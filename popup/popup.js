/**
 * Popup UI Script - The Honey Barrel
 *
 * Handles the extension popup interface and interactions
 */

// DOM Elements
document.addEventListener("DOMContentLoaded", () => {
  console.log("Popup has been opened.");
  initPopup(); // Initialize the popup here
});

const loadingState = document.getElementById("loading-state");
const noBottleState = document.getElementById("no-bottle-state");
const errorState = document.getElementById("error-state");
const bottleDetectedState = document.getElementById("bottle-detected-state");
const errorMessage = document.getElementById("error-message");
const noMatchesState = document.getElementById("no-matches-state");
const matchesList = document.getElementById("matches-list");
const lastUpdatedElement = document.getElementById("last-updated");

const currentBottleName = document.getElementById("current-bottle-name");
const currentBottlePrice = document.getElementById("current-bottle-price");
const currentBottleVintage = document.getElementById("current-bottle-vintage");
const currentBottleVolume = document.getElementById("current-bottle-volume");

const refreshButton = document.getElementById("refresh-button");
const tryAgainButton = document.getElementById("try-again-button");

// Application State
let appState = {
  currentBottle: null,
  matches: [],
  isLoading: true,
  error: null,
  lastUpdated: null,
};

// Initialize popup
function initPopup() {
  console.log("Honey Barrel: Popup initialized");
  //init()
  refreshButton.addEventListener("click", refreshListings);
  tryAgainButton.addEventListener("click", refreshListings);
  
  chrome.runtime.sendMessage({ action: "GET_STATE" }, handleStateUpdate);

  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "STATE_UPDATE") {
      handleStateUpdate(message.payload);
    }
  });
}

// Handle state update from background
function handleStateUpdate(state) {
  console.log("Honey Barrel: State update received", state);

  if (!state) {
    showError("Unable to get application state");
    return;
  }

  appState = {
    currentBottle: state.currentBottle,
    matches: state.matches || [],
    isLoading: state.isLoading,
    error: state.error,
    lastUpdated: state.lastUpdated,
  };

  updateUI();
}

// Update the popup UI
function updateUI() {
  hideAllStates();

  if (appState.isLoading) {
    showLoadingState();
  } else if (appState.error) {
    showErrorState();
  } else if (!appState.currentBottle) {
    showNoBottleState();
  } else {
    showBottleDetectedState();
  }

  if (appState.lastUpdated) {
    const lastUpdatedTime = new Date(appState.lastUpdated);
    lastUpdatedElement.textContent = `Last updated: ${formatTime(
      lastUpdatedTime
    )}`;
  } else {
    lastUpdatedElement.textContent = "";
  }
}

function hideAllStates() {
  loadingState.classList.remove("active");
  noBottleState.classList.remove("active");
  errorState.classList.remove("active");
  bottleDetectedState.classList.remove("active");
}

function showLoadingState() {
  loadingState.classList.add("active");
}

function showErrorState() {
  errorState.classList.add("active");
  errorMessage.textContent = appState.error || "Something went wrong";
}

function showNoBottleState() {
  noBottleState.classList.add("active");
}

function showBottleDetectedState() {
  bottleDetectedState.classList.add("active");
  populateCurrentBottleInfo();
  populateMatches();
}

function populateCurrentBottleInfo() {
  const bottle = appState.currentBottle;
  if (!bottle) return;

  currentBottleName.textContent = bottle.name;

  currentBottlePrice.textContent = bottle.price
    ? formatPrice(bottle.price)
    : "Price not available";

  if (bottle.vintage) {
    currentBottleVintage.textContent = `${bottle.vintage}`;
    currentBottleVintage.classList.remove("hidden");
  } else {
    currentBottleVintage.classList.add("hidden");
  }

  if (bottle.volume) {
    currentBottleVolume.textContent = formatVolume(bottle.volume);
    currentBottleVolume.classList.remove("hidden");
  } else {
    currentBottleVolume.classList.add("hidden");
  }
}

