import { test, expect } from '@playwright/test';
import { ROUTES, TESTID } from '../lib/contract.js';

/**
 * 异常与恢复分支。对应 E 的“失败分支串联”与“网络恢复”验收项。
 * 用 Playwright 的 route 拦截模拟，不依赖真实外部服务，也不消耗额度。
 */

test.describe('异常恢复', () => {
  test('业务接口 503 时保留输入并给出可重试提示', async ({ page }) => {
    await page.route('**/api/**', (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'SERVICE_UNAVAILABLE', message: '外部服务全部失败', requestId: 'e2e-503' }),
      })
    );

    await page.goto(ROUTES.quoteNew);
    await page.getByTestId(TESTID.quoteQuantity).fill('1000');
    await page.getByTestId(TESTID.quoteUnitPrice).fill('2.35');
    await page.getByTestId(TESTID.quoteSaveDraft).click();

    await expect(page.getByTestId(TESTID.formError)).toBeVisible();
    await expect(page.getByTestId(TESTID.quoteQuantity)).toHaveValue('1000');
  });

  test('断网期间提示离线，恢复后可继续', async ({ page, context }) => {
    await page.goto(ROUTES.quoteNew);

    // 离线提示与错误提示可能同时出现，用 first() 避免 strict 模式冲突。
    const anyFailureHint = page
      .getByTestId(TESTID.offlineBanner)
      .or(page.getByTestId(TESTID.formError))
      .first();

    await context.setOffline(true);
    await page.getByTestId(TESTID.quoteQuantity).fill('1000');
    await page.getByTestId(TESTID.quoteSaveDraft).click();
    await expect(anyFailureHint, '断网时应给出可见反馈').toBeVisible();
    await expect(page.getByTestId(TESTID.quoteQuantity), '输入不得丢失').toHaveValue('1000');

    await context.setOffline(false);
    await page.getByTestId(TESTID.quoteUnitPrice).fill('2.35');
    await page.getByTestId(TESTID.quoteSaveDraft).click();
    await expect(page.getByTestId(TESTID.saveSuccess), '恢复后应能保存成功').toBeVisible({ timeout: 15_000 });
  });

  test('未登录访问受保护页面跳回登录并带回跳', async ({ page, context }) => {
    await context.clearCookies();
    const response = await page.goto(ROUTES.quotes, { waitUntil: 'domcontentloaded' });

    const landedOnLogin = new URL(page.url()).pathname === ROUTES.login;
    const unauthorised = response?.status() === 401;
    expect(landedOnLogin || unauthorised, '未登录应跳转登录或返回 401').toBeTruthy();
  });

  test('重复提交同一内容只产生一条记录', async ({ page }) => {
    await page.goto(ROUTES.quoteNew);
    await page.getByTestId(TESTID.quoteQuantity).fill('1000');
    await page.getByTestId(TESTID.quoteUnitPrice).fill('2.35');
    await page.getByTestId(TESTID.quoteCurrency).selectOption('EUR');
    await page.getByTestId(TESTID.quoteIncoterm).selectOption({ index: 0 });

    await page.getByTestId(TESTID.quoteSaveDraft).click();
    await expect(page.getByTestId(TESTID.saveSuccess)).toBeVisible();
    const firstUrl = page.url();

    await page.goto(ROUTES.quoteNew);
    await page.getByTestId(TESTID.quoteQuantity).fill('1000');
    await page.getByTestId(TESTID.quoteUnitPrice).fill('2.35');
    await page.getByTestId(TESTID.quoteCurrency).selectOption('EUR');
    await page.getByTestId(TESTID.quoteIncoterm).selectOption({ index: 0 });
    await page.getByTestId(TESTID.quoteSaveDraft).click();
    await expect(page.getByTestId(TESTID.saveSuccess)).toBeVisible();

    expect(new URL(page.url()).pathname, '相同内容应复用同一报价').toBe(new URL(firstUrl).pathname);
  });
});
