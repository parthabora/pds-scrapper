import puppeteer from "puppeteer";
import fs from "fs";
import { createObjectCsvWriter } from "csv-writer";

// Change these as per your configuration
const DISTRICT_VALUE = "312";
const FPS_VALUE = "131200100458";
const MONTH_NAME = "October";
const YEAR = "2025";

export async function scrapeData() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.goto("https://epos.assam.gov.in/FPS_Trans_Abstract.jsp", {
    waitUntil: "networkidle2",
  });

  // Select district
  await page.waitForSelector("#dist_code");
  await page.select("#dist_code", DISTRICT_VALUE);
  await page.evaluate(() => {
    const el = document.querySelector("#dist_code");
    el.dispatchEvent(new Event("change"));
  });
  await page.waitForTimeout(2000);

  // Select FPS ID, Month, Year
  await page.select("#fps_id", FPS_VALUE);
  await page.select("#month", MONTH_NAME);
  await page.select("#year", YEAR);

  // Click "Details" button
  await page.click("button[onclick='detailsR();']");
  await page.waitForSelector("#Report > tbody > tr");

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

  await browser.close();
  return records.length;
}
