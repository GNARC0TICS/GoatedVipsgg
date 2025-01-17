
import fetch from 'node-fetch';

async function testLeaderboardAPI() {
  try {
    const response = await fetch('https://europe-west2-g3casino.cloudfunctions.net/user/affiliate/referral-leaderboard');
    const data = await response.json();
    
    console.log('API Response:');
    console.log(JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('Error testing API:', error);
  }
}

testLeaderboardAPI();
