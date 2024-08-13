const puppeteer = require('puppeteer-extra');
const chrome = require('@sparticuz/chromium');

// Stealth plugin issue - There is a good fix but currently this works.
const { executablePath } = require('puppeteer');

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
  const sleep = ms => new Promise(r => setTimeout(r, ms));
    const args = [
    '--no-sandbox',
    '--disable-web-security',
  ];
    const options = {
    args,
    executablePath: executablePath,
    headless: true,
  };
  let browser;
  browser = await puppeteer.launch(options);
  const page = await browser.newPage();
  let keys = {};
  await page.setRequestInterception(true);
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36; PlayStation');
  await page.setViewport({
    width: 1080,
    height: 1080
  })
  // Set headers, else wont work.
  await page.setExtraHTTPHeaders({ 'Referer': referer});

  await page.setRequestInterception(true);
  const logger = [];
  const finalResponse = { source: []};
  page.on('request', async (request) => {
    logger.push(request.url());
    if (request.url().includes('.m3u8')) finalResponse.source.push(request.url());
    // console.log(request.url());
      request.continue();
  });
  // return new Promise(async (resolve) => {
return new Promise(async (resolve) => {
    await page.goto(url, { waitUntil: 'networkidle0' });
    await page.waitForSelector("#btn-play", { timeout: 50000 });
    try {
      for (let i = 0; i < 5; i++) {
        await page.bringToFront();
        let btn = await page.$("#btn-play");
        if (btn) {
          btn.click();
      }
        await sleep(10000);
    }
    }
    catch (e) {
       return res.status(500).end(`${e}`);
    }
    resolve(keys);
  });
    if (browser) {
      await sleep(2500);
      await browser.close();
    }

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
  res.json(logger);
};
