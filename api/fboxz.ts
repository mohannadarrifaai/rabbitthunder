// written by cool-dev-guy
const puppeteer = require('puppeteer-extra');
const chrome = require('@sparticuz/chromium');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Stealth plugin
puppeteer.use(StealthPlugin());

// Launch options
const launchOptions = {
  headless: true,
  ignoreHTTPSErrors: true,
  args: chrome.args,
  defaultViewport: chrome.defaultViewport,
  executablePath: await chrome.executablePath()
};

export default async (req, res) => {
  const { body, method } = req;

  // Handle non-POST methods
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

  // Validate request body
  if (!body) return res.status(400).end('No body provided');
  if (typeof body === 'object' && !body.id) return res.status(400).end('No url provided');
  
  const id = body.id;
  const isProd = process.env.NODE_ENV === 'production';

  // Browser launch based on ENV
  let browser;
  try {
    if (isProd) {
      launchOptions.executablePath = await chrome.executablePath();
    } else {
      launchOptions.executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    }
    
    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    await page.setExtraHTTPHeaders({ 'Referer': 'https://fboxz.to/' });

    const logger = [];
    const finalResponse = { source: '', subtitle: [] };

    page.on('request', async (interceptedRequest) => {
      logger.push(interceptedRequest.url());
      if (interceptedRequest.url().includes('cdn-cgi/challenge-platform')) {
        await Promise.all([
          page.waitForRequest(req => req.url().includes('fboxz'), { timeout: 20000 }),
          page.goto(interceptedRequest.url(), { waitUntil: 'domcontentloaded' }),
        ]);
      }
      if (interceptedRequest.url().includes('vrf')) finalResponse.source = interceptedRequest.url();
      if (interceptedRequest.url().includes('.vtt')) finalResponse.subtitle.push(interceptedRequest.url());
      interceptedRequest.continue();
    });

    try {
      await Promise.all([
        page.waitForRequest(req => req.url().includes('fboxz'), { timeout: 20000 }),
        page.goto(`https://fboxz.to/movie/bad-boys-ride-or-die-18w7v`, { waitUntil: 'domcontentloaded' }),
      ]);
    } catch (error) {
      console.error('Error during navigation:', error);
      return res.status(500).end('Server Error, check the params.');
    }

    await browser.close();
    
    // Response headers
    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate');
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    console.log(finalResponse);
    res.json(finalResponse); // Adjusted to send finalResponse
  } catch (error) {
    console.error('Error launching browser:', error);
    return res.status(500).end('Server Error during browser launch.');
  }
};
