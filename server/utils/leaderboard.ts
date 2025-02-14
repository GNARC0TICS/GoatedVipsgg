import { type LeaderboardUser, type WagerData } from "../types";
import { log } from "../vite";
import { pgTable, text, serial, timestamp, boolean, decimal, jsonb, integer } from "drizzle-orm/pg-core";
import { eq } from "drizzle-orm";
import { db } from "@db";
import { users, mockWagerData } from "@db/schema";

interface WagerData {
  today: number;
  this_week: number;
  this_month: number;
  all_time: number;
}

interface LeaderboardUser {
  uid: string;
  name: string;
  wagered: WagerData;
}

function sortByWagered(data: LeaderboardUser[], period: keyof WagerData): LeaderboardUser[] {
  return [...data].sort((a, b) => {
    const bWager = parseFloat(String(b.wagered[period] || 0));
    const aWager = parseFloat(String(a.wagered[period] || 0));
    return bWager - aWager;
  });
}

export async function transformLeaderboardData(apiData: any) {
  try {
    // Extract data from various possible API response formats
    const responseData = apiData.data || apiData.results || apiData;
    if (!responseData || (Array.isArray(responseData) && responseData.length === 0)) {
      return {
        status: "success",
        metadata: {
          totalUsers: 0,
          lastUpdated: new Date().toISOString(),
        },
        data: {
          today: { data: [] },
          weekly: { data: [] },
          monthly: { data: [] },
          all_time: { data: [] },
        },
      };
    }

    const dataArray = Array.isArray(responseData) ? responseData : [responseData];
    const transformedData = dataArray.map((entry) => ({
      uid: entry.uid || "",
      name: entry.name || "",
      wagered: {
        today: Number(entry.wagered?.today || 0),
        this_week: Number(entry.wagered?.this_week || 0),
        this_month: Number(entry.wagered?.this_month || 0),
        all_time: Number(entry.wagered?.all_time || 0),
      },
    }));

    return {
      status: "success",
      metadata: {
        totalUsers: transformedData.length,
        lastUpdated: new Date().toISOString(),
      },
      data: {
        today: { data: sortByWagered(transformedData, "today") },
        weekly: { data: sortByWagered(transformedData, "this_week") },
        monthly: { data: sortByWagered(transformedData, "this_month") },
        all_time: { data: sortByWagered(transformedData, "all_time") },
      },
    };
  } catch (error) {
    console.error('Error transforming data:', error);
    throw error;
  }
}