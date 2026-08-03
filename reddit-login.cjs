/**
 * Reddit Login Helper
 * 
 * Opens a browser window for you to log into Reddit.
 * After login, captures session cookies and saves them to .reddit-session.json.
 * The server.js reads from this file to authenticate API requests.
 * 
 * Usage: node reddit-login.cjs
 * 
 * You only need to run this:
 *   - Once initially
 *   - Again when your session expires (you'll see 403 errors in the app)
 */

const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const SESSION_FILE = path.join(__dirname, '.reddit-session.json');

async function main() {
  console.log('Opening browser for Reddit login...');
  console.log('Log into your Reddit account in the browser window that opens.');
  console.log('Once logged in, this script will automatically capture your session.\n');

  const browser = await chromium.launch({ headless: false, channel: 'chrome' });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  await page.goto('https://www.reddit.com/login/', { waitUntil: 'domcontentloaded' });

  // Poll for the reddit_session cookie (set after successful login)
  console.log('Waiting for login...');
  let attempts = 0;
  const maxAttempts = 120; // 2 minutes

  while (attempts < maxAttempts) {
    await page.waitForTimeout(1000);
    const cookies = await ctx.cookies('https://www.reddit.com');
    const sessionCookie = cookies.find(c => c.name === 'reddit_session');

    if (sessionCookie) {
      // Save all reddit cookies
      const redditCookies = cookies.filter(c => c.domain.includes('reddit.com'));
      fs.writeFileSync(SESSION_FILE, JSON.stringify(redditCookies, null, 2));
      console.log(`\n✓ Session captured! Saved ${redditCookies.length} cookies to .reddit-session.json`);
      console.log('You can now close this window and restart the server.');
      await browser.close();
      return;
    }

    attempts++;
    if (attempts % 10 === 0) {
      console.log(`  Still waiting... (${attempts}s)`);
    }
  }

  console.log('\n✗ Timed out waiting for login. Please try again.');
  await browser.close();
  process.exit(1);
}

main().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
