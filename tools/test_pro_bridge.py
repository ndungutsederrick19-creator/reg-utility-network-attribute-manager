import importlib.util,json,unittest,tempfile,zipfile
from pathlib import Path
from urllib.parse import urlencode
spec=importlib.util.spec_from_file_location('bridge',Path(__file__).with_name('pro_bridge.py'));bridge=importlib.util.module_from_spec(spec);spec.loader.exec_module(bridge)
class BridgeValidation(unittest.TestCase):
 def test_validation(self):
  data={'version':1,'wkid':3857,'layer':'https://fixture/FeatureServer/7','globalId':'{12345678-1234-1234-1234-123456789ABC}','globalIdField':'GLOBALID','objectId':1,'fields':['Height'],'extent':[1,2,3,4]};config={'allowedLayers':[data['layer']]}
  def link(value):return 'reg-un-alert://focus?'+urlencode({'data':json.dumps(value)})
  self.assertEqual(bridge.validate_link(link(data),config),data)
  for change in [{'layer':'https://attacker/FeatureServer/7'},{'globalId':"x' OR 1=1"},{'globalIdField':'id;delete'},{'objectId':-1},{'extent':[3,4,1,2]},{'fields':['Height;exec']}]:
   with self.assertRaises(ValueError):bridge.validate_link(link({**data,**change}),config)
 def test_saved_map_view_is_updated_without_changing_other_views(self):
  with tempfile.TemporaryDirectory() as folder:
   target=Path(folder)/'copy.aprx';camera={'type':'CIMViewCamera','x':100,'y':200,'scale':500}
   project={'views':[{'type':'CIMMapView','viewableObjectPath':'CIMPATH=Map/Map.json','camera':{'x':1,'y':2,'viewportWidth':200,'viewportHeight':100}},{'type':'CIMMapView','viewableObjectPath':'CIMPATH=Other.json','camera':{'x':9}}]}
   with zipfile.ZipFile(target,'w') as z:
    z.writestr('Map/Map.json',json.dumps({'defaultCamera':camera}));z.writestr('GISProject.json',json.dumps(project));z.writestr('unchanged.txt','preserved')
   bridge.focus_saved_view(target,'CIMPATH=Map/Map.json',[75,175,125,225])
   with zipfile.ZipFile(target) as z:
    result=json.loads(z.read('GISProject.json'));self.assertEqual(result['views'][0]['camera']['x'],100);self.assertEqual(result['views'][0]['camera']['y'],200);self.assertEqual(result['views'][0]['camera']['viewportHeight'],50);self.assertEqual(result['views'][1],project['views'][1]);self.assertEqual(z.read('unchanged.txt'),b'preserved')
if __name__=='__main__':unittest.main()
