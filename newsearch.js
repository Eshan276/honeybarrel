// const fs = require("fs");
// const rawData = fs.readFileSync("data2.json", "utf-8");
// let listings = JSON.parse(rawData);
// function findMatches(bottleInfo, listings) {
//   // Normalize the search term (remove extra spaces, make lowercase)
//   const searchTerm = bottleInfo.toLowerCase().trim();

//   // Break the search term into keywords
//   const keywords = searchTerm.split(/\s+/).filter((word) => word.length > 2);

//   // Calculate scores for each listing
//   const scoredListings = listings.map((listing) => {
//     const listingName = listing._source.name?.toLowerCase() || "";
//     const listingProducer =
//       listing._source.attributes?.Producer?.toLowerCase() || "";
//     const listingType = listing._source.attributes?.Type?.toLowerCase() || "";

//     // Start with a score of 0
//     let score = 0;

//     // Check for exact match (highest priority)
//     if (listingName === searchTerm) {
//       score += 100;
//     }

//     // Check for partial matches in name
//     keywords.forEach((keyword) => {
//       // Higher score for matches in the name
//       if (listingName.includes(keyword)) {
//         score += 10;
//       }

//       // Some score for matches in producer
//       if (listingProducer.includes(keyword)) {
//         score += 5;
//       }

//       // Some score for matches in type
//       if (listingType.includes(keyword)) {
//         score += 3;
//       }
//     });

//     // Return the listing with its score
//     return {
//       listing,
//       score,
//     };
//   });

//   // Filter to only include listings with a score > 0 and sort by score (highest first)
//   const matches = scoredListings
//     .filter((item) => item.score > 0)
//     .sort((a, b) => b.score - a.score);

//   // Return the top matches (adjust number as needed)
//   return matches.slice(0, 5).map((item) => item.listing);
// }

// const bottleInfo = "Carlyle Blended Scotch Whisky";
// const matches = findMatches(bottleInfo, listings);
// console.log(matches);
/**
 * Enhanced matching algorithm for finding similar bottles across different retailers
 * 
 * This algorithm uses multiple factors to determine matches:
 * - Name similarity (word overlap, character-level similarity)
 * - Spirit type matching (whisky, bourbon, etc.)
 * - Producer/distillery matching
 * - Age statement matching
 * - Vintage/year matching
 */

// Normalize text for better comparison
function normalizeText(text) {
  if (!text) return "";

  return text
    .toLowerCase()
    // Remove special characters
    .replace(/[^\w\s-]/g, " ")
    // Remove extra spaces
    .replace(/\s+/g, " ")
    // Remove common suffixes and size indicators
    .replace(/(750ml|70cl|1l|1\.75l|gift set|limited edition)\s*$/i, "")
    .trim();
}

// Extract numbers from text (for age matching)
function extractNumbers(text) {
  if (!text) return [];
  const matches = text.match(/\d+/g);
  return matches ? matches.map(num => parseInt(num, 10)) : [];
}

// Extract year from text (for vintage matching)
function extractYear(text) {
  if (!text) return null;
  const yearMatch = text.match(/\b(19|20)\d{2}\b/);
  return yearMatch ? parseInt(yearMatch[0], 10) : null;
}

// Calculate Levenshtein distance (character-level similarity)
function levenshteinDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];

  // Initialize matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[b.length][a.length];
}

// Calculate normalized Levenshtein similarity (0-1 scale)
function levenshteinSimilarity(a, b) {
  const maxLength = Math.max(a.length, b.length);
  if (maxLength === 0) return 1.0; // Both strings empty
  
  const distance = levenshteinDistance(a, b);
  return 1 - (distance / maxLength);
}

// Calculate word overlap similarity
function wordSimilarity(str1, str2) {
  // Convert both strings to lowercase and split into words
  const words1 = str1.toLowerCase().split(/\s+/).filter(word => word.length > 2);
  const words2 = str2.toLowerCase().split(/\s+/).filter(word => word.length > 2);
  
  if (words1.length === 0 || words2.length === 0) return 0;

  // Count how many words from str1 appear in str2
  const commonWordCount = words1.filter(word => words2.includes(word)).length;
  
  // Calculate word overlap percentage
  return commonWordCount / Math.max(words1.length, words2.length);
}

// Check if spirit types match or are similar
function spiritTypeMatch(type1, type2) {
  if (!type1 || !type2) return 0;
  
  // Normalize types
  type1 = type1.toLowerCase();
  type2 = type2.toLowerCase();
  
  // Exact match
  if (type1 === type2) return 1;
  
  // Group similar spirit types (e.g., "bourbon whiskey" and "bourbon" should match)
  const spiritGroups = [
    ['bourbon', 'bourbon whiskey', 'kentucky bourbon'],
    ['scotch', 'scotch whisky', 'single malt scotch', 'blended scotch'],
    ['whisky', 'whiskey', 'rye whiskey', 'japanese whisky'],
    ['tequila', 'mezcal'],
    ['rum', 'dark rum', 'white rum', 'spiced rum'],
    ['gin', 'london dry gin'],
    ['vodka', 'flavored vodka'],
    ['brandy', 'cognac', 'armagnac']
  ];
  
  // Check if types are in the same group
  for (const group of spiritGroups) {
    if (group.some(term => type1.includes(term)) && 
        group.some(term => type2.includes(term))) {
      return 0.8; // 80% match if in same group
    }
  }
  
  // Partial matching based on text similarity
  return wordSimilarity(type1, type2) * 0.5; // Reduce weight for partial matches
}

