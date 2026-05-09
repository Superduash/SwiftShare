import puppeteer from 'puppeteer';
import { spawn } from 'child_process';
import path from 'path';

(async () => {
  console.log('Starting frontend server...');
  const server = spawn('npm', ['run', 'dev'], {
    cwd: 'c:\\Users\\Superduash\\Downloads\\SwiftShare\\Frontend',
    shell: true
  });

  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('Launching browser...');
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));

  console.log('Navigating to localhost:5173...');
  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0', timeout: 10000 });
  } catch (e) {
    console.log('Navigation error:', e.message);
  }

  console.log('Done.');
  await browser.close();
  server.kill();
  process.exit(0);
})();
