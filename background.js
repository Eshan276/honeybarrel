/**
 * Background Service Worker - The Honey Barrel
 *
 * Handles communication between content scripts and popup,
 * manages bottle data, and interacts with the BAXUS API
 */

// State management for the extension
const state = {
  currentBottle: null,
  matches: [],
  isLoading: false,
  error: null,
  lastUpdated: null,
  baxusListings: [],
};

// Initialize extension
async function initialize() {
  console.log("Honey Barrel: Background service worker initialized");

  // Prefetch BAXUS listings on startup
  try {
    await updateBaxusListings();
  } catch (error) {
    console.error("Failed to prefetch BAXUS listings:", error);
  }
}

// Update BAXUS listings cache
async function updateBaxusListings(forceRefresh = false) {
  state.isLoading = true;

  try {
    console.log("Honey Barrel: Updating BAXUS listings...");
    const listings = await getAllListings({ forceRefresh });
    console.log("Honey Barrel: Fetched BAXUS listings:", listings);
    console.log(`Honey Barrel: Loaded ${listings.length} BAXUS listings`);
    state.baxusListings = listings;
    state.lastUpdated = Date.now();
    state.isLoading = false;

    // Auto-update matches if we have a current bottle
    if (state.currentBottle) {
      await findBottleMatches(state.currentBottle);
    }
  } catch (error) {
    console.error("Error updating BAXUS listings:", error);
    state.error = error.message;
    state.isLoading = false;
  }
}

// Get all BAXUS listings
async function getAllListings({ forceRefresh = false, size = 100 } = {}) {
  // If we already have listings and don't need to refresh, return them
  if (
    !forceRefresh &&
    state.baxusListings.length > 0 &&
    state.lastUpdated &&
    Date.now() - state.lastUpdated < 15 * 60 * 1000
  ) {
    console.log("Using cached BAXUS listings");
    return state.baxusListings;
  }

  try {
    // Build query parameters
    const params = new URLSearchParams({
      from: 0,
      size: size,
      listed: true,
    });
    console.log("BAXUS API query params:", params.toString());
    // Fetch listings
    const response = await fetch(
      `https://services.baxus.co/api/search/listings?${params}`
    );
    // console.log("BAXUS API response:", await response.json());
    if (!response.ok) {
      throw new Error(
        `BAXUS API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    console.log(data);
    // Process the listings
    const processedListings = processRawListings(data);
    console.log("Processed BAXUS listings:", processedListings);
    return processedListings;
  } catch (error) {
    console.error("Error fetching BAXUS listings:", error);

    // Return cached data if available, even if expired
    if (state.baxusListings.length > 0) {
      console.log("Using expired cache due to API error");
      return state.baxusListings;
    }

    throw error;
  }
}

// Process raw BAXUS API listings
function processRawListings(rawData) {
  if (!Array.isArray(rawData)) {
    console.log("Input is not an array. Returning empty list.");
    return [];
  }

  console.log(`Processing ${rawData.length} listings...`);

  return rawData.map((hit, index) => {
    const source = hit._source || {};
    const attributes = source.attributes || {};

    // console.log(`\n--- Listing #${index + 1} ---`);
    // console.log("ID:", hit._id);
    // console.log("Name:", source.name || attributes.Name || "");
    // console.log("Price:", source.price);
    // console.log("Image URL:", source.imageUrl);
    // console.log("Distillery:", attributes.Producer);
    // console.log("Region:", attributes.Region);
    // console.log("Cask Type:", attributes["Wood Type"]);
    // console.log("Status:", source.status);

    return {
      id: hit._id,
      name: source.name || attributes.Name || "",
      vintage: null,
      volume: null,
      category: attributes["Spirit Type"] || "",
      price: source.price || 0,
      currency: "USD",
      url: `https://baxus.co/marketplace/${hit._id}`,
      imageUrl: source.imageUrl || null,
      distillery: attributes.Producer || "",
      region: attributes.Region || "",
      bottledBy: null,
      bottledDate: null,
      caskType: attributes["Wood Type"] || "",
      abv: null,
      description: source.description || "",
      spiritType: source.spiritType || "",
      listedDate: source.listedDate || null,
      status: source.status || "",
      nftAddress: source.nftAddress || "",
      ownerAddress: source.ownerAddress || "",
    };
  });
}


// Convert volume string to milliliters
function parseVolumeToMl(volumeStr) {
  if (!volumeStr) return null;

  // Already a number
  if (!isNaN(volumeStr)) {
    return parseFloat(volumeStr);
  }

  // Common formats: "750ml", "70cl", "1L"
  const volumeMatch = String(volumeStr).match(/(\d+(?:\.\d+)?)\s*(ml|cl|l)/i);
  if (!volumeMatch) return null;

  const value = parseFloat(volumeMatch[1]);
  const unit = volumeMatch[2].toLowerCase();

  switch (unit) {
    case "ml":
      return value;
    case "cl":
      return value * 10;
    case "l":
      return value * 1000;
    default:
      return null;
  }
}

// Find matches for a bottle
async function findBottleMatches(bottleInfo) {
  if (!bottleInfo) return [];

  state.isLoading = true;
  state.currentBottle = bottleInfo;

  try {
    // Get fresh listings if needed
    const listings = await getAllListings();

    // Find matches using simple matching algorithm
    const matches = findMatches(bottleInfo, listings);
    state.matches = matches;

    console.log(
      `Honey Barrel: Found ${matches.length} matches for ${bottleInfo.name}`
    );

    // Notify content script
    notifyContentScript(matches);

    // Update popup if open
    updatePopup();

    // Update badge
    updateBadge(matches.length);

    state.isLoading = false;
    return matches;
  } catch (error) {
    console.error("Error finding bottle matches:", error);
    state.error = error.message;
    state.isLoading = false;
    return [];
  }
}

// Simple matching algorithm
function findMatches(scrapedBottle, baxusListings) {
  // Normalize the bottle name for comparison
  const normalizedName = normalizeText(scrapedBottle.name);

  // Initial filtering to find potential matches
  const potentialMatches = baxusListings.filter((listing) => {
    const listingName = normalizeText(listing.name);

    // Check for significant name overlap
    return namesSimilar(normalizedName, listingName);
  });

  // Calculate match scores
  const scoredMatches = potentialMatches.map((listing) => {
    // Calculate name similarity score
    const nameScore = calculateNameSimilarity(
      normalizedName,
      normalizeText(listing.name)
    );

    // Calculate vintage match score
    const vintageScore =
      scrapedBottle.vintage &&
      listing.vintage &&
      scrapedBottle.vintage === listing.vintage
        ? 1.0
        : 0.0;

    // Calculate volume match score
    let volumeScore = 0.0;
    if (scrapedBottle.volume && listing.volume) {
      const volumeDiff =
        Math.abs(scrapedBottle.volume - listing.volume) / listing.volume;
      volumeScore = volumeDiff < 0.05 ? 1.0 : volumeDiff < 0.1 ? 0.8 : 0.0;
    }

    // Combine scores with weights
    const finalScore = nameScore * 0.7 + vintageScore * 0.2 + volumeScore * 0.1;

    return {
      listing,
      finalScore,
      nameScore,
    };
  });

  // Sort by score and filter only good matches
  return scoredMatches
    .filter((match) => match.finalScore > 0.7)
    .sort((a, b) => b.finalScore - a.finalScore);
}

// Check if two names are similar
function namesSimilar(name1, name2) {
  // Convert both names to lowercase and split into words
  const words1 = name1.toLowerCase().split(/\s+/);
  const words2 = name2.toLowerCase().split(/\s+/);

  // Count how many words from name1 appear in name2
  const commonWords = words1.filter(
    (word) => word.length > 2 && words2.includes(word)
  );

  // Calculate similarity based on common words
  const similarity =
    commonWords.length / Math.max(words1.length, words2.length);

  return similarity > 0.3; // Threshold for similarity
}

// Calculate name similarity score
function calculateNameSimilarity(name1, name2) {
  // Convert both names to lowercase and split into words
  const words1 = name1.toLowerCase().split(/\s+/);
  const words2 = name2.toLowerCase().split(/\s+/);

  // Count how many words from name1 appear in name2
  const commonWords = words1.filter(
    (word) => word.length > 2 && words2.includes(word)
  );

  // Calculate similarity based on common words
  return commonWords.length / Math.max(words1.length, words2.length);
}

// Normalize text for comparison
function normalizeText(text) {
  if (!text) return "";

  return (
    text
      .toLowerCase()
      // Remove special characters
      .replace(/[^\w\s-]/g, " ")
      // Remove extra spaces
      .replace(/\s+/g, " ")
      // Remove common suffixes
      .replace(/(750ml|70cl|1l|1\.75l|gift set|limited edition)\s*$/i, "")
      // Remove years from name for better matching
      .replace(/\b(19|20)\d{2}\b/g, "")
      .trim()
  );
}

// Notify content script about matches
function notifyContentScript(matches) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: "MATCHES_FOUND",
        payload: {
          count: matches.length,
          hasBetterPrice: matches.some(
            (match) => match.listing.price < state.currentBottle.price
          ),
        },
      });
    }
  });
}

