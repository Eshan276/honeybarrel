/**
 * Text Normalization Utilities
 *
 * Functions to standardize bottle information for more accurate matching
 */

/**
 * Normalize bottle name by removing common variations and formatting
 *
 * @param {string} name - Original bottle name
 * @return {string} - Normalized bottle name
 */
export function normalizeText(name) {
  if (!name) return "";

  let normalized = name
    .toLowerCase()
    // Remove special characters
    .replace(/[^\w\s-]/g, " ")
    // Remove extra spaces
    .replace(/\s+/g, " ")
    // Remove common suffixes/prefixes
    .replace(/(750ml|70cl|1l|1\.75l|gift set|limited edition)\s*$/i, "")
    // Standardize vintage format if included in name
    .replace(/\b(19|20)\d{2}\b/g, "")
    // Handle common abbreviations
    .replace(/\byr\b/g, "year")
    .replace(/\bold\b/g, "year")
    .trim();

  // Special case handling for common brand misspellings
  normalized = handleCommonMisspellings(normalized);

  return normalized;
}

/**
 * Normalize vintage year
 *
 * @param {string|number} year - Year value to normalize
 * @return {number|null} - Normalized year or null if invalid
 */
export function normalizeYear(year) {
  if (!year) return null;

  // Convert to string and extract first 4-digit number
  const yearStr = String(year);
  const match = yearStr.match(/\b(19|20)\d{2}\b/);

  if (match) {
    return parseInt(match[0], 10);
  }

  // Try to interpret 2-digit years
  const twoDigitMatch = yearStr.match(/\b\d{2}\b/);
  if (twoDigitMatch) {
    const twoDigitYear = parseInt(twoDigitMatch[0], 10);
    // Assume 00-49 is 2000-2049, 50-99 is 1950-1999
    return twoDigitYear < 50 ? 2000 + twoDigitYear : 1900 + twoDigitYear;
  }

  return null;
}

/**
 * Normalize volume to milliliters
 *
 * @param {string|number} volume - Volume value with potential unit
 * @return {number|null} - Volume in ml or null if invalid
 */
export function normalizeVolume(volume) {
  if (!volume) return null;

  const volumeStr = String(volume).toLowerCase();

  // Already a number with no unit, assume ml
  if (!isNaN(volumeStr)) {
    return parseFloat(volumeStr);
  }

  // Extract number and unit
  const match = volumeStr.match(/(\d+(?:\.\d+)?)\s*(ml|cl|l|oz|liter|litre)/i);
  if (!match) return null;

  const value = parseFloat(match[1]);
  const unit = match[2].toLowerCase();

  // Convert to ml
  switch (unit) {
    case "ml":
      return value;
    case "cl":
      return value * 10;
    case "l":
    case "liter":
    case "litre":
      return value * 1000;
    case "oz":
      return value * 29.5735; // 1 oz = 29.5735 ml
    default:
      return null;
  }
}

/**
 * Handle common brand misspellings and variations
 */
function handleCommonMisspellings(text) {
  // Common whisky brand variations
  const replacements = {
    macallan: "macallan",
    "the macallan": "macallan",
    laphroaig: "laphroaig",
    lafroig: "laphroaig",
    glenlivet: "glenlivet",
    "the glenlivet": "glenlivet",
    "johnnie walker": "johnnie walker",
    "johnie walker": "johnnie walker",
    // Wine variations
    chateau: "chateau",
    château: "chateau",
    domaine: "domaine",
    "dom perignon": "dom perignon",
    "dom pérignon": "dom perignon",
    // Add more as needed
  };

  // Replace known variations
  for (const [variation, standard] of Object.entries(replacements)) {
    const regex = new RegExp(`\\b${variation}\\b`, "gi");
    text = text.replace(regex, standard);
  }

  return text;
}

/**
 * Extract vintage from bottle name if present
 *
 * @param {string} name - Bottle name
 * @return {number|null} - Extracted vintage year or null
 */
export function extractVintageFromName(name) {
  if (!name) return null;

  // Look for 4-digit years
  const yearMatch = name.match(/\b(19|20)\d{2}\b/);
  if (yearMatch) {
    return parseInt(yearMatch[0], 10);
  }

  return null;
}

/**
 * Extract bottle age statement if present
 *
 * @param {string} name - Bottle name
 * @return {number|null} - Extracted age or null
 */
export function extractAgeStatement(name) {
  if (!name) return null;

  // Common patterns for age statements
  const agePatterns = [
    /\b(\d+)\s*year(?:s)?\s+old\b/i, // "12 year old", "12 years old"
    /\b(\d+)\s*yr(?:s)?\s+old\b/i, // "12 yr old", "12 yrs old"
    /\b(\d+)\s*yr(?:s)?\b/i, // "12 yr", "12 yrs"
    /\b(\d+)\s*y\.?o\.?\b/i, // "12 yo", "12 y.o."
    /\b(\d+)\s*age(?:d)?\b/i, // "12 aged", "12 age"
    /\baged\s+(\d+)\b/i, // "aged 12"
  ];

  for (const pattern of agePatterns) {
    const match = name.match(pattern);
    if (match) {
      return parseInt(match[1], 10);
    }
  }

  return null;
}
