using Microsoft.Web.WebView2.Core;

namespace GlobalBridge.Desktop.Shell;

internal sealed record RuntimeCheckResult(
    bool IsAvailable,
    string? Version,
    string Detail);

/// <summary>
/// 启动前检测 WebView2 Evergreen Runtime。
/// 不打包 Fixed Version，不自动安装，只做检测 + 引导下载，保持安装包轻量且升级由系统负责。
/// </summary>
internal static class WebView2RuntimeDetector
{
    public const string DownloadPageUrl = "https://developer.microsoft.com/microsoft-edge/webview2/";

    public static RuntimeCheckResult Detect()
    {
        try
        {
            string? version = CoreWebView2Environment.GetAvailableBrowserVersionString();

            if (string.IsNullOrWhiteSpace(version))
            {
                return new RuntimeCheckResult(
                    false,
                    null,
                    "GetAvailableBrowserVersionString() 返回空值，运行时可能未正确注册。");
            }

            return new RuntimeCheckResult(true, version, $"Evergreen Runtime {version}");
        }
        catch (WebView2RuntimeNotFoundException ex)
        {
            return new RuntimeCheckResult(false, null, ex.Message);
        }
        catch (Exception ex)
        {
            return new RuntimeCheckResult(false, null, $"{ex.GetType().Name}: {ex.Message}");
        }
    }
}
