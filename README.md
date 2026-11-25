# GlobalBridge AI

面向中国中小制造企业的 AI 出海业务助手。比赛 MVP 以深圳智能家居传感器制造商开拓德国市场为演示主线，覆盖市场发现、客户情报、询盘处理、多语言商务回复和报价。

## 当前文档基线

产品范围：2026-11-21 比赛 MVP PRD，保留原文。
技术与分工：2026-11-25 五人版为当前实施参考。技术选型、字段和阈值仍属于开工建议，未决事项以团队确认结果为准。旧版技术方案不再作为当前实现依据。

| 文档 | 用途 |
| --- | --- |
| [产品需求 PRD](docs/product/PRD.md) | 产品范围、原文索引 |
| [技术设计](docs/engineering/TECHNICAL-DESIGN.md) | 最新架构、页面、数据及规则 |
| [五人团队分工](docs/engineering/TEAM-RESPONSIBILITIES.md) | A–E 岗位、D1–D14 排期、交接及验收 |
| [业务 API 合同](docs/engineering/API-CONTRACT.md) | 全项目接口及错误、一致性约定 |
| [五人版完整文本提取](docs/engineering/TECHNICAL-DESIGN-2026-11-25-extracted.txt) | 2026-11-25 技术方案来源 |
| [知乎 API 合同](docs/zhihu/API_CONTRACT.md) | 第三方接口及实际响应差异 |
| [知乎历史验证基线](docs/zhihu/HISTORICAL_BASELINE.md) | 脱敏实测记录 |
| [知乎能力评估任务（Codex）](prompts/ZHIHU_CAPABILITY_EVALUATION.md) | 独立 PoC 子任务，非完整 B 岗位实施规范 |
| [旧版技术方案归档](docs/archive/2026-11-21/) | 历史参考 |

## 推荐架构

Next.js App Router + React + TypeScript + Node.js 24 LTS；Next.js Route Handlers；首选 PostgreSQL + Prisma；Windows 使用 WinForms + .NET 10 LTS + WebView2 Evergreen。两个客户端访问同一个 HTTPS 应用与业务记录。

首测知乎站内搜索；同批英德查询比较 Exa、Tavily、Brave，选择验证通过的一个海外主供应商；首测百炼 Qwen3.7-Flash 系列。数据库、部署地域、供应商、权限和留存、预算等在 D2 确认，D3 锁定模型 ID 及地域。

## 团队岗位

A 平台与资料；B 市场与客户；C 询盘与商务沟通；D 报价与历史；E 桌面与双端验收。A 统筹技术决策与 Web 发布，E 统筹双端验收。岗位代号不代表具体成员已获分配。

## 当前状态

- 两次历史真实全网搜索（中文、英文）调用成功；德文、客户核验、额度、授权、稳定性、部署环境尚未验收。
- 官方 Skill / CLI 是可选开发验证工具，每个环境独立检查安装、兼容性、认证及额度。
- 当前仅完成文档初始化及更新，尚未实现业务系统或 PoC。
- 旧 PRD PDF 曾推荐 FastAPI + Tauri；现保留产品需求原文，但实施优先参照最新五人版。邮件历史等冲突以团队冻结合同为准。

## 安全

仓库公开。禁止提交实际凭证、个人环境路径及账号信息、个人终端日志、未经许可的供应商响应及客户敏感资料。历史测试不等于部署或生产验收。
