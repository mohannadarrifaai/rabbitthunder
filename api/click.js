// api/click.js
import puppeteer from 'puppeteer';

export default async function handler(req, res) {
    // Launch Puppeteer
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
        // Go to the desired page
        await page.goto('https://google.com/');

        // Click the "I agree" button
        //await page.click('button + button');

        // Type the query into the search box
        //await page.type('textarea[title="Search"]', 'hello world');

        // Press enter
        //await page.keyboard.press('Enter');

        // Wait for the results to load
        //await page.waitForTimeout(10000);

        // Get the page content
        const content = await page.content();

        // Send the content as the response
        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(content);
    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred while processing the request.');
    } finally {
        // Close the browser
        await browser.close();
    }
}
