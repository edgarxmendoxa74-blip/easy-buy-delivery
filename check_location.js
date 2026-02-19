
async function checkLocation() {
    // Current coordinates in useLocationService.ts
    const currentLat = 7.1902484;
    const currentLng = 125.4524905;

    console.log(`Checking current coordinates: ${currentLat}, ${currentLng}`);

    // Reverse Geocode current location
    try {
        const reverseUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${currentLat}&lon=${currentLng}`;
        const reverseResp = await fetch(reverseUrl, { headers: { 'User-Agent': 'Easy-Buy-Test' } });
        const reverseData = await reverseResp.json();
        console.log('Current Location is at:', reverseData.display_name);
    } catch (e) {
        console.error('Reverse geocode failed:', e);
    }

    console.log('\nSearching for "Easy Buy Delivery"...');
    // Forward Geocode "Easy Buy Delivery"
    try {
        const searchUrl = `https://nominatim.openstreetmap.org/search?format=json&q=Easy+Buy+Delivery+Davao+City&limit=1`;
        const searchResp = await fetch(searchUrl, { headers: { 'User-Agent': 'Easy-Buy-Test' } });
        const searchData = await searchResp.json();
        if (searchData.length > 0) {
            console.log('Found "Easy Buy Delivery" at:', searchData[0].lat, searchData[0].lon);
            console.log('Address:', searchData[0].display_name);
        } else {
            console.log('Could not find "Easy Buy Delivery" by name.');
        }
    } catch (e) {
        console.error('Search failed:', e);
    }
}

checkLocation();
