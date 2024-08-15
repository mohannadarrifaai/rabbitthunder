const puppeteer = require('puppeteer-extra');
const chrome = require('@sparticuz/chromium');

// Stealth plugin issue - There is a good fix but currently this works.
require('puppeteer-extra-plugin-user-data-dir');
require('puppeteer-extra-plugin-user-preferences');
require('puppeteer-extra-plugin-stealth/evasions/chrome.app');
require('puppeteer-extra-plugin-stealth/evasions/chrome.csi');
require('puppeteer-extra-plugin-stealth/evasions/chrome.loadTimes');
require('puppeteer-extra-plugin-stealth/evasions/chrome.runtime');
require('puppeteer-extra-plugin-stealth/evasions/defaultArgs'); // pkg warned me this one was missing
require('puppeteer-extra-plugin-stealth/evasions/iframe.contentWindow');
require('puppeteer-extra-plugin-stealth/evasions/media.codecs');
require('puppeteer-extra-plugin-stealth/evasions/navigator.hardwareConcurrency');
require('puppeteer-extra-plugin-stealth/evasions/navigator.languages');
require('puppeteer-extra-plugin-stealth/evasions/navigator.permissions');
require('puppeteer-extra-plugin-stealth/evasions/navigator.plugins');
require('puppeteer-extra-plugin-stealth/evasions/navigator.vendor');
require('puppeteer-extra-plugin-stealth/evasions/navigator.webdriver');
require('puppeteer-extra-plugin-stealth/evasions/sourceurl');
require('puppeteer-extra-plugin-stealth/evasions/user-agent-override');
require('puppeteer-extra-plugin-stealth/evasions/webgl.vendor');
require('puppeteer-extra-plugin-stealth/evasions/window.outerdimensions');

const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

export default async (req, res) => {
  let { body, method } = req;

  // Some header shits
  if (method !== 'POST') {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );
    return res.status(200).end();
  }

  // Some checks...
  if (!body) return res.status(400).end(`No body provided`);
  if (typeof body === 'object' && !body.url) return res.status(400).end(`No url provided`);

  const url = body.url;
  const referer = body.referer || '';
  const isProd = process.env.NODE_ENV === 'production';

  // create browser based on ENV
  let browser;
  if (isProd) {
    browser = await puppeteer.launch({
      args: chrome.args,
      defaultViewport: chrome.defaultViewport,
      executablePath: await chrome.executablePath(),
      headless: false,
      ignoreHTTPSErrors: true
    });
  } else {
    browser = await puppeteer.launch({
      headless: false,
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    });
  }
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  await page.setUserAgent('Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36');

  // Set headers, else wont work.
  await page.setExtraHTTPHeaders({ 'Referer': referer});

  const logger = [];
  const finalResponse = { source: []};



page.on('request', async (request) => {
    logger.push(request.url());
    if (request.url().includes('.m3u8')) finalResponse.source.push(request.url());
    console.log(request.url());
      request.continue();
  });

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
} 
  
function yourFunction(page: Page, browser: Browser): Promise<any> {
  return new Promise(async (resolve) => {
    try {
      await page.goto("https://vidsrc.xyz/embed/tv?imdb=tt1190634&season=1&episode=1", { waitUntil: 'networkidle0' });
      await page.waitForSelector("#pl_but", { visible: true });

      for (let i = 0; i < 50; i++) {
        await page.bringToFront();
        const btn = await page.$("#pl_but"); // TypeScript infers btn as ElementHandle<Element> | null
        if (btn) {
          await btn.click(); // Await click to ensure it's executed properly
        }
        await sleep(1000); // Assuming sleep is correctly typed
      }
    } catch (e) {
      console.log(`[x] ${(e as Error).message}`); // Cast e to Error to access the message property
    }

    if (browser) {
      await sleep(config.MAX_TIMEOUT); // config should be properly typed
      await browser.close();
    }
    resolve(keys); // keys should be properly typed or use `resolve<any>(keys);`
  });
}

try {
    // Call your function and wait for it to resolve
    const result = await yourFunction(page, browser);

    // Handle the result if necessary
    console.log('Function result:', result);
  } catch (error) {
    console.error('An error occurred:', error);
  } finally {
    // Ensure the browser is closed if it wasn't closed in yourFunction
    if (browser && browser.isConnected()) {
      await browser.close();
    }
  }
}
  console.log(finalResponse);
  res.json(logger);
};
