import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function testCloudinaryConfig() {
  try {
    console.log('=== Cloudinary Configuration ===');
    console.log('Cloud Name:', process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME);
    console.log('API Key Length:', process.env.CLOUDINARY_API_KEY?.length);
    console.log('API Secret Length:', process.env.CLOUDINARY_API_SECRET?.length);
    
    // Try a direct API call
    const result = await cloudinary.api.ping();
    console.log('✓ Ping successful:', result);
    return true;
  } catch (error) {
    console.error('✗ Cloudinary ping failed:', {
      message: error.message,
      http_code: error.http_code,
      status: error.status,
      error: error.error
    });
    return false;
  }
}
