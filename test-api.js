import fetch from 'node-fetch';

async function testApi() {
  try {
    console.log('Testing Goated.com API integration\n');
    
    // Test affiliate stats endpoint
    console.log('Testing /api/affiliate/stats endpoint:');
    const response = await fetch('http://localhost:5000/api/affiliate/stats');
    const data = await response.json();
    
    console.log(`Status: ${response.status}`);
    console.log(`Total users: ${data.metadata.totalUsers}`);
    console.log(`Last updated: ${data.metadata.lastUpdated}`);
    console.log('\nData sample:');
    
    // Print sample data for each time period
    ['today', 'weekly', 'monthly', 'all_time'].forEach(period => {
      const periodData = data.data[period].data;
      console.log(`\n${period} (${periodData.length} entries):`);
      console.log(periodData.slice(0, 3).map(entry => 
        `  - ${entry.name}: ${entry.wagered[period === 'today' ? 'today' : 
                               period === 'weekly' ? 'this_week' : 
                               period === 'monthly' ? 'this_month' : 'all_time']}`
      ).join('\n'));
    });
    
  } catch (error) {
    console.error('Error testing API:', error);
  }
}

testApi();