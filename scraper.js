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
    console.log("🚀 Launching browser...");
    
    browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable',
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu"
      ]
    });

    console.log("✅ Browser launched successfully");

    const page = await browser.newPage();
    page.setDefaultTimeout(30000);
    
    console.log("📡 Navigating to Assam ePos website...");
    await page.goto("https://epos.assam.gov.in/FPS_Trans_Abstract.jsp", {
      waitUntil: "networkidle2",
      timeout: 30000
    });

    console.log("🔍 Selecting district...");
    await page.waitForSelector("#dist_code", { timeout: 10000 });
    await page.select("#dist_code", DISTRICT_VALUE);
    await page.evaluate(() => {
      const el = document.querySelector("#dist_code");
      el.dispatchEvent(new Event("change"));
    });
    
    // Wait for district change to process
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log("📋 Selecting FPS ID, Month, and Year...");
    await page.select("#fps_id", FPS_VALUE);
    await page.select("#month", MONTH_NAME);
    await page.select("#year", YEAR);

    console.log("🔘 Clicking Details button...");
    await page.click("button[onclick='detailsR();']");
    
    // Wait for the table to load
    await page.waitForSelector("#Report > tbody > tr", { timeout: 15000 });

    console.log("📊 Extracting data from second column...");
    const secondCol = await page.$$eval("#Report > tbody > tr > td:nth-child(2)", (els) =>
      els.map((el) => el.innerText.trim()).filter((t) => t.length > 0)
    );

    console.log(`✅ Successfully extracted ${secondCol.length} rows`);

    // Ensure output directory exists
    if (!fs.existsSync("output")) {
      fs.mkdirSync("output");
    }

    // Write to CSV
    const csvWriter = createObjectCsvWriter({
      path: "output/fps_column2_all_rows.csv",
      header: [{ id: "src", title: "SRC No" }],
    });
    
    const records = secondCol.map((src) => ({ src }));
    await csvWriter.writeRecords(records);

    console.log("💾 CSV file saved successfully");
    return records.length;
    
  } catch (error) {
    console.error("❌ Scraping error:", error.message);
    console.error("Stack trace:", error.stack);
    throw error;
  } finally {
    if (browser) {
      console.log("🔒 Closing browser...");
      await browser.close();
    }
  }
}