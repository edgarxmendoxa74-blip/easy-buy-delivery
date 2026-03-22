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


interface DeliveryMapProps {
  pickupLocation: { lat: number; lng: number };
  dropoffLocation?: { lat: number; lng: number } | null;
  dropoffLocations?: { id: string; lat: number; lng: number; address?: string }[];
  distance?: number | null;
  address?: string;
  onPickupSelect?: (lat: number, lng: number) => void;
  onDropoffSelect?: (lat: number, lng: number, id?: string) => void;
  routeCoordinates?: [number, number][] | null;
  fitBounds?: boolean;
  pickupLabel?: string;
  dropoffLabel?: string;
  pickupIcon?: string;
  dropoffIcon?: string;
  pickupColor?: string;
  dropoffColor?: string;
  selectionMode?: 'pickup' | 'dropoff' | 'none';
}

// Component to fit map bounds to show both markers
function MapBounds({ pickupLocation, dropoffLocation, dropoffLocations, fitBounds = true }: { pickupLocation: { lat: number; lng: number }; dropoffLocation?: { lat: number; lng: number } | null; dropoffLocations?: { id: string; lat: number; lng: number }[]; fitBounds?: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (fitBounds) {
      if (dropoffLocations && dropoffLocations.length > 0) {
        const bounds = L.latLngBounds([pickupLocation.lat, pickupLocation.lng], [pickupLocation.lat, pickupLocation.lng]);
        dropoffLocations.forEach(loc => bounds.extend([loc.lat, loc.lng]));
        map.fitBounds(bounds, { padding: [50, 50] });
      } else if (dropoffLocation) {
        const bounds = L.latLngBounds(
          [pickupLocation.lat, pickupLocation.lng],
          [dropoffLocation.lat, dropoffLocation.lng]
        );
        map.fitBounds(bounds, { padding: [50, 50] });
      } else {
        map.setView([pickupLocation.lat, pickupLocation.lng], 13);
      }
    }
  }, [map, pickupLocation, dropoffLocation, dropoffLocations, fitBounds]);

  return null;
}

const DeliveryMap: React.FC<DeliveryMapProps> = ({
  pickupLocation,
  dropoffLocation,
  dropoffLocations,
  distance,
  address,
  onPickupSelect,
  onDropoffSelect,
  routeCoordinates,
  fitBounds = true,
  pickupLabel = 'Easy Buy Delivery',
  dropoffLabel = 'Delivery Address',
  pickupIcon = '🛵',
  dropoffIcon = '📍',
  pickupColor = '#22c55e',
  dropoffColor = '#3b82f6',
  selectionMode = 'none'
}) => {
  const [mapReady, setMapReady] = useState(false);
  const pickupMarkerRef = useRef<L.Marker>(null);
  const dropoffMarkerRef = useRef<L.Marker>(null);

  // Dynamic icons
  const dynamicPickupIcon = L.divIcon({
    className: 'custom-pickup-marker',
    html: `<div style="
      background-color: ${pickupColor};
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
    ">${pickupIcon}</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40]
  });

  const dynamicDropoffIcon = L.divIcon({
    className: 'custom-dropoff-marker',
    html: `<div style="
      background-color: ${dropoffColor};
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
    ">${dropoffIcon}</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40]
  });

  const pickupEventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = pickupMarkerRef.current;
        if (marker && onPickupSelect) {
          const { lat, lng } = marker.getLatLng();
          onPickupSelect(lat, lng);
        }
      },
    }),
    [onPickupSelect],
  );

  const dropoffEventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = dropoffMarkerRef.current;
        if (marker && onDropoffSelect) {
          const { lat, lng } = marker.getLatLng();
          onDropoffSelect(lat, lng);
        }
      },
    }),
    [onDropoffSelect],
  );

  // Component to handle map clicks
  function MapEvents() {
    useMapEvents({
      click(e) {
        if (selectionMode === 'pickup' && onPickupSelect) {
          onPickupSelect(e.latlng.lat, e.latlng.lng);
        } else if (selectionMode === 'dropoff' && onDropoffSelect) {
          onDropoffSelect(e.latlng.lat, e.latlng.lng);
        }
      },
    });
    return null;
  }

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

  const center = dropoffLocation
    ? [(pickupLocation.lat + dropoffLocation.lat) / 2, (pickupLocation.lng + dropoffLocation.lng) / 2]
    : [pickupLocation.lat, pickupLocation.lng];

  const path: [number, number][] = routeCoordinates || (dropoffLocation
    ? [[pickupLocation.lat, pickupLocation.lng], [dropoffLocation.lat, dropoffLocation.lng]]
    : []);

  return (
    <div className="w-full h-64 rounded-lg overflow-hidden border-2 border-gray-300 shadow-lg">
      <MapContainer
        center={center as [number, number]}
        zoom={dropoffLocation ? 12 : 13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        <MapBounds pickupLocation={pickupLocation} dropoffLocation={dropoffLocation} dropoffLocations={dropoffLocations} fitBounds={fitBounds} />
        <MapEvents />

        {/* Pickup Marker */}
        <Marker 
          position={[pickupLocation.lat, pickupLocation.lng]} 
          icon={dynamicPickupIcon}
          draggable={!!onPickupSelect}
          eventHandlers={pickupEventHandlers}
          ref={pickupMarkerRef}
        >
          <Popup>
            <div className="text-center">
              <p className="font-semibold text-green-600">{pickupLabel}</p>
              {selectionMode === 'pickup' && <p className="text-xs text-blue-500 font-bold mt-1">SELECTING PICKUP...</p>}
            </div>
          </Popup>
        </Marker>

        {/* Multiple Dropoff Markers */}
        {dropoffLocations?.map((loc, index) => (
          <Marker
            key={loc.id}
            draggable={!!onDropoffSelect}
            eventHandlers={{
              dragend(e) {
                if (onDropoffSelect) {
                  onDropoffSelect(e.target.getLatLng().lat, e.target.getLatLng().lng, loc.id);
                }
              }
            }}
            position={[loc.lat, loc.lng]}
            icon={dynamicDropoffIcon}
          >
            <Popup>
              <div className="text-center">
                <p className="font-semibold text-blue-600">Drop-off {index + 1}</p>
                {loc.address && <p className="text-xs text-gray-600 mt-1">{loc.address}</p>}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Single Dropoff Marker (Fallback) */}
        {dropoffLocation && (!dropoffLocations || dropoffLocations.length === 0) && (
          <Marker
            draggable={!!onDropoffSelect}
            eventHandlers={dropoffEventHandlers}
            position={[dropoffLocation.lat, dropoffLocation.lng]}
            icon={dynamicDropoffIcon}
            ref={dropoffMarkerRef}
          >
            <Popup>
              <div className="text-center">
                <p className="font-semibold text-blue-600">{dropoffLabel}</p>
                {selectionMode === 'dropoff' && <p className="text-xs text-blue-500 font-bold mt-1">SELECTING DROP-OFF...</p>}
                {address && <p className="text-xs text-gray-600 mt-1">{address}</p>}
                {distance && (
                  <p className="text-xs font-semibold text-gray-800 mt-1">
                    Distance: {distance.toFixed(1)} km
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Route line connecting pickup and dropoff(s) */}
        {(dropoffLocation || (dropoffLocations && dropoffLocations.length > 0)) && (
          <Polyline
            positions={path}
            color={pickupColor}
            weight={5}
            opacity={0.8}
          />
        )}
      </MapContainer>
    </div>
  );
};

export default DeliveryMap;

