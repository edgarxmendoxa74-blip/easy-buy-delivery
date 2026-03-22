// src/components/RestaurantManager.tsx
import React, { useState } from 'react';
import { ArrowLeft, Plus, Edit, Trash2, Save, X, Image as ImageIcon, Utensils, MapPin, Phone, User } from 'lucide-react';
import { Restaurant } from '../types';
import { useRestaurantsAdmin } from '../hooks/useRestaurantsAdmin';
import ImageUpload from './ImageUpload';
import RestaurantMenuManager from './RestaurantMenuManager';

interface RestaurantManagerProps {
  onBack: () => void;
}

interface RestaurantFormData {
  name: string;
  type: 'Restaurant' | 'Cafe' | 'Fast Food' | 'Bakery' | 'Desserts';
  image: string;
  logo?: string;
  rating: number;
  reviewCount: number;
  deliveryTime: string;
  deliveryFee: number;
  description?: string;
  active: boolean;
  sort_order?: number;
  // New Store fields
  store_address: string;
  pin_lat: string;
  pin_lng: string;
  contact_person: string;
  contact_number: string;
  store_availability: boolean;
  markup_type: 'peso' | 'percentage';
  markup_value: number;
  markup_enabled: boolean;
  starting_point_lat: string;
  starting_point_lng: string;
  starting_point_enabled: boolean;
  starting_point_fee: number;
  starting_point_fee_enabled: boolean;
  convenience_fee: number;
  convenience_fee_enabled: boolean;
  additional_store_fee: number;
}

