import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import { WebSocket, WebSocketServer } from 'ws';
import { registerRoutes } from '../routes';
import { db } from '../db';
import { transformationLogs } from '../db/schema';
import type { Server } from 'http';

describe('Transformation API Integration', () => {
  let app: express.Express;
  let server: Server;
  let wsClient: WebSocket;
  let wss: WebSocketServer;

  beforeAll(async () => {
    app = express();
    server = registerRoutes(app);
    await new Promise<void>((resolve) => {
      server.listen(0, () => resolve());
    });
  });

  afterAll(async () => {
    if (wsClient?.readyState === WebSocket.OPEN) {
      wsClient.close();
    }
    if (wss) {
      wss.close();
    }
    await new Promise((resolve) => server.close(resolve));
  });

  it('should return transformation metrics', async () => {
    // Insert some test logs
    await db.insert(transformationLogs).values([
      {
        type: 'info',
        message: 'Test transformation',
        duration_ms: 100,
        created_at: new Date(),
        resolved: false,
      },
      {
        type: 'error',
        message: 'Test error',
        duration_ms: 150,
        created_at: new Date(),
        resolved: false,
      }
    ]);

    const response = await request(app)
      .get('/api/admin/transformation-metrics')
      .expect(200);

    expect(response.body).toMatchObject({
      totalTransformations: expect.any(Number),
      averageTimeMs: expect.any(Number),
      errorRate: expect.any(Number),
      lastUpdated: expect.any(String),
    });
  });

  it('should connect to transformation logs WebSocket', () => {
    return new Promise<void>((resolve) => {
      const port = (server.address() as any).port;
      wsClient = new WebSocket(`ws://localhost:${port}/ws/transformation-logs`);

      wsClient.on('open', () => {
        wsClient.on('message', (data) => {
          const message = JSON.parse(data.toString());
          expect(message).toHaveProperty('type');
          if (message.type === 'CONNECTED') {
            expect(message).toHaveProperty('clientId');
            expect(message).toHaveProperty('timestamp');
            resolve();
          }
        });
      });
    });
  });

  it('should receive transformation logs over WebSocket', () => {
    return new Promise<void>((resolve) => {
      wsClient.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'TRANSFORMATION_LOG') {
          expect(message.log).toMatchObject({
            type: expect.any(String),
            message: expect.any(String),
            timestamp: expect.any(String),
          });
          resolve();
        }
      });

      // Trigger a transformation to generate logs
      request(app)
        .get('/api/affiliate/stats')
        .expect(200)
        .end(() => {});
    });
  });
});