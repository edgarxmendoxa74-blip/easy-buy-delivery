# Database Setup Guide

## Overview

The database is **already set up** and ready to use! All necessary tables, relationships, and policies are in place.

## Database Structure

The application uses **Supabase (PostgreSQL)** with the following tables:

1. ✅ **restaurants** - Stores restaurant information
2. ✅ **menu_items** - Stores menu items (with `restaurant_id` for restaurant-specific items)
3. ✅ **variations** - Stores size/option variations for menu items
4. ✅ **add_ons** - Stores add-ons/extras for menu items
5. ✅ **categories** - Stores menu item categories
6. ✅ **site_settings** - Stores site-wide settings
7. ✅ **payment_methods** - Stores payment method information

## Key Features

### Restaurant Menu Items
- ✅ Menu items can belong to a specific restaurant (`restaurant_id`)
- ✅ Menu items can be general items (`restaurant_id IS NULL`)
- ✅ Cascade delete: Deleting a restaurant deletes all its menu items
- ✅ Cascade delete: Deleting a menu item deletes all its variations and add-ons

### Variations & Add-ons
- ✅ Menu items can have multiple variations (e.g., Small, Medium, Large)
- ✅ Menu items can have multiple add-ons (e.g., Extra Cheese, Spice Level)
- ✅ Variations and add-ons are linked to menu items via foreign keys

### Discount Pricing
- ✅ Menu items support discount pricing
- ✅ Discounts can have start and end dates
- ✅ Discounts can be enabled/disabled
- ✅ Database functions calculate active discounts

### Security
- ✅ Row Level Security (RLS) enabled on all tables
- ✅ Public read access for active items
- ✅ Authenticated admin access for all operations

## Migration Files

All migrations are in `supabase/migrations/`:

1. `20250101000000_add_discount_pricing_and_site_settings.sql`
   - Adds discount pricing to menu_items
   - Creates site_settings table

2. `20250102000000_create_restaurants_table.sql`
   - Creates restaurants table
   - Adds sample restaurants

3. `20250103000000_add_restaurant_menu_items.sql`
   - Adds `restaurant_id` column to menu_items
   - Creates categories table
   - Creates Jollibee sample data
   - Sets up all relationships

4. Additional migrations for various updates

## Setup Instructions

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note your project URL and anon key

### 2. Set Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Run Migrations

#### Option A: Using Supabase Dashboard

1. Go to SQL Editor in Supabase Dashboard
2. Copy and paste each migration file in order
3. Run each migration

#### Option B: Using Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

#### Option C: Using Migration Script

The project includes migration scripts:
- `scripts/run-migration.js` - Node.js migration runner
- `scripts/run-migration.mjs` - ES module migration runner
- `run-migration.ps1` - PowerShell migration runner

Run the appropriate script for your platform.

### 4. Verify Database Setup

After running migrations, verify:

1. ✅ All tables exist
2. ✅ All foreign keys are set up
3. ✅ RLS policies are enabled
4. ✅ Indexes are created
5. ✅ Sample data is inserted (if applicable)

### 5. Test Database Connection

Start the development server:

```bash
npm run dev
```

Check the browser console for any database connection errors.

## Database Schema

See `DATABASE_SCHEMA.md` for complete schema documentation.

## TypeScript Types

TypeScript types are defined in `src/lib/supabase.ts` and match the database schema:

- ✅ `restaurants` table types
- ✅ `menu_items` table types (includes `restaurant_id`)
- ✅ `variations` table types
- ✅ `add_ons` table types
- ✅ `categories` table types
- ✅ `site_settings` table types
- ✅ `payment_methods` table types

## Usage in Code

### Adding a Menu Item to a Restaurant

```typescript
const { data, error } = await supabase
  .from('menu_items')
  .insert({
    name: 'Burger',
    description: 'Delicious burger',
    base_price: 100,
    category: 'burgers',
    restaurant_id: 'restaurant-uuid', // Link to restaurant
    popular: true,
    available: true
  });
```

### Adding Variations to a Menu Item

```typescript
const { error } = await supabase
  .from('variations')
  .insert([
    { menu_item_id: 'item-uuid', name: 'Small', price: 0 },
    { menu_item_id: 'item-uuid', name: 'Medium', price: 20 },
    { menu_item_id: 'item-uuid', name: 'Large', price: 40 }
  ]);
```

### Adding Add-ons to a Menu Item

```typescript
const { error } = await supabase
  .from('add_ons')
  .insert([
    { menu_item_id: 'item-uuid', name: 'Extra Cheese', price: 10, category: 'extras' },
    { menu_item_id: 'item-uuid', name: 'Bacon', price: 15, category: 'protein' }
  ]);
```

### Querying Restaurant Menu Items

```typescript
const { data, error } = await supabase
  .from('menu_items')
  .select(`
    *,
    variations (*),
    add_ons (*)
  `)
  .eq('restaurant_id', 'restaurant-uuid')
  .order('created_at', { ascending: true });
```

## Troubleshooting

### Issue: "Missing Supabase environment variables"

**Solution:** Make sure you have a `.env` file with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

### Issue: "Policy violation" error

**Solution:** Check that RLS policies are correctly set up. Authenticated users should have full access.

### Issue: "Foreign key constraint violation"

**Solution:** Make sure the referenced record exists (e.g., restaurant exists before creating menu items).

### Issue: "Column does not exist"

**Solution:** Run the migrations to ensure all columns are created.

## Next Steps

1. ✅ Database is set up and ready
2. ✅ TypeScript types are updated
3. ✅ All hooks and components are ready
4. ✅ You can now add menu items through the admin panel

## Admin Panel Usage

1. Go to `/admin` in your application
2. Enter the admin password: `Easy Buy Delivery@Admin!2025`
3. Click "Manage Restaurants"
4. Click "Manage Menu" on any restaurant
5. Add menu items with variations and add-ons

## Support

For issues or questions:
1. Check `DATABASE_SCHEMA.md` for schema details
2. Check migration files for database structure
3. Verify environment variables are set correctly
4. Check Supabase Dashboard for database status

---

Last Updated: 2025-01-03

