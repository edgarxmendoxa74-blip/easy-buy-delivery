/*
  # Fix RLS Policies for Admin Dashboard (Robust Version)
  # This script updates policies to allow 'anon' (unauthenticated) users to manage data.
  # Includes DROP IF EXISTS for both old and new policy names to prevent errors.
*/

-- 1. Restaurants
DROP POLICY IF EXISTS "Authenticated users can manage restaurants" ON restaurants;
DROP POLICY IF EXISTS "Anon users can manage restaurants" ON restaurants;
CREATE POLICY "Anon users can manage restaurants"
  ON restaurants FOR ALL TO anon
  USING (true) WITH CHECK (true);

-- 2. Categories
DROP POLICY IF EXISTS "Authenticated users can manage categories" ON categories;
DROP POLICY IF EXISTS "Anon users can manage categories" ON categories;
CREATE POLICY "Anon users can manage categories"
  ON categories FOR ALL TO anon
  USING (true) WITH CHECK (true);

-- 3. Menu Items
DROP POLICY IF EXISTS "Authenticated users can manage menu items" ON menu_items;
DROP POLICY IF EXISTS "Anon users can manage menu items" ON menu_items;
CREATE POLICY "Anon users can manage menu items"
  ON menu_items FOR ALL TO anon
  USING (true) WITH CHECK (true);

-- 4. Variations
DROP POLICY IF EXISTS "Authenticated users can manage variations" ON variations;
DROP POLICY IF EXISTS "Anon users can manage variations" ON variations;
CREATE POLICY "Anon users can manage variations"
  ON variations FOR ALL TO anon
  USING (true) WITH CHECK (true);

-- 5. Add-ons
DROP POLICY IF EXISTS "Authenticated users can manage add-ons" ON add_ons;
DROP POLICY IF EXISTS "Anon users can manage add-ons" ON add_ons;
CREATE POLICY "Anon users can manage add-ons"
  ON add_ons FOR ALL TO anon
  USING (true) WITH CHECK (true);

-- 6. Site Settings
DROP POLICY IF EXISTS "Authenticated users can manage site settings" ON site_settings;
DROP POLICY IF EXISTS "Anon users can manage site settings" ON site_settings;
CREATE POLICY "Anon users can manage site settings"
  ON site_settings FOR ALL TO anon
  USING (true) WITH CHECK (true);

-- 7. Payment Methods
DROP POLICY IF EXISTS "Authenticated users can manage payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Anon users can manage payment methods" ON payment_methods;
CREATE POLICY "Anon users can manage payment methods"
  ON payment_methods FOR ALL TO anon
  USING (true) WITH CHECK (true);

-- 8. Groceries
DROP POLICY IF EXISTS "Authenticated users can manage groceries" ON groceries;
DROP POLICY IF EXISTS "Anon users can manage groceries" ON groceries;
CREATE POLICY "Anon users can manage groceries"
  ON groceries FOR ALL TO anon
  USING (true) WITH CHECK (true);

-- 9. Storage Policies (menu-images bucket)
DROP POLICY IF EXISTS "Authenticated users can upload menu images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update menu images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete menu images" ON storage.objects;
DROP POLICY IF EXISTS "Anon users can upload menu images" ON storage.objects;
DROP POLICY IF EXISTS "Anon users can update menu images" ON storage.objects;
DROP POLICY IF EXISTS "Anon users can delete menu images" ON storage.objects;

CREATE POLICY "Anon users can upload menu images"
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id = 'menu-images');

CREATE POLICY "Anon users can update menu images"
  ON storage.objects FOR UPDATE TO anon
  USING (bucket_id = 'menu-images');

CREATE POLICY "Anon users can delete menu images"
  ON storage.objects FOR DELETE TO anon
  USING (bucket_id = 'menu-images');
