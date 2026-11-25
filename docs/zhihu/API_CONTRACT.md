# 知乎全网搜索 API 接口合同

依据项目收集的官方接口说明整理；尚未独立在线复核，使用前以官方最新文档为准。

## 请求
- GET https://developer.zhihu.com/api/v1/content/global_search
- Authorization: Bearer <your_access_secret>
- X-Request-Timestamp: 当前秒级 Unix 时间戳
- Content-Type: application/json

| Query 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| Query | String | 是 | 查询关键词 |
| Count | Int32 | 否 | 默认 10，最大 20 |
| Filter | String | 否 | URL 编码的高级语法 |
| SearchDB | String | 否 | all（默认）、realtime、static |

Filter 支持 host（字符串，双引号，== / !=）及 publish_time（秒级 Int64，== / != / > / >= / < / <=）。AND、OR 大写，AND 优先级更高，可使用括号。host 不支持 zhihu.com 及其子域名；站内搜索使用 zhihu_search。

示例：`(host=="reichelt.de" OR host=="www.reichelt.de") AND publish_time>=1767225600`。
无筛选时省略 Filter，不猜测未公开的分页、国家或语言参数。

## 响应

顶层 Code、Message、Data。Data 包含 HasMore（Bool）与 Items（数组）。
Item 字段：

| 字段 | 类型/说明 |
|---|---|
| Title | String |
| ContentType | String |
| ContentID | String |
| ContentText | String，可能有 em 高亮 |
| Url | String，来源链接 |
| CommentCount / VoteUpCount | Int32 |
| AuthorName / AuthorAvatar / AuthorBadge / AuthorBadgeText | String |
| EditTime | Int64，最后编辑时间戳 |
| CommentInfoList | 可选数组，元素 Content 为 String |
| AuthorityLevel | String，1 至 4 |

## 真实响应差异

历史实测有 Data.SearchHashId 与 Item.RankingScore 两个未说明字段；ContentType、AuthorName 可能为空，ContentID 可为负数字符串，EditTime 可为 0，URL 不一定含 UTM，ContentText 可能很长。保留扩展字段；不假定 RankingScore 范围或排序含义。AuthorityLevel 不是客户匹配分数。EditTime 不等同于 publish_time；HasMore 暂无已知分页入参。

## 最小调用示例（本地，非自动执行）

```bash
curl -sS -G 'https://developer.zhihu.com/api/v1/content/global_search' \
  --data-urlencode 'Query=智能家居传感器' \
  --data-urlencode 'Count=5' \
  --data-urlencode 'SearchDB=all' \
  -H "Authorization: Bearer ${ZHIHU_ACCESS_SECRET}" \
  -H "X-Request-Timestamp: $(date +%s)" \
  -H 'Content-Type: application/json' \
  --max-time 30 \
  -w '%{stderr}\nHTTP: %{http_code}\nTime: %{time_total}s\n'
```

必须分别判断 HTTP 与 API Code；空结果不同于失败。不得提交凭证或未经授权的原始响应。
