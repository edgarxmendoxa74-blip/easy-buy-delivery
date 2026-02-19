
async function searchMarket() {
    console.log('Searching for "Calinan Public Market"...');
    try {
        const searchUrl = `https://nominatim.openstreetmap.org/search?format=json&q=Calinan+Public+Market+Davao+City&limit=1`;
        const searchResp = await fetch(searchUrl, { headers: { 'User-Agent': 'Easy-Buy-Test' } });
        const searchData = await searchResp.json();
        if (searchData.length > 0) {
            console.log('Found "Calinan Public Market" at:', searchData[0].lat, searchData[0].lon);
            console.log('Address:', searchData[0].display_name);
        } else {
            console.log('Could not find "Calinan Public Market".');
        }
    } catch (e) {
        console.error('Search failed:', e);
    }
}

searchMarket();
