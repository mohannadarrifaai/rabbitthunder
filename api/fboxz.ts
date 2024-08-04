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
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36');

  // Set headers, else wont work.
  await page.setExtraHTTPHeaders({ 'Referer': 'https://vidsrc.stream/'});

  const logger = [];
  const finalResponse = { source: [], subtitle: []};

  page.on('request', async (interceptedRequest) => {
    logger.push(interceptedRequest.url());
    if (interceptedRequest.url().includes('.m3u8')) finalResponse.source.push(interceptedRequest.url());
    if (interceptedRequest.url().includes('.vtt') || interceptedRequest.url().includes('.srt')) {
    finalResponse.subtitle.push(interceptedRequest.url());
    interceptedRequest.continue();
  });

  try {
    await page.goto(`https://vidsrc.net/srcrcp/NTNhYTY1YmMwMGQwNGVhODQxNjg0MTJjNmMyZjZiZmI6ZDNCdGFrSnlibHB0Tml0U1EycENLMDVyTlc1SVUxRTRkM012TUZWYUwwTjViVWQzZHpkcFVXMXVUbm94WWs0MllXd3lSVUpIV0ZKNU0yOU1OakpUUVZCRE5IVkthM0I0TTJKWGFUTjBOazh5ZUZGdVJVd3pOMkZIWlRFd1VUUk9SRmxzTDJjNFdFTmhPWEV4YjJOWWFXOWhORkY1ZUhSb1lqRldXRFJqYWpoTFV6ZHBia0ZtVFZkbVJucDVhbWRqV1d4UWMyOVdhMk5LTDJoMllVeFNVVVp2SzJvNVlYUmFNRGgzVjNsWldEbG1aSEIyWkU5Q1YwVlNWRWM1VlhsdlJWcE9Ra0pITDNCT2Vrb3JXVEZPTjI4MUszRjVVMDlNUlZWeFNHNXZkSEZQVVhrMlZESnZOMnBpU0ZGaFluSnNTMWwxSzNsV1pXSnFNQzg0VkRZMWJqZEZjVFpOTkhSNVQyOHJSV0ZCUjB0U1NXMTBPR2huYVVsNk9FdHJUbkpLYUdSekwwbzVPREJDYUVGak9VSjJiVGhJV0hWb1pVTXZlVWhuWTJ0SE0wRndTRTlNVlZWc2IwOXZSSEpEVDFWblVsUlZSekJ4WVRJeFJEY3JaRWxKYUdWck0zaGxVSE5TVUhWVFREazRkMDlTVFZwWE1EbHdSVVk0T1hSSFZTOWFNM0JEVGt3d2JFSk1lR1ZwWWtZeGNHb3dSVVJ6U1M5R1NITjJTRTlKTm1oUEsyTnNRMlpQZERkaGRtWkJablZKZHpoNVUydzVVMGxoZGtodVZtRkhZemxtUW00eE5uVmlabmN3WldGSlUzUXhSRFkwZFM5c1F6ZFRVV04xU1V4QlRqUnFNbWRsVkZOSlEyOXhZbVJRVERkSE5UbDFabXBCUkZwWk1GZE1SelF5UmpkUWFrVk1ORkI2ZHpCeVpISkVUMkpsYVdKbEt6aFBSVTl0VkdkWlNHYzNlRGMwZFZCMWEybE5halp1VlhSS2JteGFOMWMyTDA5d1pEZGlNWE5EWmxoa05YaHlNMWhKVVVoUk1uZzFhbWhtUjNCQ1IyWktkRVF3UzNkRFoxSklSRlphYUVnMmJXMXBla2xrTURZNFFVZEZSamhQVlVWdWVVcEpha0p3SzJZeWRVNDJiRmxWYkZSdFowdEZaM3BEYzJNeWVWSnJiQ3RzVWxGVFJqaDNkakJwUkdRd1ZVNXlNVXBJSzNKcVl6ZFRVbkpQYlZOS0sxRjVjRGhwY21WSGMwcFBXa3RYV1VkQlFuUjBiVGRTWXpkdVVIRkZlVzlWVFhwVFZ6TlBORTFaUkZwaFlqaG9aWFZsZFhkbllVTkxMMHQ2WkVkSGNFUk5hbTFRYmxseVMyOXdPWE0xUlRseE1GRjNlRGt3YTJWWUwzWnlOMUJDZFV0bVRsY3dkakZZYVZKV2JtSkNSRE4yYURsRE1FVjBkbmxxZDBRNU5ETTNPSGx6YWxKd1UwNDFLME0zWlRad1ZFaHVhRlV3Y0ZKVlpTdDZkMVZGVEcxRk1UZzRUbFJIUVU1UWJ6bHVUVUV2WVc0d1drVjVOM0ZZVWxkQ2JrMVlSMGc1SzJOaFZVaHZRWGw2U0hKWVQwUmhkR2xMTkZKd1NtWmFjVVJXUW5CRFl6VlRWV1o1UzBkRWVpdHliRGwwU0RGM1VHbFBhMmgzVERsNmNuUmFhemRoVUdwRU5uTXJWVnB3UWtsNFVGRlRSRk5rTUhOa1RTdDVNWGx0ZHowOQ--`, { waitUntil: 'domcontentloaded'});

  } catch (error) {
    console.error(`Error during page interaction: ${error}`);
    await browser.close();
    return res.status(500).end(`Error during page interaction: ${error} ${id}`);
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
