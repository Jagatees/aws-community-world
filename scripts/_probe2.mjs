import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

for (const path of ['community-builders', 'user-groups', 'cloud-clubs']) {
  await page.goto(`https://builder.aws.com/community/${path}`, { waitUntil: 'networkidle', timeout: 60000 });
  try {
    const btn = page.locator('[data-testid="cancel-button"]');
    if (await btn.isVisible({ timeout: 3000 })) await btn.click();
  } catch {}
  await page.waitForTimeout(2000);

  const info = await page.evaluate(() => {
    // Find all divs with class containing _card_
    const cards1 = document.querySelectorAll('[class*="_card_"]');
    // Find all articles
    const cards2 = document.querySelectorAll('article');
    // Find elements with class containing "card"
    const cards3 = document.querySelectorAll('[class*="card"]');
    
    // Sample first matching element
    const first = cards1[0] || cards2[0] || cards3[0];
    return {
      path: window.location.pathname,
      _card_count: cards1.length,
      article_count: cards2.length,
      card_class_count: cards3.length,
      firstCardText: first?.textContent?.trim()?.substring(0, 200) || 'none',
      firstCardClass: first?.className?.substring(0, 100) || 'none',
      // Sample some class names from the page
      sampleClasses: Array.from(document.querySelectorAll('[class]'))
        .map(el => typeof el.className === 'string' ? el.className : '')
        .filter(c => c && (c.includes('card') || c.includes('member') || c.includes('group') || c.includes('club')))
        .slice(0, 10)
    };
  });
  console.log(JSON.stringify(info, null, 2));
}

await browser.close();
