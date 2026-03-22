import { useState, useEffect } from 'react';
import { Restaurant } from '../types';
import { supabase } from '../lib/supabase';

export const useRestaurantsAdmin = () => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      // Admin can see all restaurants (active and inactive)
      const { data, error: fetchError } = await supabase
        .from('restaurants')
        .select('*')
        .order('sort_order', { ascending: true });

      if (fetchError) throw fetchError;

      const formattedRestaurants: Restaurant[] = (data || []).map(item => ({
        id: item.id,
        name: item.name,
        type: item.type,
        image: item.image,
        logo: item.logo || undefined,
        rating: item.rating || 0,
        reviewCount: item.review_count || 0,
        deliveryTime: item.delivery_time,
        deliveryFee: item.delivery_fee || 0,
        description: item.description || undefined,
        active: item.active,
        sort_order: item.sort_order,
        created_at: item.created_at,
        updated_at: item.updated_at,
        // New store fields (gracefully handle if columns don't exist yet)
        store_address: item.store_address || undefined,
        pin_location: item.pin_location || undefined,
        contact_person: item.contact_person || undefined,
        contact_number: item.contact_number || undefined,
        store_availability: item.store_availability ?? true,
        markup_type: item.markup_type || 'peso',
        markup_value: item.markup_value || 0,
        markup_enabled: item.markup_enabled ?? false,
        starting_point_lat: item.starting_point_lat || undefined,
        starting_point_lng: item.starting_point_lng || undefined,
        starting_point_enabled: item.starting_point_enabled ?? false,
        starting_point_fee: item.starting_point_fee || 0,
        starting_point_fee_enabled: item.starting_point_fee_enabled ?? false,
        convenience_fee: item.convenience_fee || 0,
        convenience_fee_enabled: item.convenience_fee_enabled ?? false,
        additional_store_fee: item.additional_store_fee || 0
      }));

      setRestaurants(formattedRestaurants);
      setError(null);
    } catch (err) {
      console.error('Error fetching restaurants:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch restaurants');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const addRestaurant = async (restaurant: Omit<Restaurant, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const maxSortOrder = restaurants.length > 0
        ? Math.max(...restaurants.map(r => r.sort_order || 0)) + 1
        : restaurants.length;

      const { data, error: insertError } = await supabase
        .from('restaurants')
        .insert({
          name: restaurant.name,
          type: restaurant.type,
          image: restaurant.image,
          logo: restaurant.logo || null,
          rating: restaurant.rating || 0,
          review_count: restaurant.reviewCount || 0,
          delivery_time: restaurant.deliveryTime,
          delivery_fee: restaurant.deliveryFee || 0,
          description: restaurant.description || null,
          active: restaurant.active ?? true,
          sort_order: maxSortOrder,
          store_address: restaurant.store_address || null,
          pin_location: restaurant.pin_location || null,
          contact_person: restaurant.contact_person || null,
          contact_number: restaurant.contact_number || null,
          store_availability: restaurant.store_availability ?? true,
          markup_type: restaurant.markup_type || 'peso',
          markup_value: restaurant.markup_value || 0,
          markup_enabled: restaurant.markup_enabled ?? false,
          starting_point_lat: restaurant.starting_point_lat || null,
          starting_point_lng: restaurant.starting_point_lng || null,
          starting_point_enabled: restaurant.starting_point_enabled ?? false,
          starting_point_fee: restaurant.starting_point_fee || 0,
          starting_point_fee_enabled: restaurant.starting_point_fee_enabled ?? false,
          convenience_fee: restaurant.convenience_fee || 0,
          convenience_fee_enabled: restaurant.convenience_fee_enabled ?? false,
          additional_store_fee: restaurant.additional_store_fee || 0
        })
        .select()
        .single();

      if (insertError) throw insertError;
      await fetchRestaurants();
      return data;
    } catch (err) {
      console.error('Error adding restaurant:', err);
      throw err;
    }
  };

  const updateRestaurant = async (id: string, updates: Partial<Restaurant>) => {
    try {
      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.type !== undefined) updateData.type = updates.type;
      if (updates.image !== undefined) updateData.image = updates.image;
      if (updates.logo !== undefined) updateData.logo = updates.logo || null;
      if (updates.rating !== undefined) updateData.rating = updates.rating;
      if (updates.reviewCount !== undefined) updateData.review_count = updates.reviewCount;
      if (updates.deliveryTime !== undefined) updateData.delivery_time = updates.deliveryTime;
      if (updates.deliveryFee !== undefined) updateData.delivery_fee = updates.deliveryFee;
      if (updates.description !== undefined) updateData.description = updates.description || null;
      if (updates.active !== undefined) updateData.active = updates.active;
      if (updates.sort_order !== undefined) updateData.sort_order = updates.sort_order;
      // New store fields
      if (updates.store_address !== undefined) updateData.store_address = updates.store_address || null;
      if (updates.pin_location !== undefined) updateData.pin_location = updates.pin_location || null;
      if (updates.contact_person !== undefined) updateData.contact_person = updates.contact_person || null;
      if (updates.contact_number !== undefined) updateData.contact_number = updates.contact_number || null;
      if (updates.store_availability !== undefined) updateData.store_availability = updates.store_availability;
      if (updates.markup_type !== undefined) updateData.markup_type = updates.markup_type;
      if (updates.markup_value !== undefined) updateData.markup_value = updates.markup_value;
      if (updates.markup_enabled !== undefined) updateData.markup_enabled = updates.markup_enabled;
      if (updates.starting_point_lat !== undefined) updateData.starting_point_lat = updates.starting_point_lat || null;
      if (updates.starting_point_lng !== undefined) updateData.starting_point_lng = updates.starting_point_lng || null;
      if (updates.starting_point_enabled !== undefined) updateData.starting_point_enabled = updates.starting_point_enabled;
      if (updates.starting_point_fee !== undefined) updateData.starting_point_fee = updates.starting_point_fee;
      if (updates.starting_point_fee_enabled !== undefined) updateData.starting_point_fee_enabled = updates.starting_point_fee_enabled;
      if (updates.convenience_fee !== undefined) updateData.convenience_fee = updates.convenience_fee;
      if (updates.convenience_fee_enabled !== undefined) updateData.convenience_fee_enabled = updates.convenience_fee_enabled;
      if (updates.additional_store_fee !== undefined) updateData.additional_store_fee = updates.additional_store_fee;

      const { error: updateError } = await supabase
        .from('restaurants')
        .update(updateData)
        .eq('id', id);

      if (updateError) throw updateError;
      await fetchRestaurants();
    } catch (err) {
      console.error('Error updating restaurant:', err);
      throw err;
    }
  };

  const deleteRestaurant = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('restaurants')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      await fetchRestaurants();
    } catch (err) {
      console.error('Error deleting restaurant:', err);
      throw err;
    }
  };

  return {
    restaurants,
    loading,
    error,
    addRestaurant,
    updateRestaurant,
    deleteRestaurant,
    refetch: fetchRestaurants
  };
};

