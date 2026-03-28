import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto('https://builder.aws.com/community/heroes', { waitUntil: 'networkidle', timeout: 60000 });

// Dismiss cookie banner if present
try {
  const btn = page.locator('[data-testid="cancel-button"]');
  if (await btn.isVisible({ timeout: 3000 })) await btn.click();
} catch {}

await page.waitForTimeout(2000);

const info = await page.evaluate(() => {
  const card = document.querySelector('[class*="_card_"]');
  if (!card) return { error: 'no card found' };
  return {
    html: card.innerHTML.substring(0, 2000),
    text: card.textContent.trim(),
  };
});

console.log(JSON.stringify(info, null, 2));

// Also count total cards and check for load-more
const counts = await page.evaluate(() => {
  const cards = document.querySelectorAll('[class*="_card_"]');
  const loadMore = document.querySelector('button');
  const buttons = Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()).filter(t => t.length < 30);
  return { cardCount: cards.length, buttons };
});
console.log('Counts:', JSON.stringify(counts, null, 2));

await browser.close();
