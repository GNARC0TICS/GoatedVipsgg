// Quick test script for wager races endpoint
import fetch from 'node-fetch';

async function quickTest() {
  try {
    console.log('\n===== Testing Wager Races Endpoint =====\n');
    
    // Test wager races endpoint with short timeout
    const BASE_URL = 'http://localhost:5000';
    console.log('Testing /api/wager-races/current endpoint...');
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000); // 4 second timeout
    
    try {
      const racesResponse = await fetch(`${BASE_URL}/api/wager-races/current`, {
        signal: controller.signal
      });
      console.log(`Status: ${racesResponse.status} ${racesResponse.statusText}`);
      
      const racesData = await racesResponse.json();
      console.log('Response data:', racesData);
      
      if (racesResponse.status === 404) {
        console.log('\n✅ Success! The endpoint correctly returns 404 when no active race is found.');
        console.log('✅ Error message provided:', racesData.message);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Request timed out after 4 seconds');
      } else {
        console.error('Error:', error);
      }
    } finally {
      clearTimeout(timeout);
    }
    
    console.log('\n===== Test Complete =====\n');
  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

quickTest();