/**
 * TotalWine Scraper for The Honey Barrel
 *
 * Extracts bottle information from TotalWine product pages
 */

export class TotalWineScraper {
  /**
   * Check if the current page is a product page
   * @return {boolean} - True if current page is a product page
   */
  isProductPage() {
    // Check URL pattern for product pages
    return (
      window.location.pathname.includes("/p/") &&
      document.querySelector(".pdp-product-info") !== null
    );
  }

  /**
   * Scrape bottle information from the page
   * @return {Object} - Extracted bottle information
   */
  async scrape() {
    try {
      const bottleInfo = {
        name: this.extractName(),
        price: this.extractPrice(),
        volume: this.extractVolume(),
        vintage: this.extractVintage(),
        category: this.extractCategory(),
        abv: this.extractABV(),
        description: this.extractDescription(),
        imageUrl: this.extractImageUrl(),
      };

      return bottleInfo;
    } catch (error) {
      console.error("TotalWine scraping error:", error);
      return null;
    }
  }

  /**
   * Extract product name
   */
  extractName() {
    const nameElement = document.querySelector(".pdp-product-info h1");
    if (!nameElement) return "";

    return nameElement.textContent.trim();
  }

  /**
   * Extract product price
   */
  extractPrice() {
    const priceElement = document.querySelector(".price .price-wrapper");
    if (!priceElement) return null;

    // Remove currency symbol and parse as float
    const priceText = priceElement.textContent.trim().replace(/[^\d.]/g, "");
    return parseFloat(priceText) || null;
  }

  /**
   * Extract bottle volume
   */
  extractVolume() {
    // TotalWine usually includes volume in the product details section
    const productDetails = document.querySelectorAll(
      ".pdp-tab-overview-prod-item"
    );

    for (const detail of productDetails) {
      const label = detail.querySelector(".pdp-product-attribute-label");
      const value = detail.querySelector(".pdp-product-attribute-value");

      if (
        label &&
        value &&
        (label.textContent.includes("Size") ||
          label.textContent.includes("Volume"))
      ) {
        return value.textContent.trim();
      }
    }

    // Fallback: Look for volume in the title
    const title = this.extractName();
    const volumeMatch = title.match(
      /\b(\d+(\.\d+)?)\s*(ml|cl|l|liter|litre)\b/i
    );

    if (volumeMatch) {
      return volumeMatch[0];
    }

    return null;
  }

  /**
   * Extract vintage year
   */
  extractVintage() {
    // Look in product details first
    const productDetails = document.querySelectorAll(
      ".pdp-tab-overview-prod-item"
    );

    for (const detail of productDetails) {
      const label = detail.querySelector(".pdp-product-attribute-label");
      const value = detail.querySelector(".pdp-product-attribute-value");

      if (label && value && label.textContent.includes("Vintage")) {
        const vintageText = value.textContent.trim();
        const yearMatch = vintageText.match(/\b(19|20)\d{2}\b/);
        return yearMatch ? parseInt(yearMatch[0], 10) : null;
      }
    }

    // Fallback: Look for vintage in the title
    const title = this.extractName();
    const yearMatch = title.match(/\b(19|20)\d{2}\b/);

    return yearMatch ? parseInt(yearMatch[0], 10) : null;
  }

  /**
   * Extract product category
   */
  extractCategory() {
    // Look in breadcrumbs or product details
    const breadcrumbs = document.querySelectorAll(".breadcrumb-list a");

    if (breadcrumbs.length > 1) {
      // Usually the second breadcrumb is the category (e.g., Wine, Spirits)
      return breadcrumbs[1].textContent.trim();
    }

    // Fallback: Look in product details
    const productDetails = document.querySelectorAll(
      ".pdp-tab-overview-prod-item"
    );

    for (const detail of productDetails) {
      const label = detail.querySelector(".pdp-product-attribute-label");
      const value = detail.querySelector(".pdp-product-attribute-value");

      if (label && value && label.textContent.includes("Category")) {
        return value.textContent.trim();
      }
    }

    return null;
  }

  /**
   * Extract alcohol by volume (ABV)
   */
  extractABV() {
    // Look in product details
    const productDetails = document.querySelectorAll(
      ".pdp-tab-overview-prod-item"
    );

    for (const detail of productDetails) {
      const label = detail.querySelector(".pdp-product-attribute-label");
      const value = detail.querySelector(".pdp-product-attribute-value");

      if (
        label &&
        value &&
        (label.textContent.includes("ABV") ||
          label.textContent.includes("Alcohol"))
      ) {
        // Extract percentage value
        const abvText = value.textContent.trim();
        const percentMatch = abvText.match(/(\d+(\.\d+)?)\s*%/);

        return percentMatch ? parseFloat(percentMatch[1]) : null;
      }
    }

    return null;
  }

  /**
   * Extract product description
   */
  extractDescription() {
    const descElement = document.querySelector(".pdp-product-description");
    return descElement ? descElement.textContent.trim() : "";
  }

  /**
   * Extract product image URL
   */
  extractImageUrl() {
    const imageElement = document.querySelector(".pdp-product-image img");
    return imageElement ? imageElement.src : null;
  }
}
