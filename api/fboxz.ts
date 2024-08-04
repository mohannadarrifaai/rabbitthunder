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
  await page.setExtraHTTPHeaders({ 'Referer': 'https://vidsrc.me/'});
  
  const logger:string[] = [];
  const finalResponse:{source:string,subtitle:string[]} = {source:'',subtitle:[]}
  
  page.on('request', async (interceptedRequest) => {
    logger.push(interceptedRequest.url());
    if (interceptedRequest.url().includes('.m3u8')) finalResponse.source = interceptedRequest.url();
    if (interceptedRequest.url().includes('.vtt')) finalResponse.subtitle.push(interceptedRequest.url());
    interceptedRequest.continue();
  });
  
  try {
    const [req] = await Promise.all([
      page.waitForRequest(req => req.url().includes('vidsrc'), { timeout: 20000 }),
      page.goto(`https://vidsrc.stream/rcp/OTYyOWYyOTc0YzcwNWM4MzAzODVkNGExYjEwOGM2ZWE6SzNKTE5EVnpWMmh4TkRFeVJFaEhkRE53ZHpsRU1VZHpaM2QwV1RoUmVUSklkM00xY0dkSlkxQkVaalZQVGtSVWQxcGhlVVZQYkVkV1MzQnFUVGRqZVRaWVZtVk9iMDlKVjJwelkwdGlNWGRtYjFGU2RqQnpUeTlqZW5NM09YRXZUbEJSU0VWdVkzSnlUakZQUWpKUlUwdE9kRnAxUnpkemNucE9XVGRoWml0dVZuQjRPVVpMS3pkSEwxaG1NbFJrU0RGck16SmlORlpDVmk4NUsxRm5ZVk56YkU1dU5sUkphM1pNV2xoYWJXVkdPWEZMYWpkcWRqSkpiMnRrTmpaWlFXMHdSaloxUVZKTFpsUkxZMjgzTDBkVVZWVm1TVXczU2tWeGNtc3ZjbTF0UmxCelRrOVdlVXc0VFc1aWVuUmxNMDVSTTFOTFVWTkpiV3BGU3pKSldYcE9lRE12VW0xTFZFbG9Zak5OYVhKaGNWTkxOWE5zTTJwYWRHZzJiVzVaYUU5WVpGTXhhbEZLWVZoT01FRkRUakpwTkZOT2VtZGhSMlp4TjA1bVdUbHhjQzlWYnpaVFJrazNWakZZV0hJMWJXOVhXbWRJVVhjdmMyVlVSRFZLTTJVeVVHOU5aVTlQWlRkMlZHOW5XazUzVlZnNFJpdEVkRXRrT1dObGNUWmpVMHMyVGpFek4xSkRWSE5RVTBGMFl6WnBSRFJ1ZFVWdE9YWlNRakJFZDBGRlZWbHZjVGhCYm1KQ05EZEVZemMxVGxaTE4yWTRiVVZrZUdNMFZYaEtiV3RpS3pkRGRXUldURXhLTURCamFqRk1WR294VkVWTmQxZDVXVEpwWm5KUGJHczFVSFVyTVZZemRqZHVRa0p5U0ZOeVRFczBlSEZuUVZoTFNWZHNiRVJOZUdSc1VqVlpNbnBhVlc5VFNERnBObXhsTmtwQmVXSndNRUp1Y1hNeFZtSkdaMjVPYzJseWNqUXpjblZSVjJoa2F6ZHBZV2h1YVZkUlNFRnFlVlZ2ZWxKd1lVbFNNazVYVVVoMVREVTNkMnhCV213MU5YRjBlVEJCY2xOUWNXaGxWbTUyS3pSSFdVVkVibU0zTlhSNVFqZDFOR0ZTYmtKQmJYVmFSVEJCTVdscWJsaFNUMWRHU0RKR2IyTnpRVmhQWTJselRrMUpUM0owT1hOV1l6aEVXVkJ3WldOeFVqYzJURU5IVTNKRVVVNW5SUzlGTVZaWGJGUnFjWEZaVkM5dE9FOVNUVEZ2YnpWelltNTRabk5WV0ZsRFUxbE1OalpxUTFoUVRYRXliVzFPY1RkMmIwMUtjRE4wYmtkSGNtRnhOMVV4YlUxUmRXeDRhalpSVWpWUFVrUndVQ3RvYlZoYWNUUmlSa3BSYTJOc1dHWXdNMW94Tmt0bFVtWTRiMEYwTWxrNVltMUxZM292YjFCTllVRlFhRTl3T0hCME5GWmFRblJUUmpoaVowdDZZMHRQWTAxYVJUUkxWR3d6T0RjNFpFbzVWamxsUkVwM2IzcHFWVGw0ZVd0MFkwRXpVVWh2YzIxUE5sVTBSbEZDWm5sNWRsSnpUMWROUW1GdlNWWTJhbUZVV0VadlluRk5kU3QzWkRsVGNtdExURmxtUmxOSVJIVlBiRlpXUTA4MFRHaG5VVzl2UmtGWlZpdEhTbEJKTmlzNVFrcEJWWEJKVlRNMFprVk1WMWcwY1cxUVFTczBNbmdyTTFkSGVsRm9kbEJTYUZkdFZrVlljRXB5VEdoMlNFMWxWV1JqTUhvemJ6MD0-`, { waitUntil: 'domcontentloaded' }),
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