function populateMatches() {
  matchesList.innerHTML = "";
  const matches = appState.matches || [];

  if (matches.length === 0) {
    noMatchesState.classList.remove("hidden");
    return;
  }

  noMatchesState.classList.add("hidden");
  const template = document.getElementById("match-template");
  const sortedMatches = [...matches].sort(
    (a, b) => a.listing.price - b.listing.price
  );
  const currentPrice = appState.currentBottle?.price || 0;

  sortedMatches.forEach((match, index) => {
    const { listing } = match;
    const matchElement = template.content.cloneNode(true);

    matchElement.querySelector(".match-name").textContent = listing.name;
    matchElement.querySelector(".match-price").textContent = formatPrice(
      listing.price
    );

    const vintageElement = matchElement.querySelector(".match-vintage");
    vintageElement.textContent = listing.vintage || "";

    const volumeElement = matchElement.querySelector(".match-volume");
    volumeElement.textContent = formatVolume(listing.volume || "");

    const imageElement = matchElement.querySelector(".match-image img");
    if (listing.imageUrl) {
      imageElement.src = listing.imageUrl;
      imageElement.alt = listing.name;
    } else {
      imageElement.src = "../assets/bottle-placeholder.png";
      imageElement.alt = "Bottle Image";
    }

    matchElement.querySelector(".view-button").href = listing.url;

    const savingsElement = matchElement.querySelector(".savings");
    const savingsPercentageElement = matchElement.querySelector(
      ".savings-percentage"
    );

    if (currentPrice && listing.price < currentPrice) {
      const savings = currentPrice - listing.price;
      const savingsPercentage = (savings / currentPrice) * 100;

      savingsElement.textContent = `Save ${formatPrice(savings)}`;
      savingsPercentageElement.textContent = `${savingsPercentage.toFixed(
        0
      )}% less`;

      if (index === 0) {
        matchElement.querySelector(".match-item").classList.add("better-deal");
      }
    } else if (currentPrice && listing.price > currentPrice) {
      const diff = listing.price - currentPrice;
      const diffPercent = (diff / currentPrice) * 100;

      savingsElement.textContent = `${formatPrice(diff)} more`;
      savingsElement.style.color = "#666";
      savingsPercentageElement.textContent = `${diffPercent.toFixed(
        0
      )}% higher`;
      savingsPercentageElement.style.backgroundColor = "#f5f5f5";
      savingsPercentageElement.style.color = "#666";
    } else {
      savingsElement.textContent = "Same price";
      savingsElement.style.color = "#666";
      savingsPercentageElement.textContent = "";
    }

    matchesList.appendChild(matchElement);
  });
}

// Format helpers
function formatPrice(price, currency = "USD") {
  if (price === undefined || price === null) return "";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(price);
}

function formatVolume(volume) {
  if (!volume) return "";
  if (typeof volume === "string" && /\d+\s*(ml|cl|l)/i.test(volume))
    return volume;

  const numVolume = parseFloat(volume);
  if (isNaN(numVolume)) return volume;

  return numVolume >= 1000
    ? `${(numVolume / 1000).toFixed(1)}L`
    : `${numVolume}ml`;
}

function formatTime(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 1000 / 60);
  const diffHour = Math.floor(diffMin / 60);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;

  return date.toLocaleString();
}

// Force refresh
function refreshListings() {
  console.log("Honey Barrel: Refreshing listings");
  appState.isLoading = true;
  updateUI();

  chrome.runtime.sendMessage(
    { action: "REFRESH_LISTINGS", forceRefresh: true },
    (response) => {
      if (!response || !response.success) {
        appState.error = response?.error || "Failed to refresh listings";
        appState.isLoading = false;
        updateUI();
      }
    }
  );
}
// import { extractVintageFromName } from "../utils/normalizer.js";

// // Site scraper modules
// import { TotalWineScraper } from "./sites/totalwine.js";
// import { WhiskyShopScraper } from "./sites/whiskyshop.js";
// import { WineLibraryScraper } from "./sites/winelibrary.js";
// import { WineComScraper } from "./sites/winecom.js";
// import { WhiskyExchangeScraper } from "./sites/whiskyexchange.js";

// // Map of site scrapers by domain
// const SCRAPERS = {
//   "totalwine.com": TotalWineScraper,
//   "whiskyshop.com": WhiskyShopScraper,
//   "winelibrary.com": WineLibraryScraper,
//   "wine.com": WineComScraper,
//   "thewhiskyexchange.com": WhiskyExchangeScraper,
// };

// // Main initialization function
// function init() {
//   // addPopupTrigger();
//   console.log("Honey Barrel: Content script initialized");

