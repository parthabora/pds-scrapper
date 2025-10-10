import os, time, argparse
import pandas as pd
import shutil
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.common.exceptions import TimeoutException
from html2image import Html2Image
from datetime import datetime
from selenium.webdriver.chrome.options import Options

def create_driver():
    chrome_path = shutil.which("google-chrome") or "/opt/chrome/chrome"
    driver_path = shutil.which("chromedriver") or "/opt/chromedriver/chromedriver"

    if not chrome_path or not driver_path:
        raise RuntimeError(f"Chrome or Chromedriver not found. chrome={chrome_path}, driver={driver_path}")

    options = Options()
    options.binary_location = chrome_path
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1920,1080")

    service = Service(driver_path)
    return webdriver.Chrome(service=service, options=options)

# -----------------------------
# Configuration
# -----------------------------
MONTH_NAME = "October"
YEAR = "2025"
DISTRICT_VALUE = "312"
FPS_VALUE = "131200100458"

# Chrome setup for Render
options = webdriver.ChromeOptions()
options.add_argument("--headless=new")
options.add_argument("--no-sandbox")
options.add_argument("--disable-dev-shm-usage")
options.add_argument("--disable-gpu")

# -----------------------------
# Scraper
# -----------------------------
# def scrape_data():
#     print("Skipping actual scrape for test startup")
#     pd.DataFrame(["TEST1","TEST2"], columns=["SRC No"]).to_csv("fps_column2_all_rows.csv", index=False)
#     return ["TEST1","TEST2"]

def scrape_data():
    driver = create_driver()
    wait = WebDriverWait(driver, 10)
    try:
        driver.get("https://epos.assam.gov.in/FPS_Trans_Abstract.jsp")
        Select(wait.until(EC.presence_of_element_located((By.ID, "dist_code")))).select_by_value(DISTRICT_VALUE)
        time.sleep(1)
        district_element = driver.find_element(By.ID, "dist_code")
        driver.execute_script("arguments[0].dispatchEvent(new Event('change'))", district_element)
        time.sleep(2)
        Select(wait.until(EC.presence_of_element_located((By.ID, "fps_id")))).select_by_value(FPS_VALUE)
        Select(wait.until(EC.presence_of_element_located((By.ID, "month")))).select_by_visible_text(MONTH_NAME)
        Select(wait.until(EC.presence_of_element_located((By.ID, "year")))).select_by_visible_text(YEAR)
        wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "button[onclick='detailsR();']"))).click()
        WebDriverWait(driver, 5).until(EC.visibility_of_element_located((By.CSS_SELECTOR, "#Report > tbody > tr")))
        # Extract second column
        second_col = driver.find_elements(By.CSS_SELECTOR, "#Report > tbody > tr > td:nth-child(2)")
        data = [e.text.strip() for e in second_col if e.text.strip()]
        pd.DataFrame(data, columns=["SRC No"]).to_csv("fps_column2_all_rows.csv", index=False)
        print(f"✅ Extracted {len(data)} rows")
        return data
    finally:
        driver.quit()

# -----------------------------
# Simple Report Generation (from auto.py)
# -----------------------------
def generate_html_report(scraped_data):
    total = len(scraped_data)
    html = f"""
    <html><head><style>
    body {{ font-family: Arial; padding: 20px; }}
    .header {{ background:#2c3e50;color:#fff;padding:10px;text-align:center; }}
    </style></head><body>
    <div class="header"><h1>FPS SRC Report</h1>
    <p>Generated {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}</p></div>
    <p><strong>Month:</strong> {MONTH_NAME} {YEAR}</p>
    <p><strong>Total Records:</strong> {total}</p>
    <table border="1" cellspacing="0" cellpadding="5">
    <tr><th>#</th><th>SRC Number</th></tr>
    {''.join(f"<tr><td>{i+1}</td><td>{src}</td></tr>" for i, src in enumerate(scraped_data))}
    </table></body></html>
    """
    return html

def save_html_as_image(html_content):
    hti = Html2Image(
        output_path=os.getcwd(),
        size=(1000, 2000),
        custom_flags=["--disable-gpu","--no-sandbox","--disable-dev-shm-usage","--hide-scrollbars"]
    )
    hti.screenshot(html_str=html_content, save_as="src_report.png")
    print("✅ Report image saved as src_report.png")

# -----------------------------
# CLI Entry
# -----------------------------
if __name__ == "__main__":
    try:
        parser = argparse.ArgumentParser()
        parser.add_argument("--csv-only", action="store_true")
        parser.add_argument("--full", action="store_true")
        args = parser.parse_args()

        data = scrape_data()
        if args.csv_only:
            print("CSV generation complete.")
        elif args.full:
            html = generate_html_report(data)
            save_html_as_image(html)

    except Exception as e:
        import traceback
        print("❌ Exception occurred:", e)
        traceback.print_exc()
        exit(1)
