// written by cool-dev-guy
const puppeteer = require('puppeteer-extra');
const chrome = require('@sparticuz/chromium');

// Stealth plugin issue - There is a good fix but currently this works.
require('puppeteer-extra-plugin-user-data-dir')
require('puppeteer-extra-plugin-user-preferences')
require('puppeteer-extra-plugin-stealth/evasions/chrome.app')
require('puppeteer-extra-plugin-stealth/evasions/chrome.csi')
require('puppeteer-extra-plugin-stealth/evasions/chrome.loadTimes')
require('puppeteer-extra-plugin-stealth/evasions/chrome.runtime')
require('puppeteer-extra-plugin-stealth/evasions/defaultArgs') // pkg warned me this one was missing
require('puppeteer-extra-plugin-stealth/evasions/iframe.contentWindow')
require('puppeteer-extra-plugin-stealth/evasions/media.codecs')
require('puppeteer-extra-plugin-stealth/evasions/navigator.hardwareConcurrency')
require('puppeteer-extra-plugin-stealth/evasions/navigator.languages')
require('puppeteer-extra-plugin-stealth/evasions/navigator.permissions')
require('puppeteer-extra-plugin-stealth/evasions/navigator.plugins')
require('puppeteer-extra-plugin-stealth/evasions/navigator.vendor')
require('puppeteer-extra-plugin-stealth/evasions/navigator.webdriver')
require('puppeteer-extra-plugin-stealth/evasions/sourceurl')
require('puppeteer-extra-plugin-stealth/evasions/user-agent-override')
require('puppeteer-extra-plugin-stealth/evasions/webgl.vendor')
require('puppeteer-extra-plugin-stealth/evasions/window.outerdimensions')

const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

export default async (req: any, res: any) => {
  let {body,method} = req

  // Some header shits
  if (method !== 'POST') {
    res.setHeader('Access-Control-Allow-Credentials', true)
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
    res.setHeader(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    )
    return res.status(200).end()
  }

  // Some checks...
  if (!body) return res.status(400).end(`No body provided`)
  if (typeof body === 'object' && !body.id) return res.status(400).end(`No url provided`)
  
  const id = body.id;
  const isProd = process.env.NODE_ENV === 'production'

  // create browser based on ENV
  let browser;
  if (isProd) {
    browser = await puppeteer.launch({
      args: chrome.args,
      defaultViewport: chrome.defaultViewport,
      executablePath: await chrome.executablePath(),
      headless: false,
      ignoreHTTPSErrors: true
    })
  } else {
    browser = await puppeteer.launch({
      headless: false,
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    })
  }
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  await page.setUserAgent('Mozilla/5.0 (Windows NT 5.1; rv:5.0) Gecko/20100101 Firefox/5.0');
  await page.setJavaScriptEnabled(true);

  // Set headers,else wont work.
  await page.setExtraHTTPHeaders({ 'Referer': 'https://fboxz.to/' , 'cookie':'cf_clearance=akRDHPklzlnUzB6ttahcm.DT1Mluy68mjfbTpEoiUX0-1722722872-1.0.1.1-Stv4dKIrQZgoZo4aZQHS1W4xtOjG1d7bW252aad5p9B.qQ9EB5jClW2g2UH0bncsFlhK6gGtMb8kU6D0h4pihA});
  
  const logger:string[] = [];
  const finalResponse:{source:string,subtitle:string[]} = {source:'',subtitle:[]}
  
  page.on('request', async (interceptedRequest) => {
    logger.push(interceptedRequest.url());
    if (interceptedRequest.url().includes('vrf')) finalResponse.source = interceptedRequest.url();
    if (interceptedRequest.url().includes('.vtt')) finalResponse.subtitle.push(interceptedRequest.url());
    interceptedRequest.continue();
  });
  
  try {
    const [req] = await Promise.all([
      page.waitForRequest(req => req.url().includes('fboxz'), { timeout: 20000 }),
      page.goto(`https://fboxz.to/movie/bad-boys-ride-or-die-18w7v`, { waitUntil: 'domcontentloaded' }),
    ]);
  } catch (error) {
    return res.status(500).end(`Server Error,check the params.`)
  }
  await browser.close();

  // Response headers.
  res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate')
  res.setHeader('Content-Type', 'application/json')
  // CORS
  // res.setHeader('Access-Control-Allow-Headers', '*')
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  )
  console.log(finalResponse);
  res.json(logger);
};
