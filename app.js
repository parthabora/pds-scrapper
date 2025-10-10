import express from "express";
import fs from "fs";
import { scrapeData } from "./scraper.js";

const app = express();

app.get("/", (req, res) => {
  res.send("✅ Assam PDS Scraper API is live");
});

app.get("/run", async (req, res) => {
  try {
    console.log("📥 Received scraping request");
    const count = await scrapeData();
    
    let csvPreview = "";
    try {
      csvPreview = fs.readFileSync("output/fps_column2_all_rows.csv", "utf-8")
        .split("\n")
        .slice(0, 10)
        .join("\n");
    } catch (err) {
      console.warn("⚠️ Could not read CSV preview:", err.message);
    }

    res.json({
      status: "success",
      rows: count,
      csvPreview,
      message: `Successfully scraped ${count} records`
    });
  } catch (err) {
    console.error("❌ Scraper error:", err);
    res.status(500).json({ 
      status: "error",
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Endpoints:`);
  console.log(`   GET /        - API status`);
  console.log(`   GET /run     - Run scraper`);
  console.log(`   GET /health  - Health check`);
});