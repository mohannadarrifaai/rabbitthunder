import express from 'express';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { executablePath } from 'puppeteer';
import { getRC4Names } from '../utils/getRC4Names.js';

puppeteer.use(StealthPlugin());

const app = express();
app.use(express.json());

const sleep = ms => new Promise(r => setTimeout(r, ms));

app.post('/api/log', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-web-security'],
    executablePath: process.env.PUPPETEER_EXEC_PATH || executablePath(),
    headless: true
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36; PlayStation');
  await page.setViewport({ width: 1080, height: 1080 });

  const logger = [];
  const finalResponse = { source: [] };

  page.on('request', async (request) => {
    logger.push(request.url());
    if (request.url().includes('.m3u8')) finalResponse.source.push(request.url());
    request.continue();
  });

  await page.setRequestInterception(true);

  try {
    await page.goto(url, { waitUntil: 'networkidle0' });
    await page.waitForSelector('#btn-play', { visible: true });

    for (let i = 0; i < 50; i++) {
      await page.bringToFront();
      const btn = await page.$('#btn-play');
      if (btn) {
        btn.click();
      }
      await sleep(1000);
    }
  } catch (e) {
    console.log(`[x] ${e}`);
  }

  await browser.close();

  return res.json({ logger, finalResponse });
});

export default app;
