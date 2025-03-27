export const API_CONFIG = {
  baseUrl: "https://api.goated.com",
  token: process.env.GOATED_API_TOKEN || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiJNZ2xjTU9DNEl6cWpVbzVhTXFBVyIsInNlc3Npb24iOiIzWGtjbDFoZzhSd2IiLCJpYXQiOjE3NDI4ODgzOTUsImV4cCI6MTc0Mjk3NDc5NX0.4jeHnvk2WmmqaNj_-5Xw6nBsgWgzPa4N2KDrETnFgAE",
  endpoints: {
    leaderboard: "/user2/affiliate/referral-leaderboard/2RW440E", // Only using this endpoint as requested
    health: "/health",
  },
  refreshInterval: 60000, // 1 minute
  cacheTimeout: 300000, // 5 minutes
};
