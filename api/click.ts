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
  await page.setRequestInterception(true);
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36; PlayStation');
  await page.setViewport({
    width: 1080,
    height: 1080
  })
  // Set headers, else wont work.
  await page.setExtraHTTPHeaders({ 'Referer': referer});

  const logger = [];
  const finalResponse = { source: []};

  page.on('request', async (interceptedRequest) => {
    logger.push(interceptedRequest.url());
    if (interceptedRequest.url().includes('.m3u8')) finalResponse.source.push(interceptedRequest.url());
    interceptedRequest.continue();
  });

    //await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.goto(url);
    await page.waitForSelector(".movie-btn", { timeout: 50000 });
    try {
      //for (let i = 0; i < 50; i++) {
        await page.bringToFront();
        let btn = await page.$(".movie-btn");
        if (btn) {
          btn.click();
        }
        await sleep(200);
      //}
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
  res.json(logger);
};
