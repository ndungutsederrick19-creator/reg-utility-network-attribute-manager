"""Local, credential-free REG alert handoff. Never writes feature data or original project."""
import json, math, os, re, sys, uuid
from pathlib import Path
from urllib.parse import urlsplit, parse_qs

def canonical(source):
    return re.sub(r'(?i)(/FeatureServer);[^/]+/', r'\1/', source).rstrip('/').lower()

def validate_link(link, config):
    if len(link)>16000: raise ValueError('Alert link is too long.')
    parsed=urlsplit(link)
    if parsed.scheme!='reg-un-alert' or parsed.netloc!='focus': raise ValueError('Unsupported alert action.')
    data=json.loads(parse_qs(parsed.query,strict_parsing=True)['data'][0])
    if data.get('version')!=1 or data.get('wkid')!=3857: raise ValueError('Unsupported alert version or coordinates.')
    if canonical(data.get('layer','')) not in {canonical(url) for url in config['allowedLayers']}: raise ValueError('This service layer is not linked to your LV project.')
    if not re.fullmatch(r'\{?[0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}\}?',data.get('globalId','')): raise ValueError('Invalid Global ID.')
    if type(data.get('objectId')) is not int or not 0<=data['objectId']<=9007199254740991: raise ValueError('Invalid object ID.')
    if not re.fullmatch(r'[A-Za-z_][A-Za-z0-9_]{0,254}',data.get('globalIdField','')): raise ValueError('Invalid Global ID field.')
    box=data.get('extent');fields=data.get('fields')
    if not isinstance(box,list) or len(box)!=4 or any(type(v) not in (int,float) or not math.isfinite(v) or abs(v)>40000000 for v in box) or box[0]>=box[2] or box[1]>=box[3]: raise ValueError('Invalid feature extent.')
    if not isinstance(fields,list) or not 1<=len(fields)<=1000 or any(not isinstance(f,str) or not re.fullmatch(r'[A-Za-z_][A-Za-z0-9_.]{0,254}',f) for f in fields): raise ValueError('Invalid field names.')
    return data

def prepare_project(data, config, arcpy):
    original=Path(config['project']).resolve()
    if original.suffix.lower()!='.aprx' or not original.is_file(): raise ValueError('The configured LV project is unavailable.')
    project=arcpy.mp.ArcGISProject(str(original))
    matches=[(m,l) for m in project.listMaps() for l in m.listLayers() if l.isFeatureLayer and l.supports('DATASOURCE') and canonical(l.dataSource)==canonical(data['layer'])]
    if len(matches)!=1: raise ValueError('Expected one matching layer in LV; update the local project connection.')
    map_,layer=matches[0]
    # Clear definition filters only in this in-memory project copy so they cannot hide the alert.
    layer.definitionQuery=''
    layer.visible=True
    layer.minThreshold=0;layer.maxThreshold=0
    layer.setSelectionSet([data['objectId']], 'NEW')
    extent=arcpy.Extent(*data['extent'],spatial_reference=arcpy.SpatialReference(3857))
    # Camera extents use the map spatial reference. Transform before setting it.
    corners=arcpy.Polygon(arcpy.Array([arcpy.Point(extent.XMin,extent.YMin),arcpy.Point(extent.XMin,extent.YMax),arcpy.Point(extent.XMax,extent.YMax),arcpy.Point(extent.XMax,extent.YMin)]),arcpy.SpatialReference(3857)).projectAs(map_.spatialReference)
    camera=map_.defaultCamera;camera.setExtent(corners.extent);map_.defaultCamera=camera
    label='REG alert '+data['globalId'].strip('{}')[:8]+' - '+', '.join(data['fields'])[:80]
    definition=map_.getDefinition('V3')
    cim_camera=arcpy.cim.CreateCIMObjectFromClassName('CIMViewCamera','V3')
    for name in ['heading','pitch','roll','scale','x','y','z']:
        try: setattr(cim_camera,name,getattr(camera,name.upper() if name in ['x','y','z'] else name))
        except AttributeError: pass
    definition.defaultCamera=cim_camera
    bookmark=arcpy.cim.CreateCIMObjectFromClassName('CIMBookmark','V3');bookmark.name=label;bookmark.camera=cim_camera
    e=corners.extent;bookmark.location={'xmin':e.XMin,'ymin':e.YMin,'xmax':e.XMax,'ymax':e.YMax,'spatialReference':{'wkid':map_.spatialReference.factoryCode}}
    definition.bookmarks=list(definition.bookmarks or [])+[bookmark];map_.setDefinition(definition)
    output=Path(config['output']).resolve();output.mkdir(parents=True,exist_ok=True)
    target=output/('REG-alert-'+uuid.uuid4().hex[:12]+'.aprx')
    layer=next(l for l in map_.listLayers() if l.isFeatureLayer and l.supports('DATASOURCE') and canonical(l.dataSource)==canonical(data['layer']))
    layer.definitionQuery=data['globalIdField']+" = '"+data['globalId']+"'"
    layer.setSelectionSet([data['objectId']], 'NEW')
    project.saveACopy(str(target))
    return target

def main():
    config=json.loads(Path(__file__).with_name('config.json').read_text(encoding='utf-8-sig'))
    data=validate_link(sys.argv[1],config)
    import arcpy
    target=prepare_project(data,config,arcpy)
    if '--no-launch' not in sys.argv: os.startfile(str(target))
    return target

if __name__=='__main__':
    try: main()
    except Exception as error:
        Path(__file__).with_name('last-error.txt').write_text(str(error),encoding='utf-8')
        import ctypes
        ctypes.windll.user32.MessageBoxW(0,str(error),'REG — could not locate alert in ArcGIS Pro',0x10)
