# Fix for 401 Unauthorized Resume Download

## Problem
Resume and profile picture downloads are returning 401 Unauthorized errors from Cloudinary.

## Root Cause
Cloudinary security settings require authentication for file access by default. The `access_control` parameter in the REST API doesn't work as expected.

## Solution
Change your Cloudinary security settings to allow public access:

### Steps in Cloudinary Dashboard:

1. **Go to Settings → Security**
   - URL: https://cloudinary.com/console/settings/security

2. **Look for "Restricted media types"**
   - Ensure your media types (raw, image) are NOT restricted to authenticated users only

3. **Check "Media access control"**
   - Set to: **"Allow public access by default"** or similar option

4. **Save changes**

### Alternative: Use Signed URLs (if security is a concern)
If you want to keep files private, update the frontend to request signed download URLs from your backend instead of accessing Cloudinary directly.

## Deployed Code
- Removed the problematic `access_control` JSON parameter
- Code now relies on Cloudinary's account-level security settings
- Files will be accessible if your Cloudinary security settings allow public access

## Testing
After changing Cloudinary security settings:
1. Upload a new resume
2. Try to download it - should work without 401 error
3. The profile picture should also be accessible
