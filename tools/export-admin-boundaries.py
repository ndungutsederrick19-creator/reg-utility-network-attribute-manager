import arcpy,json,pathlib,collections,argparse,gzip
parser=argparse.ArgumentParser(description='Export the supplied province, district and sector geodatabase to static app data. Requires ArcGIS Pro Python.')
parser.add_argument('gdb');args=parser.parse_args()
root=pathlib.Path('dist/assets/admin-2022');root.mkdir(parents=True,exist_ok=True);gdb=pathlib.Path(args.gdb).resolve();index={'version':1,'source':'Boundaries_2022.gdb','year':2022,'provinces':[],'districts':[],'sectors':[]};groups=collections.defaultdict(dict)
for level in ['province','district','sector']:
 fc=str(gdb/(level.title()+'_boundary_2022'));names=sum(([x,x+'_id'] for x in ['province','district','sector'][:['province','district','sector'].index(level)+1]),[])
 with arcpy.da.SearchCursor(fc,names+['SHAPE@']) as rows:
  for row in rows:
   a=dict(zip(names,row[:-1]));id=a[level+'_id'];geom=json.loads(row[-1].projectAs(arcpy.SpatialReference(4326)).JSON);geom={'rings':[[[round(p[0],7),round(p[1],7)] for p in r] for r in geom['rings']],'spatialReference':{'wkid':4326}}
   group='sectors-'+a['district_id'] if level=='sector' else level+'s';groups[group][id]=geom
   record={'id':id,'name':a[level],'file':group+'.json'}
   if level!='province':record['provinceId']=a['province_id']
   if level=='sector':record['districtId']=a['district_id']
   index[level+'s'].append(record)
for key,data in groups.items():(root/(key+'.json')).write_text(json.dumps(data,separators=(',',':')),encoding='utf-8')
(root/'index.json').write_text(json.dumps(index,separators=(',',':')),encoding='utf-8')
for p in root.glob('*.json'):
 if p.name=='index.json':continue
 with gzip.open(str(p)+'.gz','wb',compresslevel=9) as out:out.write(p.read_bytes())
 p.unlink()
print('Files',len(groups)+1,'Bytes',sum(p.stat().st_size for p in root.glob('*.json')),'Largest',max(p.stat().st_size for p in root.glob('*.json')))
