# E · 回归清单与执行状态

对应五人版技术设计 P0 验收项中 E 牵头的部分。**自动化只覆盖可断言的确定性行为**；
真实外部检索、模型输出质量、人工判断类项目保持手工验收，不写成自动断言（避免假通过）。

## 一、自动化覆盖

| 用例文件 | 覆盖 | 依赖 | 状态 |
| --- | --- | --- | --- |
| `web/connectivity.spec.ts` | HTTPS 强制、`/login` 可达、404 不泄栈、HSTS 告警 | A 部署地址 | 脚本就绪，HTTPS 门禁已验 |
| `web/quote.spec.ts` | 1000×2.35=2350.00、负数拦截、超精度拦截、数量上限、缺项草稿、确认回查 | D 报价页 + testid | **6/6 通过**（桩环境） |
| `web/recovery.spec.ts` | 503 保留输入、断网恢复、未登录跳转、重复提交幂等 | A 会话 + D 报价页 | **4/4 通过**（桩环境） |
| `scripts/probe.mjs` | 协议、健康检查结构、敏感信息泄露、响应头 | A 部署地址 | 7 项分支已验 |
| `scripts/webview2-smoke.mjs` | 壳进程存活、主窗口出现、标题正确、非错误页 | 桌面产物 | 等 .NET 10 SDK |
| `desktop/tests/NavPolicyCheck` | 白名单放行/拦截 16 条（含后缀伪装、子域、http、file、mailto） | 无 | 等 .NET 10 SDK 编译 |

## 二、手工验收（不自动化，理由明确）

| 项 | 为何手工 | 主责 |
| --- | --- | --- |
| 真实知乎与海外检索结果质量 | 外部内容每次不同，断言会产生假失败；且自动重跑消耗额度 | B |
| 德国目标企业官网核实 | 需人判断主营业务是否匹配 | B |
| 询盘六项提取准确性 | 模型输出需人工判断，三份样本（德文完整/英文缺项/矛盾） | C |
| 双语回复可读性 | 语言质量无法断言 | C |
| 清洁 Windows 环境安装 | 需真实干净机器，自动化成本高于收益 | E |
| 外链在系统浏览器打开 | 跨进程验证，截图 + 进程列表更可靠 | E |
| 剪贴板复制 | 壳内 WebView2 剪贴板受系统焦点影响，自动化不稳 | E |
| 数据恢复演练 | 独立环境、破坏性操作 | A |

## 三、执行节奏

| 阶段 | 跑什么 | 判定 |
| --- | --- | --- |
| A 交付部署地址（D2） | `probe.mjs` + `connectivity.spec` + 壳联通 | 全绿才算 D2 通过 |
| D 开放报价接口（D8–D9） | `quote.spec` + `recovery.spec` | 阻断项当日回报 |
| 双端回归（D10–D12） | 全部自动化 + 手工清单 + 证据表 | 填满证据表，列阻断清单 |
| 复测（D13–D14） | 仅重跑阻断项相关用例 + 全量冒烟 | 阻断项清零 |

## 四、本机已执行记录

执行环境：Windows，Node 24，Playwright 1.65.1，Chromium 1226（复用本机已有二进制，
通过 `GBAI_CHROME_PATH` 指定）。被测目标为本地桩服务，**非验收证据**。

| 检查 | 结果 |
| --- | --- |
| Playwright 用例枚举（26 条 / 3 文件 / 2 project） | 通过 |
| `quote.spec.ts` 6 条（桩环境） | **6 passed** |
| `recovery.spec.ts` 4 条（桩环境） | **4 passed** |
| `connectivity.spec.ts` 对 http 桩 | **按预期 1 failed / 2 passed**：HTTPS 门禁正确拦截 http 目标 |
| `probe.mjs` 参数缺失 | 通过，exit 2 并给出提示 |
| `probe.mjs` 不可达地址 | 通过，报"无法连接"并 exit 1 |
| `probe.mjs` 对桩（7 项分支） | 通过，协议项正确判失败，健康检查/敏感信息/响应头均走通 |
| `.mjs` 脚本语法检查 | 通过 |
| C# 编译与导航自检 | **未执行**：本机无 .NET SDK（仅 .NET 8 运行时） |

### 执行命令

```bash
cd tests/e2e
node scripts/mock-server.mjs 4320 &          # 仅用于验证脚本自身
GBAI_VIDEO=off \
GBAI_WEB_URL=http://127.0.0.1:4320 \
GBAI_CHROME_PATH=<本机 chrome.exe> \
  npx playwright test --project=web web/quote.spec.ts web/recovery.spec.ts
```

### 两个环境开关

| 变量 | 用途 |
| --- | --- |
| `GBAI_CHROME_PATH` | 指定已有 Chrome/Chromium，清洁环境或 CI 免下载浏览器二进制 |
| `GBAI_VIDEO=off` | 关闭失败录像（录像依赖 Playwright 自带 ffmpeg），截图与 trace 不受影响 |

关于桩环境：`scripts/mock-server.mjs` 是**仅用于验证脚本自身可用性**的最小桩，不是被测系统，
不产生任何验收证据。真实验收必须指向 A 的 HTTPS 部署；届时 `connectivity.spec` 的
HTTPS 断言应当转为通过，这正是该用例存在的意义。
