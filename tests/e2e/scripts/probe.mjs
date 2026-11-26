#!/usr/bin/env node
/**
 * 部署探针：D2 前先确认 A 的地址能连、TLS 正常、/api/healthz 返回结构符合合同。
 * 用法：node scripts/probe.mjs            （读 GBAI_WEB_URL）
 *       node scripts/probe.mjs https://... 
 * 不依赖 Playwright，队友环境没装浏览器也能跑。
 */

const target = process.argv[2] ?? process.env.GBAI_WEB_URL;
if (!target) {
  console.error('缺少目标地址：设置 GBAI_WEB_URL 或作为第一个参数传入。');
  process.exit(2);
}

let base;
try {
  base = new URL(target);
} catch {
  console.error(`地址不合法：${target}`);
  process.exit(2);
}

const rows = [];
const record = (name, status, detail) => {
  rows.push({ name, status, detail });
  const mark = status === 'ok' ? 'PASS' : status === 'warn' ? 'WARN' : 'FAIL';
  console.log(`${mark}  ${name}${detail ? ` — ${detail}` : ''}`);
};

function classify(fn) {
  return fn().then(
    (v) => v,
    (e) => {
      record('网络请求', 'fail', e.name === 'TypeError' ? '无法连接（DNS/TLS/端口）' : e.message);
      return null;
    }
  );
}

if (base.protocol !== 'https:') {
  record('协议', 'fail', `必须是 HTTPS，当前 ${base.protocol}`);
} else {
  record('协议', 'ok', 'HTTPS');
}

const started = Date.now();
const res = await classify(() =>
  fetch(new URL('/api/healthz', base), { redirect: 'manual', signal: AbortSignal.timeout(15_000) })
);
const elapsed = Date.now() - started;

if (res) {
  record('健康检查状态码', res.ok ? 'ok' : 'fail', `${res.status} / ${elapsed}ms`);
  if (res.status === 200) {
    const text = await res.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      record('健康检查响应体', 'fail', '不是合法 JSON');
    }
    if (body) {
      const leaked = /password|secret|token|postgres:\/\/|DATABASE_URL/i.test(text);
      record('健康检查无敏感信息', leaked ? 'fail' : 'ok', leaked ? '响应疑似泄露连接串或凭据' : '未发现');
      record('应用状态字段', body.status ? 'ok' : 'warn', body.status ?? '缺少 status 字段');
      record('数据库状态字段', body.db || body.database ? 'ok' : 'warn', body.db ?? body.database ?? '缺少 db 字段');
    }
  }
  const hsts = res.headers.get('strict-transport-security');
  record('HSTS', hsts ? 'ok' : 'warn', hsts ?? '缺失，建议 A 补齐');
  const ctype = res.headers.get('content-type');
  record('内容类型', ctype?.includes('json') ? 'ok' : 'warn', ctype ?? '未声明');
}

const failed = rows.filter((r) => r.status === 'fail').length;
console.log(`\n${rows.length} 项检查，失败 ${failed} 项。`);
process.exit(failed === 0 ? 0 : 1);
