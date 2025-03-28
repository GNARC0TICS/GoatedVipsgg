// Updated API testing tool for GoatedVIPs platform
import fetch from 'node-fetch';

async function testApi() {
  try {
    console.log('\n===== GoatedVIPs API Testing Tool =====\n');
    
    // Configuration
    const BASE_URL = 'http://localhost:5000'; // Update if needed
    
    // Check server health
    console.log('1. Testing server health...');
    const healthResponse = await fetch(`${BASE_URL}/api/health`);
    const healthData = await healthResponse.json();
    console.log(`   Status: ${healthResponse.status} ${healthResponse.statusText}`);
    console.log(`   Health data: `, healthData);
    
    // Test affiliate stats endpoint
    console.log('\n2. Testing /api/affiliate/stats endpoint...');
    const statsResponse = await fetch(`${BASE_URL}/api/affiliate/stats`);
    const statsData = await statsResponse.json();
    
    console.log(`   Status: ${statsResponse.status} ${statsResponse.statusText}`);
    console.log(`   Success: ${statsData.success || 'N/A'}`);
    
    if (statsData.data) {
      // Print sample data for each time period
      ['today', 'weekly', 'monthly', 'all_time'].forEach(period => {
        const periodData = statsData.data[period]?.data || [];
        console.log(`\n   ${period} (${periodData.length} entries):`);
        
        if (periodData.length === 0) {
          console.log('     No data available for this period');
        } else {
          console.log(periodData.slice(0, 3).map(entry => 
            `     - ${entry.name}: ${entry.wagered[period === 'today' ? 'today' : 
                                    period === 'weekly' ? 'this_week' : 
                                    period === 'monthly' ? 'this_month' : 'all_time']}`
          ).join('\n'));
        }
      });
    } else {
      console.log('   No data available from the stats endpoint');
    }
    
    // Test wager races endpoint with timeout
    console.log('\n3. Testing /api/wager-races/current endpoint...');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    try {
      const racesResponse = await fetch(`${BASE_URL}/api/wager-races/current`, {
        signal: controller.signal
      });
      console.log(`   Status: ${racesResponse.status} ${racesResponse.statusText}`);
      
      const racesData = await racesResponse.json();
      if (racesResponse.status === 200) {
        console.log('   Current wager race data:');
        console.log(`     Title: ${racesData.title || 'N/A'}`);
        console.log(`     Start date: ${racesData.startDate || 'N/A'}`);
        console.log(`     End date: ${racesData.endDate || 'N/A'}`);
        console.log(`     Prize pool: ${racesData.prizePool || 'N/A'}`);
        console.log(`     Participants: ${racesData.participants?.length || 0}`);
      } else {
        console.log(`   No active wager race found: ${racesData.message || 'Unknown error'}`);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('   Request timed out after 5 seconds');
      } else {
        throw error;
      }
    } finally {
      clearTimeout(timeout);
    }
    
    console.log('\n===== API Testing Complete =====\n');
    
  } catch (error) {
    console.error('\n❌ Error testing API:', error);
  }
}

testApi();