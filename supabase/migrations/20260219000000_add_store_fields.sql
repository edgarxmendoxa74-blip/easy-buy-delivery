-- Migration: Add new store fields to restaurants table
-- These fields support the Easy Buy Delivery store management features

-- Store details
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS store_address TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS pin_location JSONB;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS contact_person TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS contact_number TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS store_availability BOOLEAN DEFAULT TRUE;

-- Markup settings
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS markup_type TEXT DEFAULT 'peso' CHECK (markup_type IN ('peso', 'percentage'));
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS markup_value NUMERIC DEFAULT 0;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS markup_enabled BOOLEAN DEFAULT FALSE;

-- Delivery fee settings
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS starting_point_lat NUMERIC;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS starting_point_lng NUMERIC;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS starting_point_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS convenience_fee NUMERIC DEFAULT 0;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS convenience_fee_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS additional_store_fee NUMERIC DEFAULT 0;

-- Enable RLS policies for new columns (they inherit existing table policies)
-- No additional RLS changes needed since we're adding columns to an existing table
