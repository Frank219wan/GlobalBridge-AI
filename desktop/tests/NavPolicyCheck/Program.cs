using GlobalBridge.Desktop.Shell;

namespace GlobalBridge.Desktop.SelfCheck;

/// <summary>
/// 导航白名单的无界面自检。不依赖 WebView2 运行时、不打开窗口，
/// 可在 CI 或任意机器上直接跑，输出逐条用例结果。
/// 与 E 的验收项对应：外链必须转系统浏览器、http 不得留壳、子域默认不放行。
/// </summary>
internal static class Program
{
    private static int _failed;

    private static int Main()
    {
        ShellConfig config = ShellConfig.Load(["--url=https://gbai.example.com/login",
                                               "--allowed-hosts=gbai.example.com,app.example.com"]);
        NavigationPolicy policy = new(config);

        Check("壳内业务首页放行", policy.IsInShell(new Uri("https://gbai.example.com/login")), true);
        Check("壳内深链接放行", policy.IsInShell(new Uri("https://gbai.example.com/quotes/123?tab=history")), true);
        Check("端口不影响判定", policy.IsInShell(new Uri("https://gbai.example.com:8443/dashboard")), true);
        Check("大小写主机名放行", policy.IsInShell(new Uri("https://GBAI.Example.COM/catalog")), true);

        Check("http 不放行", policy.IsInShell(new Uri("http://gbai.example.com/login")), false);
        Check("外部站点不放行", policy.IsInShell(new Uri("https://www.zhihu.com/")), false);
        Check("外部站点后缀伪装不放行", policy.IsInShell(new Uri("https://gbai.example.com.evil.test/")), false);
        Check("子域默认不放行", policy.IsInShell(new Uri("https://api.example.com/")), false);
        Check("相对地址不放行", policy.IsInShell(new Uri("/market", UriKind.Relative)), false);
        Check("空地址不放行", policy.IsInShell(null), false);
        Check("file 协议不放行", policy.IsInShell(new Uri("file:///C:/Windows/System32/")), false);
        Check("mailto 不放行", policy.IsInShell(new Uri("mailto:a@example.com")), false);

        ShellConfig withSub = config with { AllowSubdomains = true };
        NavigationPolicy subPolicy = new(withSub);
        Check("开关打开后子域放行", subPolicy.IsInShell(new Uri("https://api.example.com/")), true);
        Check("开关打开后仍拦外部域", subPolicy.IsInShell(new Uri("https://example.com.evil.test/")), false);

        Check("外链转交拒绝非法协议", NavigationPolicy.TryOpenExternally(new Uri("file:///C:/"), out _), false);

        Console.WriteLine();
        Console.WriteLine(_failed == 0 ? "全部通过" : $"{_failed} 条未通过");
        return _failed == 0 ? 0 : 1;
    }

    private static void Check(string name, bool actual, bool expected)
    {
        bool ok = actual == expected;
        if (!ok)
        {
            _failed++;
        }

        Console.WriteLine($"{(ok ? "PASS" : "FAIL")}  {name}（期望 {expected}，实际 {actual}）");
    }
}
