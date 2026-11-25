# 知乎搜索历史验证基线

日期：2026-11-25。以下为用户提供的本地 Mac 终端真实执行记录及安装反馈的脱敏汇总，不是本仓库或 Codex 的新执行结果。

| 测试 | Query | HTTP | API Code | 耗时(s) | 返回条数 | HasMore |
|---|---|---:|---:|---:|---:|---|
| T01 | 智能家居传感器 | 200 | 0 | 0.849411 | 5 | false |
| T02 | German smart home sensor distributors | 200 | 0 | 0.957741 | 5 | false |

两次均为 Count=5、SearchDB=all。T01 证明中文、站外网页检索基本可用。T02 证明英文海外网页可检索；五条结果中直接命中德国目标经销商官网为 0。存在间接渠道线索，尚未独立核验。海外市场研究初步有价值，客户发现仍未达标。原始响应、个人终端信息及供应商正文不入库。

## 安装反馈（用户报告）

- Skill：zhihu 0.7.5，用户目录 ~/.box-agent-kanshan/skills/zhihu。
- CLI：zhihu-cli 0.6.3，~/.box-agent-kanshan/cli/zhihu/current/zhihu-cli。
- 用户报告安装校验成功，installed=true、compatible=true、update_available=false。
- auth status --verify 报告 verification=valid；凭证来源环境变量。
- me contents --type all --limit 1 曾成功返回一条内容；无需重复读取个人数据。
- 当前 Codex 环境必须重新确认 CLI 和认证，不能把历史结果计入新测试。

## 未验收
德文搜索、Filter、SearchDB、客户官网核实、额度/限流/费用、数据使用权限、正式部署环境、20 次稳定性。以上均不得假报通过。历史两次请求不足以证明 SLA。
