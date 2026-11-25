# GlobalBridge AI

面向中国中小制造企业的 AI 出海业务助手。比赛 MVP 以深圳智能家居传感器制造商开拓德国市场为演示主线，覆盖市场发现、客户情报、询盘处理、多语言商务回复和报价。

## 项目文档

- [比赛 MVP PRD](docs/product/GlobalBridge-AI-比赛MVP-PRD-2026-11-21.md)
- [最终 PRD V1.0（PDF 文本提取版）](docs/product/PRD-V1.0-extracted.txt)
- [技术方案与分工（PDF 文本提取版）](docs/engineering/TECHNICAL-DESIGN-extracted.txt)
- [知乎 API 接口合同](docs/zhihu/API_CONTRACT.md)
- [知乎 API 历史验证记录](docs/zhihu/HISTORICAL_BASELINE.md)
- [团队搜索能力评估任务（Codex）](prompts/ZHIHU_CAPABILITY_EVALUATION.md)

## 当前状态

- 知乎全网搜索中文和英文各有一次历史真实调用成功。
- 官方 Skill / CLI 是可选的开发验证工具；每个开发或部署环境均需独立检查安装、版本兼容性、认证及额度。
- 德文搜索、客户核验、额度、授权、稳定性、部署环境尚未验收。
- 目前仓库为文档初始化，尚未实现业务系统或 PoC。

## 技术决策待确认

两份原始 PRD 存在不同推荐技术栈：PDF 推荐 React/Vite + FastAPI + Tauri；Markdown PRD 与技术分工推荐 Next.js + PostgreSQL + WebView2。保留原文，不自行决定最终架构。邮件草稿留存等差异也需团队确认。

## 安全

仓库公开。禁止提交真实 API 密钥、Keychain 配置、个人终端日志、未经许可的供应商响应及客户敏感资料。测试使用环境变量及脱敏指标。历史验证不等于生产验收。
