using System.Diagnostics;

namespace GlobalBridge.Desktop.Shell;

/// <summary>
/// 导航白名单判定 + 外链转交系统浏览器。这是壳里唯一涉及“去哪个进程打开”的逻辑，
/// 与业务完全解耦：只比较 host，不关心路径、查询串或页面语义。
/// </summary>
internal sealed class NavigationPolicy
{
    private readonly string[] _allowedHosts;
    private readonly bool _allowSubdomains;

    public NavigationPolicy(ShellConfig config)
    {
        _allowedHosts = config.AllowedHosts;
        _allowSubdomains = config.AllowSubdomains;
    }

    /// <summary>只有 https 且 host 命中白名单的地址才允许留在壳内。</summary>
    public bool IsInShell(Uri? uri)
    {
        if (uri is null || !uri.IsAbsoluteUri)
        {
            return false;
        }

        if (!string.Equals(uri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        foreach (string host in _allowedHosts)
        {
            if (string.Equals(uri.Host, host, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }

            if (_allowSubdomains &&
                uri.Host.EndsWith("." + host, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        return false;
    }

    /// <summary>交给系统默认浏览器。失败时静默返回 false，由调用方决定是否提示。</summary>
    public static bool TryOpenExternally(Uri uri, out string? error)
    {
        error = null;
        if (!uri.IsAbsoluteUri ||
            (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
        {
            error = "只允许打开 http/https 外链。";
            return false;
        }

        try
        {
            Process.Start(new ProcessStartInfo(uri.AbsoluteUri) { UseShellExecute = true })?.Dispose();
            return true;
        }
        catch (Exception ex)
        {
            error = ex.Message;
            return false;
        }
    }
}
