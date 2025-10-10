import express from "express";
import fs from "fs";
import { scrapeData } from "./scraper.js";

const app = express();

app.get("/", (req, res) => {
  res.send("✅ Assam PDS Scraper API is live");
});

app.get("/run", async (req, res) => {
  try {
    const count = await scrapeData();
    const csvPreview = fs.readFileSync("output/fps_column2_all_rows.csv", "utf-8")
      .split("\n")
      .slice(0, 10)
      .join("\n");

    res.json({
      status: "success",
      rows: count,
      csvPreview,
    });
  } catch (err) {
    console.error("❌ Scraper error:", err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
