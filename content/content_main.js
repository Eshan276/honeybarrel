/**
 * Content Script - The Honey Barrel (Non-Module Version)
 *
 * Runs on supported retail websites to scrape bottle information
 * and communicate with the background service
 */
console.log("Honey Barrel: Content script loaded");

// Define all our functions and classes in the global scope directly
// No conditional checks that might prevent global declaration

// Utility function
function extractVintageFromName(name) {
  // Simplified implementation
  const match = /\b(19|20)\d{2}\b/.exec(name);
  return match ? parseInt(match[0]) : null;
}
function extractPrice() {
  // Try multiple potential selectors for price elements
  const priceSelectors = [
    ".priceTxt__\\w+", // Using regex pattern to match dynamically generated class
    "#edlpPrice", // Using the ID which might be more stable
    ".priceContainer__\\w+ .priceTxt__\\w+", // Nested approach
    "[class^='priceTxt__']", // Starts with selector
  ];

  let price = null;

  // Try each selector until we find a match
  for (const selector of priceSelectors) {
    let elements;

    // Handle regex-based selectors
    if (selector.includes("\\w+")) {
      const pattern = new RegExp(selector.replace("\\w+", "\\w+"));
      elements = Array.from(document.querySelectorAll("[class]")).filter((el) =>
        Array.from(el.classList).some((cls) => pattern.test(cls))
      );
    } else {
      elements = document.querySelectorAll(selector);
    }

    if (elements.length > 0) {
      // Get text content and extract just the price
      const text = elements[0].textContent.trim();
      // Extract dollar amount using regex
      const priceMatch = text.match(/\$(\d+\.\d+)/);
      if (priceMatch) {
        price = priceMatch[1]; // Get just the number without $
        console.log(`Found price: $${price} using selector: ${selector}`);
        return `$${price}`;
      }
    }
  }

  console.log("Price not found with any selector");
  return null;
}

// Run the function
// const price = extractPrice();
// console.log("Extracted price:", price);
// Define all scraper classes directly in the global scope
class TotalWineScraper {
  isProductPage() {
    // Implementation for Total Wine
    return window.location.pathname.includes("/p/");
  }

  async scrape() {
    console.log("Scraping Total Wine page");
    const name = document
      .querySelector("h1.productTitle__28e21c67[data-at='product-name-title']")
      ?.textContent?.trim();

    let price = document
      .querySelector("span[data-at='product-mix6price-text']")
      ?.textContent?.trim();

    // Fallback to another selector if price is null
    if (!price) {
      // price = document.querySelector(".priceTxt__")?.textContent?.trim();
      // print(document.querySelector(".priceTxt__"));
      price= extractPrice();
    }

    return {
      name,
      price,
      // Other properties...
    };
  }
}

class WhiskyShopScraper {
  isProductPage() {
    return window.location.pathname.includes("/products/");
  }
  async scrape() {
    return {
      name: document.querySelector(".product-title")?.textContent?.trim(),
      price: document.querySelector(".price")?.textContent?.trim(),
    };
  }
}

class WineLibraryScraper {
  isProductPage() {
    return window.location.pathname.includes("/products/");
  }
  async scrape() {
    return {
      name: document.querySelector(".product__title")?.textContent?.trim(),
      price: document.querySelector(".product__price")?.textContent?.trim(),
    };
  }
}

class WineComScraper {
  isProductPage() {
    return window.location.pathname.includes("/product/");
  }
  async scrape() {
    return {
      name: document.querySelector(".pipName")?.textContent?.trim(),
      price: document.querySelector(".pipPriceAmount")?.textContent?.trim(),
    };
  }
}

class WhiskyExchangeScraper {
  isProductPage() {
    return window.location.pathname.includes("/p/");
  }
  async scrape() {
    return {
      name: document.querySelector(".product-main__name")?.textContent?.trim(),
      price: document
        .querySelector(".product-action__price")
        ?.textContent?.trim(),
    };
  }
}

// Map of site scrapers by domain
const SCRAPERS = {
  "totalwine.com": TotalWineScraper,
  "whiskyshop.com": WhiskyShopScraper,
  "winelibrary.com": WineLibraryScraper,
  "wine.com": WineComScraper,
  "thewhiskyexchange.com": WhiskyExchangeScraper,
};

