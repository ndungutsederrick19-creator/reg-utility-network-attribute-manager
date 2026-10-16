import importlib.util,json,unittest
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
if __name__=='__main__':unittest.main()