// Match year or vintage between bottles
function yearMatch(year1, year2) {
  if (!year1 || !year2) return 0;
  if (year1 === year2) return 1;
  
  // Close years get partial credit (e.g., 2012 vs 2013)
  const yearDiff = Math.abs(year1 - year2);
  if (yearDiff <= 1) return 0.9;
  if (yearDiff <= 2) return 0.8;
  if (yearDiff <= 5) return 0.5;
  
  return 0;
}

// Check if age statements match (e.g., "12 Year")
function ageMatch(age1, age2) {
  if (!age1 || !age2) return 0;
  if (age1 === age2) return 1;
  
  // Close ages get partial credit
  const ageDiff = Math.abs(age1 - age2);
  if (ageDiff <= 1) return 0.9;
  if (ageDiff <= 3) return 0.7;
  
  return 0;
}

// Main matching function
function findEnhancedMatches(bottleInfo, listings) {
  // Extract and normalize bottle information
  const bottleName = normalizeText(bottleInfo.name);
  const bottleProducer = normalizeText(bottleInfo.producer || "");
  const bottleSpiritType = normalizeText(bottleInfo.spiritType || "");
  const bottleAge = bottleInfo.age ? parseInt(bottleInfo.age, 10) : extractNumbers(bottleName).find(num => num > 3 && num < 100);
  const bottleYear = bottleInfo.vintage || extractYear(bottleName);
  
  console.log("Matching bottle:", {
    name: bottleName,
    producer: bottleProducer,
    spiritType: bottleSpiritType,
    age: bottleAge,
    year: bottleYear
  });
  
  // Score each listing
  const scoredListings = listings.map(listing => {
    const listingData = listing._source;
    const listingName = normalizeText(listingData.name || "");
    const listingProducer = normalizeText(listingData.attributes?.Producer || "");
    const listingSpiritType = normalizeText(listingData.spiritType || listingData.attributes?.Type || "");
    const listingAge = listingData.attributes?.Age ? parseInt(listingData.attributes.Age, 10) : extractNumbers(listingName).find(num => num > 3 && num < 100);
    const listingYearDistilled = listingData.attributes?.["Year Distilled"] ? parseInt(listingData.attributes["Year Distilled"], 10) : null;
    const listingYearBottled = listingData.attributes?.["Year Bottled"] ? parseInt(listingData.attributes["Year Bottled"], 10) : null;
    const listingYear = listingYearDistilled || listingYearBottled || extractYear(listingName);
    
    // Calculate individual scores
    const nameWordScore = wordSimilarity(bottleName, listingName) * 30;  // 30 points max for word matching
    const nameLevenScore = levenshteinSimilarity(bottleName, listingName) * 25;  // 25 points max for character similarity
    
    // Producer matching (more weight if bottle has producer info)
    let producerScore = 0;
    if (bottleProducer && listingProducer) {
      producerScore = wordSimilarity(bottleProducer, listingProducer) * 20;  // 20 points max for producer
    } else if (listingProducer) {
      // Check if producer appears in bottle name
      producerScore = bottleName.includes(listingProducer.toLowerCase()) ? 15 : 0;
    }
    
    // Spirit type matching
    const spiritTypeScore = spiritTypeMatch(bottleSpiritType, listingSpiritType) * 15;  // 15 points max
    
    // Age matching
    let ageScore = 0;
    if (bottleAge && listingAge) {
      ageScore = ageMatch(bottleAge, listingAge) * 5;  // 5 points max
    }
    
    // Year/vintage matching
    let yearScore = 0;
    if (bottleYear && listingYear) {
      yearScore = yearMatch(bottleYear, listingYear) * 5;  // 5 points max
    }
    
    // Calculate total score (max 100 points)
    const totalScore = nameWordScore + nameLevenScore + producerScore + spiritTypeScore + ageScore + yearScore;
    
    // For debugging
    const scoreDetails = {
      nameWordScore,
      nameLevenScore,
      producerScore,
      spiritTypeScore,
      ageScore,
      yearScore,
      totalScore
    };
    
    return {
      listing,
      score: totalScore,
      details: scoreDetails
    };
  });
  
  // Filter and sort results
  const matches = scoredListings
    .filter(item => item.score > 15) // Minimum threshold to be considered a match
    .sort((a, b) => b.score - a.score);
  
  // Return the top matches
  return matches.slice(0, 5).map(item => ({
    ...item.listing,
    _matchScore: Math.round(item.score),
    _matchDetails: item.details
  }));
}

// Export the functions for use in other modules
module.exports = {
  findEnhancedMatches,
  normalizeText,
  extractYear,
  wordSimilarity,
  spiritTypeMatch
};