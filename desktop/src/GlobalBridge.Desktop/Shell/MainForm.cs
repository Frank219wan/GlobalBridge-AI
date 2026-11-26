using System.Net;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace GlobalBridge.Desktop.Shell;

/// <summary>
/// 单一窗口最小壳：窗口边框、WebView2 宿主、状态栏。
/// 壳不注入任何业务脚本、不改写页面 DOM，保证 Web 与 Windows 走同一份业务代码。
/// </summary>
internal sealed class MainForm : Form
{
    private readonly ShellConfig _config;
    private readonly NavigationPolicy _policy;
    private readonly RuntimeCheckResult _runtime;

    private readonly WebView2 _webView = new() { Dock = DockStyle.Fill };
    private readonly ToolStripStatusLabel _statusLabel = new() { Spring = true, TextAlign = ContentAlignment.MiddleLeft };
    private readonly ToolStripStatusLabel _runtimeLabel = new() { TextAlign = ContentAlignment.MiddleRight };
    private readonly ToolStripButton _retryButton = new("重试") { Enabled = false };

    private bool _showingErrorPage;
    private string? _lastFailedUrl;

    public MainForm(ShellConfig config, RuntimeCheckResult runtime)
    {
        _config = config;
        _policy = new NavigationPolicy(config);
        _runtime = runtime;

        Text = config.WindowTitle;
        StartPosition = FormStartPosition.CenterScreen;
        MinimumSize = new Size(960, 640);
        Size = new Size(1440, 900);
        AutoScaleMode = AutoScaleMode.Dpi;

        BuildLayout();
    }

    private void BuildLayout()
    {
        StatusStrip statusStrip = new();
        _retryButton.Click += (_, _) => RetryNavigation();
        statusStrip.Items.Add(_retryButton);
        statusStrip.Items.Add(_statusLabel);
        statusStrip.Items.Add(_runtimeLabel);

        _runtimeLabel.Text = _runtime.Version is null
            ? "WebView2: 未知"
            : $"WebView2 {_runtime.Version}";

        // 停靠顺序：Fill 的控件必须在最后加入（即 z-order 最前），否则会被状态栏压住。
        Controls.Add(statusStrip);
        Controls.Add(_webView);

        Load += async (_, _) => await InitializeAsync();
        FormClosing += OnFormClosing;
    }

    /// <summary>
    /// 壳级快捷键。WebView2 是独立子窗口，按键可能被浏览器进程先消费，
    /// 因此 F5 只作为壳获得焦点时的便捷入口；不把它当作唯一刷新途径。
    /// </summary>
    protected override bool ProcessCmdKey(ref Message msg, Keys keyData)
    {
        if (keyData == (Keys.Control | Keys.F5))
        {
            RetryNavigation();
            return true;
        }

        if (keyData == Keys.F5)
        {
            _webView.CoreWebView2?.Reload();
            return true;
        }

        return base.ProcessCmdKey(ref msg, keyData);
    }

    private async Task InitializeAsync()
    {
        try
        {
            CoreWebView2Environment environment = await CoreWebView2Environment.CreateAsync(
                browserExecutableFolder: null,
                userDataFolder: _config.UserDataFolder);

            await _webView.EnsureCoreWebView2Async(environment);

            CoreWebView2 core = _webView.CoreWebView2;
            core.Settings.AreDevToolsEnabled = false;
            core.Settings.AreDefaultContextMenusEnabled = true;   // 保留复制/粘贴，验收项含“复制”
            core.Settings.IsStatusBarEnabled = false;
            core.Settings.AreBrowserAcceleratorKeysEnabled = true; // Ctrl+C / Ctrl+V / F5

            core.NavigationStarting += OnNavigationStarting;
            core.NavigationCompleted += OnNavigationCompleted;
            core.NewWindowRequested += OnNewWindowRequested;
            core.ProcessFailed += OnProcessFailed;
            core.WebMessageReceived += OnWebMessageReceived;

            NavigateToStart();
        }
        catch (Exception ex)
        {
            ShowErrorPage("桌面壳初始化失败", ex.Message);
        }
    }

    private void NavigateToStart() => Navigate(_config.BaseUri, "正在连接业务服务…");

    private void Navigate(Uri uri, string statusText)
    {
        _showingErrorPage = false;
        _lastFailedUrl = null;
        _retryButton.Enabled = false;
        _statusLabel.Text = statusText;
        _webView.CoreWebView2?.Navigate(uri.AbsoluteUri);
    }

    private void OnNavigationStarting(object? sender, CoreWebView2NavigationStartingEventArgs e)
    {
        if (_showingErrorPage)
        {
            return;
        }

        if (!Uri.TryCreate(e.Uri, UriKind.Absolute, out Uri? uri))
        {
            return;
        }

        if (_policy.IsInShell(uri))
        {
            _statusLabel.Text = uri.AbsoluteUri;
            return;
        }

        // 非业务域（含 http、外部文档、邮件链接）一律不留在壳内。
        e.Cancel = true;
        if (NavigationPolicy.TryOpenExternally(uri, out string? error))
        {
            _statusLabel.Text = $"已在系统浏览器打开：{uri.Host}";
        }
        else
        {
            _statusLabel.Text = $"外链打开失败：{error}";
        }
    }

