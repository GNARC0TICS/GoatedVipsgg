export const API_CONFIG = {
  baseUrl: "https://europe-west2-g3casino.cloudfunctions.net",
  token: process.env.API_TOKEN || "",
  endpoints: {
    leaderboard: "/user/affiliate/referral-leaderboard/2RW440E",
    health: "/user/health",
    wagerRace: "/user/wager-race",
  },
  headers: {
    'Authorization': `Bearer ${process.env.API_TOKEN || ""}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};
