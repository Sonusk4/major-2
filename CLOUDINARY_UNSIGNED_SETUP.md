# Cloudinary Setup Instructions for Profile Picture Upload

## Steps to Complete on Cloudinary Dashboard:

1. **Create an Unsigned Upload Preset:**
   - Go to: https://cloudinary.com/console/settings/upload
   - Click "Add upload preset"
   - **Preset name:** `career_hub_unsigned`
   - **Mode:** Unsigned
   - **Folder:** `career-hub/profile-pictures` (optional, for organization)
   - Click "Save"

2. **Update Environment Variables on Render:**
   - Only `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=dhtfjzu6l` is needed
   - Remove or keep (but won't be used): `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET`

3. **Why Unsigned Upload?**
   - No need for API credentials in the backend
   - More reliable and faster
   - Cloudinary controls permissions via the preset
   - Better security (credentials not exposed in requests)

## Testing Locally:

```bash
npm run dev
# Then upload a profile picture through the UI at http://localhost:3000/profile
```

## Testing on Render:

1. Redeploy the application
2. Test the profile picture upload feature
3. Check Render logs for any errors

## Troubleshooting:

If you see "Unsigned upload not allowed" error:
- Make sure the upload preset `career_hub_unsigned` is created
- Verify it's set to "Unsigned" mode
- Check that `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` is correct
