using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;
using Microsoft.Win32;

static class RegAlertLauncher {
 [STAThread] static void Main(string[] args) {
  try {
   string folder=AppDomain.CurrentDomain.BaseDirectory;
   string exe=Application.ExecutablePath;
   string command="\""+exe+"\" \"%1\"";
   // Runs in the user's normal Windows context when selected in Open with.
   using(var key=Registry.CurrentUser.CreateSubKey(@"Software\Classes\REG.UtilityNetworkAlert")) {
    key.SetValue("", "REG Utility Network feature alert");
    using(var open=key.CreateSubKey(@"shell\open\command")) open.SetValue("",command);
   }
   using(var key=Registry.CurrentUser.CreateSubKey(@"Software\Classes\Applications\REG Pro Alert Launcher.exe")) {
    key.SetValue("FriendlyAppName","REG Pro Alert Launcher");
    using(var types=key.CreateSubKey("SupportedTypes")) types.SetValue(".regalert", "");
    using(var open=key.CreateSubKey(@"shell\open\command")) open.SetValue("",command);
   }
   using(var key=Registry.CurrentUser.CreateSubKey(@"Software\Classes\.regalert\OpenWithProgids")) key.SetValue("REG.UtilityNetworkAlert",new byte[0],RegistryValueKind.None);
   string input=args.Length==1?args[0]:null;
   if(input==null) {using(var picker=new OpenFileDialog()) {picker.Title="Choose the downloaded REG feature alert";picker.Filter="REG feature alerts (*.regalert)|*.regalert";if(picker.ShowDialog()!=DialogResult.OK)return;input=picker.FileName;}}
   if(!input.StartsWith("reg-un-alert://",StringComparison.OrdinalIgnoreCase)) {
    if(!File.Exists(input)||!String.Equals(Path.GetExtension(input),".regalert",StringComparison.OrdinalIgnoreCase)||new FileInfo(input).Length>16000)throw new Exception("Choose the downloaded .regalert file.");
   }
   if(input.IndexOf('"')>=0||input.Length>16000)throw new Exception("Invalid alert path.");
   string python=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles),@"ArcGIS\Pro\bin\Python\envs\arcgispro-py3\pythonw.exe");
   string script=Path.Combine(folder,"pro_bridge.py");
   if(!File.Exists(python)||!File.Exists(script))throw new Exception("ArcGIS Pro or the REG helper is missing. Repair the local launcher installation.");
   Process.Start(new ProcessStartInfo(python,"\""+script+"\" \""+input+"\""){UseShellExecute=false,CreateNoWindow=true,WindowStyle=ProcessWindowStyle.Hidden,WorkingDirectory=folder});
  }catch(Exception error){MessageBox.Show(error.Message,"REG Pro Alert Launcher",MessageBoxButtons.OK,MessageBoxIcon.Error);}
 }
}
