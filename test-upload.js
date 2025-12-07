#!/usr/bin/env node

/**
 * Test script for profile picture upload
 * Tests the /api/profile/upload-picture endpoint
 */

import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import FormData from 'form-data';
import jwt from 'jsonwebtoken';

const API_BASE_URL = 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

// Create a test user ID
const testUserId = '692ffeaeba805bfb454ff33d'; // Using a valid ObjectId format

// Generate a test JWT token
function generateTestToken() {
  return jwt.sign({ id: testUserId }, JWT_SECRET, { expiresIn: '1h' });
}

async function testProfileUpload() {
  try {
    console.log('🧪 Testing Profile Picture Upload\n');
    console.log('Configuration:');
    console.log('- API Base URL:', API_BASE_URL);
    console.log('- Test User ID:', testUserId);
    console.log('');

    // Create a test image file (1x1 pixel PNG)
    const testImagePath = path.join(process.cwd(), 'test-image.png');
    const pngBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
      0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0x99, 0x63, 0xF8, 0x0F, 0x00, 0x00,
      0x01, 0x01, 0x00, 0x01, 0x00, 0x1B, 0xB6, 0xEE, 0x56, 0x00, 0x00, 0x00,
      0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);
    
    fs.writeFileSync(testImagePath, pngBuffer);
    console.log('✓ Created test image:', testImagePath);

    // Generate token
    const token = generateTestToken();
    console.log('✓ Generated JWT token\n');

    // Prepare form data
    const formData = new FormData();
    formData.append('file', fs.createReadStream(testImagePath), 'test-image.png');

    // Make the request
    console.log('📤 Sending upload request...\n');
    
    const response = await fetch(`${API_BASE_URL}/api/profile/upload-picture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        ...formData.getHeaders()
      },
      body: formData
    });

    const statusCode = response.status;
    const responseBody = await response.text();
    
    console.log('Response Status:', statusCode);
    console.log('Response Body:', responseBody);
    console.log('');

    if (statusCode === 200) {
      try {
        const data = JSON.parse(responseBody);
        console.log('✅ SUCCESS! Profile picture uploaded');
        console.log('File URL:', data.fileUrl);
      } catch (e) {
        console.log('⚠️  Response is not valid JSON');
      }
    } else if (statusCode === 401) {
      console.log('❌ FAILED: Unauthorized - Token issue');
    } else if (statusCode === 500) {
      console.log('❌ FAILED: Internal Server Error');
      console.log('Check server logs for details');
    } else {
      console.log('❌ FAILED: HTTP', statusCode);
    }

    // Cleanup
    fs.unlinkSync(testImagePath);
    console.log('\n✓ Cleaned up test image');

  } catch (error) {
    console.error('❌ Test Error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('   → Server is not running on', API_BASE_URL);
      console.error('   → Start the dev server with: npm run dev');
    }
  }

  process.exit(0);
}

testProfileUpload();
