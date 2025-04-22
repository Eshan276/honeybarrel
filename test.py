import requests
import json

# URL to fetch data from
url = "https://services.baxus.co/api/search/listings?from=0&size=10000"

# Fetch the data
response = requests.get(url)

# Check if the request was successful
if response.status_code == 200:
    # Parse the JSON data
    data = response.json()
    
    # Save the data to a JSON file
    with open("data.json", "w") as json_file:
        json.dump(data, json_file, indent=4)
    print("Data saved to data.json")
else:
    print(f"Failed to fetch data. Status code: {response.status_code}")