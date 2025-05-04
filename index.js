const express = require("express");
const cors = require("cors");
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const port = 17321;
const DOWNLOAD_ROOT_DIR = path.join(__dirname, "downloads");

const app = express();
app.use(cors());
app.use(express.json());

app.post("/scrape", async (req, res) => {
  const boardLinks = req.body.boardLinks;
  const boardName = req.body.boardName;
  await startBackup(boardLinks, boardName);
  res.end();
});

async function startBackup(boardLinks, boardName) {
  try {
    console.info("Starting backups...");
    if (!boardLinks || boardLinks.length === 0) return;

    const boardDir = path.join(DOWNLOAD_ROOT_DIR, boardName);
    if (!fs.existsSync(DOWNLOAD_ROOT_DIR)) fs.mkdirSync(DOWNLOAD_ROOT_DIR);
    if (!fs.existsSync(boardDir)) fs.mkdirSync(boardDir);

    console.info("Target board name:", boardName);

    let downloadLinks = [];

    for (let i = 0; i < boardLinks.length; i++) {
      const link = boardLinks[i];

      let imageUrl;
      try {
        imageUrl = await extractMainImage(link);
      } catch (err) {
        console.warn(`Skipping [${link}] — failed to extract image: ${err.message}`);
        continue;
      }

      if (!imageUrl || !imageUrl.startsWith("http")) {
        console.warn(`Skipping [${link}] — invalid image URL`);
        continue;
      }

      const fileName = `${i + 1}_${imageUrl.split("/").pop()}`;
      const filePath = path.join(boardDir, fileName);

      if (await isAlreadyDownloaded(imageUrl, filePath)) {
        console.log(`Already downloaded: ${fileName}`);
        continue;
      }

      try {
        await downloadImage(imageUrl, filePath);
        downloadLinks.push(imageUrl);
      } catch (err) {
        console.warn(`Skipping download of [${imageUrl}] — reason: ${err.message}`);
      }
    }

    console.info("Finished backups.");
    console.log("Downloaded images:", downloadLinks.length);
  } catch (error) {
    console.error("Error in startBackup:", error.message);
  }
}

async function isAlreadyDownloaded(url, filePath) {
  if (!fs.existsSync(filePath)) return false;

  try {
    const { headers } = await axios.head(url);
    const remoteSize = parseInt(headers["content-length"]);
    const localSize = fs.statSync(filePath).size;

    return remoteSize === localSize;
  } catch {
    return false; // If head request fails, assume not downloaded
  }
}

async function downloadImage(url, filepath) {
  const writer = fs.createWriteStream(filepath);
  const response = await axios({
    url,
    method: "GET",
    responseType: "stream",
  });

  return new Promise((resolve, reject) => {
    response.data.pipe(writer);
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

async function extractMainImage(url) {
  const userDataDir = "./pinterest-session";
  const userAgent =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

  let context;

  try {
    if (!url || typeof url !== "string") {
      throw new Error("Invalid URL");
    }

    context = await chromium.launchPersistentContext(userDataDir, {
      headless: true,
      viewport: { width: 1280, height: 800 },
      userAgent,
    });

    const page = await context.newPage();
    await safeGoto(page, url);
    await page.waitForTimeout(3000);

    const mainImageUrl = await page.evaluate(() => {
      const link = document.querySelector("#pin-image-preload");
      return link?.href || null;
    });

    if (!mainImageUrl) throw new Error("Main image not found");

    return mainImageUrl;
  } finally {
    if (context) await context.close();
  }
}

async function safeGoto(page, url, maxRetries = 3) {
  let lastErr;
  for (let i = 0; i < maxRetries; i++) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
      return;
    } catch (err) {
      lastErr = err;
      console.warn(`Retrying page.goto (${i + 1}/${maxRetries}) for ${url}`);
    }
  }
  throw lastErr;
}

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
