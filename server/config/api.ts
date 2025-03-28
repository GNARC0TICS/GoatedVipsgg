export const API_CONFIG = {
  baseUrl: "https://api.goated.com",
  goatedToken: process.env.GOATED_TOKEN || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiJNZ2xjTU9DNEl6cWpVbzVhTXFBVyIsInNlc3Npb24iOiJIVnpkZlRRRUJBZmQiLCJpYXQiOjE3NDMxMjE1NDYsImV4cCI6MTc0MzIwNzk0Nn0.Lq-fBlzU9HhsM6cc9Ef44OVtfa4jHt4gZlcM988l0tw",
  endpoints: {
    leaderboard: "/user2/affiliate/referral-leaderboard/2RW440E", // Only using this endpoint as requested
    health: "/health",
  },
  refreshInterval: 900000, // 15 minutes
  cacheTimeout: 900000, // 15 minutes
};
