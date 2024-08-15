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

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

new Promise(async (resolve) => {
  let keys: { [key: string]: any } = {}; // Initialize keys as an object
    try {
        await page.goto("https://watchseriesx.to/tv/the-big-bang-theory-jyr9n", { waitUntil: 'networkidle0' });
        await page.waitForSelector(".movie-btn", { visible: true });

        for (let i = 0; i < 50; i++) {
            await page.bringToFront();
            const btn = await page.$(".movie-btn");
            if (btn) {
                await btn.click();
            }
            await sleep(1000);
        }
    } catch (e) {
        console.log(`[x] ${e}`);
    } finally {
        if (browser) {
            await sleep(2500);
            await browser.close();
        }
        resolve(keys); // Assuming you want to return an empty array
    }
});
  console.log(finalResponse);
  res.json(logger);
};
