import { test, expect } from '@playwright/test';

const BASE_URL = process.env.GBAI_WEB_URL ?? 'https://example.invalid';

/**
 * 连通性与部署前提检查。不依赖任何业务页面实现，A 一给出部署地址就能跑。
 * 这一步对应 E 的 D2「桌面壳联通」前提：先把地址本身验干净，再谈业务回归。
 */

test.describe('部署前提', () => {
  test('根地址使用 HTTPS 且可达', async ({ request }) => {
    expect(new URL(BASE_URL).protocol, 'E 只验收 HTTPS 部署').toBe('https:');

    const response = await request.get(BASE_URL, { maxRedirects: 0, failOnStatusCode: false });
    expect(
      [200, 301, 302, 307, 308],
      `根地址返回 ${response.status()}，部署可能未就绪（当前 BASE_URL=${BASE_URL}）`
    ).toContain(response.status());
  });

  test('/login 可访问且带安全响应头', async ({ page }) => {
    const response = await page.goto('/login', { waitUntil: 'domcontentloaded' });
    expect(response, '未拿到 /login 响应，部署未就绪').not.toBeNull();
    expect(response!.status(), '/login 应返回 200').toBe(200);

    const headers = response!.headers();
    const hasHsts = headers['strict-transport-security'] !== undefined;
    test.info().annotations.push({
      type: hasHsts ? 'ok' : 'warning',
      description: hasHsts ? '存在 HSTS' : '缺少 strict-transport-security，建议 A 补齐',
    });
  });

  test('未知路径返回统一错误页而非 500 栈', async ({ request }) => {
    const response = await request.get('/__e2e_probe__/not-found', { failOnStatusCode: false });
    expect(response.status(), '未知路径应为 404，不应 5xx').toBe(404);
    const body = await response.text();
    expect(body, '错误页不得泄露堆栈').not.toMatch(/at\s+\w+\s+\(.*:\d+:\d+\)/);
  });
});
