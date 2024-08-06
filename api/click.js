// api/click.js
import puppeteer from 'puppeteer';

export default async function handler(req, res) {
    let browser;
    try {
        // Launch Puppeteer
        browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();

        // Navigate to the desired page
        await page.goto('https://google.com/', { waitUntil: 'networkidle2' });

        // Get the page content
        const content = await page.content();

        // Send the content as the response
        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(content);
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).send('An error occurred while processing the request.');
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}
