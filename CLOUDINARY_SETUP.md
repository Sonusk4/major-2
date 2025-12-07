# Cloudinary Integration Setup Guide

## Overview
Your profile photo upload feature now uses **Cloudinary** for cloud storage instead of local file storage. The photos are automatically saved to Cloudinary and the URL is stored in your MongoDB database.

## Setup Steps

### 1. Get Cloudinary Credentials
1. Sign up at [cloudinary.com](https://cloudinary.com)
2. Go to your Dashboard
3. Copy these values:
   - **Cloud Name** - Found at the top of your dashboard
   - **API Key** - Found in Account Settings > API Keys
   - **API Secret** - Found in Account Settings > API Keys

### 2. Update Environment Variables
In `.env.local`, replace the placeholder values:

```env
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_actual_cloud_name
CLOUDINARY_API_KEY=your_actual_api_key
CLOUDINARY_API_SECRET=your_actual_api_secret
```

### 3. Install Dependencies
```bash
npm install
```

This will install the `cloudinary` package that's now in `package.json`.

## How It Works

### Upload Flow
1. User selects a profile photo in the profile page
2. Image is sent to `/api/profile/upload-picture`
3. API validates the file (image type, size < 5MB)
4. Image is uploaded to Cloudinary in the `career-hub/profile-pictures` folder
5. Cloudinary returns a secure URL
6. URL is saved to the user's Profile in MongoDB
7. User sees the image immediately on their profile

### Fetch Flow
1. When profile is loaded, it fetches the user's profile data from `/api/profile`
2. The `profilePicture` field contains the Cloudinary URL
3. Image is displayed using the Next.js `Image` component

## Benefits
✅ No local disk storage needed  
✅ Automatic image optimization  
✅ CDN delivery for fast loading  
✅ Scalable solution  
✅ Easy to manage and backup  

## Database
- **Model**: `Profile.js`
- **Field**: `profilePicture` (stores the Cloudinary secure URL)
- **Example URL**: `https://res.cloudinary.com/your_cloud_name/image/upload/v.../filename.jpg`

## Testing
1. Go to `/profile` page
2. Click on profile picture upload
3. Select an image
4. Image should upload and display immediately
5. Refresh the page - image should still be there (fetched from DB)

## Troubleshooting

**Issue**: "Invalid token" or "Unauthorized"
- Ensure you're logged in
- Check JWT token in localStorage

**Issue**: "File size must be less than 5MB"
- Compress your image before uploading

**Issue**: "Only image files are allowed"
- Ensure file is a valid image (jpg, png, gif, etc.)

**Issue**: Cloudinary credentials not working
- Double-check credentials in `.env.local`
- Ensure no extra spaces or quotes
- Restart the development server after updating `.env.local`

## File Changes
- ✅ `/api/profile/upload-picture/route.js` - Updated to use Cloudinary
- ✅ `.env.local` - Added Cloudinary credentials
- ✅ `package.json` - Added cloudinary dependency
- ✅ `/models/Profile.js` - No changes needed (already compatible)
- ✅ `/app/profile/page.js` - No changes needed (already compatible)

## Notes
- The client-side code (`page.js`) did not need changes - it already works with URLs
- Profile picture is optional, defaults to empty string if not uploaded
- Each profile can only have one picture at a time (uploading a new one replaces the old)
