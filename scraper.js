import { chromium } from "playwright";
import fs from "fs";
import { createObjectCsvWriter } from "csv-writer";

// Configuration
const DISTRICT_VALUE = "312";
const FPS_VALUE = "131200100458";
const MONTH_NAME = "October";
const YEAR = "2025";

export async function scrapeData() {
  let browser;
  
  try {
    console.log("🚀 Launching browser...");
    
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    });

    console.log("✅ Browser launched successfully");

    const page = await browser.newPage();
    
    console.log("📡 Navigating to Assam ePos website...");
    await page.goto("https://epos.assam.gov.in/FPS_Trans_Abstract.jsp", {
      waitUntil: "networkidle",
      timeout: 30000
    });

    console.log("🔍 Selecting district...");
    await page.waitForSelector("#dist_code");
    await page.selectOption("#dist_code", DISTRICT_VALUE);
    
    // Trigger change event
    await page.evaluate(() => {
      const el = document.querySelector("#dist_code");
      el.dispatchEvent(new Event("change"));
    });
    
    // Wait for FPS dropdown to populate
    await page.waitForTimeout(2000);

    console.log("📋 Selecting FPS ID, Month, and Year...");
    await page.selectOption("#fps_id", FPS_VALUE);
    await page.selectOption("#month", MONTH_NAME);
    await page.selectOption("#year", YEAR);

    console.log("🔘 Clicking Details button...");
    await page.click("button[onclick='detailsR();']");
    
    // Wait for the report table to load
    await page.waitForSelector("#Report > tbody > tr", { timeout: 15000 });

    console.log("📊 Extracting data from second column...");
    const secondCol = await page.$$eval("#Report > tbody > tr > td:nth-child(2)", (els) =>
      els.map((el) => el.innerText.trim()).filter((t) => t.length > 0)
    );

    console.log(`✅ Successfully extracted ${secondCol.length} rows`);

    // Ensure output directory exists
    if (!fs.existsSync("output")) {
      fs.mkdirSync("output", { recursive: true });
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