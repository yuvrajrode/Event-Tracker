using System;
using System.Diagnostics;
using System.IO;

class GatherLauncher
{
    [STAThread]
    static void Main()
    {
        try
        {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            string htmlFile = Path.Combine(baseDir, "index.html");
            if (!File.Exists(htmlFile))
            {
                htmlFile = Path.GetFullPath("index.html");
            }

            string fileUri = "file:///" + htmlFile.Replace('\\', '/');

            string[] browserPaths = new string[]
            {
                @"C:\Program Files\Google\Chrome\Application\chrome.exe",
                @"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData) + @"\Google\Chrome\Application\chrome.exe",
                @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
                @"C:\Program Files\Microsoft\Edge\Application\msedge.exe"
            };

            string chosenBrowser = null;
            foreach (string p in browserPaths)
            {
                if (File.Exists(p))
                {
                    chosenBrowser = p;
                    break;
                }
            }

            ProcessStartInfo psi = new ProcessStartInfo();
            psi.UseShellExecute = true;

            if (chosenBrowser != null)
            {
                psi.FileName = chosenBrowser;
                psi.Arguments = string.Format("--app=\"{0}\" --window-size=1280,820", fileUri);
            }
            else
            {
                psi.FileName = htmlFile;
            }

            Process.Start(psi);
        }
        catch (Exception ex)
        {
            try
            {
                Process.Start(new ProcessStartInfo("index.html") { UseShellExecute = true });
            }
            catch
            {
                // Fallback quiet
            }
        }
    }
}
