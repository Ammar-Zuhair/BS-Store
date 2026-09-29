export default async function (page, context) {
  const consoleLogs = [];
  page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => consoleLogs.push(`[PAGE ERROR] ${err.message}`));

  console.log('Navigating to admin app...');
  await page.goto('http://localhost:8081', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  console.log('Current URL:', page.url());
  // Login if needed
  const phoneInput = page.locator('input[type="tel"], input[placeholder*="هاتف"], input').first();
  if (await phoneInput.isVisible()) {
    console.log('Logging in...');
    await phoneInput.fill('777000000');
    const pwdInput = page.locator('input[type="password"]').first();
    if (await pwdInput.isVisible()) {
      await pwdInput.fill('AdminPassword123!');
    }
    const loginBtn = page.locator('button, div[role="button"]').filter({ hasText: /دخول|تسجيل/ }).first();
    if (await loginBtn.isVisible()) {
      await loginBtn.click();
      await page.waitForTimeout(4000);
    }
  }

  // Look for stores or categories tab
  console.log('Looking for stores / categories...');
  const storeTab = page.locator('div[role="button"], button, a').filter({ hasText: /متاجر|المتاجر|الفئات/ }).first();
  if (await storeTab.isVisible()) {
    await storeTab.click();
    await page.waitForTimeout(2000);
  }

  // Look for add store or edit store or map button
  console.log('Looking for store map button...');
  const mapBtn = page.locator('div[role="button"], button').filter({ hasText: /خريطة|موقع|تحديد/ }).first();
  if (await mapBtn.isVisible()) {
    console.log('Clicking map button:', await mapBtn.textContent());
    await mapBtn.click();
    await page.waitForTimeout(3000);
  }

  // Check if iframe exists
  const iframe = page.locator('#admin-leaflet-iframe');
  const iframeCount = await iframe.count();
  console.log('Iframe count on page:', iframeCount);
  if (iframeCount > 0) {
    const iframeBox = await iframe.boundingBox();
    console.log('Iframe bounding box:', iframeBox);
  }

  console.log('Console logs count:', consoleLogs.length);
  consoleLogs.slice(-20).forEach(log => console.log('LOG:', log));

  await page.screenshot({ path: '/workspace/.browser/map_test.png', fullPage: true });
  console.log('Screenshot saved to /workspace/.browser/map_test.png');
}
