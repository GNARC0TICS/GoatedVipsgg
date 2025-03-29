// Simple proxy server to handle CORS issues between client and server
// This is especially useful in Replit where the standard CORS solutions may not work reliably

// Using ES Modules import syntax
import http from 'node:http';
import { createProxyServer } from 'http-proxy';

// Simple logging function
function log(message) {
  console.log(`[Proxy] ${message}`);
}

// Create a proxy server instance
const proxy = createProxyServer({});

// Configure proxy options
const PORT = process.env.PROXY_PORT || 8000;
const TARGET = process.env.PROXY_TARGET || 'http://localhost:5000';

// Handle proxy errors
proxy.on('error', function(err, req, res) {
  console.error('Proxy error:', err);
  res.writeHead(500, {
    'Content-Type': 'text/plain'
  });
  res.end('Proxy error: ' + err.message);
});

// Create the proxy server
const server = http.createServer((req, res) => {
  // Set CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Get the real client IP
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  
  // Log the request
  const requestPath = req.url;
  log(`[Proxy] ${req.method} ${requestPath} from ${clientIp}`);
  
  // Add custom headers to help debugging
  req.headers['x-proxied-by'] = 'goated-proxy';
  req.headers['x-original-ip'] = clientIp;

  // Forward the request to the target server
  proxy.web(req, res, { 
    target: TARGET,
    changeOrigin: true,
    xfwd: true  // Pass on all original headers 
  });
});

// Start the proxy server
server.listen(PORT, '0.0.0.0', () => {
  log(`Proxy server running on port ${PORT}`);
  log(`Forwarding requests to ${TARGET}`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  log('Shutting down proxy server...');
  server.close(() => {
    log('Proxy server closed');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});