#!/usr/bin/env node
/**
 * 本地桩服务：只为验证 E 的回归脚本本身可用，不实现业务。
 *
 * 用途：A 的部署地址就绪前，先用它跑通 quote.spec / recovery.spec，确认脚本无语法与
 * 断言错误。它**不是**被测系统，也不产生任何验收证据；真实验收必须指向 A 的 HTTPS 部署。
 *
 * 用法：node scripts/mock-server.mjs [port]
 *       GBAI_WEB_URL=http://127.0.0.1:<port> npx playwright test web/quote.spec.ts web/recovery.spec.ts
 *
 * 注意：本桩只监听 http，因此 connectivity.spec（强制 HTTPS）不适用于它。
 */

import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

const PORT = Number(process.argv[2] ?? 4319);
const quotes = new Map();

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const shell = (title, body, script = '') => `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><title>${esc(title)}</title></head>
<body>
${body}
<script>
const post = async (url, payload, method = 'POST') => {
  const r = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};
window.addEventListener('offline', () => document.querySelector('[data-testid="offline-banner"]')?.removeAttribute('hidden'));
window.addEventListener('online', () => document.querySelector('[data-testid="offline-banner"]')?.setAttribute('hidden', ''));
${script}
</script>
</body></html>`;

const fieldsForm = (q = {}) => `
<h1>报价</h1>
<div data-testid="form-error" hidden></div>
<div data-testid="save-success" hidden>已保存</div>
<div data-testid="offline-banner" hidden>网络已断开</div>
<div data-testid="quote-missing-field" data-field="unitPrice" hidden>缺少单价</div>
<div>状态 <span data-testid="quote-status">draft</span></div>
<div>版本 <span data-testid="quote-version">1</span></div>
<label>数量 <input data-testid="quote-quantity" value="${esc(q.quantity ?? '')}"></label>
<label>单价 <input data-testid="quote-unit-price" value="${esc(q.unitPrice ?? '')}"></label>
<label>币种 <select data-testid="quote-currency"><option>EUR</option><option>USD</option></select></label>
<label>贸易条件 <select data-testid="quote-incoterm"><option>DAP</option><option>FOB</option></select></label>
<div>总价 <span data-testid="quote-total">—</span></div>
<button data-testid="quote-save-draft">存草稿</button>
<button data-testid="quote-confirm">确认</button>`;

const formScript = (id = null) => `
const q = (n) => document.querySelector('[data-testid="quote-' + n + '"]');
const err = (m) => { const e = document.querySelector('[data-testid="form-error"]'); e.textContent = m; e.hidden = false; };
const clearErr = () => { document.querySelector('[data-testid="form-error"]').hidden = true; };
const money = (v) => v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const read = () => ({ quantity: q('quantity').value.trim(), unitPrice: q('unit-price').value.trim(),
  currency: q('currency').value, incoterm: q('incoterm').value });
const total = () => { const { quantity, unitPrice } = read(); const n = Number(quantity), p = Number(unitPrice);
  if (!Number.isFinite(n) || !Number.isFinite(p) || !quantity || !unitPrice) return '—'; return money(n * p); };
const render = () => { document.querySelector('[data-testid="quote-total"]').textContent = total(); };
['quantity', 'unit-price'].forEach((k) => q(k).addEventListener('input', render));
render();

const validate = (d, strict) => {
  if (d.quantity !== '') { const n = Number(d.quantity);
    if (!Number.isInteger(n) || n <= 0) return '数量必须为正整数';
    if (n > 1000000) return '数量超出上限'; }
  if (d.unitPrice !== '') { const p = Number(d.unitPrice);
    if (!(p > 0)) return '单价必须为正数';
    if (p > 999999.99) return '单价超出上限';
    if (!/^\\d+(\\.\\d{1,2})?$/.test(d.unitPrice)) return '单价最多两位小数'; }
  return null;
};

const missingOf = (d) => {
  const miss = [];
  if (!d.quantity) miss.push('quantity');
  if (!d.unitPrice) miss.push('unitPrice');
  return miss;
};

const showMissing = (miss) => {
  const el = document.querySelector('[data-testid="quote-missing-field"]');
  el.textContent = '缺少：' + miss.join('、');
  el.hidden = false;
};

const submit = async (strict) => {
  clearErr();
  document.querySelector('[data-testid="quote-missing-field"]').hidden = true;
  const d = read();
  const bad = validate(d, strict);
  if (bad) { err(bad); return; }

  // 确认时校验齐全；缺项不报 form-error，而是列出缺失字段（与合同一致）。
  if (strict) { const miss = missingOf(d); if (miss.length) { showMissing(miss); return; } }

  try {
    const r = await post('/api/quotes', { ...d, strict, id: window.__quoteId ?? ${id ? `'${id}'` : 'null'} });
    if (r.status >= 400 || r.body.code) { err(r.body.message || '外部服务全部失败'); return; }
    document.querySelector('[data-testid="save-success"]').hidden = false;
    if (r.body.id) {
      window.__quoteId = r.body.id;
      if (location.pathname === '/quotes/new') history.replaceState({}, '', '/quotes/' + r.body.id);
    }
    if (r.body.status) document.querySelector('[data-testid="quote-status"]').textContent = r.body.status;
    if (r.body.version) document.querySelector('[data-testid="quote-version"]').textContent = r.body.version;
    render();
  } catch (e) { err('网络异常：' + e.message); }
};
q('save-draft').addEventListener('click', () => submit(false));
q('confirm').addEventListener('click', () => submit(true));
`;

