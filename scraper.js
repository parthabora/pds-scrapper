import puppeteer from "puppeteer";
import fs from "fs";
import { createObjectCsvWriter } from "csv-writer";

// Change these as per your configuration
const DISTRICT_VALUE = "312";
const FPS_VALUE = "131200100458";
const MONTH_NAME = "October";
const YEAR = "2025";

export async function scrapeData() {
  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
        "--window-size=1920x1080",
        "--single-process",
        "--no-zygote"
      ],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || puppeteer.executablePath(),
    });

    const page = await browser.newPage();
    
    // Set timeout
    page.setDefaultTimeout(30000);
    
    await page.goto("https://epos.assam.gov.in/FPS_Trans_Abstract.jsp", {
      waitUntil: "networkidle2",
      timeout: 30000
    });

    // Select district
    await page.waitForSelector("#dist_code", { timeout: 10000 });
    await page.select("#dist_code", DISTRICT_VALUE);
    await page.evaluate(() => {
      const el = document.querySelector("#dist_code");
      el.dispatchEvent(new Event("change"));
    });
    
    // Use waitForNetworkIdle instead of fixed timeout
    await page.waitForNetworkIdle({ timeout: 5000 }).catch(() => {
      console.log("Network still active after 5s, continuing...");
    });

    // Select FPS ID, Month, Year
    await page.select("#fps_id", FPS_VALUE);
    await page.select("#month", MONTH_NAME);
    await page.select("#year", YEAR);

    // Click "Details" button
    await page.click("button[onclick='detailsR();']");
    await page.waitForSelector("#Report > tbody > tr", { timeout: 15000 });

    // Extract the second column
    const secondCol = await page.$$eval("#Report > tbody > tr > td:nth-child(2)", (els) =>
      els.map((el) => el.innerText.trim()).filter((t) => t.length > 0)
    );

    console.log(`✅ Extracted ${secondCol.length} rows`);

    // Write to CSV
    if (!fs.existsSync("output")) fs.mkdirSync("output");
    const csvWriter = createObjectCsvWriter({
      path: "output/fps_column2_all_rows.csv",
      header: [{ id: "src", title: "SRC No" }],
    });
    const records = secondCol.map((src) => ({ src }));
    await csvWriter.writeRecords(records);

    return records.length;
  } catch (error) {
    console.error("❌ Scraping error:", error.message);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}