# GlobalBridge AI 技术设计 — 五人分工版

**当前技术实施参考：2026-11-25。** 本文件为最新版技术方案索引及可读摘要，不是新增技术决议。

原始依据：[五人版完整文本提取（6 页）](TECHNICAL-DESIGN-2026-11-25-extracted.txt)。[2026-11-21 旧技术方案](../archive/2026-11-21/TECHNICAL-DESIGN-extracted.txt)仅供历史参考。产品需求见 [PRD 索引](../product/PRD.md)。

## 1. 技术栈与部署（原文第 1 页）

| 层级 | 最新推荐 |
| --- | --- |
| Web | Next.js App Router、React、TypeScript、Node.js 24 LTS |
| API | Next.js Route Handlers，同源部署；路由处理鉴权、校验和错误转换，业务服务处理规则及写入，供应商适配器处理外部协议 |
| 数据 | 首选托管 PostgreSQL、Prisma、版本化迁移；未就绪可选单实例持久卷 SQLite，金额以整数分存储并复测；二选一 |
| Windows | WinForms + .NET 10 LTS + WebView2 Evergreen；仅业务 HTTPS 域留壳内，来源外链由系统浏览器打开 |
| 外部服务 | 首测知乎站内搜索；同一批样本比较 Exa、Tavily、Brave，选择一个通过验证的海外主供应商；首测百炼 Qwen3.7-Flash 系列，模型 ID 与地域待锁定 |
| 部署 | 一个 Node.js 实例、同区域持久数据库、HTTPS；开发与正式演示独立工作区、数据库配置和额度 |

浏览器 / Windows WebView2 → HTTPS → Next.js 页面和业务 API → PostgreSQL、知乎官方 API、海外搜索 API、模型 API。

凭证仅服务端保管；日志仅记录请求编号、服务、结果类别、耗时和计费用量。本地验证不能代替拟部署环境真实请求。以上为原文推荐，并不表示已完成选型或部署。

## 2. 页面（原文第 2 页）

| 页面 | 功能 |
| --- | --- |
| /login | Demo 登录及会话恢复 |
| /dashboard | 工作区、产品及最近保存业务记录 |
| /catalog | 企业、产品 CRUD，产品可带入市场 |
| /market、/market/[id] | 产品和国家、需求/竞争/机会、分源状态、候选企业、保存及报告历史 |
| /customers、/customers/[id] | 客户列表、官网、背景、匹配理由、核实状态、发起询盘并带入产品 |
| /inquiries、/inquiries/new、/inquiries/[id] | 文本询盘、六项提取及证据、风险、追问、修订、德英回复编辑复制、发起报价 |
| /quotes、/quotes/new、/quotes/[id] | 单行报价、预填、金额预览、草稿、确认及历史 |

业务记录 ID 跳转，刷新后按当前会话读取。保存失败保留输入；生成或切换语言前提示保留/覆盖当前稿。抽取真正复用的导航、表单反馈、来源卡、加载/错误状态及货币输入组件。

## 3. 接口与数据（原文第 2–5 页）

详见 [API 合同索引](API-CONTRACT.md)。统一 /api 前缀、会话工作区隔离、游标分页默认 20、UTC 时间、十进制字符串金额、统一错误。

主要表：workspaces、demo_accounts、sessions、companies、products、market_runs、source_evidence、market_candidates、customers、inquiries、quotes。主要业务表 UUID、workspace_id、created_at、updated_at，可编辑记录有版本号。关联查询限制工作区与记录 ID，PostgreSQL 建议组合外键；客户在工作区内按规范化官网域唯一。

- market_runs：产品和查询快照、国家、检索时间、分源状态、需求/竞争/机会、保存时间；结论关联证据或标资料不足。
- source_evidence / market_candidates：只存获准来源和支持字段；候选名称、官网域、国家、业务、匹配理由与核实状态。无官网证据可展示待核实，保存需有效公开证据。
- customers：官网域、国家、主营业务、核实状态、首次关联产品、来源引用及匹配理由。
- inquiries：关联客户/产品、六项采购字段、风险、追问及获准脱敏证据；原始正文默认不落库。
- quotes：询盘 ID、企业/客户/产品快照、数量、单位、单价、币种、总价、贸易条件、缺项、状态。历史快照不随产品改价变化。

写入规则：询盘和报价唯一提交键；同工作区/资源类型/键的相同内容返回同记录，不同内容 409；更新按 id + workspaceId + version 原子比较并递增。事务内不做外部搜索。查询仅发送产品关键词、国家、企业类型；供应商内容先检查留存许可。

检索：知乎与海外并行，单源 ok/empty/timeout/error；建议单路 8 秒、整体 25 秒；保留有效证据、校验模型引用；标记真实、获准历史与演示样例，不以演示样例替代验收。首次同步有限等待，只有压测证明不足才考虑持久任务和轮询。

询盘六项：产品、数量、规格、目的地、交期、付款条件，各含 value、status、evidenceText，状态 extracted/missing/needs_review；使用经用户修订的字段。模糊日期不猜补，数量未知用空值。

报价：单行 USD/EUR，数量正整数建议上限 1,000,000，单价正数最多两位小数建议上限 999,999.99，PostgreSQL 建议 numeric(16,2)，服务端十进制乘法。缺项可存草稿；确认时校验齐全，确认后修改复制新草稿。币种变化重新确认单价。

## 4. 交付与风险（原文第 5–6 页）

[团队职责与里程碑](TEAM-RESPONSIBILITIES.md)。只打磨德国单产品、单行报价、文本询盘、英德两语、人工确认和简易 Dashboard；文件解析、PDF 导出、完整客户报告及增强仪表盘按原 P1。

D2 待冻结：数据库/部署地域、知乎权限与留存、海外供应商与预算、Windows 支持版本/签名、脱敏素材、报价规则、负责人。D3 锁定模型 ID 和地域。赛后清理日期、第三方可保留字段和评委独立工作区数量需确认。

发布：P0-01 至 P0-10 全部通过，真实外部能力有验证记录，Web 和 Windows 均能从产品走到报价并回查；交付 Web 入口、Windows 安装包、受控 Demo 账号、验证记录及演示脚本。