//   // Determine which scraper to use based on current domain
//   const currentDomain = getCurrentDomain();
//   const Scraper = getScraper(currentDomain);

//   if (!Scraper) {
//     console.log(`Honey Barrel: No scraper available for ${currentDomain}`);
//     return;
//   }

//   // Create scraper instance
//   const scraper = new Scraper();

//   // Execute scraping after the page has fully loaded
//   window.addEventListener("load", async () => {
//     try {
//       // Check if we're on a product page
//       if (!scraper.isProductPage()) {
//         console.log("Honey Barrel: Not a product page, stopping");
//         return;
//       }

//       console.log("Honey Barrel: Detected product page, scraping...");

//       // Scrape bottle information
//       const bottleInfo = await scraper.scrape();

//       if (!bottleInfo) {
//         console.log("Honey Barrel: No bottle information found");
//         return;
//       }

//       console.log("Honey Barrel: Scraped bottle info", bottleInfo);

//       // Enhance bottle information
//       const enhancedInfo = enhanceBottleInfo(bottleInfo);

//       // Send to background script
//       chrome.runtime.sendMessage({
//         action: "BOTTLE_DETECTED",
//         payload: {
//           bottleInfo: enhancedInfo,
//           source: {
//             url: window.location.href,
//             domain: currentDomain,
//             title: document.title,
//           },
//         },
//       });

//       // Listen for badge updates
//       chrome.runtime.onMessage.addListener((message) => {
//         if (message.action === "MATCHES_FOUND") {
//           // Update the extension icon badge with number of matches
//           const matchCount = message.payload.count;
//           if (matchCount > 0) {
//             // Optionally, we could show a notification or overlay on the page
//             console.log(`Honey Barrel: ${matchCount} matches found`);
//           }
//         }
//       });
//     } catch (error) {
//       console.error("Honey Barrel: Error scraping bottle info", error);
//     }
//   });
// }
// function addPopupTrigger() {
//   const btn = document.createElement("button");
//   btn.innerText = "🔍 Compare Price";
//   btn.style.position = "fixed";
//   btn.style.bottom = "20px";
//   btn.style.right = "20px";
//   btn.style.zIndex = 10000;
//   btn.style.padding = "10px 15px";
//   btn.style.background = "#f06";
//   btn.style.color = "white";
//   btn.style.border = "none";
//   btn.style.borderRadius = "8px";
//   btn.style.cursor = "pointer";
//   btn.style.fontSize = "14px";
//   btn.onclick = async () => {
//     const scraper = new SCRAPERS[getCurrentDomain()]();
//     const bottleInfo = await scraper.scrape();
//     if (!bottleInfo) return alert("Could not scrape this page.");

//     const enhanced = enhanceBottleInfo(bottleInfo);

//     // Send to background to fetch Bauxes match
//     chrome.runtime.sendMessage({
//       action: "MATCH_WITH_BAUXES",
//       payload: enhanced,
//     });
//   };
//   document.body.appendChild(btn);
// }

// /**
//  * Get current domain name from URL
//  */
// function getCurrentDomain() {
//   const hostname = window.location.hostname.toLowerCase();
//   console.log(`Honey Barrel: Current hostname is ${hostname}`);
//   // Extract base domain (e.g., "wine.com" from "www.wine.com")
//   const domainParts = hostname.split(".");
//   if (domainParts.length >= 2) {
//     const mainDomain = domainParts.slice(-2).join(".");
//     for (const domain of Object.keys(SCRAPERS)) {
//       if (mainDomain.includes(domain)) {
//         return domain;
//       }
//     }
//   }

//   return hostname;
// }

// /**
//  * Get the appropriate scraper for the current domain
//  */
// function getScraper(domain) {
//   for (const [scraperDomain, Scraper] of Object.entries(SCRAPERS)) {
//     if (domain.includes(scraperDomain)) {
//       return Scraper;
//     }
//   }

//   return null;
// }

// /**
//  * Enhance bottle information with additional derived data
//  */
// function enhanceBottleInfo(bottleInfo) {
//   const enhanced = { ...bottleInfo };

//   // Extract vintage from name if not already present
//   if (!enhanced.vintage && enhanced.name) {
//     enhanced.vintage = extractVintageFromName(enhanced.name);
//   }

//   // Add timestamp
//   enhanced.timestamp = Date.now();

//   return enhanced;
// }