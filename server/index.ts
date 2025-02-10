import express from 'express';
import cors from 'cors';
import { join } from 'path';
import { routes } from './routes';
import { API_CONFIG } from './config/api';

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api', routes);

// Serve static files from the client/dist directory
app.use(express.static(join(__dirname, '../client/dist')));

// Handle client-side routing
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '../client/dist/index.html'));
});

const port = API_CONFIG.port || 3000;

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});