const initScript = (quote) => quote
  ? `document.querySelector('[data-testid="quote-status"]').textContent = ${JSON.stringify(quote.status)};
     document.querySelector('[data-testid="quote-version"]').textContent = ${JSON.stringify(String(quote.version))};
     document.querySelector('[data-testid="quote-currency"]').value = ${JSON.stringify(quote.key.split('|')[2] || 'EUR')};
     window.__quoteId = ${JSON.stringify(quote.id)};
     render();`
  : '';

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const send = (status, body, type = 'text/html; charset=utf-8') => {
    res.writeHead(status, { 'content-type': type });
    res.end(body);
  };
  const json = (status, body) => send(status, JSON.stringify(body), 'application/json');

  if (url.pathname === '/api/healthz') {
    return json(200, { status: 'ok', db: 'ok' });
  }

  if (url.pathname === '/api/quotes' && req.method === 'POST') {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const payload = JSON.parse(raw || '{}');
    const key = [payload.quantity, payload.unitPrice, payload.currency, payload.incoterm].join('|');

    // 幂等：同内容复用同一条记录；内容变化则在原记录上递增版本。
    let quote = payload.id ? quotes.get(payload.id) : null;
    if (!quote) {
      quote = [...quotes.values()].find((q) => q.key === key) ?? null;
    }
    if (!quote) {
      quote = { id: randomUUID(), version: 1, total: '—', status: 'draft', key };
    } else if (quote.key !== key) {
      quote.version += 1;
      quote.key = key;
    }

    if (payload.quantity && payload.unitPrice) {
      quote.total = (Number(payload.quantity) * Number(payload.unitPrice))
        .toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (payload.strict) quote.status = 'confirmed';
    quotes.set(quote.id, quote);
    return json(200, { id: quote.id, version: quote.version, status: quote.status, total: quote.total });
  }

  if (url.pathname === '/login') {
    return send(200, shell('登录', '<h1>登录</h1><form><input data-testid="login-email"><input data-testid="login-password"><button data-testid="login-submit">登录</button></form>'));
  }

  if (url.pathname === '/quotes/new') {
    return send(200, shell('新建报价', fieldsForm(), formScript(null)));
  }

  if (url.pathname === '/quotes') {
    // 桩不实现会话，统一按未登录处理：跳登录页，符合“未登录访问受保护页面”的期望。
    res.writeHead(302, { location: '/login' });
    return res.end();
  }

  const detail = url.pathname.match(/^\/quotes\/([0-9a-f-]{36})$/i);
  if (detail) {
    const quote = quotes.get(detail[1]);
    if (!quote) return send(404, shell('未找到', '<h1>404</h1>'));
    const [quantity = '', unitPrice = ''] = quote.key.split('|');
    return send(200, shell('报价详情', fieldsForm({ quantity, unitPrice }),
      formScript(quote.id) + initScript(quote)));
  }

  send(404, shell('未找到', '<h1>404</h1>'));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`桩服务已启动：http://127.0.0.1:${PORT}`);
  console.log('仅在验证回归脚本时使用，不作为验收目标。');
});
