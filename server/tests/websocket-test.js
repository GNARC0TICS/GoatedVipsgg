const WebSocket = require('ws');
const util = require('util');
const wait = util.promisify(setTimeout);

async function testWebSocket() {
  console.log('Starting WebSocket connection test...');
  
  const ws = new WebSocket('ws://0.0.0.0:3000/ws/leaderboard');
  
  ws.on('open', () => {
    console.log('WebSocket connection established');
  });
  
  ws.on('message', (data) => {
    console.log('Received:', JSON.parse(data));
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
  
  ws.on('close', () => {
    console.log('WebSocket connection closed');
  });
  
  // Keep connection alive for heartbeat test
  await wait(35000);
  ws.close();
}

testWebSocket().catch(console.error);
