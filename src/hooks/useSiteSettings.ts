import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { SiteSettings } from '../types';

export const useSiteSettings = () => {
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSiteSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .order('id');

      if (error) throw error;

      // Transform the data into a more usable format
      const settings: SiteSettings = {
        site_name: data.find(s => s.id === 'site_name')?.value || 'Easy Buy Delivery',
        site_logo: data.find(s => s.id === 'site_logo')?.value || '',
        site_description: data.find(s => s.id === 'site_description')?.value || '',
        site_tagline: data.find(s => s.id === 'site_tagline')?.value || '',
        address: data.find(s => s.id === 'address')?.value || 'Calinan, Davao City',
        facebook_url: data.find(s => s.id === 'facebook_url')?.value || '',
        facebook_handle: data.find(s => s.id === 'facebook_handle')?.value || '',
        currency: data.find(s => s.id === 'currency')?.value || '₱',
        currency_code: data.find(s => s.id === 'currency_code')?.value || 'PHP',
        messenger_id: data.find(s => s.id === 'messenger_id')?.value || '61558704207383',
        // New Admin Settings
        daily_operation_schedule: data.find(s => s.id === 'daily_operation_schedule')?.value || '',
        easy_buy_delivery_base_fee: Number(data.find(s => s.id === 'easy_buy_delivery_base_fee')?.value) || 0,
        easy_buy_multiple_store_fee: Number(data.find(s => s.id === 'easy_buy_multiple_store_fee')?.value) || 0,
        easy_buy_convenience_fee: Number(data.find(s => s.id === 'easy_buy_convenience_fee')?.value) || 0,
        easy_buy_convenience_enabled: data.find(s => s.id === 'easy_buy_convenience_enabled')?.value === 'true',
        easy_buy_starting_point_fee: Number(data.find(s => s.id === 'easy_buy_starting_point_fee')?.value) || 0,
        easy_buy_starting_point_enabled: data.find(s => s.id === 'easy_buy_starting_point_enabled')?.value === 'true',
        padala_base_fee: Number(data.find(s => s.id === 'padala_base_fee')?.value) || 0,
        padala_additional_dropoff_fee: Number(data.find(s => s.id === 'padala_additional_dropoff_fee')?.value) || 0,
        padala_convenience_fee: Number(data.find(s => s.id === 'padala_convenience_fee')?.value) || 0,
        padala_convenience_enabled: data.find(s => s.id === 'padala_convenience_enabled')?.value === 'true',
        angkas_transport_fee_per_km: Number(data.find(s => s.id === 'angkas_transport_fee_per_km')?.value) || 0,
        feature_padala_enabled: data.find(s => s.id === 'feature_padala_enabled')?.value !== 'false',
        feature_angkas_enabled: data.find(s => s.id === 'feature_angkas_enabled')?.value !== 'false',
        feature_pabili_enabled: data.find(s => s.id === 'feature_pabili_enabled')?.value !== 'false',
      };

      setSiteSettings(settings);
    } catch (err) {
      console.error('Error fetching site settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch site settings');
    } finally {
      setLoading(false);
    }
  };

  const updateSiteSetting = async (id: string, value: string) => {
    try {
      setError(null);

      const { error } = await supabase
        .from('site_settings')
        .update({ value })
        .eq('id', id);

      if (error) throw error;

      // Refresh the settings
      await fetchSiteSettings();
    } catch (err) {
      console.error('Error updating site setting:', err);
      setError(err instanceof Error ? err.message : 'Failed to update site setting');
      throw err;
    }
  };

  const updateSiteSettings = async (updates: Partial<SiteSettings>) => {
    try {
      setError(null);

      const updatePromises = Object.entries(updates).map(([key, value]) =>
        supabase
          .from('site_settings')
          .upsert({ id: key, value: String(value), updated_at: new Date().toISOString() })
      );

      const results = await Promise.all(updatePromises);

      // Check for errors
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        throw new Error('Some updates failed');
      }

      // Refresh the settings
      await fetchSiteSettings();
    } catch (err) {
      console.error('Error updating site settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to update site settings');
      throw err;
    }
  };

  useEffect(() => {
    fetchSiteSettings();
  }, []);

  return {
    siteSettings,
    loading,
    error,
    updateSiteSetting,
    updateSiteSettings,
    refetch: fetchSiteSettings
  };
};
