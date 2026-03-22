export interface Variation {
  id: string;
  name: string;
  price: number;
}

export interface AddOn {
  id: string;
  name: string;
  price: number;
  category: string;
  quantity?: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  category: string;
  restaurantName?: string;
  image?: string;
  popular?: boolean;
  available?: boolean;
  variations?: Variation[];
  addOns?: AddOn[];
  // Discount pricing fields
  discountPrice?: number;
  discountStartDate?: string;
  discountEndDate?: string;
  discountActive?: boolean;
  // Computed effective price (calculated in the app)
  effectivePrice?: number;
  isOnDiscount?: boolean;
}

export interface CartItem extends MenuItem {
  quantity: number;
  selectedVariation?: Variation;
  selectedAddOns?: AddOn[];
  totalPrice: number;
}

export interface OrderData {
  items: CartItem[];
  customerName: string;
  contactNumber: string;
  receiverName?: string;
  serviceType: 'delivery';
  address: string;
  landmark?: string;
  paymentMethod: 'cod' | 'gcash' | 'maya' | 'bank-transfer';
  referenceNumber?: string;
  total: number;
  notes?: string;
  deliveryFee: number;
  convenienceFee: number;
}

export type PaymentMethod = 'cod' | 'gcash' | 'maya' | 'bank-transfer';
export type ServiceType = 'delivery';

// Site Settings Types
export interface SiteSetting {
  id: string;
  value: string;
  type: 'text' | 'image' | 'boolean' | 'number';
  description?: string;
  updated_at: string;
}

export interface SiteSettings {
  site_name: string;
  site_logo: string;
  site_description: string;
  site_tagline: string;
  address: string;
  facebook_url: string;
  facebook_handle: string;
  currency: string;
  currency_code: string;
  messenger_id: string;
  // New Admin Settings
  daily_operation_schedule?: string;
  easy_buy_delivery_base_fee?: number;
  easy_buy_multiple_store_fee?: number;
  easy_buy_convenience_fee?: number;
  easy_buy_convenience_enabled?: boolean;
  easy_buy_starting_point_fee?: number;
  easy_buy_starting_point_enabled?: boolean;
  padala_base_fee?: number;
  padala_additional_dropoff_fee?: number;
  padala_convenience_fee?: number;
  padala_convenience_enabled?: boolean;
  angkas_transport_fee_per_km?: number;
  feature_padala_enabled?: boolean;
  feature_angkas_enabled?: boolean;
  feature_pabili_enabled?: boolean;
}

// Store / Restaurant Types
export interface Restaurant {
  id: string;
  name: string;
  type: 'Restaurant' | 'Cafe' | 'Fast Food' | 'Bakery' | 'Desserts';
  image: string;
  rating: number;
  reviewCount: number;
  deliveryTime: string;
  deliveryFee: number;
  description?: string;
  logo?: string;
  active: boolean;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
  // New Store fields
  store_address?: string;
  pin_location?: { lat: number; lng: number };
  contact_person?: string;
  contact_number?: string;
  store_availability?: boolean;
  markup_type?: 'peso' | 'percentage';
  markup_value?: number;
  markup_enabled?: boolean;
  starting_point_lat?: number;
  starting_point_lng?: number;
  starting_point_enabled?: boolean;
  starting_point_fee?: number;
  starting_point_fee_enabled?: boolean;
  convenience_fee?: number;
  convenience_fee_enabled?: boolean;
  additional_store_fee?: number;
}

// Restaurant Menu Item (different from general MenuItem)
export interface RestaurantMenuItem {
  id: string;
  restaurant_id: string;
  name: string;
  description: string;
  basePrice: number;
  category: string;
  image?: string;
  popular?: boolean;
  available?: boolean;
  variations?: Variation[];
  addOns?: AddOn[];
  discountPrice?: number;
  discountStartDate?: string;
  discountEndDate?: string;
  discountActive?: boolean;
  effectivePrice?: number;
  isOnDiscount?: boolean;
}

// Padala/Pabili Booking
export interface PadalaBooking {
  id: string;
  customer_name: string;
  contact_number: string;
  pickup_address: string;
  delivery_address: string;
  item_description: string;
  item_weight?: string;
  item_value?: number;
  special_instructions?: string;
  preferred_date?: string;
  preferred_time?: string;
  status: 'pending' | 'confirmed' | 'in_transit' | 'delivered' | 'cancelled';
  delivery_fee?: number;
  distance_km?: number;
  payment_method?: string;
  reference_number?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Pabili/Padala Order Item
export interface PabiliOrderItem {
  id: string;
  item_description: string;
  quantity: number;
}

// Pabili/Padala Store Order (one per store)
export interface PabiliStoreOrder {
  id: string;
  store_name: string;
  store_address: string;
  items: PabiliOrderItem[];
}

// Request
export interface Request {
  id: string;
  customer_name: string;
  contact_number: string;
  request_type: string;
  subject: string;
  description: string;
  address?: string;
  status: 'pending' | 'in_progress' | 'resolved' | 'cancelled';
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

// Promo Code
export interface PromoCode {
  id: string;
  code: string;
  description?: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  applicable_to: 'delivery_fee' | 'food_items' | 'total';
  min_order_amount?: number;
  max_discount_amount?: number;
  start_date: string;
  end_date: string;
  usage_limit?: number;
  usage_count: number;
  active: boolean;
  is_new_user_only?: boolean;
  created_at?: string;
  updated_at?: string;
}