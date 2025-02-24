/**
 * ============================================================================
 * GOATEDVIPS TELEGRAM BOT - CONSTANTS
 * ============================================================================
 */

export const CUSTOM_EMOJIS = {
  error: "❌",      // Error/failure indicators
  success: "✅",    // Success/completion indicators
  vip: "👑",       // VIP/premium features
  stats: "📊",     // Statistics and data
  race: "🏃",      // Wager races
  play: "🎮",      // Gaming actions
  bonus: "🎁",     // Bonus codes/rewards
  challenge: "🎯", // Challenges/competitions
  verify: "✨",    // Verification process
  refresh: "🔄",   // Refresh/update actions
  bell: "🔔",      // Notifications
  sparkle: "✨"    // General sparkle effect
};

export const BEGGING_PATTERNS = {
  DIRECT: [
    'give me', 'send me', 'need money', 'spare some',
    'can send?', 'sen pls', 'pls send', 'send pls',
    'send coin', 'gimme', 'hook me up', 'need help$'
  ],
  SUBTLE: [
    'broke', 'poor', 'help me out', 'anything helps',
    'no money', 'struggling', 'desperate'
  ],
  SPAM: [
    'copy paste', 'forwarded message', 'chain message',
    'spam', 'bulk message'
  ],
  SHARING: [
    'airdrop', 'giveaway', 'sharing',
    'giving away', 'drop', 'contest'
  ]
} as const;

export const BEGGING_WARNINGS = [
  "⚠️ @{username} Begging is not allowed in this group. Focus on participating in challenges and events instead!",
  "⚠️ Hey @{username}, we don't allow begging here. Try joining our monthly races to earn rewards!",
  "⚠️ @{username} This is a warning for begging. Join the community events instead of asking for handouts!",
  "⚠️ @{username} No begging allowed! Check /help to see how you can earn through races and challenges!"
] as const;

export const BOT_PERSONALITY = {
  FRIENDLY: ['Hey!', 'Sup Goat!', 'Hello!', 'Sup!'],
  HELPFUL: ['Let me help you with that!', 'I can assist with that!', 'I got you!'],
  PLAYFUL: ['😎', '🎮', '🎲'],
  CONGRATULATORY: ['Well done!', 'ggs!', 'Great job!', 'LFG!']
} as const;

export const BOT_COMMANDS = [
  { command: 'start', description: '🚀 Start using the bot' },
  { command: 'verify', description: '🔐 Link your Goated account' },
  { command: 'stats', description: '📊 Check your wager stats' },
  { command: 'race', description: '🏁 View your race position' },
  { command: 'leaderboard', description: '🏆 See top players' },
  { command: 'play', description: '🎮 Play on Goated with our affiliate link' },
  { command: 'website', description: '🌐 Visit GoatedVIPs.gg' },
  { command: 'help', description: '❓ Get help using the bot' }
];

export const ADMIN_COMMANDS = [
  { command: 'pending', description: '📝 View pending verifications' },
  { command: 'broadcast', description: '📢 Send announcement to all users' },
  { command: 'approve', description: '✅ Approve a verification request' },
  { command: 'reject', description: '❌ Reject a verification request' },
  { command: 'createbonus', description: '🎁 Create a bonus code' },
  { command: 'createchallenge', description: '🎯 Create a challenge' }
];

export const MONITORED_CHANNELS = ['@Goatedcom'];
export const AFFILIATE_LINK = 'https://www.Goated.com/r/REDEEM';
