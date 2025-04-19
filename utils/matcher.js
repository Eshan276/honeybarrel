/**
 * Bottle Matcher - Core matching algorithm for The Honey Barrel extension
 *
 * This module handles the complex task of matching bottles from retail sites
 * with listings in the BAXUS marketplace.
 */

import { normalizeText, normalizeYear, normalizeVolume } from "./normalizer.js";
import Fuse from "../lib/fuse.js";

/**
 * Configuration for fuzzy matching sensitivity
 */
const MATCHER_CONFIG = {
  nameThreshold: 0.85, // Minimum similarity score for name matching
  yearThreshold: 1.0, // Year must match exactly when present
  volumeThreshold: 0.8, // Volume must be close enough
  // Weights for different attributes in the final matching score
  weights: {
    name: 0.7,
    vintage: 0.2,
    volume: 0.1,
  },
};

/**
 * Main matching function to find BAXUS equivalents for a scraped bottle
 *
 * @param {Object} scrapedBottle - Bottle information scraped from retail site
 * @param {Array} baxusListings - Array of BAXUS marketplace listings
 * @return {Array} - Sorted array of matching bottles with match scores
 */
export async function findMatches(scrapedBottle, baxusListings) {
  // Normalize the scraped bottle information
  const normalizedScraped = {
    name: normalizeText(scrapedBottle.name),
    vintage: normalizeYear(scrapedBottle.vintage),
    volume: normalizeVolume(scrapedBottle.volume),
  };

  // Initial filtering - reduce the set of potential matches
  const potentialMatches = preFilterListings(normalizedScraped, baxusListings);

  // Configure Fuse.js for fuzzy matching
  const fuseOptions = {
    keys: ["name"],
    includeScore: true,
    threshold: 0.4, // Higher threshold to get more potential matches
  };

  const fuse = new Fuse(potentialMatches, fuseOptions);
  const nameResults = fuse.search(normalizedScraped.name);

  // Further refine matches with additional attributes
  const refinedMatches = refineMatches(normalizedScraped, nameResults);

  // Sort matches by final score (highest first)
  refinedMatches.sort((a, b) => b.finalScore - a.finalScore);

  // Filter only high-confidence matches
  return refinedMatches.filter((match) => match.finalScore > 0.7);
}

/**
 * Pre-filter listings to reduce the matching set
 * Uses basic category and type matching to eliminate obvious non-matches
 */
function preFilterListings(normalizedBottle, baxusListings) {
  // Extract basic category (whisky, wine, etc.)
  const category = extractCategory(normalizedBottle.name);

  return baxusListings.filter((listing) => {
    // Filter by basic category
    const listingCategory = extractCategory(listing.name);
    if (category && listingCategory && category !== listingCategory) {
      return false;
    }

    // Vintage filtering - if both have years and they don't match, exclude
    if (
      normalizedBottle.vintage &&
      listing.vintage &&
      normalizedBottle.vintage !== listing.vintage
    ) {
      return false;
    }

    return true;
  });
}

/**
 * Refine matches using additional attributes beyond name
 */
function refineMatches(normalizedScraped, nameResults) {
  return nameResults.map((result) => {
    const { item, score: nameScore } = result;
    const listing = item;

    // Initialize with name matching score
    let finalScore = (1 - nameScore) * MATCHER_CONFIG.weights.name;

    // Add vintage matching score if available
    if (normalizedScraped.vintage && listing.vintage) {
      const vintageScore =
        normalizedScraped.vintage === listing.vintage ? 1.0 : 0.0;
      finalScore += vintageScore * MATCHER_CONFIG.weights.vintage;
    } else if (!normalizedScraped.vintage && !listing.vintage) {
      // Both don't have vintage, which is a match
      finalScore += MATCHER_CONFIG.weights.vintage;
    }

    // Add volume matching score if available
    if (normalizedScraped.volume && listing.volume) {
      const volumeDiff =
        Math.abs(normalizedScraped.volume - listing.volume) / listing.volume;
      const volumeScore =
        volumeDiff < 0.05 ? 1.0 : volumeDiff < 0.1 ? 0.8 : 0.0;
      finalScore += volumeScore * MATCHER_CONFIG.weights.volume;
    }

    return {
      listing,
      finalScore,
      nameScore: 1 - nameScore,
    };
  });
}

/**
 * Extract basic category from bottle name
 * Helps with initial filtering
 */
function extractCategory(name) {
  const lowerName = name.toLowerCase();

  if (
    lowerName.includes("whisky") ||
    lowerName.includes("whiskey") ||
    lowerName.includes("bourbon") ||
    lowerName.includes("scotch")
  ) {
    return "whisky";
  }

  if (
    lowerName.includes("wine") ||
    lowerName.includes("cabernet") ||
    lowerName.includes("merlot") ||
    lowerName.includes("pinot")
  ) {
    return "wine";
  }

  if (
    lowerName.includes("champagne") ||
    lowerName.includes("prosecco") ||
    lowerName.includes("sparkling")
  ) {
    return "sparkling";
  }

  // Add more categories as needed

  return null; // Unknown category
}
