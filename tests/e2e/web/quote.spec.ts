import { test, expect } from '@playwright/test';
import { ROUTES, TESTID, DEMO_QUOTE, RULES } from '../lib/contract.js';

/**
 * 报价回归。对应 D 的验收条件与 E 的双端回查：
 * 1000 × 2.35 EUR = 2,350.00 EUR；负数/超精度拦截；存草稿后重登可回查。
 *
 * 这几条不依赖 A 的登录实现细节，只依赖 TESTID 契约。
 */

test.describe('报价', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ROUTES.quoteNew);
  });

  test('金额预览按服务端十进制计算', async ({ page }) => {
    await page.getByTestId(TESTID.quoteQuantity).fill(DEMO_QUOTE.quantity);
    await page.getByTestId(TESTID.quoteUnitPrice).fill(DEMO_QUOTE.unitPrice);
    await page.getByTestId(TESTID.quoteCurrency).selectOption(DEMO_QUOTE.currency);
    await page.getByTestId(TESTID.quoteIncoterm).selectOption({ index: 0 });

    const total = page.getByTestId(TESTID.quoteTotal);
    await expect(total).toContainText(/2[,.]?350[.,]00/);
  });

  test('数量为负触发校验而非提交', async ({ page }) => {
    await page.getByTestId(TESTID.quoteQuantity).fill('-5');
    await page.getByTestId(TESTID.quoteUnitPrice).fill(DEMO_QUOTE.unitPrice);
    await page.getByTestId(TESTID.quoteSaveDraft).click();

    await expect(page.getByTestId(TESTID.formError)).toBeVisible();
    await expect(page).not.toHaveURL(new RegExp(`${ROUTES.quoteDetail('.*').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  });

  test('单价超过两位小数被拦截', async ({ page }) => {
    await page.getByTestId(TESTID.quoteQuantity).fill('10');
    await page.getByTestId(TESTID.quoteUnitPrice).fill('2.345');
    await page.getByTestId(TESTID.quoteSaveDraft).click();

    await expect(page.getByTestId(TESTID.formError)).toBeVisible();
  });

  test('数量上限被拒绝', async ({ page }) => {
    await page.getByTestId(TESTID.quoteQuantity).fill(String(RULES.quantityMax + 1));
    await page.getByTestId(TESTID.quoteUnitPrice).fill(DEMO_QUOTE.unitPrice);
    await page.getByTestId(TESTID.quoteSaveDraft).click();

    await expect(page.getByTestId(TESTID.formError)).toBeVisible();
  });

  test('缺项可存草稿，确认时被拦', async ({ page }) => {
    await page.getByTestId(TESTID.quoteQuantity).fill(DEMO_QUOTE.quantity);
    await page.getByTestId(TESTID.quoteSaveDraft).click();
    await expect(page.getByTestId(TESTID.saveSuccess)).toBeVisible();

    await page.getByTestId(TESTID.quoteConfirm).click();
    await expect(page.getByTestId(TESTID.quoteMissingField).first()).toBeVisible();
  });

  test('确认后状态可回查', async ({ page }) => {
    await page.getByTestId(TESTID.quoteQuantity).fill(DEMO_QUOTE.quantity);
    await page.getByTestId(TESTID.quoteUnitPrice).fill(DEMO_QUOTE.unitPrice);
    await page.getByTestId(TESTID.quoteCurrency).selectOption(DEMO_QUOTE.currency);
    await page.getByTestId(TESTID.quoteIncoterm).selectOption({ index: 0 });
    await page.getByTestId(TESTID.quoteSaveDraft).click();
    await page.getByTestId(TESTID.quoteConfirm).click();

    await expect(page.getByTestId(TESTID.quoteStatus)).toHaveText(/confirmed|已确认/i);
    const url = page.url();
    expect(url).toMatch(/\/quotes\/[0-9a-f-]{8,}/i);

    await page.reload();
    await expect(page.getByTestId(TESTID.quoteTotal)).toContainText(/2[,.]?350[.,]00/);
  });
});
