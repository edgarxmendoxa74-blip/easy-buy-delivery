import { useState, useCallback, useEffect } from 'react';

// Restaurant location: Calinan, Davao City
const RESTAURANT_LOCATION = {
  lat: 7.2906, // Calinan, Davao City latitude
  lng: 125.3764 // Calinan, Davao City longitude
};

// Delivery center: Villafuerte St, Calinan District, Davao City, Davao del Sur
// This is the point from which delivery distance is calculated
const DELIVERY_CENTER = {
  lat: 7.2906, // Villafuerte St, Calinan District, Davao City (approximate - will be geocoded)
  lng: 125.3764, // Villafuerte St, Calinan District, Davao City (approximate - will be geocoded)
  address: 'Villafuerte St, Calinan District, Davao City, Davao del Sur'
};

// Maximum delivery radius in kilometers from delivery center (adjust as needed)
const MAX_DELIVERY_RADIUS_KM = 100;

interface DistanceResult {
  distance: number; // in kilometers
  duration?: string;
}

export const useGoogleMaps = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Use delivery center coordinates (will be geocoded, but start with default)
  const [deliveryCenterCoords, setDeliveryCenterCoords] = useState<{ lat: number; lng: number }>({
    lat: DELIVERY_CENTER.lat,
    lng: DELIVERY_CENTER.lng
  });

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

  // Get coordinates from address using OpenStreetMap Nominatim (FREE, no API key needed)
  const geocodeAddressOSM = async (address: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      // Add "Davao City, Philippines" to improve accuracy for local addresses
      const fullAddress = address.includes('Davao') || address.includes('Philippines')
        ? address
        : `${address}, Davao City, Philippines`;

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}&limit=1&countrycodes=ph`,
        {
          headers: {
            'User-Agent': 'Easy-Buy-Delivery-App' // Required by Nominatim
          }
        }
      );

      if (!response.ok) {
        throw new Error('Geocoding service unavailable');
      }

      const data = await response.json();

      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        };
      }

      return null;
    } catch (err) {
      console.error('OpenStreetMap geocoding error:', err);
      return null;
    }
  };

  // Alternative: Try Google Maps API if key is provided (optional)
  const geocodeAddressGoogle = async (address: string): Promise<{ lat: number; lng: number } | null> => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      return null;
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}&region=ph`
      );
      const data = await response.json();

      if (data.status === 'OK' && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        return { lat: location.lat, lng: location.lng };
      }

      return null;
    } catch (err) {
      console.error('Google geocoding error:', err);
      return null;
    }
  };

  // Geocode delivery center address on first load
  useEffect(() => {
    const geocodeDeliveryCenter = async () => {
      try {
        // Try Google geocoding first
        let coords = await geocodeAddressGoogle(DELIVERY_CENTER.address);
        if (!coords) {
          // Fallback to OpenStreetMap
          coords = await geocodeAddressOSM(DELIVERY_CENTER.address);
        }
        if (coords) {
          setDeliveryCenterCoords(coords);
          console.log('Delivery center geocoded:', coords);
        }
      } catch (err) {
        console.error('Error geocoding delivery center:', err);
      }
    };
    geocodeDeliveryCenter();
  }, []);

  // Calculate distance using Google Maps Distance Matrix API (if key is provided)
  const calculateDistanceGoogle = async (destinationAddress: string): Promise<DistanceResult | null> => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      return null;
    }

    try {
      // Use delivery center coordinates for distance calculation
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${deliveryCenterCoords.lat},${deliveryCenterCoords.lng}&destinations=${encodeURIComponent(destinationAddress)}&key=${apiKey}&units=metric&region=ph`
      );
      const data = await response.json();

      if (data.status === 'OK' && data.rows[0]?.elements[0]?.status === 'OK') {
        const element = data.rows[0].elements[0];
        const distanceInKm = element.distance.value / 1000; // Convert meters to kilometers
        const duration = element.duration.text;

        return {
          distance: Math.round(distanceInKm * 10) / 10, // Round to 1 decimal place
          duration
        };
      }
    } catch (err) {
      console.warn('Google Maps API error:', err);
    }

    return null;
  };

  // Main distance calculation function - calculates from delivery center to customer address
  const calculateDistance = useCallback(async (destinationAddress: string): Promise<DistanceResult | null> => {
    setLoading(true);
    setError(null);

    try {
      // Try Google Maps API first if key is available (more accurate road distance)
      const googleResult = await calculateDistanceGoogle(destinationAddress);
      if (googleResult) {
        setLoading(false);
        return googleResult;
      }

      // Fallback: Use free OpenStreetMap geocoding + Haversine formula
      // Try Google geocoding first (if key available), then OSM
      let coords = await geocodeAddressGoogle(destinationAddress);
      if (!coords) {
        coords = await geocodeAddressOSM(destinationAddress);
      }

      if (coords) {
        // Calculate distance from delivery center to customer address
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

      // If all geocoding fails
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
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

        // Try Google Distance Matrix API first if key is available
        if (apiKey) {
          try {
            const response = await fetch(
              `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(
                pickupAddress
              )}&destinations=${encodeURIComponent(dropoffAddress)}&key=${apiKey}&units=metric&region=ph`
            );
            const data = await response.json();

            if (data.status === 'OK' && data.rows[0]?.elements[0]?.status === 'OK') {
              const element = data.rows[0].elements[0];
              const distanceInKm = element.distance.value / 1000;
              const duration = element.duration.text;

              const result: DistanceResult = {
                distance: Math.round(distanceInKm * 10) / 10,
                duration
              };
              setLoading(false);
              return result;
            }
          } catch (err) {
            console.warn('Google DistanceMatrix error (pickup->dropoff):', err);
          }
        }

        // Fallback: geocode both addresses and use Haversine
        let pickupCoords = await geocodeAddressGoogle(pickupAddress);
        if (!pickupCoords) {
          pickupCoords = await geocodeAddressOSM(pickupAddress);
        }

        let dropoffCoords = await geocodeAddressGoogle(dropoffAddress);
        if (!dropoffCoords) {
          dropoffCoords = await geocodeAddressOSM(dropoffAddress);
        }

        if (pickupCoords && dropoffCoords) {
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
  // Fixed delivery fee calculation:
  // - Base fee: ₱65 (covers first 3km)
  // - For distances beyond 3km: add ₱15 for every additional 3km (or portion thereof)
  // - Plus tiered fees for longer distances:
  //   - If distance > 10km: add ₱20
  //   - If distance > 20km: add ₱50
  const calculateDeliveryFee = useCallback((distanceInKm: number | null): number => {
    if (distanceInKm === null || distanceInKm === undefined) return 0;

    // Base fee: ₱65 (covers first 3km)
    let fee = 65;

    // For distances beyond 3km: add ₱15 for every additional 3km (or portion thereof)
    if (distanceInKm > 3) {
      const additionalDistance = distanceInKm - 3;
      const additionalBlocks = Math.ceil(additionalDistance / 3);
      fee += additionalBlocks * 15;
    }

    // Plus tiered fees for longer distances:
    // If distance > 10km: add ₱20
    if (distanceInKm > 10) {
      fee += 20;
    }

    // If distance > 20km: add ₱50
    if (distanceInKm > 20) {
      fee += 50;
    }

    return fee;
  }, []);

  // Check if customer address is within delivery area (distance from restaurant)
  const isWithinDeliveryArea = useCallback(async (address: string): Promise<{ within: boolean; distance?: number; error?: string }> => {
    try {
      // Get coordinates for the customer's delivery address
      let coords = await geocodeAddressGoogle(address);
      if (!coords) {
        coords = await geocodeAddressOSM(address);
      }

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

  return {
    calculateDistance,
    calculateDistanceBetweenAddresses,
    calculateDeliveryFee,
    isWithinDeliveryArea,
    loading,
    error,
    restaurantLocation: RESTAURANT_LOCATION,
    maxDeliveryRadius: MAX_DELIVERY_RADIUS_KM
  };
};
