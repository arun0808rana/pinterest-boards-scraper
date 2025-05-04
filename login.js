// login-pinterest.js
const { chromium } = require("playwright");

(async () => {
  const userDataDir = "./pinterest-session"; // This folder will be created
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
  });

  const page = await context.newPage();
  await page.goto("https://www.pinterest.com/login");

  console.log("👉 Please log in manually (Google login is OK).");
  console.log(
    "✅ Once logged in, close the browser window to save the session."
  );
})();
