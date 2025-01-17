
import fetch from 'node-fetch';

async function testLeaderboardAPI() {
  try {
    console.log('Making request to leaderboard API...');
    const response = await fetch('https://europe-west2-g3casino.cloudfunctions.net/user/affiliate/referral-leaderboard', {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiJNZ2xjTU9DNEl6cWpVbzVhTXFBVyIsInNlc3Npb24iOiJiZk1FaVBYT29yVEIiLCJpYXQiOjE3MzcwNzEzOTgsImV4cCI6MTczNzA5Mjk5OH0.hZTi2h9zO27zw3nrz0p9ZiAkKPorP1NZkJ84--M4RZE',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('\nResponse Status:', response.status);
    console.log('Response Headers:', Object.fromEntries(response.headers.entries()));
    
    const rawText = await response.text();
    console.log('\nRaw Response Text:', rawText);
    
    if (rawText) {
      try {
        const data = JSON.parse(rawText);
        console.log('\nParsed JSON Data:', JSON.stringify(data, null, 2));
      } catch (e) {
        console.log('Failed to parse response as JSON:', e);
      }
    }
    
  } catch (error) {
    console.error('Error making request:', error);
  }
}

testLeaderboardAPI();
