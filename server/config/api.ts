
export const API_CONFIG = {
  baseUrl: 'https://api.goated.gg',  // Replace with your actual API base URL
  token: process.env.API_TOKEN || '',
  endpoints: {
    leaderboard: '/affiliate/referral-leaderboard',
    health: '/health'
  }
};
