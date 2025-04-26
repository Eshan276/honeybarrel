const Fuse = require('fuse.js');

// fuse.js
// This module can be used to implement functionality using Fuse.js for fuzzy searching.


// Example data to search
const data = [
    { title: "Old Man's War", author: "John Scalzi" },
    { title: "The Lock Artist", author: "Steve Hamilton" },
    { title: "HTML5", author: "Remy Sharp" },
];

// Fuse.js options
const options = {
    keys: ['title', 'author'], // Fields to search in
    threshold: 0.3, // Adjust sensitivity of the search
};

// Create a Fuse instance
const fuse = new Fuse(data, options);

// Function to perform a search
function search(query) {
    const results = fuse.search(query);
    return results.map(result => result.item);
}

// Example usage
const query = "old man";
const searchResults = search(query);
console.log("Search Results:", searchResults);

module.exports = { search };