param([Parameter(Mandatory=$true)][string]$ProjectPath)
$ErrorActionPreference='Stop'
$projectFile=(Resolve-Path -LiteralPath $ProjectPath).Path
if([IO.Path]::GetExtension($projectFile) -ne '.aprx'){throw 'Choose an ArcGIS Pro project (.aprx).'}
$pythonRoot=Join-Path $env:ProgramFiles 'ArcGIS\Pro\bin\Python\envs\arcgispro-py3'
$bridgeDir=Join-Path $env:LOCALAPPDATA 'REG Utility Manager\ProBridge'
New-Item -ItemType Directory -Path $bridgeDir -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'pro_bridge.py') -Destination (Join-Path $bridgeDir 'pro_bridge.py') -Force
$inspection=@'
import arcpy,json,re,sys
p=arcpy.mp.ArcGISProject(sys.argv[1]);urls=[]
for m in p.listMaps():
 for l in m.listLayers():
  if l.isFeatureLayer and l.name in ['Electric Device','Structure Junction','Electric Line'] and l.supports('DATASOURCE'):
   source=re.sub(r'(?i)(/FeatureServer);[^/]+/',r'\1/',l.dataSource)
   if source.startswith('https://') and re.search(r'/FeatureServer/\d+$',source,re.I): urls.append(source)
print(json.dumps(sorted(set(urls))))
'@
$urls=& (Join-Path $pythonRoot 'python.exe') -c $inspection $projectFile | ConvertFrom-Json
if(-not $urls){throw 'No matching HTTPS network service layers found in this project.'}
@{project=$projectFile;output=(Join-Path $bridgeDir 'AlertProjects');allowedLayers=@($urls)} | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $bridgeDir 'config.json')
$regPath='HKCU:\Software\Classes\reg-un-alert'
New-Item -Path $regPath -Force | Out-Null
Set-Item -Path $regPath -Value 'URL:REG Utility Network alert'
New-ItemProperty -Path $regPath -Name 'URL Protocol' -Value '' -PropertyType String -Force | Out-Null
New-Item -Path ($regPath+'\shell\open\command') -Force | Out-Null
Set-Item -Path ($regPath+'\shell\open\command') -Value ('"'+(Join-Path $pythonRoot 'pythonw.exe')+'" "'+(Join-Path $bridgeDir 'pro_bridge.py')+'" "%1"')
Write-Output 'REG alert connection installed for this Windows account. Enable the Open ArcGIS Pro on alert-click option in the monitor.'
