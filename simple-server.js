const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Hello from GoatedVIPs! The server is running.');
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on port ${port}`);
});