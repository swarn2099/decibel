import { chromium, type Browser, type Page } from 'playwright';

let browser: Browser | null = null;

/**
 * Returns the shared Playwright browser instance.
 * Launches chromium headless if not running or disconnected.
 * PM2 restart clears in-memory state; isConnected() check guards re-launch.
 */
export async function getBrowser(): Promise<Browser> {
  if (!browser || !browser.isConnected()) {
    console.log('[browser] Launching chromium headless...');
    browser = await chromium.launch({ headless: true });
    console.log('[browser] Chromium launched');
  }
  return browser;
}

/**
 * Creates a new browser context, runs fn with a fresh page,
 * and ALWAYS closes the context in a finally block (prevents context leaks).
 */
export async function scrapeWithBrowser<T>(
  fn: (page: Page) => Promise<T>
): Promise<T> {
  const b = await getBrowser();
  const context = await b.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();
  try {
    return await fn(page);
  } finally {
    await context.close(); // ALWAYS runs — prevents context leak
  }
}

/**
 * Graceful shutdown — close the shared browser for SIGINT/SIGTERM.
 */
export async function closeBrowser(): Promise<void> {
  if (browser && browser.isConnected()) {
    console.log('[browser] Closing shared browser...');
    await browser.close();
    browser = null;
    console.log('[browser] Closed');
  }
}
