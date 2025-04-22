console.log("📦 Content loader loaded");

(async () => {
  try {
    const url = chrome.runtime.getURL("content/content_main.js");
    console.log("🔗 Importing content_main.js from:", url);

    // Method 1: Using dynamic import
    try {
      const module = await import(url);
      console.log("✅ Module imported successfully");
      module.main();
    } catch (importError) {
      console.error("❌ Dynamic import failed:", importError);

      // Method 2: Fallback to script injection if dynamic import fails
      console.log("⚠️ Falling back to script injection method");
      const script = document.createElement("script");
      script.src = url;
      script.onload = () => console.log("✅ Script loaded via injection");
      script.onerror = (e) => console.error("❌ Script injection failed:", e);
      document.head.appendChild(script);
    }
  } catch (e) {
    console.error("❌ Failed to load content_main.js:", e);
  }
})();
