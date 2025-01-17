
import fetch from 'node-fetch';

async function testLeaderboardAPI() {
  try {
    console.log('Making request to leaderboard API...');
    const response = await fetch('https://europe-west2-g3casino.cloudfunctions.net/user/affiliate/referral-leaderboard', {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiJNZ2xjTU9DNEl6cWpVbzVhTXFBVyIsInNlc3Npb24iOiJiZk1FaVBYT29yVEIiLCJpYXQiOjE3MzcwNzEzOTgsImV4cCI6MTczNzA5Mjk5OH0.hZTi2h9zO27zw3nrz0p9ZiAkKPorP1NZkJ84--M4RZE'
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);
    
    const data = await response.json();
    console.log('\nAPI Response Data:');
    console.log(JSON.stringify(data, null, 2));
    
    return data;
  } catch (error) {
    console.error('Error testing API:', error);
  }
}

testLeaderboardAPI();
