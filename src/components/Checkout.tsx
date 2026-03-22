import React, { useState } from 'react';
import { ArrowLeft, MapPin, Navigation, Tag, X } from 'lucide-react';
import { CartItem, PaymentMethod, PromoCode } from '../types';
import { usePaymentMethods } from '../hooks/usePaymentMethods';
import { useLocationService } from '../hooks/useLocationService';
import { usePromoCodes } from '../hooks/usePromoCodes';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { useRestaurants } from '../hooks/useRestaurants';
import DeliveryMap from './DeliveryMap';

interface CheckoutProps {
  cartItems: CartItem[];
  totalPrice: number;
  onBack: () => void;
}

const Checkout: React.FC<CheckoutProps> = ({ cartItems, totalPrice, onBack }) => {
  const { paymentMethods } = usePaymentMethods();
  const { calculateDistance, calculateDeliveryFee, isWithinDeliveryArea, restaurantLocation, maxDeliveryRadius, geocodeAddressOSM, getRouteOSRM } = useLocationService();
  const { validatePromoCode, incrementUsage } = usePromoCodes();
  const { siteSettings } = useSiteSettings();
  const { restaurants } = useRestaurants();

  const [step, setStep] = useState<'details' | 'payment'>('details');
  const [customerName, setCustomerName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [notes, setNotes] = useState('');
  
  // Group items by restaurant
  const groupedItems = React.useMemo(() => {
    const groups: Record<string, CartItem[]> = {};
    cartItems.forEach(item => {
      const restaurantName = item.restaurantName || 'Other Items';
      if (!groups[restaurantName]) {
        groups[restaurantName] = [];
      }
      groups[restaurantName].push(item);
    });
    return groups;
  }, [cartItems]);

  const convenienceFee = siteSettings?.easy_buy_convenience_enabled ? (siteSettings.easy_buy_convenience_fee || 0) : 0;
  
  const startingPointFee = React.useMemo(() => {
    let maxFee = 0;
    let foundStoreFee = false;
    
    // Check if any store in the cart has a specific starting point fee enabled
    Object.keys(groupedItems).forEach(storeName => {
      const store = restaurants.find(r => r.name === storeName);
      if (store && store.starting_point_fee_enabled) {
        foundStoreFee = true;
        if ((store.starting_point_fee || 0) > maxFee) {
          maxFee = store.starting_point_fee || 0;
        }
      }
    });

    if (foundStoreFee) {
      return maxFee;
    }

    // Fallback to global setting
    if (siteSettings?.easy_buy_starting_point_enabled) {
      return siteSettings.easy_buy_starting_point_fee || 0;
    }
    return 0;
  }, [groupedItems, restaurants, siteSettings]);
  
  const additionalStoreCount = Math.max(0, Object.keys(groupedItems).length - 1);
  const additionalStoreFee = additionalStoreCount > 0 ? additionalStoreCount * (siteSettings?.easy_buy_multiple_store_fee || 0) : 0;
  // Delivery fee calculation
  const [distance, setDistance] = useState<number | null>(null);
  const [deliveryFee, setDeliveryFee] = useState<number>(65); // Default base fee
  const [isCalculatingDistance, setIsCalculatingDistance] = useState(false);
  const [customerLocation, setCustomerLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  // Delivery area validation
  const [isWithinArea, setIsWithinArea] = useState<boolean | null>(null);
  const [areaCheckError, setAreaCheckError] = useState<string | null>(null);
  const [isAddressReadOnly, setIsAddressReadOnly] = useState(false);

  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][] | null>(null);
  const [shouldFitBounds, setShouldFitBounds] = useState(true);

  // Promo Code State
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);


  const [ipAddress, setIpAddress] = useState<string | undefined>(undefined);

  // Ref to skip next geocode update (prevent overwriting precise coords with address geocode)
  const skipNextGeocode = React.useRef(false);
  const prevAddress = React.useRef(address);

  // Fetch IP address
  React.useEffect(() => {
    fetch('https://api.ipify.org?format=json')
      .then(response => response.json())
      .then(data => setIpAddress(data.ip))
      .catch(err => console.error('Error fetching IP:', err));
  }, []);

  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  // Set default payment method when payment methods are loaded
  React.useEffect(() => {
    if (paymentMethods.length > 0 && !paymentMethod) {
      setPaymentMethod(paymentMethods[0].id as PaymentMethod);
    }
  }, [paymentMethods]);


  const getCurrentLocation = () => {
    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setShouldFitBounds(true);
        setCustomerLocation({ lat: latitude, lng: longitude });

        // Reverse geocode to get address
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
          );
          const data = await response.json();
          if (data && data.display_name) {
            skipNextGeocode.current = true;
            setAddress(data.display_name);
            setIsAddressReadOnly(true);
          }
        } catch (err) {
          console.error('Reverse geocoding error:', err);
        }

        // Calculate distance
        const distanceResult = await calculateDistance(`${latitude},${longitude}`);
        if (distanceResult) {
          setDistance(distanceResult.distance);
          const fee = calculateDeliveryFee(distanceResult.distance);
          setDeliveryFee(fee);
          if (distanceResult.routeCoordinates) {
            setRouteCoordinates(distanceResult.routeCoordinates);
          }
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

  const updateRoute = async (lat: number, lng: number) => {
    const route = await getRouteOSRM(restaurantLocation, { lat, lng });
    setRouteCoordinates(route);
  };

  // Handle manual location selection on map
  const handleLocationSelect = async (lat: number, lng: number) => {
    skipNextGeocode.current = true; // IMMEDIATELY set skip to true to prevent any race conditions
    setShouldFitBounds(false); // Don't auto-zoom when manually selecting/dragging
    setCustomerLocation({ lat, lng });
    setIsCalculatingDistance(true);

    try {
      // Reverse geocode to get address
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
          { signal: controller.signal }
        );
        clearTimeout(timeoutId);

        const data = await response.json();
        if (data && data.display_name) {
          // skipNextGeocode.current = true; // Already set at start
          setAddress(data.display_name);
          setIsAddressReadOnly(false); // Allow editing even after drag
        }
      } catch (err) {
        console.error('Reverse geocoding error:', err);
      }

      // Calculate distance
      const distanceResult = await calculateDistance(`${lat},${lng}`);
      if (distanceResult) {
        setDistance(distanceResult.distance);
        const fee = calculateDeliveryFee(distanceResult.distance);
        setDeliveryFee(fee);
        if (distanceResult.routeCoordinates) {
          setRouteCoordinates(distanceResult.routeCoordinates);
        }

        // Check if within area
        if (distanceResult.distance > maxDeliveryRadius) {
          setIsWithinArea(false);
          setAreaCheckError(`We only deliver to addresses within ${maxDeliveryRadius}km from our restaurant location.`);
        } else {
          setIsWithinArea(true);
          setAreaCheckError(null);
        }
      }

      // Update route
      await updateRoute(lat, lng);
    } finally {
      setIsCalculatingDistance(false);
    }
  };

  // Calculate distance and delivery fee when address changes

  React.useEffect(() => {
    // Only run if address actually changed
    if (address.trim() && address !== prevAddress.current) {
      prevAddress.current = address;

      const timeoutId = setTimeout(async () => {
        if (skipNextGeocode.current) {
          skipNextGeocode.current = false;
          return;
        }

        setIsCalculatingDistance(true);
        setAreaCheckError(null);

        try {
          // First check if address is within delivery area
          const areaCheck = await isWithinDeliveryArea(address);
          setIsWithinArea(areaCheck.within);

          if (areaCheck.error) {
            setAreaCheckError(areaCheck.error);
          }

          // Only calculate distance and fee if address is within delivery area
          if (areaCheck.within) {
            const result = await calculateDistance(address);
            if (result) {
              setDistance(result.distance);
              const fee = calculateDeliveryFee(result.distance);
              setDeliveryFee(fee);
              if (result.routeCoordinates) {
                setRouteCoordinates(result.routeCoordinates);
              }
            } else {
              setDistance(null);
              setDeliveryFee(calculateDeliveryFee(null));
            }


            // Get coordinates for the address to show on map
            try {
              const coords = await geocodeAddressOSM(address);
              if (coords) {
                setShouldFitBounds(true);
                setCustomerLocation(coords);
              }
            } catch (err) {
              console.error('Geocoding error:', err);
            }
          } else {
            // Address is outside delivery area
            setDistance(null);
            setDeliveryFee(0);
            setCustomerLocation(null);
          }
        } finally {
          setIsCalculatingDistance(false);
        }
      }, 1000); // Debounce for 1 second

      return () => clearTimeout(timeoutId);
    } else {
      setDistance(null);
      setDeliveryFee(calculateDeliveryFee(null));
      setCustomerLocation(null);
      setIsWithinArea(null);
      setAreaCheckError(null);
    }
  }, [address, calculateDistance, calculateDeliveryFee, isWithinDeliveryArea]);

  // Calculate total price including delivery fee, starting point, additional store, convenience fee, and discount
  const finalTotalPrice = React.useMemo(() => {
    return Math.max(0, totalPrice + deliveryFee + startingPointFee + additionalStoreFee + convenienceFee - discountAmount);
  }, [totalPrice, deliveryFee, startingPointFee, additionalStoreFee, convenienceFee, discountAmount]);

  // Alias for consistency with other parts of the code
  const grandTotal = finalTotalPrice;

  const handleApplyPromo = async () => {
    if (!promoCodeInput.trim()) return;

    setIsValidatingPromo(true);
    setPromoError(null);

    try {
      // Determine what amount to validate against (usually subtotal for food items)
      const { valid, message, promoCode } = await validatePromoCode(
        promoCodeInput,
        totalPrice,
        'food', // Default to food check
        ipAddress
      );

      if (!valid || !promoCode) {
        setPromoError(message || 'Invalid promo code');
        setAppliedPromo(null);
        setDiscountAmount(0);
      } else {
        // Calculate actual discount based on applicability
        let calculatedDiscount = 0;

        if (promoCode.applicable_to === 'delivery_fee') {
          // Apply to delivery fee
          if (promoCode.discount_type === 'percentage') {
            calculatedDiscount = (deliveryFee * promoCode.discount_value) / 100;
          } else {
            calculatedDiscount = promoCode.discount_value;
          }
          // Cap at delivery fee amount
          calculatedDiscount = Math.min(calculatedDiscount, deliveryFee);
        } else if (promoCode.applicable_to === 'food_items') {
          // Apply to subtotal
          if (promoCode.discount_type === 'percentage') {
            calculatedDiscount = (totalPrice * promoCode.discount_value) / 100;
          } else {
            calculatedDiscount = promoCode.discount_value;
          }
        } else {
          // Apply to total (subtotal + delivery fee)
          const total = totalPrice + deliveryFee;
          if (promoCode.discount_type === 'percentage') {
            calculatedDiscount = (total * promoCode.discount_value) / 100;
          } else {
            calculatedDiscount = promoCode.discount_value;
          }
        }

        // Apply max discount limit if exists
        if (promoCode.max_discount_amount && calculatedDiscount > promoCode.max_discount_amount) {
          calculatedDiscount = promoCode.max_discount_amount;
        }

        setAppliedPromo(promoCode);
        setDiscountAmount(calculatedDiscount);
        setPromoError(null);
      }
    } catch (err) {
      setPromoError('Failed to apply promo code');
    } finally {
      setIsValidatingPromo(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setDiscountAmount(0);
    setPromoCodeInput('');
    setPromoError(null);
  };

  // (groupedItems moved to top)

  const selectedPaymentMethod = paymentMethods.find(method => method.id === paymentMethod);

  const handleProceedToPayment = () => {
    setStep('payment');
  };

  const handlePlaceOrder = async () => {
    if (appliedPromo) {
      await incrementUsage(appliedPromo.id, ipAddress);
    }

    const orderDetails = `
🛒 Easy Buy Delivery ORDER

👤 Customer: ${customerName}
📞 Contact: ${contactNumber}${receiverName ? `\n📋 Receiver: ${receiverName}` : ''}
📍 Service: Delivery
🏠 Address: ${address}${landmark ? `\n🗺️ Landmark: ${landmark}` : ''}${customerLocation ? `\n📌 Pin Location: https://maps.google.com/?q=${customerLocation.lat},${customerLocation.lng}` : ''}


📋 ORDER DETAILS:

${Object.entries(groupedItems).map(([restaurantName, items]) => `
🏪 ${restaurantName}
${items.map(item => {
      let itemDetails = `• ${item.category ? item.category + ' | ' : ''}${item.name}`;
      if (item.selectedVariation) {
        itemDetails += ` | ${item.selectedVariation.name}`;
      }
      if (item.selectedAddOns && item.selectedAddOns.length > 0) {
        itemDetails += ` | ${item.selectedAddOns.map(addOn =>
          addOn.quantity && addOn.quantity > 1
            ? `${addOn.name} x${addOn.quantity}`
            : addOn.name
        ).join(', ')}`;
      }
      itemDetails += ` | Qty: ${item.quantity} | SRP: ₱${item.totalPrice} | Total: ₱${item.totalPrice * item.quantity}`;
      return itemDetails;
    }).join('\n')}`).join('\n')}

💰 Subtotal: ₱${totalPrice}
🛵 Delivery Fee: ₱${(deliveryFee + startingPointFee).toFixed(2)}${distance !== null ? ` (${distance} km)` : ''}
${startingPointFee > 0 ? `   ↳ Includes Starting Point Fee: ₱${startingPointFee.toFixed(2)}\n` : ''}${additionalStoreFee > 0 ? `🏪 Additional Store Fee: ₱${additionalStoreFee.toFixed(2)}\n` : ''}${convenienceFee > 0 ? `🏷️ Convenience Fee: ₱${convenienceFee.toFixed(2)}\n` : ''}${appliedPromo ? `🏷️ Promo Code: ${appliedPromo.code} (-₱${discountAmount.toFixed(2)})\n` : ''}💰 TOTAL BILL: ₱${grandTotal.toFixed(2)}

⚠️ Notice: The price will be different at the store or restaurant.

💳 Payment: ${paymentMethod === 'cod' ? 'Cash on Delivery (COD)' : (selectedPaymentMethod?.name || paymentMethod)}${paymentMethod !== 'cod' ? '\n📸 Payment Screenshot: Please attach your payment receipt screenshot' : ''}

${notes ? `📝 Notes: ${notes}` : ''}

Please confirm this order to proceed. Thank you for choosing Easy Buy Delivery! 🛵
    `.trim();

    const encodedMessage = encodeURIComponent(orderDetails);
    const messengerId = siteSettings?.messenger_id || '61558704207383';
    const messengerUrl = `https://m.me/${messengerId}?text=${encodedMessage}`;

    window.location.href = messengerUrl;
  };

  const isDetailsValid = customerName && contactNumber && address;

  if (step === 'details') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center mb-8">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-black transition-colors duration-200"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Cart</span>
          </button>
          <h1 className="text-3xl font-noto font-semibold text-black ml-8">Delivery Details</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Summary */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-2xl font-noto font-medium text-black mb-6">Order Summary</h2>

            <div className="space-y-6 mb-6">
              {Object.entries(groupedItems).map(([restaurantName, items]) => (
                <div key={restaurantName}>
                  <h3 className="font-medium text-green-primary mb-2 flex items-center gap-2">
                    <span className="text-lg">🏪</span> {restaurantName}
                  </h3>
                  <div className="pl-4 border-l-2 border-gray-100 space-y-3">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                        <div>
                          <h4 className="font-medium text-black">{item.name}</h4>
                          {item.selectedVariation && (
                            <p className="text-sm text-gray-600">Size: {item.selectedVariation.name}</p>
                          )}
                          {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                            <p className="text-sm text-gray-600">
                              Add-ons: {item.selectedAddOns.map(addOn => addOn.name).join(', ')}
                            </p>
                          )}
                          <p className="text-sm text-gray-600">₱{item.totalPrice} x {item.quantity}</p>
                        </div>
                        <span className="font-semibold text-black">₱{item.totalPrice * item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-200 pt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="text-gray-900">₱{totalPrice.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  Delivery Fee:
                  {isCalculatingDistance && (
                    <span className="text-xs text-gray-500 ml-1">(calculating...)</span>
                  )}
                  {distance !== null && !isCalculatingDistance && (
                    <span className="text-xs text-gray-500 ml-1">({distance} km)</span>
                  )}
                </span>
                <span className="text-gray-900 font-semibold">₱{(deliveryFee + startingPointFee).toFixed(2)}</span>
              </div>
              {startingPointFee > 0 && (
                <div className="flex items-center justify-between text-xs text-gray-500 pl-5">
                  <span>↳ Includes Starting Point Fee:</span>
                  <span>₱{startingPointFee.toFixed(2)}</span>
                </div>
              )}
              {additionalStoreFee > 0 && (
                 <div className="flex items-center justify-between text-sm">
                   <span className="text-gray-600">Additional Store Fee:</span>
                   <span className="text-gray-900 font-semibold">₱{additionalStoreFee.toFixed(2)}</span>
                 </div>
              )}
              {convenienceFee > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Convenience Fee:</span>
                  <span className="text-gray-900 font-semibold">₱{convenienceFee.toFixed(2)}</span>
                </div>
              )}

              {/* Promo Code Section */}
              <div className="py-3 border-y border-gray-100 my-2">
                {!appliedPromo ? (
                  <div className="flex space-x-2">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Tag className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        value={promoCodeInput}
                        onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-green-500 focus:border-green-500 sm:text-sm"
                        placeholder="Enter promo code"
                      />
                    </div>
                    <button
                      onClick={handleApplyPromo}
                      disabled={isValidatingPromo || !promoCodeInput}
                      className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isValidatingPromo ? '...' : 'Apply'}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-green-50 px-3 py-2 rounded-lg border border-green-100">
                    <div className="flex items-center space-x-2">
                      <Tag className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-green-900">
                          Code: {appliedPromo.code}
                        </p>
                        <p className="text-xs text-green-700">
                          Discount applied
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleRemovePromo}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )
                }
                {promoError && (
                  <p className="mt-2 text-sm text-red-600 flex items-center">
                    <span className="mr-1">⚠️</span> {promoError}
                  </p>
                )}
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-green-600 font-medium">
                  <span>Discount</span>
                  <span>-₱{discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-2xl font-noto font-semibold text-black pt-2 border-t border-gray-200">
                <span>Total Bill:</span>
                <span>₱{grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Customer Details Form */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-2xl font-noto font-medium text-black mb-6">Delivery Information</h2>

            <form className="space-y-6">
              {/* Customer Information */}
              <div>
                <label className="block text-sm font-medium text-black mb-2">Name *</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-primary focus:border-transparent transition-all duration-200"
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-2">Name of Receiver</label>
                <input
                  type="text"
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-primary focus:border-transparent transition-all duration-200"
                  placeholder="Leave blank if same as customer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-2">Contact Number *</label>
                <input
                  type="tel"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-primary focus:border-transparent transition-all duration-200"
                  placeholder="09XX XXX XXXX"
                  required
                />
              </div>

              {/* Delivery Address */}
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Delivery Address *
                </label>
                <div className="flex flex-col gap-3 mb-2">
                  <button
                    type="button"
                    onClick={getCurrentLocation}
                    disabled={isGettingLocation}
                    className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
                    title="Use my current location"
                  >
                    <Navigation className={`h-5 w-5 ${isGettingLocation ? 'animate-spin' : ''}`} />
                    {isGettingLocation ? 'Getting Location...' : 'Use My Current Location'}
                  </button>

                  <textarea
                    value={address}
                    onChange={(e) => !isAddressReadOnly && setAddress(e.target.value)}
                    readOnly={isAddressReadOnly}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-primary focus:border-transparent transition-all duration-200 ${isWithinArea === false ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      } ${isAddressReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    placeholder="Enter your complete delivery address"
                    rows={3}
                    required
                  />
                </div>
                {isWithinArea === false && !isCalculatingDistance && (
                  <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800 font-medium">
                      ⚠️ Delivery not available to this address
                    </p>
                    <p className="text-xs text-red-600 mt-1">
                      We only deliver to addresses within {maxDeliveryRadius}km from our restaurant location.
                    </p>
                    {areaCheckError && (
                      <p className="text-xs text-red-500 mt-1">{areaCheckError}</p>
                    )}
                  </div>
                )}


                {/* Map Display */}
                {(customerLocation || address) && (
                  <div className="mt-4">
                    <DeliveryMap
                      pickupLocation={restaurantLocation}
                      dropoffLocation={customerLocation}
                      distance={distance}
                      address={address}
                      onDropoffSelect={handleLocationSelect}
                      routeCoordinates={routeCoordinates}
                      fitBounds={shouldFitBounds}
                    />
                    <p className="text-xs text-gray-500 mt-2 text-center flex items-center justify-center gap-1">
                      <span>💡</span> Tip: You can drag the blue pin to your exact location.
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-2">Landmark</label>
                <input
                  type="text"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-primary focus:border-transparent transition-all duration-200"
                  placeholder="e.g., Near McDonald's, Beside 7-Eleven, In front of school"
                />
              </div>

              {/* Special Notes */}
              <div>
                <label className="block text-sm font-medium text-black mb-2">Special Instructions</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-primary focus:border-transparent transition-all duration-200"
                  placeholder="Any special requests or notes..."
                  rows={3}
                />
              </div>

              <button
                onClick={handleProceedToPayment}
                disabled={!isDetailsValid}
                className={`w-full py-4 rounded-xl font-medium text-lg transition-all duration-200 transform ${isDetailsValid
                  ? 'bg-green-primary text-white hover:bg-green-dark hover:scale-[1.02] shadow-lg'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
              >
                Proceed to Payment
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Payment Step
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center mb-8">
        <button
          onClick={() => setStep('details')}
          className="flex items-center space-x-2 text-gray-600 hover:text-black transition-colors duration-200"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Details</span>
        </button>
        <h1 className="text-3xl font-noto font-semibold text-black ml-8">Payment</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Payment Method Selection */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-2xl font-noto font-medium text-black mb-6">Payment Option</h2>

          <div className="grid grid-cols-1 gap-4 mb-6">
            {/* Cash on Delivery */}
            <button
              type="button"
              onClick={() => setPaymentMethod('cod')}
              className={`p-4 rounded-lg border-2 transition-all duration-200 flex items-center space-x-3 ${paymentMethod === 'cod'
                ? 'border-green-primary bg-green-primary text-white'
                : 'border-gray-300 bg-white text-gray-700 hover:border-green-primary'
                }`}
            >
              <span className="text-2xl">💵</span>
              <span className="font-medium">Cash on Delivery</span>
            </button>

            {/* Cashless payments */}
            {paymentMethods.map((method) => (
              <button
                key={method.id}
                type="button"
                onClick={() => setPaymentMethod(method.id as PaymentMethod)}
                className={`p-4 rounded-lg border-2 transition-all duration-200 flex items-center space-x-3 ${paymentMethod === method.id
                  ? 'border-green-primary bg-green-primary text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-green-primary'
                  }`}
              >
                <span className="text-2xl">💳</span>
                <span className="font-medium">{method.name}</span>
              </button>
            ))}
          </div>

          {/* COD Notice */}
          {paymentMethod === 'cod' && (
            <div className="bg-green-50 rounded-lg p-6 mb-6 border border-green-100">
              <h3 className="font-medium text-black mb-2">💵 Cash on Delivery</h3>
              <p className="text-sm text-gray-600">Please prepare the exact amount of <strong className="text-black">₱{grandTotal.toFixed(2)}</strong> upon delivery.</p>
            </div>
          )}

          {/* Payment Details with QR Code (for cashless) */}
          {paymentMethod !== 'cod' && selectedPaymentMethod && (
            <div className="bg-green-50 rounded-lg p-6 mb-6 border border-green-100">
              <h3 className="font-medium text-black mb-4">Cashless Payment Details</h3>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-1">{selectedPaymentMethod.name}</p>
                  <p className="font-mono text-black font-medium">{selectedPaymentMethod.account_number}</p>
                  <p className="text-sm text-gray-600 mb-3">Account Name: {selectedPaymentMethod.account_name}</p>
                  <p className="text-xl font-semibold text-black">Amount: ₱{grandTotal.toFixed(2)}</p>
                </div>
                <div className="flex-shrink-0">
                  <img
                    src={selectedPaymentMethod.qr_code_url}
                    alt={`${selectedPaymentMethod.name} QR Code`}
                    className="w-32 h-32 rounded-lg border-2 border-green-300 shadow-sm"
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.pexels.com/photos/8867482/pexels-photo-8867482.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop';
                    }}
                  />
                  <p className="text-xs text-gray-500 text-center mt-2">Scan to pay</p>
                </div>
              </div>
            </div>
          )}

          {/* Reference Number for cashless */}
          {paymentMethod !== 'cod' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-black mb-2">📸 Payment Proof Required</h4>
              <p className="text-sm text-gray-700">
                After making your payment, please take a screenshot of your payment receipt and attach it when you send your order via Messenger. This helps us verify and process your order quickly.
              </p>
            </div>
          )}
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-2xl font-noto font-medium text-black mb-6">Final Order Summary</h2>

          <div className="space-y-6 mb-6">
            <div className="bg-green-50 rounded-lg p-4 border border-green-100">
              <h4 className="font-medium text-black mb-2">Customer Details</h4>
              <p className="text-sm text-gray-600">Name: {customerName}</p>
              {receiverName && <p className="text-sm text-gray-600">Receiver: {receiverName}</p>}
              <p className="text-sm text-gray-600">Contact: {contactNumber}</p>
              <p className="text-sm text-gray-600">Address: {address}</p>
              {landmark && <p className="text-sm text-gray-600">Landmark: {landmark}</p>}
            </div>

            {Object.entries(groupedItems).map(([restaurantName, items]) => (
              <div key={restaurantName}>
                <h3 className="font-medium text-green-primary mb-2 flex items-center gap-2">
                  <span className="text-lg">🏪</span> {restaurantName}
                </h3>
                <div className="pl-4 border-l-2 border-gray-100 space-y-3">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div>
                        <h4 className="font-medium text-black">{item.name}</h4>
                        {item.selectedVariation && (
                          <p className="text-sm text-gray-600">Size: {item.selectedVariation.name}</p>
                        )}
                        {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                          <p className="text-sm text-gray-600">
                            Add-ons: {item.selectedAddOns.map(addOn =>
                              addOn.quantity && addOn.quantity > 1
                                ? `${addOn.name} x${addOn.quantity}`
                                : addOn.name
                            ).join(', ')}
                          </p>
                        )}
                        <p className="text-sm text-gray-600">₱{item.totalPrice} x {item.quantity}</p>
                      </div>
                      <span className="font-semibold text-black">₱{item.totalPrice * item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-200 pt-4 mb-6 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="text-gray-900">₱{totalPrice.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                Delivery Fee:
                {distance !== null && (
                  <span className="text-xs text-gray-500 ml-1">({distance} km)</span>
                )}
              </span>
              <span className="text-gray-900 font-semibold">₱{(deliveryFee + startingPointFee).toFixed(2)}</span>
            </div>
            {startingPointFee > 0 && (
              <div className="flex items-center justify-between text-xs text-gray-500 pl-5">
                <span>↳ Includes Starting Point Fee:</span>
                <span>₱{startingPointFee.toFixed(2)}</span>
              </div>
            )}
            {additionalStoreFee > 0 && (
               <div className="flex items-center justify-between text-sm">
                 <span className="text-gray-600">Additional Store Fee:</span>
                 <span className="text-gray-900 font-semibold">₱{additionalStoreFee.toFixed(2)}</span>
               </div>
            )}
            {convenienceFee > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Convenience Fee:</span>
                <span className="text-gray-900 font-semibold">₱{convenienceFee.toFixed(2)}</span>
              </div>
            )}

            {discountAmount > 0 && (
              <div className="flex justify-between text-green-600 font-medium text-sm">
                <span>Discount</span>
                <span>-₱{discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-2xl font-noto font-semibold text-black pt-2 border-t border-gray-200">
              <span>Total Bill:</span>
              <span>₱{grandTotal.toFixed(2)}</span>
            </div>
          </div>

          <button
            onClick={handlePlaceOrder}
            className="w-full py-4 rounded-xl font-medium text-lg transition-all duration-200 transform bg-green-primary text-white hover:bg-green-dark hover:scale-[1.02] shadow-lg"
          >
            Place Order via Messenger
          </button>

          <p className="text-xs text-gray-500 text-center mt-3">
            You'll be redirected to Facebook Messenger to confirm your order. Don't forget to attach your payment screenshot!
          </p>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
