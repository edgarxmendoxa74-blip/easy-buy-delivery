import React, { useState } from 'react';
import { ArrowLeft, MapPin, Plus, Trash2, Navigation } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useGoogleMaps } from '../hooks/useGoogleMaps';
import { useSiteSettings } from '../hooks/useSiteSettings';


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

const PadalaBooking: React.FC<PadalaBookingProps> = ({ onBack, title = 'Padala', mode = 'full' }) => {
  const { calculateDistanceBetweenAddresses, calculateDeliveryFee } = useGoogleMaps();
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
    delivery_address: '',
    item_description: '',
    item_weight: '',
    item_value: '',
    special_instructions: '',
    preferred_date: '',
    preferred_time: 'Morning',
    notes: ''
  });

  const [distance, setDistance] = useState<number | null>(null);
  const [deliveryFee, setDeliveryFee] = useState<number>(65);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // ═══════════ PADALA MODE HANDLERS ═══════════
  const handlePadalaInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPadalaData(prev => ({ ...prev, [name]: value }));
  };

  const calculatePadalaFee = async () => {
    if (!padalaData.pickup_address.trim() || !padalaData.delivery_address.trim()) {
      return;
    }

    setIsCalculating(true);
    try {
      const result = await calculateDistanceBetweenAddresses(
        padalaData.pickup_address,
        padalaData.delivery_address
      );

      if (result && !isNaN(result.distance)) {
        setDistance(result.distance);
        const fee = calculateDeliveryFee(result.distance);
        setDeliveryFee(fee);
      } else {
        setDistance(null);
        setDeliveryFee(65);
      }
    } catch (error) {
      console.error('Error calculating fee:', error);
      setDistance(null);
      setDeliveryFee(65);
    } finally {
      setIsCalculating(false);
    }
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
  const getCurrentLocation = () => {
    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCustomerData(prev => ({
          ...prev,
          pin_lat: latitude.toString(),
          pin_lng: longitude.toString()
        }));

        // Reverse geocode to get address
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
          );
          const data = await response.json();
          if (data && data.display_name) {
            setCustomerData(prev => ({ ...prev, address: data.display_name }));
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
      if (
        !padalaData.customer_name ||
        !padalaData.contact_number ||
        !padalaData.pickup_address ||
        !padalaData.delivery_address ||
        !padalaData.item_description
      ) {
        alert('Please fill in all required fields');
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
📍 Address: ${customerData.address}${customerData.pin_lat && customerData.pin_lng ? `\n📌 Pin: ${customerData.pin_lat}, ${customerData.pin_lng}` : ''}${customerData.landmark ? `\n🗺️ Landmark: ${customerData.landmark}` : ''}

Please confirm this Pabili order. Thank you! 🛵`;

        const encodedMessage = encodeURIComponent(message);
        const messengerId = siteSettings?.messenger_id || '61558704207383';
        const messengerUrl = `https://m.me/${messengerId}?text=${encodedMessage}`;
        window.open(messengerUrl, '_blank');

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
        const { error } = await supabase
          .from('padala_bookings')
          .insert({
            customer_name: padalaData.customer_name,
            contact_number: padalaData.contact_number,
            pickup_address: padalaData.pickup_address,
            delivery_address: padalaData.delivery_address,
            item_description: padalaData.item_description || null,
            item_weight: padalaData.item_weight ? padalaData.item_weight : null,
            item_value: padalaData.item_value ? parseFloat(padalaData.item_value) : null,
            special_instructions: padalaData.special_instructions || null,
            preferred_date: padalaData.preferred_date ? padalaData.preferred_date : null,
            preferred_time: padalaData.preferred_time,
            delivery_fee: deliveryFee || null,
            distance_km: distance || null,
            notes: padalaData.notes ? padalaData.notes : null,
            status: 'pending'
          });

        if (error) throw error;

        const message = `📦 Padala Service

👤 Customer: ${padalaData.customer_name}
📞 Contact: ${padalaData.contact_number}

📍 Pickup Address:
${padalaData.pickup_address}

📍 Delivery Address:
${padalaData.delivery_address}

${padalaData.item_description ? `📦 Item Details:\n${padalaData.item_description}\n` : ''}${padalaData.item_weight ? `Weight: ${padalaData.item_weight}\n` : ''}${padalaData.item_value ? `Declared Value: ₱${padalaData.item_value}\n` : ''}
📅 Preferred Date: ${padalaData.preferred_date || 'Any'}
⏰ Preferred Time: ${padalaData.preferred_time}

${distance ? `📏 Distance: ${distance} km` : ''}
💰 Delivery Fee: ₱${deliveryFee.toFixed(2)}

${padalaData.special_instructions ? `📝 Special Instructions: ${padalaData.special_instructions}` : ''}${padalaData.notes ? `\n📝 Notes: ${padalaData.notes}` : ''}

Please confirm this Padala booking. Thank you! 🛵`;

        const encodedMessage = encodeURIComponent(message);
        const messengerId = siteSettings?.messenger_id || '61558704207383';
        const messengerUrl = `https://m.me/${messengerId}?text=${encodedMessage}`;
        window.open(messengerUrl, '_blank');

        // Reset form
        setPadalaData({
          customer_name: '',
          contact_number: '',
          pickup_address: '',
          delivery_address: '',
          item_description: '',
          item_weight: '',
          item_value: '',
          special_instructions: '',
          preferred_date: '',
          preferred_time: 'Morning',
          notes: ''
        });
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
                onClick={getCurrentLocation}
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

        {/* Customer Information */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Customer Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Address *</label>
              <textarea
                name="delivery_address"
                value={padalaData.delivery_address}
                onChange={handlePadalaInputChange}
                onBlur={calculatePadalaFee}
                required
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-primary focus:border-transparent"
                placeholder="Enter complete delivery address"
              />
              {isCalculating && (
                <p className="text-xs text-gray-500 mt-1">Calculating distance...</p>
              )}
            </div>
          </div>
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
