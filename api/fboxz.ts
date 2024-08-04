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
  if (typeof body === 'object' && !body.id) return res.status(400).end(`No url provided`);

  const id = body.id;
  const isProd = process.env.NODE_ENV === 'production';

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
  await page.setJavaScriptEnabled(true);

  // Set headers, else wont work.
  await page.setExtraHTTPHeaders({ 'Referer': 'https://vidsrc.net/'});

  const logger = [];
  const finalResponse = { source: '', subtitle: [] };

  page.on('request', async (interceptedRequest) => {
    logger.push(interceptedRequest.url());
    if (interceptedRequest.url().includes('.m3u8')) finalResponse.source = interceptedRequest.url();
    if (interceptedRequest.url().includes('.vtt')) finalResponse.subtitle.push(interceptedRequest.url());
    interceptedRequest.continue();
  });

  try {
    console.log('Navigating to the page...');
    await page.goto('https://vidsrc.stream/prorcp/ZTA1NTJiNDc5YWJmNjNmYThiZDUyNjgzM2UyNmY5YjE6YlV3MVVGQkVkR012TW0xdVluUlZWRGhUZVhsSFdGbHJiazlrTTBweGJqbDRORFJCTUZad05DODFlRTByZFVoUFFWUmtWVXhoY1dGT1ZrdFlNRXg1YUZWcmFFNVVVVmxHUVRNMk9EazBhV3hzZVVScmRUVTRUMWwzUjNOWlVESnNhMmxqVFZnNGVXaEhZblF4TTFac2RtOUJla3hXYVRacFVqVTJiakEwT1UxV2VGZDFValUxWmtzM1VUaE5halJxWVV4bmFsUjNPVTlPUzA1MGVDc3JNVlJaY2t4dVJEUk9SelZSTmxodVkzWjZWMHg2YTI4emNtVlFiU3RyY2pKT1NGbEZZVXhZU21wblFsbHVUR0pGYTJwdU5qRkNlbkpxVTJKdmVEbGFORU0zZDB3d1QxbHJhVGRhZW5WVFNqRlNSVWRDTnpOeGJGRm9WREI1ZW5kUE9Fa3plRVJMVmtaRFJXbGtWREpzTlhKMk5tdERUVnBFV2pnM0swUjFhbGhsZEdOM09HZ3ljbEJKTUUxUWQxZEdia0ptWjI1SGNFMUlUek14VFRRelNucHdiVVJyTUZCeVpWa3lMelYxZWxKMGRtWXpZa2hRVWs1bFltNHJTSGg0YlVoTWIyaDNUak0wVUdOd1VVZExhVGxDVFVGVmVtUldiazAyZFd4d05GcExVR00wTDBsalZrNHlkSGhTZDBWYU5FMUlWRFV4TlZGWFdYcEhaRU5FZDJwNkwzQjRSV0ZCUlVoVWJUaE9LMk5VWjBSdlZtcHliMk5UYUVrNE1ESmxOR00yZFRSb2VtTk5PSEpQZVhwMFRrVnhhMGREYzFrcmNrdDRSa0UxV21GNU1VdHZPRWRxWXpjMlNtTjNXV0ZxVGxoTmIxa3dUbWxLYzBwRE0wNXNPV3hqZGtwWFJqbEpXa1ZOUW5CWlRIRkNTVXB4YW1SVE1TOUtXVFppYjIxMlpFeHNWVVpwWjBwYWNrVnBRV3RCVUZKSlZuTXlMeTlIVDJKREsyRm1WVkJUTWs1ekwyOUZVSEJsY0hSSGVsRnJNa3hGTm05dVF6bEdNbmg1Wmt4NE4yRlZibXdyTm1Zd05VTnFWMU5aWm1SRFJtTkVXSGhXZDFNMldsUjNNakpJTVhodFUwUXJjRUZxWlVwUlp5OVNOSGhZTVdRemRVODNObnBWTW5jMFRtVjNUQzlJYVU4d1VHSlFWV2RuTUhjMGIyMU9VM1JUUVdoQ2JIQlZOVEp5WmxOWFVteDFabFZsWkU5elFrbFRTVEJIV1ROeFpISkZURVZITDA5dFVYTlJibFJrVEV0UmVsRklXVnBwZWs1b1VsZFFSMWRNUlU4clFpOURUbU5xUVRoVkx6aE5XRzByUVV4V05FWm5jVk5DZEc5eFZHaHZPVzE1UjB4SWNIWktUa1Z1TDFKeU1ERkNjRTFxY0VSS05GaDNkV0pwTTA5SlpYWndVVTFxYlVkdlRWbFBkMU5UT0ZGbGRsbGxNRFZ3VFRCaE5tVkpWMngxUjNJNVEwZEJUM1ZvWWpWaFpERnJhRFY1VnpOd1J6TlRSR2MxZUZWaFNXZDBibUpGTmxnMVJpOXZaRGQxVlVOU1NVMVFlWE0xVlRkSlVEbFdORVkzV1RKMVdGUlRRMGROWVhsNU5VaENjbU5NVlVORlFXRXdSVTE1ZW5GNlYwRXhkSEpsTXpONVJ6RXlXV1ZDTUZWUk16TklTQ3Q0T0M5RGMySlNRV1psZHowOQ--', { waitUntil: 'domcontentloaded', timeout: 5000 });

  } catch (error) {
    console.error(`Error during page interaction: ${error}`);
    await browser.close();
    return res.status(500).end(`Server Error, check the params.`);
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
