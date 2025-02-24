import { db } from '@db';
import { eq } from 'drizzle-orm';
import { telegramUsers } from '../../db/schema/telegram';
import { CUSTOM_EMOJIS } from './constants';

/**
 * ============================================================================
 * GOATEDVIPS TELEGRAM BOT - MESSAGE GUIDE
 * ============================================================================
 * 
 * This file contains all message templates and configurations for the Telegram bot.
 * Edit messages here to update bot responses platform-wide.
 * 
 * SECTIONS:
 * 1. Welcome & Help
 * 2. Verification Flow
 * 3. Statistics & Leaderboard
 * 4. Admin Commands
 * 5. General Messages
 */

export const MESSAGES = {
  /**
   * Welcome & Help Messages
   * ----------------------
   */
  welcome: async (isAdmin: boolean) => {
    const adminSection = isAdmin ? `
*Admin Commands:*
• /broadcast - Send message to all users
• /pending - View verification requests
• /verify - Verify a user
• /reject - Reject a verification

` : '';

    return `${CUSTOM_EMOJIS.vip} *Welcome to GoatedVIPs Bot*

${adminSection}*Available Commands:*
• /start - Get started with the bot
• /verify - Link your Goated account
• /stats - View your wager statistics
• /race - Check your race position
• /leaderboard - See top players
• /play - Play on Goated with our link
• /website - Visit GoatedVIPs.gg
• /bonuscodes - Get latest bonus codes
• /challenges - Join exclusive challenges

Need help? Contact @xGoombas for support.`.trim()
  },

  verifyInstructions: `
🔐 *Account Verification*

Use: /verify YourGoatedUsername
Your username must match your account on Goated.com

An admin will review your request shortly.
  `.trim(),

  verificationSubmitted: `
✅ *Verification Request Submitted*

Your request will be reviewed by an admin.
You'll receive a notification once verified.

While waiting:
• Check /help for available commands
• Use /website to visit our platform
  `.trim(),

  stats: (user: any) => `
${CUSTOM_EMOJIS.stats} *Your Stats*

• Username: ${user.username}
• Verified: ${user.isVerified ? CUSTOM_EMOJIS.success : CUSTOM_EMOJIS.error}
• Notifications: ${user.notificationsEnabled ? '🔔' : '🔕'}
${user.verifiedAt ? `• Member since: ${new Date(user.verifiedAt).toLocaleDateString()}` : ''}
`.trim(),

  website: `
${CUSTOM_EMOJIS.vip} *Official Website*

Visit our platform: https://goatedvips.gg
`.trim(),

  play: `
${CUSTOM_EMOJIS.play} *Play Now*

Join through our link:
https://www.Goated.com/r/GOATEDVIPS
`.trim(),

  race: (user: any, participants: any[]) => {
    const userPosition = participants.findIndex(p => p.uid === user.userId) + 1;
    const userStats = participants.find(p => p.uid === user.userId);

    return `
${CUSTOM_EMOJIS.race} *Your Monthly Race Status*

Position: #${userPosition || 'Not participating'}
${userStats ? `Wagered: $${userStats.wagered.toFixed(2)}` : 'Start playing to join the race!'}

🏆 Prize Pool: $500
⏰ Updated: ${new Date().toLocaleString()}
`.trim();
  },

  leaderboard: async (participants: any[]) => {
    // Get all verified telegram users for mapping
    const verifiedUsers = await db
      .select()
      .from(telegramUsers)
      .where(eq(telegramUsers.isVerified, true));

    // Create a mapping of userId to telegram username
    const userIdToTelegramMap = new Map(
      verifiedUsers.map(user => [user.userId, user.telegramUsername])
    );

    const top10 = participants.slice(0, 10);
    return `🏆 *Monthly Race Leaderboard*
💵 *Prize Pool: $500*
🏁 *Current Top 10:*

${top10.map((p, i) => {
      const telegramUsername = userIdToTelegramMap.get(p.uid);
      const displayName = telegramUsername ? `@${telegramUsername}` : p.name;
      const formattedAmount = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 3,
        maximumFractionDigits: 3
      }).format(p.wagered);
      return `${(i + 1).toString().padStart(2)}. ${displayName}\n    💰 $ ${formattedAmount}`;
    }).join('\n\n')}

📊 Updated: ${new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: true
    })}`.trim();
  },

  pendingRequests: (requests: any[]) => {
    if (requests.length === 0) {
      return '✅ No pending verification requests.';
    }

    return `📝 *Pending Verification Requests*\n\n${
      requests.map((req, index) =>
        `${index + 1}. @${req.telegramUsername}\n` +
        `   • Goated Username: ${req.goatedUsername}\n` +
        `   • Requested: ${new Date(req.requestedAt).toLocaleString()}\n`
      ).join('\n')
    }`;
  },

  broadcastPrompt: `
${CUSTOM_EMOJIS.vip} *Send Broadcast Message*

To send a message to all verified users:
1. Use: /broadcast Your Message
2. Example: /broadcast New bonus codes available!

Your message will be sent to all verified users.
`.trim(),

  broadcastSent: (count: number) => `
${CUSTOM_EMOJIS.success} Broadcast sent successfully to ${count} users.
`.trim(),
};
