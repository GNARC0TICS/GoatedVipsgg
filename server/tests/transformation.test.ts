import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { transformLeaderboardData } from '../utils/leaderboard';
import { db } from '../db';
import { transformationLogs } from '../db/schema';
import type { LeaderboardEntry } from '../types/leaderboard';

describe('Leaderboard Transformation', () => {
  beforeEach(async () => {
    // Clear transformation logs before each test
    await db.delete(transformationLogs);
  });

  it('should handle empty input data', async () => {
    const result = await transformLeaderboardData([]);
    expect(result.status).toBe('success');
    expect(result.data.today.data).toEqual([]);
    expect(result.data.weekly.data).toEqual([]);
    expect(result.data.monthly.data).toEqual([]);
    expect(result.data.all_time.data).toEqual([]);
  });

  it('should transform and sort wager data correctly', async () => {
    const testData: LeaderboardEntry[] = [
      {
        uid: '1',
        name: 'User1',
        wagered: {
          today: 100,
          this_week: 500,
          this_month: 2000,
          all_time: 5000
        }
      },
      {
        uid: '2',
        name: 'User2',
        wagered: {
          today: 200,
          this_week: 300,
          this_month: 1000,
          all_time: 3000
        }
      }
    ];

    const result = await transformLeaderboardData(testData);

    // Verify sorting
    expect(result.data.today.data[0].uid).toBe('2'); // Higher today value
    expect(result.data.weekly.data[0].uid).toBe('1'); // Higher weekly value
    expect(result.data.monthly.data[0].uid).toBe('1'); // Higher monthly value
    expect(result.data.all_time.data[0].uid).toBe('1'); // Higher all-time value
  });

  it('should handle invalid or missing wager values', async () => {
    const testData = [
      {
        uid: '1',
        name: 'User1',
        wagered: {
          today: null,
          this_week: undefined,
          this_month: 'invalid' as any,
          all_time: NaN
        }
      }
    ];

    const result = await transformLeaderboardData(testData);
    const transformedUser = result.data.today.data[0];

    expect(transformedUser.wagered.today).toBe(0);
    expect(transformedUser.wagered.this_week).toBe(0);
    expect(transformedUser.wagered.this_month).toBe(0);
    expect(transformedUser.wagered.all_time).toBe(0);
  });

  it('should create transformation logs', async () => {
    const testData = [{ uid: '1', name: 'User1', wagered: { today: 100 } }];
    await transformLeaderboardData(testData);

    const logs = await db
      .select()
      .from(transformationLogs)
      .orderBy(transformationLogs.created_at.desc())
      .limit(1);

    expect(logs.length).toBe(1);
    expect(logs[0].type).toBe('info');
    expect(logs[0].duration_ms).toBeGreaterThan(0);
  });

  it('should handle and log errors appropriately', async () => {
    const invalidData = 'not an array' as any;
    await transformLeaderboardData(invalidData);

    const logs = await db
      .select()
      .from(transformationLogs)
      .where(transformationLogs.type.eq('error'));

    expect(logs.length).toBe(1);
    expect(logs[0].error_message).toBeTruthy();
  });
});