using System.Diagnostics;
using GlobalBridge.Desktop.Shell;

namespace GlobalBridge.Desktop;

internal static class Program
{
    /// <summary>
    /// 壳的唯一入口。职责边界：窗口、目标域导航、外链转交、启动失败与重试、运行时检测。
    /// 不包含任何业务逻辑；业务页面与接口全部由 Web 端提供。
    /// </summary>
    [STAThread]
    private static void Main(string[] args)
    {
        ApplicationConfiguration.Initialize();

        ShellConfig config;
        try
        {
            config = ShellConfig.Load(args);
        }
        catch (Exception ex)
        {
            MessageBox.Show(
                $"配置读取失败，无法启动。\r\n\r\n{ex.Message}",
                "GlobalBridge AI",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);
            return;
        }

        RuntimeCheckResult runtime = WebView2RuntimeDetector.Detect();
        if (!runtime.IsAvailable)
        {
            ShowRuntimeMissingDialog(runtime);
            return;
        }

        Application.Run(new MainForm(config, runtime));
    }

    private static void ShowRuntimeMissingDialog(RuntimeCheckResult runtime)
    {
        string message =
            "未检测到 Microsoft Edge WebView2 Evergreen 运行时，桌面端无法启动。\r\n\r\n" +
            $"检测详情：{runtime.Detail}\r\n\r\n" +
            "点击“是”打开微软官方下载页（Evergreen Standalone Installer），安装后重新启动本程序。";

        DialogResult choice = MessageBox.Show(
            message,
            "缺少 WebView2 运行时",
            MessageBoxButtons.YesNo,
            MessageBoxIcon.Warning);

        if (choice != DialogResult.Yes)
        {
            return;
        }

        try
        {
            Process.Start(new ProcessStartInfo(WebView2RuntimeDetector.DownloadPageUrl)
            {
                UseShellExecute = true
            });
        }
        catch (Exception ex)
        {
            MessageBox.Show(
                $"无法打开下载页，请手动访问：\r\n{WebView2RuntimeDetector.DownloadPageUrl}\r\n\r\n{ex.Message}",
                "GlobalBridge AI",
                MessageBoxButtons.OK,
                MessageBoxIcon.Information);
        }
    }
}