// Update popup with current state
function updatePopup() {
  chrome.runtime.sendMessage({
    action: "STATE_UPDATE",
    payload: {
      currentBottle: state.currentBottle,
      matches: state.matches,
      isLoading: state.isLoading,
      error: state.error,
      lastUpdated: state.lastUpdated,
    },
  });
}

// Update extension badge
function updateBadge(count) {
  if (count > 0) {
    chrome.action.setBadgeText({ text: count.toString() });
    chrome.action.setBadgeBackgroundColor({ color: "#FFD700" }); // Gold color for the badge
  } else {
    chrome.action.setBadgeText({ text: "" });
  }
}

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Honey Barrel: Received message", message.action);

  switch (message.action) {
    case "BOTTLE_DETECTED":
      // A new bottle was detected on a retail site
      findBottleMatches(message.payload.bottleInfo);
      sendResponse({ success: true });
      break;

    case "GET_STATE":
      // Popup is requesting current state
      sendResponse({
        currentBottle: state.currentBottle,
        matches: state.matches,
        isLoading: state.isLoading,
        error: state.error,
        lastUpdated: state.lastUpdated,
      });
      break;

    case "REFRESH_LISTINGS":
      // Manual refresh requested
      updateBaxusListings(true)
        .then(() => sendResponse({ success: true }))
        .catch((error) =>
          sendResponse({ success: false, error: error.message })
        );
      return true; // Keep the message channel open for async response

    case "CLEAR_STATE":
      // Clear current state
      state.currentBottle = null;
      state.matches = [];
      state.error = null;
      updateBadge(0);
      sendResponse({ success: true });
      break;
  }
});

// Initialize when the service worker starts
initialize();
