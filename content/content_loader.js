console.log("📦 Honey Barrel: Content loader loaded");

// Function to inject the module script once DOM is ready
function injectModuleScript() {
  try {
    // Create a module script element
    const script = document.createElement("script");
    script.type = "module";
    script.src = chrome.runtime.getURL("content/content_main.js");

    // Add error handling
    script.onerror = (error) => {
      console.error("❌ Failed to load content_main.js module:", error);
    };

    // Append to document to start loading
    console.log("🔄 Loading ES module:", script.src);
    (document.head || document.documentElement).appendChild(script);
    console.log("✅ Module script injected successfully");
  } catch (e) {
    console.error("❌ Content loader error:", e);
  }
}

// Wait for the DOM to be ready, then inject the script
if (document.readyState === "loading") {
  // DOM still loading, wait for it
  document.addEventListener("DOMContentLoaded", injectModuleScript);
  console.log("⏳ Waiting for DOM to be ready...");
} else {
  // DOM already ready, inject immediately
  injectModuleScript();
}
