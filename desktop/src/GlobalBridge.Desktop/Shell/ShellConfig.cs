using System.Text.Json;
using System.Text.Json.Serialization;

namespace GlobalBridge.Desktop.Shell;

/// <summary>
/// 壳的全部可变参数集中在此处。<br/>
/// 与队友融合时的唯一改动点：把 appsettings.json 的 baseUrl / allowedHosts 换成 A 提供的正式 HTTPS 部署地址。
/// 代码无需改动。
/// </summary>
internal sealed record ShellConfig
{
    public const string FileName = "appsettings.json";

    /// <summary>壳内首个加载的业务地址，必须是 HTTPS。</summary>
    [JsonPropertyName("baseUrl")]
    public string BaseUrl { get; init; } = "https://example.invalid/login";

    /// <summary>允许留在壳内的业务主机名；其余一切链接交给系统默认浏览器。</summary>
    [JsonPropertyName("allowedHosts")]
    public string[] AllowedHosts { get; init; } = ["example.invalid"];

    /// <summary>是否把 allowedHosts 的子域也视为壳内域（如 app.example.com 之于 example.com）。</summary>
    [JsonPropertyName("allowSubdomains")]
    public bool AllowSubdomains { get; init; }

    [JsonPropertyName("windowTitle")]
    public string WindowTitle { get; init; } = "GlobalBridge AI";

    /// <summary>首屏导航超时秒数，超时后显示可重试的启动失败页。</summary>
    [JsonPropertyName("startupTimeoutSeconds")]
    public int StartupTimeoutSeconds { get; init; } = 20;

    /// <summary>WebView2 用户数据目录（置于 LocalAppData 下），保证会话、登录态可持久化。</summary>
    [JsonPropertyName("userDataSubFolder")]
    public string UserDataSubFolder { get; init; } = "GlobalBridgeAI/WebView2";

    [JsonIgnore]
    public Uri BaseUri { get; private set; } = null!;

    [JsonIgnore]
    public string UserDataFolder => Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        UserDataSubFolder.Replace('/', Path.DirectorySeparatorChar));

    private static readonly JsonSerializerOptions SerializerOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        ReadCommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true
    };

    /// <summary>
    /// 加载顺序：appsettings.json → 环境变量 GBAI_BASE_URL / GBAI_ALLOWED_HOSTS → 命令行 --url= / --allowed-hosts=。
    /// 便于 E 在部署地址未定前用占位地址开工，也便于回归脚本切换测试环境。
    /// </summary>
    public static ShellConfig Load(IReadOnlyList<string> args)
    {
        string path = Path.Combine(AppContext.BaseDirectory, FileName);
        ShellConfig config = File.Exists(path)
            ? JsonSerializer.Deserialize<ShellConfig>(File.ReadAllText(path), SerializerOptions)
              ?? throw new InvalidDataException($"{FileName} 内容为空或格式错误。")
            : new ShellConfig();

        string? url = Environment.GetEnvironmentVariable("GBAI_BASE_URL");
        string? hosts = Environment.GetEnvironmentVariable("GBAI_ALLOWED_HOSTS");

        foreach (string arg in args)
        {
            if (arg.StartsWith("--url=", StringComparison.OrdinalIgnoreCase))
            {
                url = arg["--url=".Length..];
            }
            else if (arg.StartsWith("--allowed-hosts=", StringComparison.OrdinalIgnoreCase))
            {
                hosts = arg["--allowed-hosts=".Length..];
            }
        }

        if (!string.IsNullOrWhiteSpace(url))
        {
            config = config with { BaseUrl = url.Trim() };
        }

        if (!string.IsNullOrWhiteSpace(hosts))
        {
            config = config with
            {
                AllowedHosts = hosts
                    .Split([',', ';'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            };
        }

        config.Validate();
        return config;
    }

    private void Validate()
    {
        if (!Uri.TryCreate(BaseUrl, UriKind.Absolute, out Uri? uri))
        {
            throw new InvalidDataException($"baseUrl 不是合法的绝对地址：{BaseUrl}");
        }

        if (!string.Equals(uri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidDataException($"baseUrl 必须使用 HTTPS，当前为 {uri.Scheme}。");
        }

        if (AllowedHosts.Length == 0)
        {
            throw new InvalidDataException("allowedHosts 不能为空，否则壳内无任何可访问域。");
        }

        BaseUri = uri;
    }
}
