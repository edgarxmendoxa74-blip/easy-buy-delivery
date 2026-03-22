import { useState, useCallback } from 'react';

// Restaurant location: Floridablanca Center
const RESTAURANT_LOCATION = {
  lat: 14.9667, // Updated Location
  lng: 120.5333 // Updated Location
};

// Delivery center: Floridablanca, Pampanga
// This is the point from which delivery distance is calculated
const DELIVERY_CENTER = {
  lat: 14.9667, // Updated Delivery Center
  lng: 120.5333, // Updated Delivery Center
  address: 'Floridablanca, Pampanga'
};

// Maximum delivery radius in kilometers from delivery center (adjust as needed)
const MAX_DELIVERY_RADIUS_KM = 100;

interface DistanceResult {
  distance: number; // in kilometers
  duration?: string;
  routeCoordinates?: [number, number][];
}

export const useLocationService = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Use delivery center coordinates directly
  // Use delivery center coordinates directly
  const deliveryCenterCoords = DELIVERY_CENTER;

  // Calculate distance using Haversine formula (straight-line distance)
  const calculateDistanceHaversine = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const straightLineDistance = R * c;
    
    // Add 20% buffer for road distance (straight-line is usually shorter than actual road distance)
    return straightLineDistance * 1.2;
  };

  // Viewbox for Floridablanca area to bias search results
  // Format: min_lon,min_lat,max_lon,max_lat (approximate bounding box for Floridablanca)
  const VIEWBOX = '120.40,14.80,120.70,15.10';

  // Geocode using Photon (Komoot) - Better for fuzzy search and typos
  const geocodeAddressPhoton = async (query: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      // Bias towards Floridablanca
      const lat = 14.9667;
      const lon = 120.5333;
      const response = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&lat=${lat}&lon=${lon}&limit=3`
      );
      
      if (!response.ok) return null;
      
      const data = await response.json();
      if (data.features && data.features.length > 0) {
        // Filter results to ensure they are in the Philippines
        const phResult = data.features.find((f: any) => 
          f.properties.country === 'Philippines' || 
          f.properties.countrycode === 'PH'
        );

        if (phResult) {
          return {
            lat: phResult.geometry.coordinates[1],
            lng: phResult.geometry.coordinates[0]
          };
        }
        
        // If no PH result but we have results, return the first one if it looks local
        // (Photon sometimes misses country tags for local streets)
        const first = data.features[0];
        const props = first.properties;
        if (props.city === 'Floridablanca' || props.state === 'Pampanga') {
           return {
            lat: first.geometry.coordinates[1],
            lng: first.geometry.coordinates[0]
          };
        }
      }
      return null;
    } catch (err) {
      console.error('Photon geocoding error:', err);
      return null;
    }
  };

  // Geocode using Nominatim (OSM) - Good for structured addresses
  const geocodeAddressNominatim = async (query: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=ph&viewbox=${VIEWBOX}&bounded=1`
      );
      
      if (!response.ok) return null;
      
      const data = await response.json();
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        };
      }
      return null;
    } catch (err) {
      console.error('Nominatim geocoding error:', err);
      return null;
    }
  };

  // Combined Geocoding Strategy
  const geocodeAddressOSM = async (address: string): Promise<{ lat: number; lng: number } | null> => {
    // 1. Try Photon first (handles typos better)
    let coords = await geocodeAddressPhoton(address);
    if (coords) return coords;

    // 2. Try Photon with "Floridablanca" appended if not present
    if (!address.toLowerCase().includes('floridablanca')) {
      coords = await geocodeAddressPhoton(`${address}, Floridablanca`);
      if (coords) return coords;
    }

    // 3. Fallback to Nominatim (Standard OSM)
    coords = await geocodeAddressNominatim(address);
    if (coords) return coords;

    // 4. Fallback: Try with "Pampanga" appended
    const fullAddress = address.includes('Pampanga') || address.includes('Philippines') 
      ? address 
      : `${address}, Pampanga, Philippines`;
    
    coords = await geocodeAddressNominatim(fullAddress);
    if (coords) return coords;

    // 5. Last Resort: Floridablanca Center
    if (address.toLowerCase().includes('floridablanca')) {
       return await geocodeAddressNominatim('Floridablanca, Pampanga');
    }

    return null;
  };

  // Geocode delivery center address on first load - REMOVED to keep precise coordinates
  // useEffect(() => {
  //   const geocodeDeliveryCenter = async () => {
  //     try {
  //       const coords = await geocodeAddressOSM(DELIVERY_CENTER.address);
  //       if (coords) {
  //         setDeliveryCenterCoords(coords);
  //       }
  //     } catch (err) {
  //       console.error('Error geocoding delivery center:', err);
  //     }
  //   };
  //   geocodeDeliveryCenter();
  // }, []);

  // Main distance calculation function - calculates from delivery center to customer address
  const calculateDistance = useCallback(async (destinationAddress: string): Promise<DistanceResult | null> => {
    setLoading(true);
    setError(null);

    try {
      const coords = await geocodeAddressOSM(destinationAddress);

      if (coords) {
        // Try to get driving distance and route from OSRM
        try {
          const response = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${deliveryCenterCoords.lng},${deliveryCenterCoords.lat};${coords.lng},${coords.lat}?overview=full&geometries=geojson&alternatives=true&steps=true`
          );

          if (response.ok) {
            const data = await response.json();
            if (data.routes && data.routes.length > 0) {
              // Smart Routing: Select the fastest route (lowest duration)
              const bestRoute = data.routes.sort((a: any, b: any) => a.duration - b.duration)[0];
              
              const distanceKm = bestRoute.distance / 1000; // Convert meters to km
              // OSRM returns [lng, lat], Leaflet needs [lat, lng]
              const routeCoords = bestRoute.geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]);

              setLoading(false);
              return {
                distance: Math.round(distanceKm * 10) / 10, // Round to 1 decimal place
                duration: Math.round(bestRoute.duration / 60) + ' min',
                routeCoordinates: routeCoords
              };
            }
          }
        } catch (osrmError) {
          console.error('OSRM routing failed, falling back to Haversine:', osrmError);
        }

        // Fallback: Calculate straight-line distance using Haversine formula
        const distance = calculateDistanceHaversine(
          deliveryCenterCoords.lat,
          deliveryCenterCoords.lng,
          coords.lat,
          coords.lng
        );
        
        setLoading(false);
        return {
          distance: Math.round(distance * 10) / 10 // Round to 1 decimal place
        };
      }

      // If geocoding fails
      setError('Could not find the address. Please enter a complete address including barangay and city.');
      setLoading(false);
      return null;
    } catch (err) {
      console.error('Distance calculation error:', err);
      setError('Failed to calculate distance. Please try again.');
      setLoading(false);
      return null;
    }
  }, [deliveryCenterCoords]);

  // Calculate distance between two arbitrary addresses (e.g., Angkas/Padala pickup -> drop-off)
  const calculateDistanceBetweenAddresses = useCallback(
    async (pickupAddress: string, dropoffAddress: string): Promise<DistanceResult | null> => {
      setLoading(true);
      setError(null);

      try {
        // Geocode both addresses
        const pickupCoords = await geocodeAddressOSM(pickupAddress);
        const dropoffCoords = await geocodeAddressOSM(dropoffAddress);

        if (pickupCoords && dropoffCoords) {
           // Try OSRM first
           try {
            const response = await fetch(
              `https://router.project-osrm.org/route/v1/driving/${pickupCoords.lng},${pickupCoords.lat};${dropoffCoords.lng},${dropoffCoords.lat}?overview=full&geometries=geojson&alternatives=true&steps=true`
            );
  
            if (response.ok) {
              const data = await response.json();
              if (data.routes && data.routes.length > 0) {
                // Smart Routing: Select the fastest route
                const bestRoute = data.routes.sort((a: any, b: any) => a.duration - b.duration)[0];
                
                const distanceKm = bestRoute.distance / 1000;
                const routeCoords = bestRoute.geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]);
  
                setLoading(false);
                return {
                  distance: Math.round(distanceKm * 10) / 10,
                  duration: Math.round(bestRoute.duration / 60) + ' min',
                  routeCoordinates: routeCoords
                };
              }
            }
          } catch (e) {
            console.warn('OSRM failed for arbitrary points, using Haversine');
          }

          // Fallback to Haversine
          const distance = calculateDistanceHaversine(
            pickupCoords.lat,
            pickupCoords.lng,
            dropoffCoords.lat,
            dropoffCoords.lng
          );

          setLoading(false);
          return {
            distance: Math.round(distance * 10) / 10
          };
        }

        setError('Could not find pickup or drop-off address. Please enter complete addresses.');
        setLoading(false);
        return null;
      } catch (err) {
        console.error('Distance calculation error (pickup->dropoff):', err);
        setError('Failed to calculate distance. Please try again.');
        setLoading(false);
        return null;
      }
    },
    []
  );

  // Calculate delivery fee (shared by Food / Pabili / Padala / Angkas)
  // Tiered delivery fee calculation:
  // - Base fee: ₱65 (0-2km)
  // - > 2km: +₱15
  // - > 3km: +₱25
  // - > 5km: +₱35
  // - > 10km: +₱50
  // - > 25km: +₱60
  // - > 30km: +₱100
  // - > 45km: +₱200
  const calculateDeliveryFee = useCallback((distance: number | null): number => {
    if (distance === null || distance === undefined || isNaN(distance)) {
      return 65; // Base fee if distance cannot be calculated
    }

    const baseFee = 65;
    let surcharge = 0;

    // Cumulative surcharges based on distance (stacking)
    if (distance > 2) {
      surcharge += 15;
    }
    if (distance > 3) {
      surcharge += 25;
    }
    if (distance > 5) {
      surcharge += 35;
    }
    if (distance > 10) {
      surcharge += 50;
    }
    if (distance > 25) {
      surcharge += 60;
    }
    if (distance > 30) {
      surcharge += 100;
    }
    if (distance > 45) {
      surcharge += 200;
    }
    
    return baseFee + surcharge;
  }, []);

  // Check if customer address is within delivery area (distance from restaurant)
  const isWithinDeliveryArea = useCallback(async (address: string): Promise<{ within: boolean; distance?: number; error?: string }> => {
    try {
      // Get coordinates for the customer's delivery address
      const coords = await geocodeAddressOSM(address);

      if (!coords) {
        return { within: false, error: 'Could not find the address location.' };
      }

      // Calculate distance from delivery center to customer address
      const distanceFromCenter = calculateDistanceHaversine(
        deliveryCenterCoords.lat,
        deliveryCenterCoords.lng,
        coords.lat,
        coords.lng
      );

      const within = distanceFromCenter <= MAX_DELIVERY_RADIUS_KM;
      return { within, distance: Math.round(distanceFromCenter * 10) / 10 };
    } catch (err) {
      console.error('Delivery area check error:', err);
      return { within: false, error: 'Failed to check delivery area.' };
    }
  }, [deliveryCenterCoords]);

  // Get driving route from OSRM
  const getRouteOSRM = async (start: { lat: number; lng: number }, end: { lat: number; lng: number }): Promise<[number, number][] | null> => {
    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson&alternatives=true&steps=true`
      );
      
      if (!response.ok) return null;
      
      const data = await response.json();
      if (data.routes && data.routes.length > 0) {
        // Smart Routing: Select the fastest route
        const bestRoute = data.routes.sort((a: any, b: any) => a.duration - b.duration)[0];
        // OSRM returns [lng, lat], Leaflet needs [lat, lng]
        return bestRoute.geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]);
      }
      return null;
    } catch (err) {
      console.error('OSRM routing error:', err);
      return null;
    }
  };

  return {
    calculateDistance,
    calculateDistanceBetweenAddresses,
    calculateDeliveryFee,
    isWithinDeliveryArea,
    loading,
    error,
    restaurantLocation: RESTAURANT_LOCATION,
    maxDeliveryRadius: MAX_DELIVERY_RADIUS_KM,
    geocodeAddressOSM,
    getRouteOSRM
  };
};
