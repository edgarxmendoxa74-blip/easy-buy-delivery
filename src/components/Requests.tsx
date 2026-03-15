import React, { useState, useEffect } from 'react';
import { ArrowLeft, Send, Navigation } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useGoogleMaps } from '../hooks/useGoogleMaps';
import { useSiteSettings } from '../hooks/useSiteSettings';
import DeliveryMap from './DeliveryMap';


interface RequestsProps {
  onBack: () => void;
}

const Requests: React.FC<RequestsProps> = ({ onBack }) => {
  const { calculateDistanceBetweenAddresses, calculateDeliveryFee, geocodeAddressOSM, getRouteOSRM } = useGoogleMaps();
  const { siteSettings } = useSiteSettings();

  // Angkas/Padala form data
  const [angkasData, setAngkasData] = useState({
    customer_name: '',
    contact_number: '',
    request_type: 'angkas',
    subject: '',
    description: '',
    pickup_address: '',
    dropoff_address: ''
  });
  const [isSubmittingAngkas, setIsSubmittingAngkas] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [deliveryFee, setDeliveryFee] = useState<number>(60);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // Map state
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [dropoffCoords, setDropoffCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][] | null>(null);
  const [shouldFitBounds, setShouldFitBounds] = useState(true);
  const [selectionMode, setSelectionMode] = useState<'pickup' | 'dropoff'>('pickup');

  const requestTypes = [
    { value: 'angkas', label: 'Angkas (Motorcycle Ride)' }
  ];

  // Auto-locate effect for Pickup Address
  useEffect(() => {
    if (!angkasData.pickup_address.trim() || angkasData.pickup_address.length < 5) return;

    const timer = setTimeout(async () => {
      const coords = await geocodeAddressOSM(angkasData.pickup_address);
      if (coords) {
        setPickupCoords(coords);
        setShouldFitBounds(true);
        
        // If we have both, update route
        if (dropoffCoords) {
          const result = await calculateDistanceBetweenAddresses(
            `${coords.lat},${coords.lng}`,
            `${dropoffCoords.lat},${dropoffCoords.lng}`
          );
          if (result && !isNaN(result.distance)) {
            setDistance(result.distance);
            setDeliveryFee(calculateDeliveryFee(result.distance));
            const route = await getRouteOSRM(coords, dropoffCoords);
            setRouteCoordinates(route);
          }
        }
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [angkasData.pickup_address]);

  // Auto-locate effect for Drop-off Address
  useEffect(() => {
    if (!angkasData.dropoff_address.trim() || angkasData.dropoff_address.length < 5) return;

    const timer = setTimeout(async () => {
      const coords = await geocodeAddressOSM(angkasData.dropoff_address);
      if (coords) {
        setDropoffCoords(coords);
        setShouldFitBounds(true);

        // If we have both, update route
        if (pickupCoords) {
          const result = await calculateDistanceBetweenAddresses(
            `${pickupCoords.lat},${pickupCoords.lng}`,
            `${coords.lat},${coords.lng}`
          );
          if (result && !isNaN(result.distance)) {
            setDistance(result.distance);
            setDeliveryFee(calculateDeliveryFee(result.distance));
            const route = await getRouteOSRM(pickupCoords, coords);
            setRouteCoordinates(route);
          }
        }
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [angkasData.dropoff_address]);

  // Angkas/Padala handlers
  const handleAngkasInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setAngkasData(prev => ({ ...prev, [name]: value }));
  };

  const calculateFee = async () => {
    if (!angkasData.pickup_address.trim() || !angkasData.dropoff_address.trim()) {
      return;
    }

    try {
      setIsCalculating(true);
      
      // Geocode both addresses for the map
      const pCoords = await geocodeAddressOSM(angkasData.pickup_address);
      const dCoords = await geocodeAddressOSM(angkasData.dropoff_address);

      if (pCoords) setPickupCoords(pCoords);
      if (dCoords) setDropoffCoords(dCoords);

      const result = await calculateDistanceBetweenAddresses(
        angkasData.pickup_address,
        angkasData.dropoff_address
      );
      if (result && !isNaN(result.distance)) {
        setDistance(result.distance);
        const fee = calculateDeliveryFee(result.distance);
        setDeliveryFee(fee);

        if (pCoords && dCoords) {
          const route = await getRouteOSRM(pCoords, dCoords);
          setRouteCoordinates(route);
        }
      } else {
        setDistance(null);
        setDeliveryFee(60);
      }
    } catch (error) {
      console.error('Error calculating Angkas fee:', error);
      setDistance(null);
      setDeliveryFee(60);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleMapPickupSelect = async (lat: number, lng: number) => {
    setPickupCoords({ lat, lng });
    setShouldFitBounds(false);
    
    // Reverse geocode
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const data = await response.json();
      if (data && data.display_name) {
        setAngkasData(prev => ({ ...prev, pickup_address: data.display_name }));
      }
    } catch (err) {
      console.error('Reverse geocoding error:', err);
    }

    if (dropoffCoords) {
      const result = await calculateDistanceBetweenAddresses(
        `${lat},${lng}`,
        `${dropoffCoords.lat},${dropoffCoords.lng}`
      );
      if (result && !isNaN(result.distance)) {
        setDistance(result.distance);
        setDeliveryFee(calculateDeliveryFee(result.distance));
        const route = await getRouteOSRM({ lat, lng }, dropoffCoords);
        setRouteCoordinates(route);
      }
    }
  };

  const handleMapDropoffSelect = async (lat: number, lng: number) => {
    setDropoffCoords({ lat, lng });
    setShouldFitBounds(false);
    
    // Reverse geocode
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const data = await response.json();
      if (data && data.display_name) {
        setAngkasData(prev => ({ ...prev, dropoff_address: data.display_name }));
      }
    } catch (err) {
      console.error('Reverse geocoding error:', err);
    }

    if (pickupCoords) {
      const result = await calculateDistanceBetweenAddresses(
        `${pickupCoords.lat},${pickupCoords.lng}`,
        `${lat},${lng}`
      );
      if (result && !isNaN(result.distance)) {
        setDistance(result.distance);
        setDeliveryFee(calculateDeliveryFee(result.distance));
        const route = await getRouteOSRM(pickupCoords, { lat, lng });
        setRouteCoordinates(route);
      }
    }
  };

  const getCurrentLocation = (target: 'pickup' | 'dropoff') => {
    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        if (target === 'pickup') {
          await handleMapPickupSelect(latitude, longitude);
        } else {
          await handleMapDropoffSelect(latitude, longitude);
        }
        
        setShouldFitBounds(true);
        setIsGettingLocation(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Could not get your location. Please enter your address manually.');
        setIsGettingLocation(false);
      }
    );
  };

  const handleAngkasSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !angkasData.customer_name ||
      !angkasData.contact_number ||
      !angkasData.subject ||
      !angkasData.description ||
      !angkasData.pickup_address ||
      !angkasData.dropoff_address
    ) {
      alert('Please fill in all required fields');
      return;
    }

    setIsSubmittingAngkas(true);
    try {
      const { error } = await supabase
        .from('requests')
        .insert({
          customer_name: angkasData.customer_name,
          contact_number: angkasData.contact_number,
          request_type: angkasData.request_type,
          subject: angkasData.subject,
          description: angkasData.description,
          address: `${angkasData.pickup_address} -> ${angkasData.dropoff_address}`,
          status: 'pending'
        });

      if (error) throw error;

      const requestTypeLabel = requestTypes.find(t => t.value === angkasData.request_type)?.label || angkasData.request_type;
      const message = `🏍️ ANGKAS/PADALA REQUEST

Type: ${requestTypeLabel}
Subject: ${angkasData.subject}

👤 Customer: ${angkasData.customer_name}
📞 Contact: ${angkasData.contact_number}
📍 Pickup Address:
${angkasData.pickup_address}${pickupCoords ? `\n📌 Pickup Pin: https://maps.google.com/?q=${pickupCoords.lat},${pickupCoords.lng}` : ''}

📍 Drop-off Address:
${angkasData.dropoff_address}${dropoffCoords ? `\n📌 Drop-off Pin: https://maps.google.com/?q=${dropoffCoords.lat},${dropoffCoords.lng}` : ''}

${distance !== null ? `📏 Distance: ${distance} km` : ''}
💰 Estimated Fare (delivery fee logic): ₱${deliveryFee.toFixed(2)}

📄 Description:
${angkasData.description}

Thank you for your Angkas/Padala request. We will get back to you soon! 🛵`;

      const encodedMessage = encodeURIComponent(message);
      const messengerId = siteSettings?.messenger_id || '61558704207383';
      const messengerUrl = `https://m.me/${messengerId}?text=${encodedMessage}`;

      window.open(messengerUrl, '_blank');

      // Reset form
      setAngkasData({
        customer_name: '',
        contact_number: '',
        request_type: 'angkas',
        subject: '',
        description: '',
        pickup_address: '',
        dropoff_address: ''
      });
      setDistance(null);
      setDeliveryFee(60);
    } catch (error) {
      console.error('Error submitting request:', error);
      const errorMessage = error instanceof Error ? error.message : 'Please try again.';
      alert(`Failed to submit request: ${errorMessage}\n\nNote: If the error mentions 'relation "requests" does not exist', please make sure you have run the database migration.`);
    } finally {
      setIsSubmittingAngkas(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={onBack}
        className="flex items-center space-x-2 text-gray-600 hover:text-black transition-colors duration-200 mb-6"
      >
        <ArrowLeft className="h-5 w-5" />
        <span>Back to Home</span>
      </button>

      <form onSubmit={handleAngkasSubmit} className="bg-white rounded-xl shadow-sm p-6 md:p-8 space-y-6">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-brand-charcoal">🛵 Angkas Service</h1>
          <p className="text-gray-500 mt-1">Book a quick motorcycle ride across the city</p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
              <input
                type="text"
                name="customer_name"
                value={angkasData.customer_name}
                onChange={handleAngkasInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Contact Number *</label>
              <input
                type="tel"
                name="contact_number"
                value={angkasData.contact_number}
                onChange={handleAngkasInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-primary focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Service Type *</label>
          <select
            name="request_type"
            value={angkasData.request_type}
            onChange={handleAngkasInputChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-primary focus:border-transparent"
          >
            {requestTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Subject *</label>
          <input
            type="text"
            name="subject"
            value={angkasData.subject}
            onChange={handleAngkasInputChange}
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-primary focus:border-transparent"
            placeholder="Brief summary of your request (e.g., Need Angkas ride)"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
          <textarea
            name="description"
            value={angkasData.description}
            onChange={handleAngkasInputChange}
            required
            rows={6}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-primary focus:border-transparent"
            placeholder="Please provide detailed information about your Angkas request (pickup location, destination, time needed, etc.)"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Pickup Address *</label>
          <button
            type="button"
            onClick={() => getCurrentLocation('pickup')}
            disabled={isGettingLocation}
            className="w-full mb-2 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
          >
            <Navigation className={`h-5 w-5 ${isGettingLocation ? 'animate-spin' : ''}`} />
            {isGettingLocation ? 'Getting Location...' : 'Use My Current Location'}
          </button>
          <textarea
            name="pickup_address"
            value={angkasData.pickup_address}
            onChange={handleAngkasInputChange}
            required
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-primary focus:border-transparent"
            placeholder="Where to pick up (complete address)"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Drop-off Address *</label>
          <button
            type="button"
            onClick={() => getCurrentLocation('dropoff')}
            disabled={isGettingLocation}
            className="w-full mb-2 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
          >
            <Navigation className={`h-5 w-5 ${isGettingLocation ? 'animate-spin' : ''}`} />
            {isGettingLocation ? 'Getting Location...' : 'Use My Current Location'}
          </button>
          <textarea
            name="dropoff_address"
            value={angkasData.dropoff_address}
            onChange={handleAngkasInputChange}
            onBlur={calculateFee}
            required
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-primary focus:border-transparent"
            placeholder="Where to drop off (complete address)"
          />
          {isCalculating && (
            <p className="text-xs text-gray-500 mt-1">Calculating distance and fee...</p>
          )}
          {!isCalculating && distance !== null && (
            <p className="text-xs text-green-600 mt-1">
              Estimated distance: {distance} km • Estimated fee: ₱{deliveryFee.toFixed(2)}
            </p>
          )}
        </div>

        {/* Map Section */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              🗺️ Pick Point on Map
            </h2>
            <div className="flex rounded-xl overflow-hidden border border-gray-200 shadow-sm">
              <button
                type="button"
                onClick={() => setSelectionMode('pickup')}
                className={`px-4 py-2 text-sm font-bold transition-all ${selectionMode === 'pickup' ? 'bg-green-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
              >
                Set Pickup
              </button>
              <button
                type="button"
                onClick={() => setSelectionMode('dropoff')}
                className={`px-4 py-2 text-sm font-bold transition-all ${selectionMode === 'dropoff' ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
              >
                Set Drop-off
              </button>
            </div>
          </div>
          <DeliveryMap
            pickupLocation={pickupCoords || { lat: 7.2906, lng: 125.3764 }}
            dropoffLocation={dropoffCoords}
            distance={distance}
            address={angkasData.dropoff_address}
            onPickupSelect={handleMapPickupSelect}
            onDropoffSelect={handleMapDropoffSelect}
            routeCoordinates={routeCoordinates}
            fitBounds={shouldFitBounds}
            pickupLabel="Pickup Point"
            dropoffLabel="Destination Point"
            pickupIcon="🛵"
            dropoffIcon="📍"
            pickupColor="#22c55e" // green-500
            dropoffColor="#3b82f6" // blue-500
            selectionMode={selectionMode}
          />
          <p className="text-xs text-gray-500 mt-2 text-center flex items-center justify-center gap-1">
            <span>💡</span> Tip: Select "Set Pickup" or "Set Drop-off" then tap the map to place pins.
          </p>
        </div>

        <button
          type="submit"
          disabled={isSubmittingAngkas}
          className="w-full py-4 rounded-xl font-medium text-lg transition-all duration-200 transform bg-green-primary text-white hover:bg-green-dark hover:scale-[1.02] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Send className="h-5 w-5" />
          {isSubmittingAngkas ? 'Submitting...' : 'Submit Angkas Request'}
        </button>
      </form>
    </div>
  );
};

export default Requests;

