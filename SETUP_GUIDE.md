# Setup Guide for Easy Buy Delivery

## Recent Updates

### 1. Delivery Fee Calculation
- **Base Fee**: ₱65
- **Additional Fees (Additive)**:
  - Every 2km: +₱15
  - Every 3km: +₱25
  - Every 5km: +₱35
  - Every 10km: +₱50
  - Every 25km: +₱60
  - Every 30km: +₱100
  - Every 45km: +₱100

The system automatically calculates the total delivery fee by adding up all applicable fees based on the distance from the restaurant.

### 2. Google Maps Integration
The checkout process now uses Google Maps to:
- Calculate the distance from the restaurant to the delivery address
- Automatically compute the delivery fee based on distance
- Display real-time distance and fee information

### 3. Image Upload Support
- Fixed image upload functionality for menu items
- Improved error handling and user feedback
- Support for JPEG, PNG, WebP, and GIF formats (max 5MB)

## Required Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Google Maps API Key (Optional - Free Alternative Available)

The system works **completely free** using OpenStreetMap's Nominatim service for geocoding. No API key is required!

**Free Option (Default - No Setup Required):**
- Uses OpenStreetMap Nominatim (free, no API key needed)
- Calculates distance using Haversine formula with road distance buffer
- Works immediately without any configuration

**Optional: Google Maps API (More Accurate Road Distance)**
If you want more accurate road distance calculations, you can optionally add a Google Maps API key:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - **Geocoding API** (for address to coordinates conversion)
   - **Distance Matrix API** (for distance calculation)
4. Create credentials (API Key)
5. Restrict the API key to only the enabled APIs for security
6. Add the API key to your environment variables (optional):

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key  # Optional - system works without this
```

**Note**: The system works perfectly fine without a Google Maps API key using free OpenStreetMap services. The API key is only needed if you want more precise road distance calculations.

### 3. Database Migration

Run the new migration to ensure image upload support:

```sql
-- Run this in your Supabase SQL Editor
-- File: supabase/migrations/20250106000000_ensure_image_upload_support.sql
```

Or use the migration script:
```bash
# Windows PowerShell
.\run-migration.ps1

# Node.js
node scripts/run-migration.js
```

### 4. Supabase Storage Setup

Ensure the `menu-images` storage bucket exists:

1. Go to Supabase Dashboard → Storage
2. Verify that `menu-images` bucket exists
3. If it doesn't exist, the migration will create it automatically
4. Ensure the bucket is set to **Public** for read access

## How It Works

### Delivery Fee Calculation

1. Customer selects "Delivery" as service type
2. Customer enters their delivery address
3. System automatically:
   - Geocodes the address to get coordinates
   - Calculates distance from restaurant (Calinan, Davao City)
   - Computes delivery fee: ₱60 + (₱15 × number of 3km blocks)
   - Displays the fee in real-time

### Image Upload

1. Admin can upload images when creating/editing menu items
2. Images are stored in Supabase Storage (`menu-images` bucket)
3. Public URLs are generated automatically
4. Fallback: Admin can also enter image URLs manually

## Restaurant Location

The default restaurant location is set to:
- **Latitude**: 7.2906
- **Longitude**: 125.3764
- **Location**: Calinan, Davao City

To change the restaurant location, edit `src/hooks/useGoogleMaps.ts`:

```typescript
const RESTAURANT_LOCATION = {
  lat: YOUR_LATITUDE,
  lng: YOUR_LONGITUDE
};
```

## Troubleshooting

### Delivery Fee Not Calculating

1. Ensure the delivery address is complete (include barangay and city for better accuracy)
2. Check browser console for errors
3. The system uses free OpenStreetMap by default - no API key needed
4. If address cannot be found, try adding "Davao City, Philippines" to the address
5. If all else fails, the system will use base fee (₱60)

### Image Upload Not Working

1. Ensure you're logged in to Supabase (authenticated user)
2. Verify `menu-images` bucket exists in Supabase Storage
3. Check that storage policies are set correctly
4. Verify file size is under 5MB
5. Check file type is JPEG, PNG, WebP, or GIF

### Distance Calculation Issues

- The system uses free OpenStreetMap Nominatim for geocoding (no API key needed)
- If Google Maps API key is provided, it will use that for more accurate road distances
- Ensure the delivery address is complete and accurate
- Try including "Davao City, Philippines" in the address for better geocoding results
- The system adds a 20% buffer to straight-line distance to account for road distance

## Environment Variables

Required environment variables:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key  # Optional - system works without this using free services
```

**Note**: The delivery fee calculation works completely free using OpenStreetMap. The Google Maps API key is only optional for more accurate road distance calculations.

## Support

For issues or questions:
1. Check the browser console for error messages
2. Verify all environment variables are set correctly
3. Ensure database migrations are run
4. Check Supabase Storage bucket configuration

