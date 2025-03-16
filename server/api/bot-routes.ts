
import { Router } from 'express';
import { db } from "@db";
import { sql } from "drizzle-orm";
import { API_CONFIG } from "../config/api";
import fetch from 'node-fetch';

const router = Router();

// Get user stats by username
router.get('/user/:username/stats', async (req, res) => {
  try {
    const { username } = req.params;
    const url = new URL(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.leaderboard}`);
    url.searchParams.append('username', username);

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${process.env.API_TOKEN || API_CONFIG.token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    const userData = data.data?.find((user: any) => 
      user.name.toLowerCase() === username.toLowerCase()
    );

    if (!userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      username: userData.name,
      wagered: {
        daily: userData.wagered?.today || 0,
        weekly: userData.wagered?.this_week || 0,
        monthly: userData.wagered?.this_month || 0,
        allTime: userData.wagered?.all_time || 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user stats' });
  }
});

// Get current race standings
router.get('/race/current', async (_req, res) => {
  try {
    const response = await fetch(
      `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.leaderboard}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.API_TOKEN || API_CONFIG.token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    const sortedData = data.data
      .sort((a: any, b: any) => (b.wagered?.this_month || 0) - (a.wagered?.this_month || 0))
      .slice(0, 10)
      .map((entry: any, index: number) => ({
        position: index + 1,
        username: entry.name,
        wagered: entry.wagered?.this_month || 0
      }));

    res.json({
      status: 'live',
      prizePool: 500,
      participants: sortedData
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch race standings' });
  }
});

// Get MVP data for all periods
router.get('/mvp', async (_req, res) => {
  try {
    const response = await fetch(
      `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.leaderboard}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.API_TOKEN || API_CONFIG.token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    const mvpData = {
      daily: data.data.reduce((max: any, curr: any) => 
        (curr.wagered?.today || 0) > (max?.wagered?.today || 0) ? curr : max, null),
      weekly: data.data.reduce((max: any, curr: any) => 
        (curr.wagered?.this_week || 0) > (max?.wagered?.this_week || 0) ? curr : max, null),
      monthly: data.data.reduce((max: any, curr: any) => 
        (curr.wagered?.this_month || 0) > (max?.wagered?.this_month || 0) ? curr : max, null)
    };

    res.json({
      daily: mvpData.daily ? {
        username: mvpData.daily.name,
        wagered: mvpData.daily.wagered?.today || 0
      } : null,
      weekly: mvpData.weekly ? {
        username: mvpData.weekly.name,
        wagered: mvpData.weekly.wagered?.this_week || 0
      } : null,
      monthly: mvpData.monthly ? {
        username: mvpData.monthly.name,
        wagered: mvpData.monthly.wagered?.this_month || 0
      } : null
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch MVP data' });
  }
});

export default router;
