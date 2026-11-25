# 业务 API 合同索引

依据 2026-11-25 五人版技术设计第 2–4 页；以下为实现与联调的合同整理，非已上线接口。完整原文见 [技术方案](TECHNICAL-DESIGN-2026-11-25-extracted.txt)。第三方知乎协议另见 [知乎 API 合同](../zhihu/API_CONTRACT.md)。

统一前缀 /api；ID 服务端生成；除登录与健康检查外从会话取得 workspaceId；游标默认 20 条；时间 ISO 8601 UTC；金额十进制字符串。错误包含 code、message、requestId，字段错误另有 fieldErrors。

| 方法及路径（省略 /api） | 输入及输出 |
| --- | --- |
| POST /session、GET /session、DELETE /session | 预设账号口令登录，HttpOnly/Secure/SameSite Cookie；读取当前账号和工作区摘要；退出撤销当前会话 |
| GET /dashboard | 最近市场报告、客户、询盘和报价标题/状态/时间/ID，企业及产品摘要 |
| GET /company、PUT /company | 企业名称、所在地、简介、主营业务；一个工作区一份资料；更新带版本，未初始化空状态 |
| GET /products、POST /products、GET /products/{id}、PATCH /products/{id} | 名称、简介、规格、单位、可空单价与币种；同时有或同时空；更新带版本；已引用产品可归档 |
| POST /market-runs | productId、countryCode（DE）；并行检索；runId、总状态、来源状态、时间、市场结论、来源、候选；保留获准摘要与独立证据 |
| GET /market-runs、GET /market-runs/{id}、PATCH /market-runs/{id} | 历史查询、详情、标记保存；更新带版本；Dashboard 仅展示已保存报告；注明历史时点 |
| POST /customers、GET /customers、GET /customers/{id} | 保存来自本轮 runId 和 candidateId 的候选，验证工作区和可留存性；同官网域返回已有客户；详情含背景、匹配理由、证据 |
| POST /inquiry-analyses | 同工作区 customerId、productId、正文；六项结构化结果、证据、风险、缺项、追问；正文默认只在当前请求和编辑页面使用 |
| POST /inquiries、GET /inquiries、GET /inquiries/{id}、PATCH /inquiries/{id} | 客户/产品、修订采购字段、获准证据、风险/追问；确认记录与版本；重复提交检测 |
| POST /inquiries/{id}/reply | language=en/de、当前询盘版本；主题、正文、待沟通事项及所用版本；编辑复制，首版默认无邮件历史表 |
| GET /inquiries/{id}/quote-defaults | 企业/客户/产品预填、确认数量、当前产品价格与币种、待补全字段 |
| GET /quotes、POST /quotes、GET /quotes/{id}、PATCH /quotes/{id} | 创建关联询盘；targetStatus、核对数量/单价/币种/单位/贸易条件；更新带版本；服务端快照和计算；返回 draft/confirmed、缺项、总价及新版本；已确认复制新草稿 |
| GET /healthz | 应用和数据库状态，不泄露内部连接信息；第三方探测独立，不随客户端健康检查消耗额度 |

## 状态与错误

| 状态 | 语义 |
| --- | --- |
| 401 | 未登录 |
| 404 | 缺失或非当前工作区记录 |
| 422 | 字段错误 |
| 409 | 版本冲突或重复提交键内容冲突 |
| 429 | 工作区限额 |
| 503 | 外部服务全部失败 |
| 504 | 整体时限耗尽且无可用结果 |
| 200 partial | 单源失败但仍有可用结果，显示分源原因 |
| empty | 各源正常但无命中 |
| 模型归纳失败 | 保留有效来源，报告待重试 |

每个搜索源分别记录 ok/empty/timeout/error。单源建议 8 秒，整体 25 秒。用户主动重试新开查询轮次；鉴权和余额异常先修复。模型引用需服务端验证。

## 一致性

询盘/报价创建唯一提交键；相同工作区、资源类型和键的相同内容返回同记录，不同内容 409。更新按 id + workspaceId + version 原子校验；跨工作区读写失败。客户按规范化官网域在工作区内去重。报价服务端十进制计算及快照，历史不随产品改价变化。

具体 DTO 字段类型、提交键传递位置、状态枚举及 Prisma 迁移由团队按 D2 合同冻结，本文不擅自定义原文没有明确规定的字段。
