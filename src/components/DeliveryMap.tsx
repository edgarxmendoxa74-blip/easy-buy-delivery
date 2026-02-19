import React, { useEffect, useState, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Fix for default marker icons in Leaflet with React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconRetinaUrl: iconRetina,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom restaurant icon
const restaurantIcon = L.divIcon({
  className: 'custom-restaurant-marker',
  html: `<div style="
    background-color: #22c55e;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 3px solid white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 20px;
  ">🛵</div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40]
});

// Custom customer icon
const customerIcon = L.divIcon({
  className: 'custom-customer-marker',
  html: `<div style="
    background-color: #3b82f6;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 3px solid white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 20px;
  ">📍</div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40]
});

interface DeliveryMapProps {
  restaurantLocation: { lat: number; lng: number };
  customerLocation: { lat: number; lng: number } | null;
  distance?: number | null;
  address?: string;
  onLocationSelect?: (lat: number, lng: number) => void;
  routeCoordinates?: [number, number][] | null;
  fitBounds?: boolean;
}

// Component to fit map bounds to show both markers
function MapBounds({ restaurantLocation, customerLocation, fitBounds = true }: { restaurantLocation: { lat: number; lng: number }; customerLocation: { lat: number; lng: number } | null; fitBounds?: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (customerLocation && fitBounds) {
      const bounds = L.latLngBounds(
        [restaurantLocation.lat, restaurantLocation.lng],
        [customerLocation.lat, customerLocation.lng]
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (!customerLocation) {
      map.setView([restaurantLocation.lat, restaurantLocation.lng], 13);
    }
  }, [map, restaurantLocation, customerLocation, fitBounds]);

  return null;
}

const DeliveryMap: React.FC<DeliveryMapProps> = ({
  restaurantLocation,
  customerLocation,
  distance,
  address,
  onLocationSelect,
  routeCoordinates,
  fitBounds = true
}) => {
  const [mapReady, setMapReady] = useState(false);
  const markerRef = useRef<L.Marker>(null);

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker && onLocationSelect) {
          const { lat, lng } = marker.getLatLng();
          onLocationSelect(lat, lng);
        }
      },
    }),
    [onLocationSelect],
  );

  useEffect(() => {
    // Only render map on client side
    if (typeof window !== 'undefined') {
      setMapReady(true);
    }
  }, []);

  if (!mapReady || typeof window === 'undefined') {
    return (
      <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-primary mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  const center = customerLocation
    ? [(restaurantLocation.lat + customerLocation.lat) / 2, (restaurantLocation.lng + customerLocation.lng) / 2]
    : [restaurantLocation.lat, restaurantLocation.lng];

  const path: [number, number][] = routeCoordinates || (customerLocation
    ? [[restaurantLocation.lat, restaurantLocation.lng], [customerLocation.lat, customerLocation.lng]]
    : []);

  return (
    <div className="w-full h-64 rounded-lg overflow-hidden border-2 border-gray-300 shadow-lg">
      <MapContainer
        center={center as [number, number]}
        zoom={customerLocation ? 12 : 13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        <MapBounds restaurantLocation={restaurantLocation} customerLocation={customerLocation} fitBounds={fitBounds} />

        {/* Restaurant Marker */}
        <Marker position={[restaurantLocation.lat, restaurantLocation.lng]} icon={restaurantIcon}>
          <Popup>
            <div className="text-center">
              <p className="font-semibold text-green-600">🛵 Easy Buy Delivery</p>
              <p className="text-xs text-gray-600 mt-1">Calinan, Davao City</p>
            </div>
          </Popup>
        </Marker>

        {/* Customer Marker */}
        {customerLocation && (
          <>
            <Marker
              draggable={!!onLocationSelect}
              eventHandlers={eventHandlers}
              position={[customerLocation.lat, customerLocation.lng]}
              icon={customerIcon}
              ref={markerRef}
            >
              <Popup>
                <div className="text-center">
                  <p className="font-semibold text-blue-600">📍 Delivery Address</p>
                  {address && <p className="text-xs text-gray-600 mt-1">{address}</p>}
                  {distance && (
                    <p className="text-xs font-semibold text-gray-800 mt-1">
                      Distance: {distance.toFixed(1)} km
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>

            {/* Route line connecting restaurant and customer */}
            <Polyline
              positions={path}
              color="#16a34a" // green-600 to match brand
              weight={5}
              opacity={0.8}
            />
          </>
        )}
      </MapContainer>
    </div>
  );
};

export default DeliveryMap;

