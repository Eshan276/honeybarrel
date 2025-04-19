/**
 * BAXUS API Service
 *
 * Handles all interactions with the BAXUS marketplace API
 */

const API_BASE_URL = "https://services.baxus.co/api";
const LISTINGS_ENDPOINT = "/search/listings";
const DEFAULT_PAGE_SIZE = 100;

/**
 * Cache for API responses to minimize network requests
 */
const responseCache = {
  listings: {
    data: null,
    timestamp: null,
    expiresInMinutes: 15,
  },
};

/**
 * Get all current BAXUS marketplace listings
 *
 * @param {Object} options - Search options
 * @param {boolean} options.forceRefresh - Bypass cache and fetch fresh data
 * @param {number} options.size - Number of results per page
 * @return {Promise<Array>} - Array of BAXUS listings
 */
export async function getAllListings({
  forceRefresh = false,
  size = DEFAULT_PAGE_SIZE,
} = {}) {
  // Check cache first unless force refresh is requested
  if (!forceRefresh && isCacheValid("listings")) {
    console.log("Using cached BAXUS listings");
    return responseCache.listings.data;
  }

  try {
    // Build query parameters
    const params = new URLSearchParams({
      from: 0,
      size: size,
      listed: true,
    });

    // Fetch listings
    const response = await fetch(
      `${API_BASE_URL}${LISTINGS_ENDPOINT}?${params}`
    );

    if (!response.ok) {
      throw new Error(
        `BAXUS API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    // Process and normalize the listings
    const processedListings = processRawListings(data);

    // Update cache
    responseCache.listings.data = processedListings;
    responseCache.listings.timestamp = Date.now();

    return processedListings;
  } catch (error) {
    console.error("Error fetching BAXUS listings:", error);

    // Return cached data if available, even if expired
    if (responseCache.listings.data) {
      console.log("Using expired cache due to API error");
      return responseCache.listings.data;
    }

    throw error;
  }
}

/**
 * Process raw BAXUS API listings into standardized format
 *
 * @param {Object} rawData - Raw response from BAXUS API
 * @return {Array} - Processed listings
 */
function processRawListings(rawData) {
  if (!rawData || !rawData.hits || !Array.isArray(rawData.hits.hits)) {
    return [];
  }

  return rawData.hits.hits.map((hit) => {
    const source = hit._source;
    const bottleInfo = source.bottleInfo || {};

    return {
      id: hit._id,
      name: bottleInfo.bottleName || "",
      vintage: bottleInfo.vintage || null,
      volume: parseVolumeToMl(bottleInfo.volume),
      category: bottleInfo.category || "",
      price: source.price || 0,
      currency: source.currency || "USD",
      url: `https://baxus.co/marketplace/${hit._id}`,
      imageUrl:
        source.mediaUrls && source.mediaUrls.length > 0
          ? source.mediaUrls[0]
          : null,
      // Additional fields
      distillery: bottleInfo.distillery || "",
      region: bottleInfo.region || "",
      bottledBy: bottleInfo.bottledBy || "",
      bottledDate: bottleInfo.bottledDate || null,
      caskType: bottleInfo.caskType || "",
      abv: bottleInfo.abv || null,
      description: source.description || "",
    };
  });
}

/**
 * Convert volume string to milliliters
 */
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

/**
 * Check if cached data is still valid
 */
function isCacheValid(cacheKey) {
  const cache = responseCache[cacheKey];
  if (!cache || !cache.timestamp) return false;

  const ageInMs = Date.now() - cache.timestamp;
  const maxAgeInMs = cache.expiresInMinutes * 60 * 1000;

  return ageInMs < maxAgeInMs;
}

/**
 * Search for specific bottle in BAXUS marketplace
 *
 * @param {string} query - Search query
 * @return {Promise<Array>} - Matching listings
 */
export async function searchListings(query) {
  try {
    // Build query parameters
    const params = new URLSearchParams({
      from: 0,
      size: DEFAULT_PAGE_SIZE,
      listed: true,
      q: query,
    });

    const response = await fetch(
      `${API_BASE_URL}${LISTINGS_ENDPOINT}?${params}`
    );

    if (!response.ok) {
      throw new Error(
        `BAXUS search API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json(); // Read the response body once
    console.log(data); // Log the parsed JSON
    return processRawListings(data);
  } catch (error) {
    console.error("Error searching BAXUS listings:", error);
    throw error;
  }
}
