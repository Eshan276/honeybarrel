// Debug version of content loader
console.log("📦 Honey Barrel: Content loader loaded");

// Log the extension ID to check if it's properly loaded
console.log("Extension ID:", chrome.runtime.id);

// Debug function to check file access
function checkFileAccess() {
  const bridgeUrl = chrome.runtime.getURL("content/bridge.js");
  const mainUrl = chrome.runtime.getURL("content/content_main_no_modules.js");

  console.log("Bridge script URL:", bridgeUrl);
  console.log("Content script URL:", mainUrl);

  // Try to fetch the files to verify they exist
  fetch(bridgeUrl)
    .then((response) => {
      if (response.ok) {
        console.log("✅ Bridge script file exists");
      } else {
        console.error(`❌ Bridge script file not found: ${response.status}`);
      }
    })
    .catch((error) => console.error("❌ Error fetching bridge script:", error));

  fetch(mainUrl)
    .then((response) => {
      if (response.ok) {
        console.log("✅ Content script file exists");
      } else {
        console.error(`❌ Content script file not found: ${response.status}`);
      }
    })
    .catch((error) =>
      console.error("❌ Error fetching content script:", error)
    );
}

// Check file access before trying to load scripts
checkFileAccess();

// Set up a message listener
window.addEventListener(
  "message",
  function (event) {
    if (event.source != window) return;

    if (event.data.type && event.data.type === "FROM_PAGE_TO_EXTENSION") {
      console.log("Extension received message from page:", event.data);

      chrome.runtime.sendMessage(event.data.message, function (response) {
        window.postMessage(
          {
            type: "FROM_EXTENSION_TO_PAGE",
            response: response,
            messageId: event.data.messageId,
          },
          "*"
        );
      });
    }
  },
  false
);

// Simple script loading function with better error handling
function loadScript(src) {
  return new Promise((resolve, reject) => {
    try {
      console.log("Attempting to load script:", src);
      const script = document.createElement("script");
      script.src = src;
      script.onload = () => {
        console.log(`✅ Script loaded: ${src}`);
        resolve();
      };
      script.onerror = (e) => {
        console.error(`❌ Error loading script: ${src}`, e);
        // Log detailed information about the error
        console.log("Script element:", script);
        console.log("Head element:", document.head);
        reject(e);
      };
      document.head.appendChild(script);
    } catch (e) {
      console.error("❌ Exception while loading script:", e);
      reject(e);
    }
  });
}

// Load scripts with better error handling
async function loadScriptsInOrder() {
  try {
    // First load the bridge script
    await loadScript(chrome.runtime.getURL("content/bridge.js"));
    console.log("Bridge script loaded, now loading content script...");

    // Then load the main content script
    await loadScript(
      chrome.runtime.getURL("content/content_main.js")
    );
    console.log("All scripts loaded successfully");
  } catch (e) {
    console.error("❌ Failed to load scripts:", e);
    // Try alternative loading method
    console.log("Trying alternative loading method...");

    try {
      // Get the target elements to make sure they exist
      const head = document.head || document.documentElement;
      if (!head) {
        console.error("❌ Cannot find head or documentElement!");
        return;
      }

      console.log("Found head element, attempting direct script injection");

      // Try direct script injection
      const script1 = document.createElement("script");
      script1.src = chrome.runtime.getURL("content/bridge.js");
      head.appendChild(script1);

      // Add a slight delay before adding the second script
      setTimeout(() => {
        const script2 = document.createElement("script");
        script2.src = chrome.runtime.getURL(
          "content/content_main_no_modules.js"
        );
        head.appendChild(script2);
      }, 500);
    } catch (e2) {
      console.error("❌ Alternative loading also failed:", e2);
    }
  }
}

// Wait for DOM to be ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadScriptsInOrder);
  console.log("⏳ Waiting for DOM to be ready...");
} else {
  loadScriptsInOrder();
}
