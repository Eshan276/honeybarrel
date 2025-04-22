// console.log("📦 Honey Barrel: Content loader loaded");

// // Function to inject the module script once DOM is ready
// function injectModuleScript() {
//   try {
//     // Create a module script element
//     const script = document.createElement("script");
//     script.type = "module";
//     script.src = chrome.runtime.getURL("content/content_main.js");

//     // Add error handling
//     script.onerror = (error) => {
//       console.error("❌ Failed to load content_main.js module:", error);
//     };

//     // Append to document to start loading
//     console.log("🔄 Loading ES module:", script.src);
//     (document.head || document.documentElement).appendChild(script);
//     console.log("✅ Module script injected successfully");
//   } catch (e) {
//     console.error("❌ Content loader error:", e);
//   }
// }

// // Wait for the DOM to be ready, then inject the script
// if (document.readyState === "loading") {
//   // DOM still loading, wait for it
//   document.addEventListener("DOMContentLoaded", injectModuleScript);
//   console.log("⏳ Waiting for DOM to be ready...");
// } else {
//   // DOM already ready, inject immediately
//   injectModuleScript();
// }
console.log("📦 Honey Barrel: Content loader loaded");

// This approach uses a simplified version that avoids module issues entirely

// Create a content_main_no_modules.js file with this content:
// (All the code from content_main.js but with the imports removed and functions declared globally)

function loadContentScript() {
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("content/content_main.js");
  script.onload = () => console.log("✅ Content script loaded");
  script.onerror = (e) => console.error("❌ Error loading content script:", e);
  (document.head || document.documentElement).appendChild(script);
}

// Wait for DOM to be ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadContentScript);
  console.log("⏳ Waiting for DOM to be ready...");
} else {
  loadContentScript();
}