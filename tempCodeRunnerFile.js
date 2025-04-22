nfo, listings) {
  // Normalize the search term (remove extra spaces, make lowercase)
  const searchTerm = bottleInfo.toLowerCase().trim();

  // Break the search term into keywords
  const keywords = searchTerm.split(/\s+/).filter((word) => word.length > 2);

  // Calculate scores for each listing
  const scoredListings = listings.map((listing) => {
    const listingName = listing._source.name?.toLowerCase() || "";
    const listingProducer =
      listing._source.attributes?.Producer?.toLowerCase() || "";
    const listingType = listing._source.attributes?.Type?.toLowerCase() || "";

    // Start with a score of 0
    let score = 0;

    // Check for exact match (highest priority)
    if (listingName === searchTerm) {
      score += 100;
    }

    // Check for partial matches in name
    keywords.forEach((keyword) => {
      // Higher score for matches in the name
      if (listingName.includes(keyword)) {
        score += 10;
      }

      // Some score for matches in producer
      if (listingProducer.includes(keyword)) {
        score += 5;
      }

      // Some score for matches in type
      if (listingType.includes(keyword)) {
        score += 3;
      }
    });

    // Return the listing with its score
    return {
      listing,
      score,
    };
  });

  // Filter to only include listings with a score > 0 and sort by score (highest first)
  const matches = scoredListings
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  // Return the top matches (adjust number as needed)
  return matches.slice(0, 5).map((item) => item.listing);
}