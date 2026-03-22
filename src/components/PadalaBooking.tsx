import React, { useState, useEffect } from 'react';
import { ArrowLeft, MapPin, Plus, Trash2, Navigation } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useGoogleMaps } from '../hooks/useGoogleMaps';
import { useSiteSettings } from '../hooks/useSiteSettings';
import DeliveryMap from './DeliveryMap';


interface PadalaBookingProps {
  onBack: () => void;
  title?: string;
  mode?: 'simple' | 'full';
}

interface OrderItem {
  id: string;
  item_description: string;
  quantity: number;
}

interface StoreOrder {
  id: string;
  store_name: string;
  store_address: string;
  items: OrderItem[];
}

interface PadalaDropoff {
  id: string;
  receiver_name: string;
  contact_number: string;
  address: string;
  landmark: string;
  coords: { lat: number; lng: number } | null;
}

const PadalaBooking: React.FC<PadalaBookingProps> = ({ onBack, mode = 'full' }) => {
  const { calculateDistanceBetweenAddresses, calculateDeliveryFee, geocodeAddressOSM, getMultiPointRouteOSRM } = useGoogleMaps();
  const { siteSettings } = useSiteSettings();

  // Customer details
  const [customerData, setCustomerData] = useState({
    receivers_name: '',
    address: '',
    pin_lat: '',
    pin_lng: '',
    landmark: '',
    contact_number: '',
  });

  // Location state for Pabili
  const pickupCoords = { lat: 14.9667, lng: 120.5333 }; // Default to Floridablanca
  const [dropoffCoords, setDropoffCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][] | null>(null);
  const [shouldFitBounds, setShouldFitBounds] = useState(true);
  const [pabiliSelectionMode, setPabiliSelectionMode] = useState<'pickup' | 'dropoff'>('dropoff');

  // Store orders (for Pabili mode - multiple stores with items)
  const [storeOrders, setStoreOrders] = useState<StoreOrder[]>([
    {
      id: `store-${Date.now()}`,
      store_name: '',
      store_address: '',
      items: [{ id: `item-${Date.now()}`, item_description: '', quantity: 1 }]
    }
  ]);

  // Padala mode form data (single item send)
  const [padalaData, setPadalaData] = useState({
    customer_name: '',
    contact_number: '',
    pickup_address: '',
    item_description: '',
    item_weight: '',
    item_value: '',
    special_instructions: '',
    preferred_date: '',
    preferred_time: 'Morning',
    notes: ''
  });

  // Location state for Padala
  const [padalaPickupCoords, setPadalaPickupCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [padalaDropoffs, setPadalaDropoffs] = useState<PadalaDropoff[]>([
    { id: `dropoff-${Date.now()}`, receiver_name: '', contact_number: '', address: '', landmark: '', coords: null }
  ]);

  const [distance, setDistance] = useState<number | null>(null);
  const [deliveryFee, setDeliveryFee] = useState<number>(65);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [padalaSelectionMode, setPadalaSelectionMode] = useState<'pickup' | 'dropoff'>('pickup');

  // ═══════════ PADALA MODE HANDLERS ═══════════
  const handlePadalaInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPadalaData(prev => ({ ...prev, [name]: value }));
  };

  const calculatePadalaFee = async () => {
    if (!padalaData.pickup_address.trim() || !padalaDropoffs[0].address.trim()) {
      return;
    }

    setIsCalculating(true);
    try {
      const pCoords = await geocodeAddressOSM(padalaData.pickup_address);
      if (pCoords) setPadalaPickupCoords(pCoords);

      let totalDistance = 0;
      let allCoords: {lat: number, lng: number}[] = pCoords ? [pCoords] : [];
      let previousPoint = pCoords ? `${pCoords.lat},${pCoords.lng}` : padalaData.pickup_address;
      
      const newDropoffs = [...padalaDropoffs];

      for (let i = 0; i < newDropoffs.length; i++) {
        const dropoff = newDropoffs[i];
        if (!dropoff.address.trim()) continue;

        const dCoords = dropoff.coords || await geocodeAddressOSM(dropoff.address);
        if (dCoords) {
           newDropoffs[i].coords = dCoords;
           const result = await calculateDistanceBetweenAddresses(
             previousPoint,
             `${dCoords.lat},${dCoords.lng}`
           );
           if (result && !isNaN(result.distance)) {
             totalDistance += result.distance;
             previousPoint = `${dCoords.lat},${dCoords.lng}`;
             allCoords.push(dCoords);
           }
        }
      }
      setPadalaDropoffs(newDropoffs);

      if (totalDistance > 0) {
        setDistance(Math.round(totalDistance * 10) / 10);
        
        // Fee calculation
        let fee = calculateDeliveryFee(totalDistance); 
        const padalaBaseFee = siteSettings?.padala_base_fee ?? 65;
        let distanceFee = fee - 65; 
        fee = padalaBaseFee + distanceFee;
        
        // Additional dropoffs
        if (newDropoffs.length > 1) {
          const additionalDropoffFee = siteSettings?.padala_additional_dropoff_fee ?? 50;
          fee += additionalDropoffFee * (newDropoffs.length - 1);
        }

        // Convenience fee
        if (siteSettings?.padala_convenience_enabled) {
          fee += siteSettings?.padala_convenience_fee ?? 0;
        }

        setDeliveryFee(fee);

        if (allCoords.length > 1 && getMultiPointRouteOSRM) {
          const route = await getMultiPointRouteOSRM(allCoords);
          setRouteCoordinates(route);
        }
      } else {
        setDistance(null);
        setDeliveryFee(siteSettings?.padala_base_fee ?? 65);
      }
    } catch (error) {
      console.error('Error calculating fee:', error);
      setDistance(null);
      setDeliveryFee(siteSettings?.padala_base_fee ?? 65);
    } finally {
      setIsCalculating(false);
    }
  };

  const addPadalaDropoff = () => {
    setPadalaDropoffs(prev => [
      ...prev,
      { id: `dropoff-${Date.now()}`, receiver_name: '', contact_number: '', address: '', landmark: '', coords: null }
    ]);
  };

  const removePadalaDropoff = (dropoffId: string) => {
    if (padalaDropoffs.length <= 1) return;
    setPadalaDropoffs(prev => prev.filter(d => d.id !== dropoffId));
    setTimeout(calculatePadalaFee, 500);
  };

  const updatePadalaDropoff = (dropoffId: string, field: keyof PadalaDropoff, value: any) => {
    setPadalaDropoffs(prev =>
      prev.map(d => d.id === dropoffId ? { ...d, [field]: value } : d)
    );
  };

  // Auto-locate effect for Pabili Delivery Address
  useEffect(() => {
    if (mode !== 'simple' || !customerData.address.trim() || customerData.address.length < 5) return;

    const timer = setTimeout(async () => {
      const coords = await geocodeAddressOSM(customerData.address);
      if (coords) {
        setDropoffCoords(coords);
        setCustomerData(prev => ({
          ...prev,
          pin_lat: coords.lat.toString(),
          pin_lng: coords.lng.toString()
        }));
        setShouldFitBounds(true);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [customerData.address, mode]);

  // Avoid auto-locate effect loop issues by checking length and using timeout for first dropoff (we don't wanna retrigger route loop constantly)
  useEffect(() => {
    if (mode !== 'full' || padalaDropoffs.length === 0) return;
    const firstDropoff = padalaDropoffs[0];
    if (!firstDropoff.address.trim() || firstDropoff.address.length < 5) return;

    const timer = setTimeout(async () => {
      if (!firstDropoff.coords) {
         calculatePadalaFee();
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [padalaDropoffs[0]?.address, mode]);

  const handlePadalaPickupSelect = async (lat: number, lng: number) => {
    setPadalaPickupCoords({ lat, lng });
    setShouldFitBounds(false);
    
    // Reverse geocode
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const data = await response.json();
      if (data && data.display_name) {
        setPadalaData(prev => ({ ...prev, pickup_address: data.display_name }));
      }
    } catch (err) {
      console.error('Reverse geocoding error:', err);
    }

    calculatePadalaFee();
  };

  const handlePadalaDropoffSelect = async (lat: number, lng: number, dropoffId?: string) => {
    const targetId = dropoffId || padalaDropoffs[0].id;
    setShouldFitBounds(false);
    
    // Reverse geocode
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const data = await response.json();
      if (data && data.display_name) {
        updatePadalaDropoff(targetId, 'address', data.display_name);
        updatePadalaDropoff(targetId, 'coords', { lat, lng });
      } else {
        updatePadalaDropoff(targetId, 'coords', { lat, lng });
      }
    } catch (err) {
      console.error('Reverse geocoding error:', err);
      updatePadalaDropoff(targetId, 'coords', { lat, lng });
    }

    // Give it a moment to update state before recalculating fees
    setTimeout(calculatePadalaFee, 500);
  };

  // ═══════════ PABILI / PADALA STORE ORDER HANDLERS ═══════════
  const addStoreOrder = () => {
    setStoreOrders(prev => [
      ...prev,
      {
        id: `store-${Date.now()}`,
        store_name: '',
        store_address: '',
        items: [{ id: `item-${Date.now()}`, item_description: '', quantity: 1 }]
      }
    ]);
  };

  const removeStoreOrder = (storeId: string) => {
    if (storeOrders.length <= 1) return;
    setStoreOrders(prev => prev.filter(s => s.id !== storeId));
  };

  const updateStoreOrder = (storeId: string, field: 'store_name' | 'store_address', value: string) => {
    setStoreOrders(prev =>
      prev.map(s => s.id === storeId ? { ...s, [field]: value } : s)
    );
  };

  const addItemToStore = (storeId: string) => {
    setStoreOrders(prev =>
      prev.map(s => s.id === storeId ? {
        ...s,
        items: [...s.items, { id: `item-${Date.now()}`, item_description: '', quantity: 1 }]
      } : s)
    );
  };

  const removeItemFromStore = (storeId: string, itemId: string) => {
    setStoreOrders(prev =>
      prev.map(s => {
        if (s.id === storeId) {
          const newItems = s.items.filter(i => i.id !== itemId);
          return { ...s, items: newItems.length > 0 ? newItems : [{ id: `item-${Date.now()}`, item_description: '', quantity: 1 }] };
        }
        return s;
      })
    );
  };

  const updateItem = (storeId: string, itemId: string, field: 'item_description' | 'quantity', value: string | number) => {
    setStoreOrders(prev =>
      prev.map(s => s.id === storeId ? {
        ...s,
        items: s.items.map(i => i.id === itemId ? { ...i, [field]: value } : i)
      } : s)
    );
  };

  // Get current GPS location
  const getCurrentLocation = (target: 'pabili_dropoff' | 'padala_pickup' | 'padala_dropoff') => {
    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        if (target === 'pabili_dropoff') {
          setCustomerData(prev => ({
            ...prev,
            pin_lat: latitude.toString(),
            pin_lng: longitude.toString()
          }));
          setDropoffCoords({ lat: latitude, lng: longitude });
        } else if (target === 'padala_pickup') {
          await handlePadalaPickupSelect(latitude, longitude);
        } else if (target === 'padala_dropoff') {
          await handlePadalaDropoffSelect(latitude, longitude);
        }

        setShouldFitBounds(true);

        // Reverse geocode to get address
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
          );
          const data = await response.json();
          if (data && data.display_name) {
            if (target === 'pabili_dropoff') {
              setCustomerData(prev => ({ ...prev, address: data.display_name }));
            } else if (target === 'padala_pickup') {
              setPadalaData(prev => ({ ...prev, pickup_address: data.display_name }));
            } else if (target === 'padala_dropoff') {
              setPadalaData(prev => ({ ...prev, delivery_address: data.display_name }));
            }
          }
        } catch (err) {
          console.error('Reverse geocoding error:', err);
        }
        setIsGettingLocation(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Could not get your location. Please enter your address manually.');
        setIsGettingLocation(false);
      }
    );
  };

  const handlePabiliLocationSelect = async (lat: number, lng: number) => {
    if (pabiliSelectionMode === 'pickup') {
      // Store/Pickup
      // In Pabili mode, pickup is often the store. But here we allow selecting it.
      // Logic for multi-store pabili might need update if store_address is synced.
      // For now, let's assume it updates the FIRST store's address as a shortcut.
      if (storeOrders.length > 0) {
         setStoreOrders(prev => {
            const updated = [...prev];
            updated[0] = { ...updated[0], store_address: 'Point on Map' }; // Placeholder or reverse geocode
            return updated;
         });
      }

      // We might need a separate pickupCoords state if it's not the default Calinan center
      // But for Pabili, usually it's from Calinan Center.
    } else {
      setDropoffCoords({ lat, lng });
      setShouldFitBounds(false);
      setCustomerData(prev => ({
        ...prev,
        pin_lat: lat.toString(),
        pin_lng: lng.toString()
      }));

      // Reverse geocode
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
        );
        const data = await response.json();
        if (data && data.display_name) {
          setCustomerData(prev => ({ ...prev, address: data.display_name }));
        }
      } catch (err) {
        console.error('Reverse geocoding error:', err);
      }
    }
  };

  // ═══════════ SUBMIT HANDLER ═══════════
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'simple') {
      // Pabili mode validation
      const hasValidStore = storeOrders.some(s => s.store_name.trim());
      const hasValidItems = storeOrders.some(s => s.items.some(i => i.item_description.trim()));

      if (!customerData.receivers_name || !customerData.address || !customerData.contact_number || !hasValidStore || !hasValidItems) {
        alert('Please fill in all required fields: Receiver name, Address, Contact Number, at least one store, and at least one item.');
        return;
      }
    } else {
      // Padala mode validation
      const hasValidDropoffs = padalaDropoffs.some(d => d.address.trim() && d.receiver_name.trim() && d.contact_number.trim());
      if (
        !padalaData.customer_name ||
        !padalaData.contact_number ||
        !padalaData.pickup_address ||
        !padalaData.item_description ||
        !hasValidDropoffs
      ) {
        alert('Please fill in all required fields, including at least one valid drop-off.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (mode === 'simple') {
        // ═══════════ PABILI SUBMISSION ═══════════
        const storeDetails = storeOrders
          .filter(s => s.store_name.trim())
          .map(store => ({
            store_name: store.store_name,
            store_address: store.store_address,
            items: store.items.filter(i => i.item_description.trim())
          }));

        // Build item description from all stores
        const allItemsDescription = storeDetails.map(store =>
          `[${store.store_name}${store.store_address ? ` - ${store.store_address}` : ''}]\n` +
          store.items.map(i => `  • ${i.item_description} x${i.quantity}`).join('\n')
        ).join('\n\n');

        const { error } = await supabase
          .from('padala_bookings')
          .insert({
            customer_name: customerData.receivers_name,
            contact_number: customerData.contact_number,
            pickup_address: storeDetails.map(s => `${s.store_name}: ${s.store_address}`).join(' | '),
            delivery_address: customerData.address,
            item_description: allItemsDescription,
            delivery_fee: deliveryFee || null,
            distance_km: distance || null,
            notes: customerData.landmark ? `Landmark: ${customerData.landmark}` : null,
            status: 'pending'
          });

        if (error) throw error;

        // Build Messenger message
        const message = `🛒 Pabili Service

${storeDetails.map((store, idx) => `
🏪 Store ${idx + 1}: ${store.store_name}${store.store_address ? `\n📍 Address: ${store.store_address}` : ''}
📋 Items:
${store.items.map(i => `  • ${i.item_description} — Qty: ${i.quantity}`).join('\n')}`).join('\n')}

━━━━━━━━━━━━━━━━━━
👤 Customer Details
━━━━━━━━━━━━━━━━━━
📋 Receiver: ${customerData.receivers_name}
📞 Contact: ${customerData.contact_number}
📍 Address: ${customerData.address}${customerData.pin_lat && customerData.pin_lng ? `\n📌 Pin Location: https://maps.google.com/?q=${customerData.pin_lat},${customerData.pin_lng}` : ''}${customerData.landmark ? `\n🗺️ Landmark: ${customerData.landmark}` : ''}

Please confirm this Pabili order. Thank you! 🛵`;

        const encodedMessage = encodeURIComponent(message);
        const messengerId = siteSettings?.messenger_id || '61558704207383';
        const messengerUrl = `https://m.me/${messengerId}?text=${encodedMessage}`;
        window.location.href = messengerUrl;

        // Reset form
        setStoreOrders([{
          id: `store-${Date.now()}`,
          store_name: '',
          store_address: '',
          items: [{ id: `item-${Date.now()}`, item_description: '', quantity: 1 }]
        }]);
        setCustomerData({
          receivers_name: '',
          address: '',
          pin_lat: '',
          pin_lng: '',
          landmark: '',
          contact_number: '',
        });

      } else {
        // ═══════════ PADALA SUBMISSION ═══════════
        const validDropoffs = padalaDropoffs.filter(d => d.address.trim() && d.receiver_name.trim() && d.contact_number.trim());
        const deliveryAddressString = validDropoffs.map((d, i) => `Dropoff ${i + 1}: ${d.address} (${d.receiver_name})`).join(' | ');
        const notesString = validDropoffs.map((d, i) => d.landmark ? `Dropoff ${i + 1} Landmark: ${d.landmark}` : '').filter(Boolean).join(' | ') + (padalaData.notes ? ` | General Notes: ${padalaData.notes}` : '');

        const { error } = await supabase
          .from('padala_bookings')
          .insert({
            customer_name: padalaData.customer_name,
            contact_number: padalaData.contact_number,
            pickup_address: padalaData.pickup_address,
            delivery_address: deliveryAddressString,
            item_description: padalaData.item_description || null,
            item_weight: padalaData.item_weight ? padalaData.item_weight : null,
            item_value: padalaData.item_value ? parseFloat(padalaData.item_value) : null,
            special_instructions: padalaData.special_instructions || null,
            preferred_date: padalaData.preferred_date ? padalaData.preferred_date : null,
            preferred_time: padalaData.preferred_time,
            delivery_fee: deliveryFee || null,
            distance_km: distance || null,
            notes: notesString ? notesString : null,
            status: 'pending'
          });

        if (error) throw error;

        const message = `📦 Padala Service

👤 Sender: ${padalaData.customer_name}
📞 Contact: ${padalaData.contact_number}

📍 Pickup Address:
${padalaData.pickup_address}${padalaPickupCoords ? `\n📌 Pickup Pin: https://maps.google.com/?q=${padalaPickupCoords.lat},${padalaPickupCoords.lng}` : ''}

${validDropoffs.map((d, i) => `📍 Drop-off ${i + 1}:
👤 Receiver: ${d.receiver_name}
📞 Contact: ${d.contact_number}
🏠 Address: ${d.address}${d.coords ? `\n📌 Pin: https://maps.google.com/?q=${d.coords.lat},${d.coords.lng}` : ''}${d.landmark ? `\n🗺️ Landmark: ${d.landmark}` : ''}`).join('\n\n')}

${padalaData.item_description ? `📦 Item Details:\n${padalaData.item_description}\n` : ''}${padalaData.item_weight ? `Weight: ${padalaData.item_weight}\n` : ''}${padalaData.item_value ? `Declared Value: ₱${padalaData.item_value}\n` : ''}
📅 Preferred Date: ${padalaData.preferred_date || 'Any'}
⏰ Preferred Time: ${padalaData.preferred_time}

${distance ? `📏 Distance: ${distance} km` : ''}
💰 Delivery Fee: ₱${deliveryFee.toFixed(2)}

${padalaData.special_instructions ? `📝 Special Instructions: ${padalaData.special_instructions}` : ''}${padalaData.notes ? `\n📝 General Notes: ${padalaData.notes}` : ''}

Please confirm this Padala booking. Thank you! 🛵`;

        const encodedMessage = encodeURIComponent(message);
        const messengerId = siteSettings?.messenger_id || '61558704207383';
        const messengerUrl = `https://m.me/${messengerId}?text=${encodedMessage}`;
        window.location.href = messengerUrl;

        // Reset form
        setPadalaData({
          customer_name: '',
          contact_number: '',
          pickup_address: '',
          item_description: '',
          item_weight: '',
          item_value: '',
          special_instructions: '',
          preferred_date: '',
          preferred_time: 'Morning',
          notes: ''
        });
        setPadalaDropoffs([{ id: `dropoff-${Date.now()}`, receiver_name: '', contact_number: '', address: '', landmark: '', coords: null }]);
      }

      setDistance(null);
      setDeliveryFee(65);
    } catch (error) {
      console.error('Error submitting booking:', error);
      const errorMessage = error instanceof Error ? error.message : 'Please try again.';
      alert(`Failed to submit booking: ${errorMessage}\n\nNote: If the error mentions 'relation "padala_bookings" does not exist', please make sure you have run the database migration.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ═══════════════════════════════════════
  // PABILI MODE (simple) - Multi-store with items
  // ═══════════════════════════════════════
  if (mode === 'simple') {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-gray-600 hover:text-black transition-colors duration-200 mb-6"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Home</span>
        </button>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-brand-charcoal">
              🛒 Pabili Service
            </h1>
            <p className="text-gray-500 mt-1">Tell us what you need and we'll buy it for you</p>
          </div>

          {/* ═══════════ STORE ORDERS ═══════════ */}
          {storeOrders.map((store, storeIndex) => (
            <div key={store.id} className="bg-white rounded-xl shadow-sm p-6 md:p-8 space-y-4 border-l-4 border-green-400">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  🏪 Store {storeIndex + 1}
                </h2>
                {storeOrders.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeStoreOrder(store.id)}
                    className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Store Name *</label>
                  <input
                    type="text"
                    value={store.store_name}
                    onChange={(e) => updateStoreOrder(store.id, 'store_name', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-primary focus:border-transparent"
                    placeholder="e.g., Mercury Drug, 7-Eleven"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Store Address</label>
                  <input
                    type="text"
                    value={store.store_address}
                    onChange={(e) => updateStoreOrder(store.id, 'store_address', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-primary focus:border-transparent"
                    placeholder="Store location / branch"
                  />
                </div>
              </div>

              {/* Items */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Items</label>
                <div className="space-y-3">
                  {store.items.map((item, itemIndex) => (
                    <div key={item.id} className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 w-6 text-center">{itemIndex + 1}.</span>
                      <input
                        type="text"
                        value={item.item_description}
                        onChange={(e) => updateItem(store.id, item.id, 'item_description', e.target.value)}
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-primary focus:border-transparent"
                        placeholder="Item description"
                      />
                      <div className="flex items-center gap-1">
                        <label className="text-xs text-gray-500">Qty:</label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(store.id, item.id, 'quantity', Number(e.target.value) || 1)}
                          className="w-16 px-2 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-primary focus:border-transparent text-center"
                          min="1"
                        />
                      </div>
                      {store.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItemFromStore(store.id, item.id)}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => addItemToStore(store.id)}
                  className="mt-3 flex items-center gap-2 text-sm font-medium text-green-600 hover:text-green-700 px-3 py-2 rounded-lg hover:bg-green-50 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add Item
                </button>
              </div>
            </div>
          ))}

          {/* Add Store Button */}
          <button
            type="button"
            onClick={addStoreOrder}
            className="w-full py-3 border-2 border-dashed border-green-300 rounded-xl text-green-600 font-medium hover:bg-green-50 hover:border-green-400 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Add Another Store
          </button>

          {/* ═══════════ CUSTOMER DETAILS ═══════════ */}
          <div className="bg-white rounded-xl shadow-sm p-6 md:p-8 space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              👤 Customer Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Receiver's Name *</label>
                <input
                  type="text"
                  value={customerData.receivers_name}
                  onChange={(e) => setCustomerData(prev => ({ ...prev, receivers_name: e.target.value }))}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-primary focus:border-transparent"
                  placeholder="Full name of receiver"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contact Number *</label>
                <input
                  type="tel"
                  value={customerData.contact_number}
                  onChange={(e) => setCustomerData(prev => ({ ...prev, contact_number: e.target.value }))}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-primary focus:border-transparent"
                  placeholder="09XX XXX XXXX"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Address *</label>
              <button
                type="button"
                onClick={() => getCurrentLocation('pabili_dropoff')}
                disabled={isGettingLocation}
                className="w-full mb-2 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
              >
                <Navigation className={`h-5 w-5 ${isGettingLocation ? 'animate-spin' : ''}`} />
                {isGettingLocation ? 'Getting Location...' : 'Use My Current Location'}
              </button>
              <textarea
                value={customerData.address}
                onChange={(e) => setCustomerData(prev => ({ ...prev, address: e.target.value }))}
                required
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-primary focus:border-transparent"
                placeholder="Enter complete delivery address"
              />
            </div>

            {/* Pin Location */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="inline h-4 w-4 mr-1" />
                  Pin Location - Latitude
                </label>
                <input
                  type="text"
                  value={customerData.pin_lat}
                  onChange={(e) => setCustomerData(prev => ({ ...prev, pin_lat: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-primary focus:border-transparent"
                  placeholder="Auto-filled from GPS"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="inline h-4 w-4 mr-1" />
                  Pin Location - Longitude
                </label>
                <input
                  type="text"
                  value={customerData.pin_lng}
                  onChange={(e) => setCustomerData(prev => ({ ...prev, pin_lng: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-primary focus:border-transparent"
                  placeholder="Auto-filled from GPS"
                />
              </div>
            </div>

            {/* Pabili Map */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Delivery Location Map</label>
                <div className="flex rounded-lg overflow-hidden border border-gray-200">
                  <button
                    type="button"
                    onClick={() => setPabiliSelectionMode('dropoff')}
                    className={`px-3 py-1 text-xs font-bold ${pabiliSelectionMode === 'dropoff' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}
                  >
                    Select Delivery
                  </button>
                </div>
              </div>
              <DeliveryMap
                pickupLocation={pickupCoords}
                dropoffLocation={dropoffCoords}
                distance={distance}
                address={customerData.address}
                onDropoffSelect={handlePabiliLocationSelect}
                routeCoordinates={routeCoordinates}
                fitBounds={shouldFitBounds}
                pickupLabel="Calinan Center"
                dropoffLabel="Your Location"
                selectionMode={pabiliSelectionMode}
              />
              <p className="text-xs text-gray-500 mt-2 text-center flex items-center justify-center gap-1">
                <span>💡</span> Tip: Tap the map or drag the pin to set your location.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Landmark</label>
              <input
                type="text"
                value={customerData.landmark}
                onChange={(e) => setCustomerData(prev => ({ ...prev, landmark: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-primary focus:border-transparent"
                placeholder="e.g., Near McDonald's, Beside 7-Eleven"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 rounded-xl font-medium text-lg transition-all duration-200 transform bg-green-primary text-white hover:bg-green-dark hover:scale-[1.02] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Pabili Order'}
          </button>
        </form>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // PADALA MODE (full) - Send items
  // ═══════════════════════════════════════
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={onBack}
        className="flex items-center space-x-2 text-gray-600 hover:text-black transition-colors duration-200 mb-6"
      >
        <ArrowLeft className="h-5 w-5" />
        <span>Back to Home</span>
      </button>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 md:p-8 space-y-6">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-brand-charcoal">
            📦 Padala Service
          </h1>
          <p className="text-gray-500 mt-1">Send items across the city quickly and safely</p>
        </div>

        {/* Sender Information */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Sender Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sender's Full Name *</label>
              <input
                type="text"
                name="customer_name"
                value={padalaData.customer_name}
                onChange={handlePadalaInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Contact Number *</label>
              <input
                type="tel"
                name="contact_number"
                value={padalaData.contact_number}
                onChange={handlePadalaInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-primary focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Addresses */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Addresses
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pickup Address *</label>
              <button
                type="button"
                onClick={() => getCurrentLocation('padala_pickup')}
                disabled={isGettingLocation}
                className="w-full mb-2 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
              >
                <Navigation className={`h-5 w-5 ${isGettingLocation ? 'animate-spin' : ''}`} />
                {isGettingLocation ? 'Getting Location...' : 'Use My Current Location'}
              </button>
              <textarea
                name="pickup_address"
                value={padalaData.pickup_address}
                onChange={handlePadalaInputChange}
                required
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-primary focus:border-transparent"
                placeholder="Enter complete pickup address"
              />
            </div>

            {/* Dropoffs Array Mapping */}
            <div className="mt-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center justify-between">
                <span>Drop-off Locations</span>
              </h3>
              {padalaDropoffs.map((dropoff, index) => (
                <div key={dropoff.id} className="p-5 border-2 border-gray-100 rounded-xl space-y-4 mb-4 relative bg-gray-50/50">
                  <div className="flex justify-between items-center text-sm font-bold text-blue-600 mb-2">
                    <span className="flex items-center gap-2"><MapPin className="h-4 w-4" />Drop-off {index + 1}</span>
                    {padalaDropoffs.length > 1 && (
                      <button type="button" onClick={() => removePadalaDropoff(dropoff.id)} className="text-red-500 hover:text-red-700 bg-red-50 p-1.5 rounded-lg transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Receiver's Name *</label>
                      <input
                        type="text"
                        value={dropoff.receiver_name}
                        onChange={(e) => updatePadalaDropoff(dropoff.id, 'receiver_name', e.target.value)}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Name of receiver"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Contact Number *</label>
                      <input
                        type="tel"
                        value={dropoff.contact_number}
                        onChange={(e) => updatePadalaDropoff(dropoff.id, 'contact_number', e.target.value)}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="09XX XXX XXXX"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Address *</label>
                    <textarea
                      value={dropoff.address}
                      onChange={(e) => updatePadalaDropoff(dropoff.id, 'address', e.target.value)}
                      onBlur={calculatePadalaFee}
                      required
                      rows={2}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter complete delivery address"
                    />
                    {isCalculating && index === padalaDropoffs.length - 1 && (
                      <p className="text-xs text-gray-500 mt-1">Calculating distance...</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Landmark</label>
                    <input
                      type="text"
                      value={dropoff.landmark}
                      onChange={(e) => updatePadalaDropoff(dropoff.id, 'landmark', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Near McDonald's, Beside 7-Eleven"
                    />
                  </div>
                </div>
              ))}
              
              <button
                type="button"
                onClick={addPadalaDropoff}
                className="w-full mt-2 py-3 border-2 border-dashed border-blue-300 rounded-xl text-blue-600 font-medium hover:bg-blue-50 flex items-center justify-center gap-2 transition-colors"
              >
                <Plus className="h-5 w-5" />
                Add Another Drop-off
              </button>
            </div>
          </div>
        </div>

        {/* Padala Map */}
        <div className="bg-white rounded-xl shadow-sm p-6 md:p-8 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              🗺️ Delivery Map
            </h2>
            <div className="flex rounded-xl overflow-hidden border border-gray-200 shadow-sm">
              <button
                type="button"
                onClick={() => setPadalaSelectionMode('pickup')}
                className={`px-4 py-2 text-sm font-bold transition-all ${padalaSelectionMode === 'pickup' ? 'bg-purple-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
              >
                Pick Pickup
              </button>
              <button
                type="button"
                onClick={() => setPadalaSelectionMode('dropoff')}
                className={`px-4 py-2 text-sm font-bold transition-all ${padalaSelectionMode === 'dropoff' ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
              >
                Pick Drop-off
              </button>
            </div>
          </div>
            <DeliveryMap
              pickupLocation={padalaPickupCoords || { lat: 14.9667, lng: 120.5333 }}
              dropoffLocations={padalaDropoffs.filter(d => d.coords).map((d) => ({
                 id: d.id,
                 lat: d.coords!.lat,
                 lng: d.coords!.lng,
                 address: d.address
              }))}
              distance={distance}
              onPickupSelect={handlePadalaPickupSelect}
              onDropoffSelect={(lat, lng, id) => handlePadalaDropoffSelect(lat, lng, id)}
              routeCoordinates={routeCoordinates}
              fitBounds={shouldFitBounds}
              pickupLabel="Pickup Point"
              dropoffLabel="Drop-off"
              pickupIcon="📦"
              dropoffIcon="📍"
              pickupColor="#9333ea" // purple-600
              dropoffColor="#3b82f6" // blue-500
              selectionMode={padalaSelectionMode}
            />
            <p className="text-xs text-gray-500 mt-2 text-center flex items-center justify-center gap-1">
              <span>💡</span> Tip: Select a mode above, then tap map or drag pins to set locations.
            </p>
          </div>

        {/* Item Details */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Item Details</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Item Description *</label>
              <textarea
                name="item_description"
                value={padalaData.item_description}
                onChange={handlePadalaInputChange}
                required
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-primary focus:border-transparent"
                placeholder="Describe what you are sending"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Item Weight (optional)</label>
                <input
                  type="text"
                  name="item_weight"
                  value={padalaData.item_weight}
                  onChange={handlePadalaInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-primary focus:border-transparent"
                  placeholder="e.g., 1kg, 2kg, light"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Item Value (optional)</label>
                <input
                  type="number"
                  name="item_value"
                  value={padalaData.item_value}
                  onChange={handlePadalaInputChange}
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-primary focus:border-transparent"
                  placeholder="₱0.00"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Preferred Schedule */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span>📅</span>
            Preferred Schedule
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Date</label>
              <input
                type="date"
                name="preferred_date"
                value={padalaData.preferred_date}
                onChange={handlePadalaInputChange}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Time</label>
              <select
                name="preferred_time"
                value={padalaData.preferred_time}
                onChange={handlePadalaInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-primary focus:border-transparent"
              >
                <option value="Morning">Morning</option>
                <option value="Afternoon">Afternoon</option>
                <option value="Evening">Evening</option>
                <option value="Any">Any</option>
              </select>
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Special Instructions (optional)</label>
          <textarea
            name="special_instructions"
            value={padalaData.special_instructions}
            onChange={handlePadalaInputChange}
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-primary focus:border-transparent"
            placeholder="Any special instructions for delivery"
          />
        </div>

        {/* Delivery Fee Display */}
        {distance !== null && deliveryFee > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Estimated Distance</p>
                <p className="text-lg font-semibold text-gray-900">{distance} km</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Delivery Fee</p>
                <p className="text-2xl font-bold text-green-primary">₱{deliveryFee.toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-4 rounded-xl font-medium text-lg transition-all duration-200 transform bg-green-primary text-white hover:bg-green-dark hover:scale-[1.02] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Padala Booking'}
        </button>
      </form>
    </div>
  );
};

export default PadalaBooking;
