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

  // CORS headers
  if (method !== 'POST') {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );
    return res.status(200).end();
  }

  // Input validation
  if (!body || typeof body !== 'object' || !body.url) {
    return res.status(400).end('No url provided');
  }

  const url = body.url;
  const referer = body.referer || '';
  const isProd = process.env.NODE_ENV === 'production';

  let browser: Browser | null = null;

  try {
    // Launch the browser based on the environment
    if (isProd) {
      browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: true,
        ignoreHTTPSErrors: true,
      });
    } else {
      browser = await puppeteer.launch({
        headless: false,
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      });
    }

    const page: Page = await browser.newPage();
    await page.setRequestInterception(true);
    await page.setUserAgent('Mozilla/5.0 (Windows NT 5.1; rv:5.0) Gecko/20100101 Firefox/5.0');
    await page.setExtraHTTPHeaders({ Referer: referer });

    const logger: string[] = [];
    const finalResponse: { source: string[] } = { source: [] };

    page.on('request', (interceptedRequest) => {
      logger.push(interceptedRequest.url());
      if (interceptedRequest.url().includes('.m3u8')) {
        finalResponse.source.push(interceptedRequest.url());
      }
      interceptedRequest.continue();
    });

    // Navigate to the provided URL
    await page.goto(url, { waitUntil: 'networkidle2' });

    // Click the specified element
    await page.click('#pl_but');

    // Wait for a while to capture requests
    await page.waitForTimeout(5000);

    await browser.close();

    // Set response headers and return the captured URLs
    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate');
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    console.log(finalResponse);
    res.json(logger);
  } catch (error) {
    if (browser) {
      await browser.close();
    }
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