// Main initialization function
function init() {
  console.log("Honey Barrel: Content script initialized");

  // Check if bridge is available
  if (!window.honeyBarrelBridge) {
    console.error(
      "Honey Barrel: Bridge not found. Communication with extension won't work."
    );
  } else {
    console.log("Honey Barrel: Bridge found, communication ready");
  }

  // Determine which scraper to use based on current domain
  const currentDomain = getCurrentDomain();
  console.log("Current domain:", currentDomain);

  const Scraper = getScraper(currentDomain);
  console.log("Selected scraper:", Scraper ? Scraper.name : "None");

  if (!Scraper) {
    console.log(`Honey Barrel: No scraper available for ${currentDomain}`);
    return;
  }

  // Create scraper instance
  const scraper = new Scraper();

  // Execute scraping after the page has fully loaded
  window.addEventListener("load", async () => {
    try {
      // Check if we're on a product page
      if (!scraper.isProductPage()) {
        console.log("Honey Barrel: Not a product page, stopping");
        return;
      }

      console.log("Honey Barrel: Detected product page, scraping...");

      // Scrape bottle information
      const bottleInfo = await scraper.scrape();

      if (!bottleInfo) {
        console.log("Honey Barrel: No bottle information found");
        return;
      }

      console.log("Honey Barrel: Scraped bottle info", bottleInfo);

      // Enhance bottle information
      const enhancedInfo = enhanceBottleInfo(bottleInfo);

      // Send to background script via bridge
      if (window.honeyBarrelBridge) {
        window.honeyBarrelBridge
          .sendMessage({
            action: "BOTTLE_DETECTED",
            payload: {
              bottleInfo: enhancedInfo,
              source: {
                url: window.location.href,
                domain: currentDomain,
                title: document.title,
              },
            },
          })
          .then((response) => {
            console.log("Honey Barrel: Message sent, response:", response);
          })
          .catch((err) => {
            console.error("Honey Barrel: Error sending message:", err);
          });
      } else {
        console.error(
          "Honey Barrel: Bridge not available for sending messages"
        );
      }
    } catch (error) {
      console.error("Honey Barrel: Error scraping bottle info", error);
    }
  });

  // Set up listener for extension messages
  window.addEventListener("message", function (event) {
    // Only accept messages from the same window
    if (event.source !== window) return;

    // Check if it's a message from the extension
    if (event.data.type && event.data.type === "FROM_EXTENSION_TO_PAGE") {
      if (event.data.message && event.data.message.action === "MATCHES_FOUND") {
        const matchCount = event.data.message.payload.count;
        if (matchCount > 0) {
          console.log(`Honey Barrel: ${matchCount} matches found`);
        }
      }
    }
  });
}

function addPopupTrigger() {
  const btn = document.createElement("button");
  btn.innerText = "🔍 Compare Price";
  btn.style.position = "fixed";
  btn.style.bottom = "20px";
  btn.style.right = "20px";
  btn.style.zIndex = 10000;
  btn.style.padding = "10px 15px";
  btn.style.background = "#f06";
  btn.style.color = "white";
  btn.style.border = "none";
  btn.style.borderRadius = "8px";
  btn.style.cursor = "pointer";
  btn.style.fontSize = "14px";
  btn.onclick = async () => {
    try {
      const scraper = new SCRAPERS[getCurrentDomain()]();
      const bottleInfo = await scraper.scrape();
      if (!bottleInfo) return alert("Could not scrape this page.");

      const enhanced = enhanceBottleInfo(bottleInfo);

      // Send to background via bridge
      if (window.honeyBarrelBridge) {
        window.honeyBarrelBridge.sendMessage({
          action: "MATCH_WITH_BAUXES",
          payload: enhanced,
        });
      } else {
        alert("Communication bridge not available");
      }
    } catch (err) {
      console.error("Error in popup trigger:", err);
    }
  };
  document.body.appendChild(btn);
}

/**
 * Get current domain name from URL
 */
function getCurrentDomain() {
  const hostname = window.location.hostname.toLowerCase();
  console.log(`Honey Barrel: Current hostname is ${hostname}`);
  // Extract base domain (e.g., "wine.com" from "www.wine.com")
  const domainParts = hostname.split(".");
  if (domainParts.length >= 2) {
    const mainDomain = domainParts.slice(-2).join(".");
    for (const domain of Object.keys(SCRAPERS)) {
      if (mainDomain.includes(domain)) {
        return domain;
      }
    }
  }

  return hostname;
}

/**
 * Get the appropriate scraper for the current domain
 */
function getScraper(domain) {
  for (const [scraperDomain, Scraper] of Object.entries(SCRAPERS)) {
    if (domain.includes(scraperDomain)) {
      return Scraper;
    }
  }

  return null;
}

/**
 * Enhance bottle information with additional derived data
 */
function enhanceBottleInfo(bottleInfo) {
  const enhanced = { ...bottleInfo };

  // Extract vintage from name if not already present
  if (!enhanced.vintage && enhanced.name) {
    enhanced.vintage = extractVintageFromName(enhanced.name);
  }

  // Add timestamp
  enhanced.timestamp = Date.now();

  return enhanced;
}

// Initialize content script
init();
