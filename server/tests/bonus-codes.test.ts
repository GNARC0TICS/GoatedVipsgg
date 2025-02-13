import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { db } from "@db";
import { bonusCodes } from "@db/schema/bonus";
import { generateTestToken } from '../auth';
import { eq } from 'drizzle-orm';
import bonusChallengesRouter from '../routes/bonus-challenges';

describe('Bonus Codes API', () => {
  let app: express.Express;
  let adminToken: string;

  beforeAll(async () => {
    console.log('Setting up test environment...');
    try {
      // Setup express app
      app = express();
      app.use(express.json());
      app.use('/', bonusChallengesRouter);

      // Generate admin token
      adminToken = generateTestToken(true);
      console.log('Admin token generated successfully');

      // Clear existing test data
      await db.delete(bonusCodes).where(eq(bonusCodes.code, 'TEST100'));
      console.log('Test data cleared successfully');
    } catch (error) {
      console.error('Setup failed:', error);
      throw error;
    }
  });

  describe('GET /bonus-codes', () => {
    it('should return active, non-expired bonus codes', async () => {
      const response = await request(app)
        .get('/bonus-codes')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body._meta).toHaveProperty('timestamp');
    });

    it('should include rate limit headers', async () => {
      const response = await request(app)
        .get('/bonus-codes')
        .expect(200);

      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
    });
  });

  describe('Admin Endpoints', () => {
    describe('GET /admin/bonus-codes', () => {
      it('should require authentication', async () => {
        await request(app)
          .get('/admin/bonus-codes')
          .expect(401);
      });

      it('should return all bonus codes for admin', async () => {
        const response = await request(app)
          .get('/admin/bonus-codes')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
      });
    });

    describe('POST /admin/bonus-codes', () => {
      it('should create a new bonus code', async () => {
        const newCode = {
          code: 'TEST100',
          description: 'Test Bonus',
          bonusAmount: '$100',
          totalClaims: 50,
          expiresAt: new Date(Date.now() + 86400000).toISOString(), // tomorrow
        };

        const response = await request(app)
          .post('/admin/bonus-codes')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(newCode)
          .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body.code).toBe(newCode.code);
      });

      it('should validate request body', async () => {
        const invalidCode = {
          code: '',
          bonusAmount: '',
        };

        await request(app)
          .post('/admin/bonus-codes')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidCode)
          .expect(400);
      });
    });

    describe('PUT /admin/bonus-codes/:id', () => {
      it('should update an existing bonus code', async () => {
        // First get the test code we created
        const [testCode] = await db
          .select()
          .from(bonusCodes)
          .where(eq(bonusCodes.code, 'TEST100'))
          .limit(1);

        const update = {
          description: 'Updated Test Bonus',
          bonusAmount: '$150',
        };

        const response = await request(app)
          .put(`/admin/bonus-codes/${testCode.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(update)
          .expect(200);

        expect(response.body.description).toBe(update.description);
        expect(response.body.bonusAmount).toBe(update.bonusAmount);
      });

      it('should handle invalid bonus code IDs', async () => {
        const update = {
          description: 'Invalid Update',
        };

        await request(app)
          .put('/admin/bonus-codes/999999')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(update)
          .expect(404);
      });
    });

    describe('DELETE /admin/bonus-codes/:id', () => {
      it('should deactivate a bonus code', async () => {
        const [testCode] = await db
          .select()
          .from(bonusCodes)
          .where(eq(bonusCodes.code, 'TEST100'))
          .limit(1);

        const response = await request(app)
          .delete(`/admin/bonus-codes/${testCode.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.message).toBe('Bonus code deactivated successfully');

        // Verify code is deactivated
        const [deactivatedCode] = await db
          .select()
          .from(bonusCodes)
          .where(eq(bonusCodes.id, testCode.id))
          .limit(1);

        expect(deactivatedCode.status).toBe('inactive');
      });
    });
  });

  afterAll(async () => {
    console.log('Cleaning up test data...');
    try {
      // Cleanup test data
      await db.delete(bonusCodes).where(eq(bonusCodes.code, 'TEST100'));
      console.log('Test data cleanup completed');
    } catch (error) {
      console.error('Cleanup failed:', error);
      throw error;
    }
  });
});