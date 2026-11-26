/**
 * 唯一适配层：E 的回归脚本与队友实现之间的全部耦合都收在这个文件里。
 *
 * 约定：页面按本文件的 ROUTES 提供路径，交互元素带 data-testid = TESTID.* 的值。
 * 队友只需按此表补 data-testid（一行 HTML 属性），无需改动任何测试代码。
 * 若队友选了别的路径或命名，只改这里的常量，spec 文件不用动。
 */

export const ROUTES = {
  login: '/login',
  dashboard: '/dashboard',
  catalog: '/catalog',
  market: '/market',
  marketDetail: (id: string) => `/market/${id}`,
  customers: '/customers',
  inquiryNew: '/inquiries/new',
  inquiryDetail: (id: string) => `/inquiries/${id}`,
  quoteNew: '/quotes/new',
  quoteDetail: (id: string) => `/quotes/${id}`,
  quotes: '/quotes',
  health: '/api/healthz',
} as const;

export const TESTID = {
  // 登录
  loginEmail: 'login-email',
  loginPassword: 'login-password',
  loginSubmit: 'login-submit',
  loginError: 'login-error',

  // 会话与工作区
  workspaceName: 'workspace-name',
  logout: 'logout-button',

  // 目录与产品
  productCreate: 'product-create',
  productName: 'product-name',
  productUnitPrice: 'product-unit-price',
  productCurrency: 'product-currency',
  productSave: 'product-save',
  productRow: 'product-row',

  // 询盘
  inquiryCustomer: 'inquiry-customer',
  inquiryBody: 'inquiry-body',
  inquiryAnalyze: 'inquiry-analyze',
  inquiryField: 'inquiry-field',           // 六项字段容器，内层按 field key 带 data-field
  inquiryConfirm: 'inquiry-confirm',
  inquiryReplyTab: 'reply-tab',            // 内层按 lang 带 data-lang = en | de
  replyBody: 'reply-body',
  replyCopy: 'reply-copy',
  replySave: 'reply-save',

  // 报价
  quoteQuantity: 'quote-quantity',
  quoteUnitPrice: 'quote-unit-price',
  quoteCurrency: 'quote-currency',
  quoteIncoterm: 'quote-incoterm',
  quoteTotal: 'quote-total',
  quoteSaveDraft: 'quote-save-draft',
  quoteConfirm: 'quote-confirm',
  quoteStatus: 'quote-status',
  quoteVersion: 'quote-version',
  quoteMissingField: 'quote-missing-field',

  // 通用状态
  formError: 'form-error',
  saveSuccess: 'save-success',
  loading: 'loading-indicator',
  offlineBanner: 'offline-banner',
} as const;

/** 预算与阈值，取自五人版技术设计第 3–5 页。 */
export const RULES = {
  quantityMax: 1_000_000,
  unitPriceMax: 999_999.99,
  pageSize: 20,
  searchSingleSourceTimeoutMs: 8_000,
  searchOverallTimeoutMs: 25_000,
} as const;

/** 演示主线：德国传感器报价用例，D 的验收数字。 */
export const DEMO_QUOTE = {
  quantity: '1000',
  unitPrice: '2.35',
  currency: 'EUR',
  expectedTotal: '2,350.00',
  expectedTotalRaw: '2350.00',
} as const;
