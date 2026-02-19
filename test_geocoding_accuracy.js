

async function testGeocode(query) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=ph`;
    console.log(`Querying: ${query}`);
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Easy-Buy-Delivery-Test-Script'
            }
        });
        const data = await response.json();
        console.log(`Results for "${query}":`, data.length);
        if (data.length > 0) {
            console.log('Top result:', data[0].display_name);
            console.log('Lat/Lon:', data[0].lat, data[0].lon);
        } else {
            console.log('No results found.');
        }
        console.log('---');
    } catch (error) {
        console.error('Error:', error);
    }
}

async function testGeocodeWithViewbox(query) {
    // Viewbox for Davao/Calinan area (approximate)
    const viewbox = '125.30,7.30,125.70,7.00';
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=ph&viewbox=${viewbox}&bounded=1`;
    console.log(`Querying with viewbox: ${query}`);
    try {
        const response = await fetch(url, { headers: { 'User-Agent': 'Easy-Buy-Delivery-Test-Script' } });
        const data = await response.json();
        console.log(`Results:`, data.length);
        if (data.length > 0) console.log('Top result:', data[0].display_name);
        console.log('---');
    } catch (error) { console.error('Error:', error); }
}

async function runTests() {
    await testGeocode('Vallafuarte, Calinan');
    await testGeocode('Villafuerte, Calinan');
    await testGeocodeWithViewbox('Vallafuarte');
    await testGeocodeWithViewbox('Villafuerte');
}

runTests();
