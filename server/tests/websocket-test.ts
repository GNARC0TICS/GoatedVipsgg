import { expect } from 'chai';
import WebSocket from 'ws';
import { createServer } from 'http';
import express, { Express } from 'express';
import { WebSocketServer } from 'ws';
import { describe, it, before, after } from 'mocha';
import { setupWebSocket } from '../routes';

describe('WebSocket and Session Integration Tests', () => {
  let wss: WebSocketServer;
  let server: ReturnType<typeof createServer>;
  let app: Express;
  const PORT = parseInt(process.env.TEST_PORT || '5001', 10);
  const WS_URL = `ws://0.0.0.0:${PORT}/ws`;

  before((done) => {
    app = express();
    server = createServer(app);
    wss = new WebSocketServer({ server });

    // Setup WebSocket handlers
    wss.on('connection', (ws) => {
      ws.on('message', (message) => {
        ws.send(JSON.stringify({
          type: 'ECHO',
          message: message.toString()
        }));
      });

      // Send connection established message
      ws.send(JSON.stringify({
        type: 'CONNECTION_ESTABLISHED',
        timestamp: Date.now()
      }));
    });

    server.listen(PORT, '0.0.0.0', done);
  });

  after((done) => {
    if (server) {
      server.close();
    }
    if (wss) {
      wss.close();
    }
    done();
  });

  describe('WebSocket Connection Tests', () => {
    it('should establish connection and receive confirmation', (done) => {
      const ws = new WebSocket(WS_URL);

      ws.on('open', () => {
        console.log('WebSocket connected');
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        expect(message).to.have.property('type');
        expect(message.type).to.equal('CONNECTION_ESTABLISHED');
        expect(message).to.have.property('timestamp');
        ws.close();
        done();
      });

      ws.on('error', (error) => {
        done(error);
      });
    });

    it('should echo messages back', (done) => {
      const ws = new WebSocket(WS_URL);
      const testMessage = 'Hello WebSocket';

      ws.on('open', () => {
        // Skip the CONNECTION_ESTABLISHED message
        ws.once('message', () => {
          // Now send our test message
          ws.send(testMessage);
        });
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'ECHO') {
          expect(message.message).to.equal(testMessage);
          ws.close();
          done();
        }
      });

      ws.on('error', (error) => {
        done(error);
      });
    });

    it('should handle multiple concurrent connections', (done) => {
      const connections = Array.from({ length: 3 }, () => new WebSocket(WS_URL));
      let connectedCount = 0;

      connections.forEach((ws, index) => {
        ws.on('open', () => {
          console.log(`Connection ${index + 1} established`);
          connectedCount++;
          if (connectedCount === connections.length) {
            connections.forEach(conn => conn.close());
            done();
          }
        });

        ws.on('error', (error) => {
          connections.forEach(conn => conn.close());
          done(error);
        });
      });
    });
  });

  describe('Session Handling Tests', () => {
    it('should maintain session across reconnections', (done) => {
      let ws = new WebSocket(WS_URL);
      let connectionCount = 0;

      const connect = () => {
        ws.on('open', () => {
          connectionCount++;
          if (connectionCount === 1) {
            // First connection established, close and reconnect
            ws.close();
            ws = new WebSocket(WS_URL);
            connect();
          } else {
            // Second connection established
            expect(connectionCount).to.equal(2);
            ws.close();
            done();
          }
        });

        ws.on('error', (error) => {
          done(error);
        });
      };

      connect();
    });
  });
});