import { defineConfig, devices } from '@playwright/test';

/**
 * 目标地址全部来自环境变量，脚本本身不含任何部署地址：
 *   GBAI_WEB_URL      被测 Web 根地址（A 提供），未设置时用占位地址跑通骨架
 *   GBAI_DEMO_USER    受控 Demo 账号（A 提供）
 *   GBAI_DEMO_PASS    对应口令
 *   GBAI_CHROME_PATH  可选：指定已有 Chrome/Chromium 可执行文件，
 *                     用于清洁环境或 CI 上避免重复下载浏览器二进制
 *
 * 占位地址下，连通性用例会明确失败并提示“部署未就绪”，而不是伪装通过。
 */
export const BASE_URL = process.env.GBAI_WEB_URL ?? 'https://example.invalid';

const executablePath = process.env.GBAI_CHROME_PATH;
const launchOptions = executablePath ? { executablePath } : {};

export default defineConfig({
  testDir: './web',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'results/html', open: 'never' }],
    ['json', { outputFile: 'results/results.json' }],
  ],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // 视频需要 Playwright 自带的 ffmpeg 二进制；清洁环境或离线机器可能缺失。
    // 设 GBAI_VIDEO=off 关闭，避免因录制依赖导致用例整体失败（截图与 trace 仍保留）。
    video: process.env.GBAI_VIDEO === 'off' ? 'off' : 'retain-on-failure',
    ignoreHTTPSErrors: false,
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
  },
  projects: [
    {
      name: 'web',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, launchOptions },
    },
    {
      // Windows 壳内视口：与 MainForm 默认窗口尺寸一致，用于发现只在壳内出现的问题。
      name: 'webview2-viewport',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 820 }, launchOptions },
    },
  ],
});
