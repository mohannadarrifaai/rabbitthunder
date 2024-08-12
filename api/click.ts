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
  const referer = body.referer;
  const isProd = process.env.NODE_ENV === 'production';
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  // create browser based on ENV
  let browser;
  if (isProd) {
    browser = await puppeteer.launch({
      args: chrome.args,
      defaultViewport: chrome.defaultViewport,
      executablePath: await chrome.executablePath(),
      headless: true,
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
  await page.setUserAgent('Mozilla/5.0 (Windows NT 5.1; rv:5.0) Gecko/20100101 Firefox/5.0');

  // Set headers, else wont work.
  await page.setExtraHTTPHeaders({ 'Referer': referer});

  const logger = [];
  const finalResponse = { source: []};

  page.on('request', async (interceptedRequest) => {
    logger.push(interceptedRequest.url());
    if (interceptedRequest.url().includes('.m3u8')) finalResponse.source.push(interceptedRequest.url());
    interceptedRequest.continue();
  });

    await page.goto(url, { waitUntil: 'networkidle0' });
    await page.waitForSelector("#btn-play", { timeout: 5000 });
    try {
      for (let i = 0; i < 50; i++) {
        //if (closed) {
          //break;
        //}
        await page.bringToFront();
        let btn = await page.$("#btn-play");
        if (btn) {
          btn.click();
        }
        await sleep(200);
      }
    }
    catch (e) {
      //if (!closed)
        return res.status(500).end(`${e}`);
        //console.log(`[x] ${e}`);
    }

  await browser.close();

  // Response headers.
  res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate');
  res.setHeader('Content-Type', 'application/json');
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
  console.log(finalResponse);
  res.json(finalResponse);
};
