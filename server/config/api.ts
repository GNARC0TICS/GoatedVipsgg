
export const API_CONFIG = {
  baseUrl: 'https://europe-west2-g3casino.cloudfunctions.net/user',
  token: process.env.API_TOKEN || '',
  endpoints: {
    leaderboard: '/affiliate/referral-leaderboard',
    health: '/health'
  }
};
