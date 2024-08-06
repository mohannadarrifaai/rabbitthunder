import express from 'express';
import puppeteer from 'puppeteer';

const app = express();
const port = 3000;

app.get('/', async (req, res) => {
  try {
    // Launch a new browser instance
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    // Go to Google and perform actions
    await page.goto('https://google.com/');
    await page.click('button + button');
    await page.type('textarea[title="Search"]', 'hello world');
    await page.keyboard.press('Enter');

    // Wait for results to load
    await page.waitForTimeout(5000);

    // Get the HTML content of the page
    const content = await page.content();

    // Close the browser
    await browser.close();

    // Send the HTML content as the HTTP response
    res.send(content);
  } catch (error) {
    console.error('Error occurred:', error);
    res.status(500).send('Internal Server Error');
  }
});
