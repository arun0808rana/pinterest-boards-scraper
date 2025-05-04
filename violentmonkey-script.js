// ==UserScript==
// @name        BACKUP PINTEREST BOARDS
// @namespace   Violentmonkey Scripts
// @match       https://www.pinterest.com/arun0808rana/*
// @grant       none
// @version     1.0
// @author      -
// @grant       GM.xmlHttpRequest
// @run-at      document-end
// ==/UserScript==

const PAGE_LOADED_INDICATOR_SELECTOR = "[data-test-id=board-tools] > div";

waitForElement(PAGE_LOADED_INDICATOR_SELECTOR, attachBackupBtn);

async function attachBackupBtn() {
  const backupBtn = document.createElement("button");
  backupBtn.textContent = "Backup";
  const backupBtnParent = document.querySelector(
    PAGE_LOADED_INDICATOR_SELECTOR
  );
  backupBtnParent.appendChild(backupBtn);
  backupBtn.onclick = extractBoardLinks;
}

// const timeoutId = setTimeout(extractBoardLinks, 2000)
async function extractBoardLinks() {
  const boardParent = document.querySelector(
    "[data-test-id=base-board-pin-grid]"
  );
  const board = boardParent.firstChild;

  const boardLinks = Array.from(
    board.querySelectorAll("[data-test-id=pinWrapper] > a")
  ).map((boardLink) => boardLink.href);
  console.log({ boardLinks });

  await sendBoardLinksForDownload(boardLinks);
}

async function sendBoardLinksForDownload(boardLinks) {
  const url = "http://localhost:17321/scrape";
  const boardName = document.querySelector("#board-name").textContent;
  GM.xmlHttpRequest({
    method: "POST",
    url: url,
    headers: {
      "Content-Type": "application/json",
    },
    data: JSON.stringify({ boardLinks, boardName }),
    onload: function (response) {
      // console.log("Response:", response.responseText);
    },
    onerror: function (error) {
      console.error("Error:", error);
    },
  });
}

function waitForElement(selector, callback) {
  const observer = new MutationObserver(() => {
    const el = document.querySelector(selector);
    if (el) {
      observer.disconnect();
      callback(el);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}
