const puppeteer = require('puppeteer-extra');
const chrome = require('@sparticuz/chromium');

// Stealth plugin setup
require('puppeteer-extra-plugin-user-data-dir');
require('puppeteer-extra-plugin-user-preferences');
require('puppeteer-extra-plugin-stealth/evasions/chrome.app');
require('puppeteer-extra-plugin-stealth/evasions/chrome.csi');
require('puppeteer-extra-plugin-stealth/evasions/chrome.loadTimes');
require('puppeteer-extra-plugin-stealth/evasions/chrome.runtime');
require('puppeteer-extra-plugin-stealth/evasions/defaultArgs');
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

module.exports = async (req, res) => {
  let { body, method } = req;

  // Handle CORS and method validation
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
  if (!body) return res.status(400).end('No body provided');
  if (typeof body === 'object' && !body.url) return res.status(400).end('No url provided');

  const url = body.url;
  const referer = body.referer || '';
  const isProd = process.env.NODE_ENV === 'production';

  let browser = null;

  try {
    // Launch browser
    if (isProd) {
      browser = await puppeteer.launch({
        args: chrome.args,
        defaultViewport: chrome.defaultViewport,
        executablePath: await chrome.executablePath(),
        headless: chrome.headless,
        ignoreHTTPSErrors: true,
      });
    } else {
      browser = await puppeteer.launch({
        headless: false,
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      });
    }

    const page = await browser.newPage();
    await page.setRequestInterception(true);
    await page.setUserAgent('Mozilla/5.0 (Windows NT 5.1; rv:5.0) Gecko/20100101 Firefox/5.0');
    await page.setExtraHTTPHeaders({ Referer: referer });

    const logger = [];
    const finalResponse = { source: [] };

    page.on('request', (interceptedRequest) => {
      logger.push(interceptedRequest.url());
      if (interceptedRequest.url().includes('.m3u8')) {
        finalResponse.source.push(interceptedRequest.url());
      }
      interceptedRequest.continue();
    });

    page.on('error', (error) => {
      console.error('Page error:', error);
    });

    // Load page and wait for the selector
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    console.log('Page loaded successfully');

    // Ensure the element is visible before clicking
    try {
      await page.waitForSelector('#pl_but', { timeout: 60000 });
      console.log('Element found');
    } catch (e) {
      console.error('Element not found:', e);
      await browser.close();
      return res.status(500).json({ error: 'Element not found' });
    }

    // Click the button
    try {
      await page.click('#pl_but');
      console.log('Button clicked');
    } catch (e) {
      console.error('Error clicking button:', e);
      await browser.close();
      return res.status(500).json({ error: 'Error clicking button' });
    }

    // Wait for a bit to capture network requests
    await page.waitForTimeout(10000); // 10 seconds

    await browser.close();

    // Respond with the captured URLs
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
