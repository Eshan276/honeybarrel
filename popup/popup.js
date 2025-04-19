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
