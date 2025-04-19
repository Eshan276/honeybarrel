console.log("📦 Content loader loaded");

(async () => {
  try {
    const url = chrome.runtime.getURL("content/content_main.js");
    const src = chrome.runtime.getURL("content/content_main.js");
    console.log("Loading:", src);
    const contentMain = await import(
      "chrome-extension://efngiaijmijndokokfjpjgpbllilpbpj/content/content_main.js"
    );
    contentMain.main();
    console.log("🔗 Importing content_main.js from:", url);
    const module = await import(url);
    console.log("✅ Module imported successfully");
    module.main();
  } catch (e) {
    console.error("❌ Failed to import content_main.js:", e);
  }
})();