const ToggleSwitch: React.FC<{ enabled: boolean; onChange: (v: boolean) => void; label: string; sublabel?: string }> = ({ enabled, onChange, label, sublabel }) => (
  <div className="flex items-center justify-between py-2">
    <div>
      <span className="text-sm font-medium text-black">{label}</span>
      {sublabel && <p className="text-xs text-gray-500">{sublabel}</p>}
    </div>
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${enabled ? 'bg-green-500' : 'bg-gray-300'}`}
    >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  </div>
);

const RestaurantManager: React.FC<RestaurantManagerProps> = ({ onBack }) => {
  const { restaurants, loading, addRestaurant, updateRestaurant, deleteRestaurant, refetch } = useRestaurantsAdmin();
  const [currentView, setCurrentView] = useState<'list' | 'add' | 'edit' | 'menu'>('list');
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [formData, setFormData] = useState<RestaurantFormData>({
    name: '',
    type: 'Restaurant',
    image: '',
    logo: '',
    rating: 0.0,
    reviewCount: 0,
    deliveryTime: '30-45 mins',
    deliveryFee: 0,
    description: '',
    active: true,
    sort_order: 0,
    store_address: '',
    pin_lat: '',
    pin_lng: '',
    contact_person: '',
    contact_number: '',
    store_availability: true,
    markup_type: 'peso',
    markup_value: 0,
    markup_enabled: false,
    starting_point_lat: '',
    starting_point_lng: '',
    starting_point_enabled: false,
    starting_point_fee: 0,
    starting_point_fee_enabled: false,
    convenience_fee: 0,
    convenience_fee_enabled: false,
    additional_store_fee: 0
  });

  const handleAdd = () => {
    setCurrentView('add');
    const maxSortOrder = restaurants.length > 0
      ? Math.max(...restaurants.map(r => r.sort_order || 0))
      : 0;

    setFormData({
      name: '',
      type: 'Restaurant',
      image: '',
      logo: '',
      rating: 0.0,
      reviewCount: 0,
      deliveryTime: '30-45 mins',
      deliveryFee: 0,
      description: '',
      active: true,
      sort_order: maxSortOrder + 1,
      store_address: '',
      pin_lat: '',
      pin_lng: '',
      contact_person: '',
      contact_number: '',
      store_availability: true,
      markup_type: 'peso',
      markup_value: 0,
      markup_enabled: false,
      starting_point_lat: '',
      starting_point_lng: '',
      starting_point_enabled: false,
      starting_point_fee: 0,
      starting_point_fee_enabled: false,
      convenience_fee: 0,
      convenience_fee_enabled: false,
      additional_store_fee: 0
    });
  };

  const handleEdit = (restaurant: Restaurant) => {
    setEditingRestaurant(restaurant);
    setFormData({
      name: restaurant.name,
      type: restaurant.type,
      image: restaurant.image,
      logo: restaurant.logo || '',
      rating: restaurant.rating,
      reviewCount: restaurant.reviewCount,
      deliveryTime: restaurant.deliveryTime,
      deliveryFee: restaurant.deliveryFee,
      description: restaurant.description || '',
      active: restaurant.active,
      sort_order: restaurant.sort_order || 0,
      store_address: restaurant.store_address || '',
      pin_lat: restaurant.pin_location?.lat?.toString() || '',
      pin_lng: restaurant.pin_location?.lng?.toString() || '',
      contact_person: restaurant.contact_person || '',
      contact_number: restaurant.contact_number || '',
      store_availability: restaurant.store_availability ?? true,
      markup_type: restaurant.markup_type || 'peso',
      markup_value: restaurant.markup_value || 0,
      markup_enabled: restaurant.markup_enabled ?? false,
      starting_point_lat: restaurant.starting_point_lat?.toString() || '',
      starting_point_lng: restaurant.starting_point_lng?.toString() || '',
      starting_point_enabled: restaurant.starting_point_enabled ?? false,
      starting_point_fee: restaurant.starting_point_fee || 0,
      starting_point_fee_enabled: restaurant.starting_point_fee_enabled ?? false,
      convenience_fee: restaurant.convenience_fee || 0,
      convenience_fee_enabled: restaurant.convenience_fee_enabled ?? false,
      additional_store_fee: restaurant.additional_store_fee || 0
    });
    setCurrentView('edit');
  };

  const handleSave = async () => {
    if (!formData.name?.trim() || !formData.image?.trim() || !formData.deliveryTime) {
      alert('Please fill in all required fields (Name, Image, and Delivery Time)');
      return;
    }

    try {
      const payload: Omit<Restaurant, 'id' | 'created_at' | 'updated_at'> = {
        name: formData.name.trim(),
        type: formData.type,
        image: formData.image.trim(),
        logo: formData.logo && formData.logo.trim() !== '' ? formData.logo.trim() : undefined,
        rating: Number(formData.rating),
        reviewCount: Number(formData.reviewCount),
        deliveryTime: formData.deliveryTime,
        deliveryFee: 0,
        description: formData.description || undefined,
        active: formData.active,
        sort_order: Number(formData.sort_order) || 0,
        store_address: formData.store_address || undefined,
        pin_location: formData.pin_lat && formData.pin_lng
          ? { lat: parseFloat(formData.pin_lat), lng: parseFloat(formData.pin_lng) }
          : undefined,
        contact_person: formData.contact_person || undefined,
        contact_number: formData.contact_number || undefined,
        store_availability: formData.store_availability,
        markup_type: formData.markup_type,
        markup_value: formData.markup_value || 0,
        markup_enabled: formData.markup_enabled,
        starting_point_lat: formData.starting_point_lat ? parseFloat(formData.starting_point_lat) : undefined,
        starting_point_lng: formData.starting_point_lng ? parseFloat(formData.starting_point_lng) : undefined,
        starting_point_enabled: formData.starting_point_enabled,
        starting_point_fee: formData.starting_point_fee || 0,
        starting_point_fee_enabled: formData.starting_point_fee_enabled,
        convenience_fee: formData.convenience_fee || 0,
        convenience_fee_enabled: formData.convenience_fee_enabled,
        additional_store_fee: formData.additional_store_fee || 0
      };

      if (currentView === 'edit' && editingRestaurant) {
        await updateRestaurant(editingRestaurant.id, payload);
      } else {
        await addRestaurant(payload);
      }

      setCurrentView('list');
      setEditingRestaurant(null);
    } catch (error: any) {
      alert(error.message || 'Failed to save store');
    }
  };

  const handleCancel = () => {
    setCurrentView('list');
    setEditingRestaurant(null);
    setSelectedRestaurant(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this store? This will also delete all its menu items.')) {
      try {
        await deleteRestaurant(id);
        refetch();
      } catch (error) {
        alert('Failed to delete store');
      }
    }
  };

  const handleManageMenu = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setCurrentView('menu');
  };

  const handleBackFromMenu = () => {
    setSelectedRestaurant(null);
    setCurrentView('list');
  };

  // Menu Management View
  if (currentView === 'menu' && selectedRestaurant) {
    return (
      <RestaurantMenuManager
        restaurantId={selectedRestaurant.id}
        restaurantName={selectedRestaurant.name}
        onBack={handleBackFromMenu}
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading stores...</p>
        </div>
      </div>
    );
  }

  if (currentView === 'add' || currentView === 'edit') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <button onClick={handleCancel} className="flex items-center space-x-2 text-gray-600 hover:text-black">
                  <ArrowLeft className="h-5 w-5" />
                  <span>Back</span>
                </button>
                <h1 className="text-2xl font-semibold text-black">
                  {currentView === 'add' ? 'Add Store' : 'Edit Store'}
                </h1>
              </div>
              <div className="flex space-x-3">
                <button onClick={handleCancel} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2">
                  <X className="h-4 w-4" />
                  <span>Cancel</span>
                </button>
                <button onClick={handleSave} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2">
                  <Save className="h-4 w-4" />
                  <span>Save</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
          {/* ═══════════ BASIC STORE INFO ═══════════ */}
          <div className="bg-white rounded-xl shadow-sm p-8">
            <h2 className="text-xl font-semibold text-black mb-6 flex items-center gap-2">
              🏪 Store Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-black mb-2">Name of Store *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter store name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-2">Store Type *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as RestaurantFormData['type'] })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="Restaurant">Restaurant</option>
                  <option value="Cafe">Cafe</option>
                  <option value="Fast Food">Fast Food</option>
                  <option value="Bakery">Bakery</option>
                  <option value="Desserts">Desserts</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-black mb-2">Store Address</label>
                <textarea
                  value={formData.store_address}
                  onChange={(e) => setFormData({ ...formData, store_address: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter complete store address"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  <MapPin className="inline h-4 w-4 mr-1" />
                  Manual Pin Location - Latitude
                </label>
                <input
                  type="text"
                  value={formData.pin_lat}
                  onChange={(e) => setFormData({ ...formData, pin_lat: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="e.g., 7.2016"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  <MapPin className="inline h-4 w-4 mr-1" />
                  Manual Pin Location - Longitude
                </label>
                <input
                  type="text"
                  value={formData.pin_lng}
                  onChange={(e) => setFormData({ ...formData, pin_lng: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="e.g., 125.4584"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  <User className="inline h-4 w-4 mr-1" />
                  Contact Person
                </label>
                <input
                  type="text"
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Name of contact person"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  <Phone className="inline h-4 w-4 mr-1" />
                  Contact Number
                </label>
                <input
                  type="tel"
                  value={formData.contact_number}
                  onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="09XX XXX XXXX"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-2">Delivery Time *</label>
                <input
                  type="text"
                  value={formData.deliveryTime}
                  onChange={(e) => setFormData({ ...formData, deliveryTime: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="e.g., 30-45 mins"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-2">Sort Order</label>
                <input
                  type="number"
                  value={formData.sort_order || 0}
                  onChange={(e) => setFormData({ ...formData, sort_order: Number(e.target.value) || 0 })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>

            {/* Toggles Section */}
            <div className="mt-6 space-y-2 border-t border-gray-100 pt-4">
              <ToggleSwitch
                enabled={formData.store_availability}
                onChange={(v) => setFormData({ ...formData, store_availability: v })}
                label="Store Availability"
                sublabel="Whether the store is currently open and accepting orders"
              />
              <ToggleSwitch
                enabled={formData.active}
                onChange={(v) => setFormData({ ...formData, active: v })}
                label="Active (Visible on Site)"
                sublabel="Show or hide this store from the public listing"
              />
            </div>
          </div>

          {/* ═══════════ MARKUP SETTINGS ═══════════ */}
          <div className="bg-white rounded-xl shadow-sm p-8">
            <h2 className="text-xl font-semibold text-black mb-6 flex items-center gap-2">
              💰 Markup Settings
            </h2>
            <ToggleSwitch
              enabled={formData.markup_enabled}
              onChange={(v) => setFormData({ ...formData, markup_enabled: v })}
              label="Enable Markup"
              sublabel="Add markup to all product prices from this store"
            />
            {formData.markup_enabled && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg animate-in fade-in">
                <div>
                  <label className="block text-sm font-medium text-black mb-2">Markup Type</label>
                  <div className="flex rounded-lg overflow-hidden border border-gray-300">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, markup_type: 'peso' })}
                      className={`flex-1 py-3 text-sm font-medium transition-colors ${formData.markup_type === 'peso' ? 'bg-green-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                    >
                      ₱ Peso
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, markup_type: 'percentage' })}
                      className={`flex-1 py-3 text-sm font-medium transition-colors ${formData.markup_type === 'percentage' ? 'bg-green-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                    >
                      % Percentage
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Markup Value ({formData.markup_type === 'peso' ? '₱' : '%'})
                  </label>
                  <input
                    type="number"
                    value={formData.markup_value}
                    onChange={(e) => setFormData({ ...formData, markup_value: Number(e.target.value) || 0 })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="0"
                    min="0"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ═══════════ DELIVERY FEE SETTINGS ═══════════ */}
          <div className="bg-white rounded-xl shadow-sm p-8">
            <h2 className="text-xl font-semibold text-black mb-6 flex items-center gap-2">
              🛵 Delivery Fee Settings
            </h2>

            {/* Starting Point */}
            <ToggleSwitch
              enabled={formData.starting_point_enabled}
              onChange={(v) => setFormData({ ...formData, starting_point_enabled: v })}
              label="Custom Starting Point"
              sublabel="Not visible to customer. Used for delivery fee computation from starting point → store → customer."
            />
            {formData.starting_point_enabled && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div>
                  <label className="block text-sm font-medium text-black mb-2">Starting Point - Latitude</label>
                  <input
                    type="text"
                    value={formData.starting_point_lat}
                    onChange={(e) => setFormData({ ...formData, starting_point_lat: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="e.g., 7.2016"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-2">Starting Point - Longitude</label>
                  <input
                    type="text"
                    value={formData.starting_point_lng}
                    onChange={(e) => setFormData({ ...formData, starting_point_lng: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="e.g., 125.4584"
                  />
                </div>
                <div className="md:col-span-2 border-t border-amber-200 pt-4 mt-2">
                  <ToggleSwitch
                    enabled={formData.starting_point_fee_enabled}
                    onChange={(v) => setFormData({ ...formData, starting_point_fee_enabled: v })}
                    label="Enable Starting Point Fee"
                    sublabel="Add a specific fee for this starting point"
                  />
                  {formData.starting_point_fee_enabled && (
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-black mb-2">Starting Point Fee (₱)</label>
                      <input
                        type="number"
                        value={formData.starting_point_fee}
                        onChange={(e) => setFormData({ ...formData, starting_point_fee: Number(e.target.value) || 0 })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="0"
                        min="0"
                      />
                    </div>
                  )}
                </div>
                <p className="md:col-span-2 text-xs text-amber-700 mt-2">
                  ⚠️ This starting point is for internal delivery fee computation only and will NOT be visible to the customer.
                </p>
              </div>
            )}

            <div className="mt-6 border-t border-gray-100 pt-4">
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Additional Fee per Extra Store (₱)
                </label>
                <input
                  type="number"
                  value={formData.additional_store_fee}
                  onChange={(e) => setFormData({ ...formData, additional_store_fee: Number(e.target.value) || 0 })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="0"
                  min="0"
                />
                <p className="text-xs text-gray-500 mt-1">Additional peso value for every store added, excluding the first store.</p>
              </div>
            </div>

            {/* Convenience Fee */}
            <div className="mt-6 border-t border-gray-100 pt-4">
              <ToggleSwitch
                enabled={formData.convenience_fee_enabled}
                onChange={(v) => setFormData({ ...formData, convenience_fee_enabled: v })}
                label="Convenience Fee"
                sublabel="Add a convenience fee on top of the delivery fee"
              />
              {formData.convenience_fee_enabled && (
                <div className="mt-3 p-4 bg-gray-50 rounded-lg">
                  <label className="block text-sm font-medium text-black mb-2">Convenience Fee Amount (₱)</label>
                  <input
                    type="number"
                    value={formData.convenience_fee}
                    onChange={(e) => setFormData({ ...formData, convenience_fee: Number(e.target.value) || 0 })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="0"
                    min="0"
                  />
                </div>
              )}
            </div>
          </div>

          {/* ═══════════ IMAGES ═══════════ */}
          <div className="bg-white rounded-xl shadow-sm p-8">
            <h2 className="text-xl font-semibold text-black mb-6">📸 Store Images</h2>
            <div className="mb-8">
              <label className="block text-sm font-medium text-black mb-2">Description</label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter store description"
                rows={3}
              />
            </div>

            <div className="mb-8">
              <label className="block text-sm font-medium text-black mb-2">Store Image *</label>
              <ImageUpload
                currentImage={formData.image || undefined}
                onImageChange={(imageUrl) => {
                  setFormData({
                    ...formData,
                    image: imageUrl && imageUrl.trim() !== '' ? imageUrl.trim() : ''
                  });
                }}
              />
            </div>

            <div className="mb-8">
              <label className="block text-sm font-medium text-black mb-2">Logo (Optional)</label>
              <ImageUpload
                currentImage={formData.logo || undefined}
                onImageChange={(imageUrl) => {
                  setFormData({
                    ...formData,
                    logo: imageUrl && imageUrl.trim() !== '' ? imageUrl.trim() : ''
                  });
                }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // List View
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button onClick={onBack} className="flex items-center space-x-2 text-gray-600 hover:text-black">
                <ArrowLeft className="h-5 w-5" />
                <span>Dashboard</span>
              </button>
              <h1 className="text-2xl font-semibold text-black">Stores</h1>
            </div>
            <button onClick={handleAdd} className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
              <Plus className="h-4 w-4" />
              <span>Add Store</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {restaurants.map((restaurant) => (
            <div key={restaurant.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="relative h-48 bg-gray-200">
                {restaurant.image ? (
                  <img src={restaurant.image} alt={restaurant.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="h-12 w-12 text-gray-400" />
                  </div>
                )}
                <div className="absolute top-4 right-4 flex gap-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${restaurant.store_availability !== false ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                    {restaurant.store_availability !== false ? 'Open' : 'Closed'}
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${restaurant.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                    {restaurant.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{restaurant.name}</h3>
                  {restaurant.logo && (
                    <img src={restaurant.logo} alt="Logo" className="h-10 w-10 rounded-full object-cover" />
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-1">{restaurant.type}</p>
                {restaurant.store_address && (
                  <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {restaurant.store_address}
                  </p>
                )}
                {restaurant.contact_person && (
                  <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                    <User className="h-3 w-3" /> {restaurant.contact_person}
                    {restaurant.contact_number && ` • ${restaurant.contact_number}`}
                  </p>
                )}
                {restaurant.markup_enabled && (
                  <p className="text-xs text-blue-600 mb-1">
                    💰 Markup: {restaurant.markup_type === 'peso' ? `₱${restaurant.markup_value}` : `${restaurant.markup_value}%`}
                  </p>
                )}
                <p className="text-sm text-gray-500 mb-4 line-clamp-2">{restaurant.description}</p>
                <div className="flex items-center text-sm text-gray-600 mb-4">
                  <span>Delivery: {restaurant.deliveryTime}</span>
                </div>
                <div className="flex flex-col space-y-2">
                  <button
                    onClick={() => handleManageMenu(restaurant)}
                    className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
                  >
                    <Utensils className="h-4 w-4" />
                    <span>Manage Menu</span>
                  </button>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(restaurant)}
                      className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      <Edit className="h-4 w-4" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(restaurant.id)}
                      className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RestaurantManager;
