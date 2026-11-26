#!/usr/bin/env node
/**
 * 桌面壳冒烟：启动已发布的 GlobalBridgeAI.exe，确认进程起来、主窗口标题正确、
 * 并在给定时间内不异常退出。用于 D1–D2 试装与 D10–D14 双端回归的自动化前置。
 *
 * 用法：node scripts/webview2-smoke.mjs [exe路径] [--url=...] [--wait=15]
 * 依赖：Windows + PowerShell（读窗口标题），不需要 Playwright。
 */

import { spawn, execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const argv = process.argv.slice(2);
const exeArg = argv.find((a) => !a.startsWith('--'));
const urlArg = argv.find((a) => a.startsWith('--url='))?.slice(6);
const waitSec = Number(argv.find((a) => a.startsWith('--wait='))?.slice(7) ?? 15);

const exe = resolve(
  exeArg ?? 'desktop/artifacts/publish/GlobalBridgeAI.exe'
);

if (!existsSync(exe)) {
  console.error(`未找到可执行文件：${exe}\n先运行 desktop/scripts/build-desktop.ps1 生成产物。`);
  process.exit(2);
}

const args = [];
if (urlArg) args.push(`--url=${urlArg}`);

console.log(`启动 ${exe}${args.length ? ` ${args.join(' ')}` : ''}`);
const child = spawn(exe, args, { detached: false, stdio: 'ignore' });

let exitedEarly = null;
child.on('exit', (code) => {
  exitedEarly = code;
});

function windowTitleFor(pid) {
  const script = `
    $p = Get-Process -Id ${pid} -ErrorAction SilentlyContinue
    if ($p) { $p.MainWindowTitle } else { '' }
  `;
  try {
    return execFileSync('powershell', ['-NoProfile', '-Command', script], { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

let title = '';
for (let i = 0; i < waitSec; i++) {
  await new Promise((r) => setTimeout(r, 1000));
  if (exitedEarly !== null) break;
  title = windowTitleFor(child.pid);
  if (title) break;
}

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

check('进程存活', exitedEarly === null, exitedEarly === null ? '' : `提前退出，code=${exitedEarly}`);
check('主窗口出现', Boolean(title), title || `${waitSec}s 内未取得窗口标题`);
if (title) {
  check('窗口标题', /GlobalBridge/i.test(title), title);
  check('非错误页标题', !/无法打开|运行时/.test(title), title);
}

if (exitedEarly === null) {
  child.kill();
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length} 项，失败 ${failed} 项。`);
process.exit(failed === 0 ? 0 : 1);
