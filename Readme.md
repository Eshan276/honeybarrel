# HoneyBarrel

HoneyBarrel is a Chrome extension designed to [briefly describe the purpose of the extension].

## Features

### Multi-Factor Matching
The algorithm evaluates multiple attributes to ensure accurate matching:
- **Name similarity**: Uses both word overlap and character-level matching.
- **Spirit type matching**: Matches categories like whisky, bourbon, etc.
- **Producer/distillery matching**: Identifies matches based on producer or distillery.
- **Age statement matching**: Compares age statements for better precision.
- **Vintage/year matching**: Matches products based on vintage or year.

### Smarter Text Processing
Enhanced text processing capabilities include:
- **Better text normalization**: Standardizes text for improved comparison.
- **Levenshtein distance calculation**: Measures character-level similarity.
- **Improved word overlap calculation**: Ensures accurate word-based matching.
![Matching Algorithm Visualization](Public/graph1.png)
### Spirit Type Categorization
- Groups similar spirit types (e.g., "bourbon whiskey" and "bourbon").
- Supports partial matching for related spirit categories.

### Attribute Extraction
- Automatically extracts **age statements** from product names.
- Identifies **vintage years** from product descriptions.
- Handles diverse data formats in listings.
![Spirit Type Categorization Visualization](Public/graph2.png)
### Detailed Scoring System
- A **100-point scoring system** with weighted components for precise evaluation.
- Provides a **score breakdown** for transparency in matching.
- Includes a **minimum threshold filter** to eliminate weak matches.

## Installation

1. Clone the repository:
    ```bash
    git clone https://github.com/yourusername/honeybarrel.git
    ```
2. Navigate to the project directory:
    ```bash
    cd honeybarrel
    ```
3. Open Google Chrome and go to `chrome://extensions/`.
4. Enable "Developer mode" (toggle in the top-right corner).
5. Click on "Load unpacked" and select the project directory.

## Usage

Once the extension is loaded, you can [insert usage instructions, e.g., click on the extension icon or describe its functionality].

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a new branch:
    ```bash
    git checkout -b feature-name
    ```
3. Commit your changes:
    ```bash
    git commit -m "Add feature-name"
    ```
4. Push to the branch:
    ```bash
    git push origin feature-name
    ```
5. Open a pull request.

## License

This project is licensed under the [License Name]. See the [LICENSE](LICENSE) file for details.

## Contact

For questions or feedback, please contact [your email or other contact info].
