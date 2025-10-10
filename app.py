from flask import Flask, jsonify, send_file
import subprocess
import os

app = Flask(__name__)

@app.route("/")
def home():
    return jsonify({
        "message": "Assam FPS Scraper API running",
        "endpoints": ["/run", "/report"]
    })

@app.route("/run")
def run_scraper():
    """Run the scraper and return CSV data."""
    try:
        subprocess.run(["python", "scraper_auto.py", "--csv-only"], check=True)
        csv_path = "fps_column2_all_rows.csv"
        if not os.path.exists(csv_path):
            return jsonify({"error": "CSV not generated"}), 500
        with open(csv_path, "r", encoding="utf-8") as f:
            data = f.read()
        return jsonify({"status": "success", "csv": data})
    except subprocess.CalledProcessError as e:
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        return jsonify({"error": f"Unexpected error: {e}"}), 500

@app.route("/report")
def run_full_report():
    """Run scraper + report generator, return image file."""
    try:
        subprocess.run(["python", "scraper_auto.py", "--full"], check=True)
        image_path = "src_report.png"
        if not os.path.exists(image_path):
            return jsonify({"error": "Image not generated"}), 500
        return send_file(image_path, mimetype="image/png")
    except subprocess.CalledProcessError as e:
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        return jsonify({"error": f"Unexpected error: {e}"}), 500

@app.route("/debug")
def debug_env():
    import shutil, os
    return {
        "google-chrome": shutil.which("google-chrome"),
        "chromedriver": shutil.which("chromedriver"),
        "opt_chrome_exists": os.path.exists("/opt/chrome/chrome"),
        "opt_driver_exists": os.path.exists("/opt/chromedriver/chromedriver")
    }


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)
