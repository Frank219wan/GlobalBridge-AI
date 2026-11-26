# E · 桌面壳与双端验收

本目录只属于 E（桌面与双端验收）。新增文件全部限定在 `desktop/`、`tests/e2e/`、`docs/qa/`，
不修改 `README.md`、`docs/engineering/*`、`docs/product/*` 等他人维护的文档。

## 一、目录结构

```
desktop/
  src/GlobalBridge.Desktop/       WinForms + WebView2 最小壳（.NET 10 LTS）
    Program.cs                    入口：配置 → 运行时检测 → 开窗
    Shell/ShellConfig.cs          全部可变参数（地址、白名单、超时）
    Shell/NavigationPolicy.cs     白名单判定 + 外链转系统浏览器
    Shell/WebView2RuntimeDetector.cs  Evergreen 运行时检测
    Shell/MainForm.cs             窗口、导航、失败页、重试、进程异常
    appsettings.json              唯一需要改的配置文件
  tests/NavPolicyCheck/           导航规则无界面自检（不依赖 WebView2）
  scripts/build-desktop.ps1       SDK 检查 → 自检 → 发布
tests/e2e/                        Playwright 回归（独立 package.json）
  lib/contract.ts                 ★ 与队友的唯一耦合点（路由 + data-testid 常量）
  web/connectivity.spec.ts        部署前提
  web/quote.spec.ts               报价规则与回查
  web/recovery.spec.ts            异常与恢复
  scripts/probe.mjs               部署探针（无浏览器依赖）
  scripts/webview2-smoke.mjs      壳冒烟（进程 + 窗口）
docs/qa/                          双端证据模板、演示脚本、对接契约
```

## 二、壳的职责边界（刻意做窄）

| 做 | 不做 |
| --- | --- |
| 开窗口、导航到业务 HTTPS 域 | 任何业务逻辑 |
| 非白名单链接转交系统默认浏览器 | 注入脚本、改写页面 DOM |
| 检测 WebView2 Evergreen，缺失时引导下载 | 自动安装运行时 |
| 加载失败 / 进程崩溃 → 错误页 + 重试 | 打包 Fixed Version 运行时 |
| 会话持久化（LocalAppData 用户数据目录） | 保存任何业务凭据 |

壳内**不落任何业务代码**，因此 Web 端迭代不需要重新发版，双端也天然共用同一份业务实现。

## 三、与队友的最小融合

融合只需两件事，都不改代码：

1. **换地址** —— A 给出 HTTPS 部署地址后，改 `appsettings.json`：

   ```json
   { "baseUrl": "https://<A 的域名>/login", "allowedHosts": ["<A 的域名>"] }
   ```

   临时验证也可用命令行覆盖，不必改文件：
   `GlobalBridgeAI.exe --url=https://... --allowed-hosts=...`
   环境变量同理：`GBAI_BASE_URL` / `GBAI_ALLOWED_HOSTS`。

2. **补 data-testid** —— 队友按 `tests/e2e/lib/contract.ts` 的 `TESTID` 表加属性（纯 HTML 属性，一行一个）。
   若路径或命名与表不同，只改 `contract.ts` 常量，spec 文件不动。

未就绪的依赖一律不硬编码：登录、报价回查等用例存在但会失败，失败信息写明“部署未就绪”，
不会伪装通过。

## 四、构建与运行

```powershell
# 需要 .NET 10 SDK（Windows x64）
pwsh desktop/scripts/build-desktop.ps1

# 产物默认在 desktop/artifacts/publish/GlobalBridgeAI.exe
# 冒烟：起进程、查窗口标题、确认不崩
node tests/e2e/scripts/webview2-smoke.mjs --url=https://<测试地址>
```

回归：

```powershell
cd tests/e2e
npm install
$env:GBAI_WEB_URL = "https://<A 的地址>"
node scripts/probe.mjs          # 先探部署
npx playwright test             # 再跑业务回归
```

两个可选环境开关：

| 变量 | 用途 |
| --- | --- |
| `GBAI_CHROME_PATH` | 指定已有 Chrome/Chromium 可执行文件，清洁环境或 CI 免下载浏览器二进制 |
| `GBAI_VIDEO=off` | 关闭失败录像（录像依赖 Playwright 自带 ffmpeg），截图与 trace 不受影响 |

## 五、当前验证状态

| 项 | 状态 |
| --- | --- |
| `quote.spec.ts` 报价回归 6 条 | **6/6 通过**（桩环境实跑） |
| `recovery.spec.ts` 异常恢复 4 条 | **4/4 通过**（桩环境实跑） |
| `connectivity.spec.ts` HTTPS 门禁 | 按预期拦截 http 目标，行为正确 |
| `probe.mjs` 探针 7 项分支 | 全部走通 |
| 导航白名单自检 | **未运行**：本机无 .NET SDK，无法编译 |
| C# 壳编译与启动 | **未运行**：同上 |
| 真实部署联通 | 未开始：等 A 的 HTTPS 地址 |
| 全链路回归 | 未开始：等 A/D 接口就绪 |

本机仅有 .NET 8 运行时、无 SDK，因此 C# 代码虽已写完，**未经编译验证**。
装上 .NET 10 SDK 后先跑 `build-desktop.ps1`，它会先跑导航自检再发布，编译错误会直接暴露。

回归脚本已在本地桩环境实跑通过（详见 `docs/qa/E-回归清单.md`）。桩只用于验证脚本自身，
不产生验收证据；真实验收指向 A 的部署。
