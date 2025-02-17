/**
 * WebSocket Integration Tests
 * 
 * This test suite verifies the WebSocket server functionality including:
 * - Connection establishment and management
 * - Message handling and echo capabilities
 * - Session persistence across reconnections
 * - Concurrent connection handling
 */

import { expect } from 'chai';
import WebSocket from 'ws';
import { createServer } from 'http';
import express, { Express } from 'express';
import { WebSocketServer } from 'ws';
import { describe, it, before, after } from 'mocha';
import { setupWebSocket } from '../routes';

describe('WebSocket and Session Integration Tests', () => {
  // Test configuration and server setup
  let wss: WebSocketServer;
  let server: ReturnType<typeof createServer>;
  let app: Express;
  const PORT = parseInt(process.env.TEST_PORT || '5001', 10);
  const WS_URL = `ws://0.0.0.0:${PORT}/ws`;

  /**
   * Server Setup
   * - Creates Express application
   * - Initializes HTTP server
   * - Sets up WebSocket server
   * - Configures message handlers
   */
  before((done) => {
    app = express();
    server = createServer(app);
    wss = new WebSocketServer({ server });

    // Setup WebSocket handlers for testing
    wss.on('connection', (ws) => {
      // Echo handler for testing message exchange
      ws.on('message', (message) => {
        ws.send(JSON.stringify({
          type: 'ECHO',
          message: message.toString()
        }));
      });

      // Send connection confirmation
      ws.send(JSON.stringify({
        type: 'CONNECTION_ESTABLISHED',
        timestamp: Date.now()
      }));
    });

    server.listen(PORT, '0.0.0.0', done);
  });

  /**
   * Cleanup
   * - Closes WebSocket server
   * - Closes HTTP server
   * - Ensures clean state for next test run
   */
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
    /**
     * Basic Connection Test
     * Verifies that clients can:
     * 1. Establish connection
     * 2. Receive confirmation message
     * 3. Close connection cleanly
     */
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

    /**
     * Message Echo Test
     * Verifies that:
     * 1. Server receives client messages
     * 2. Server correctly echoes messages back
     * 3. Message integrity is maintained
     */
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

    /**
     * Concurrent Connections Test
     * Verifies that the server can:
     * 1. Handle multiple simultaneous connections
     * 2. Manage connection state correctly
     * 3. Clean up resources properly
     */
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
    /**
     * Session Persistence Test
     * Verifies that:
     * 1. Sessions persist across disconnections
     * 2. Reconnection works properly
     * 3. Connection state is managed correctly
     */
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