    private void OnNavigationCompleted(object? sender, CoreWebView2NavigationCompletedEventArgs e)
    {
        if (_showingErrorPage)
        {
            return;
        }

        if (e.IsSuccess)
        {
            _retryButton.Enabled = false;
            _statusLabel.Text = _webView.Source?.AbsoluteUri ?? _statusLabel.Text;
            return;
        }

        string reason = e.WebErrorStatus switch
        {
            CoreWebView2WebErrorStatus.HostNameNotResolved => "域名无法解析，请检查网络或部署地址。",
            CoreWebView2WebErrorStatus.ServerUnreachable => "服务不可达，部署实例可能未启动。",
            CoreWebView2WebErrorStatus.Timeout => "请求超时，网络可能不稳定。",
            CoreWebView2WebErrorStatus.Disconnected => "网络已断开。",
            CoreWebView2WebErrorStatus.CertificateCommonNameIsIncorrect
                or CoreWebView2WebErrorStatus.CertificateExpired
                or CoreWebView2WebErrorStatus.ClientCertificateContainsErrors
                or CoreWebView2WebErrorStatus.CertificateRevoked
                or CoreWebView2WebErrorStatus.CertificateIsInvalid => "HTTPS 证书校验失败。",
            _ => $"加载失败（{e.WebErrorStatus}）。"
        };

        ShowErrorPage("无法打开业务页面", reason);
    }

    private void OnNewWindowRequested(object? sender, CoreWebView2NewWindowRequestedEventArgs e)
    {
        e.Handled = true;

        if (Uri.TryCreate(e.Uri, UriKind.Absolute, out Uri? uri))
        {
            if (_policy.IsInShell(uri))
            {
                Navigate(uri, uri.AbsoluteUri);
                return;
            }

            NavigationPolicy.TryOpenExternally(uri, out _);
        }
    }

    private void OnProcessFailed(object? sender, CoreWebView2ProcessFailedEventArgs e)
    {
        if (e.ProcessFailedKind == CoreWebView2ProcessFailedKind.BrowserProcessExited)
        {
            ShowErrorPage("渲染进程已退出", "WebView2 浏览器进程意外结束，请重试。");
            return;
        }

        ShowErrorPage("页面进程异常", $"进程失败类型：{e.ProcessFailedKind}。请重试。");
        _retryButton.Enabled = true;
    }

    private void OnWebMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        // 壳内错误页只回传一个动作名，不解析任何业务数据。
        string? message = null;
        try
        {
            message = e.TryGetWebMessageAsString();
        }
        catch (ArgumentException)
        {
            // 业务页面若发送 JSON 对象，此处静默忽略：壳不消费业务消息。
            return;
        }

        if (string.Equals(message, "retry", StringComparison.Ordinal))
        {
            RetryNavigation();
        }
    }

    private void RetryNavigation()
    {
        if (_lastFailedUrl is not null &&
            Uri.TryCreate(_lastFailedUrl, UriKind.Absolute, out Uri? failedUri) &&
            _policy.IsInShell(failedUri))
        {
            Navigate(failedUri, "正在重试…");
            return;
        }

        NavigateToStart();
    }

    private void ShowErrorPage(string title, string detail)
    {
        _showingErrorPage = true;
        _lastFailedUrl = _webView.Source is { } source && _policy.IsInShell(source)
            ? source.AbsoluteUri
            : _config.BaseUrl;

        _retryButton.Enabled = true;
        _statusLabel.Text = title;
        _webView.CoreWebView2?.NavigateToString(BuildErrorPage(title, detail));
    }

    private static string BuildErrorPage(string title, string detail) => $$"""
        <!doctype html>
        <html lang="zh-Hans">
        <head>
          <meta charset="utf-8">
          <style>
            :root { color-scheme: light dark; }
            body { margin: 0; height: 100vh; display: flex; align-items: center; justify-content: center;
                   font-family: "Segoe UI", "Microsoft YaHei", system-ui, sans-serif; background: #f7f8fa; color: #1c1f23; }
            .card { max-width: 520px; padding: 40px; text-align: center; }
            h1 { font-size: 20px; margin: 0 0 12px; }
            p { font-size: 14px; line-height: 1.7; color: #5a6068; margin: 0 0 28px; white-space: pre-wrap; }
            button { font-size: 14px; padding: 10px 28px; border: 0; border-radius: 8px;
                     background: #1f6feb; color: #fff; cursor: pointer; }
            button:hover { background: #1a5fd0; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>{{WebUtility.HtmlEncode(title)}}</h1>
            <p>{{WebUtility.HtmlEncode(detail)}}</p>
            <button onclick="chrome.webview.postMessage('retry')">重新连接</button>
          </div>
        </body>
        </html>
        """;

    private void OnFormClosing(object? sender, FormClosingEventArgs e)
    {
        try
        {
            _webView.Dispose();
        }
        catch
        {
            // 关闭阶段忽略释放异常，不影响退出。
        }
    }
}
