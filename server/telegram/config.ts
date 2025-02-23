import { z } from 'zod';

export const CUSTOM_EMOJIS = {
  logo: "[5956308779791291440]",
  goat_race: "[5222141780476046109]",
  bonus1: "[6032605098528477151]",
  bonus2: "[6046260843966893372]",
  race_flag: "[5411520005386806155]",
  reject1: "[6113872536968104754]",
  reject2: "[5465665476971471368]",
  approved1: "[6318741991656001135]",
  approved2: "[5215492745900077682]",
  trophy: "[5280769763398671636]",
  first_place: "[5100686784019301387]",
  first: "[5440539497383087970]",
  second: "[5447203607294265305]",
  third: "[5453902265922376865]",
  website: "[5447410659077661506]",
  website_nav: "[5282843764451195532]",
  attention: "[5213181173026533794]",
  challenges: "[5274080935950688944]",
  verify_account: "[5197288647275071607]",
  verified: "[5366450216310416145]",
  gold_verified: "[6086832243211242109]",
  money_eyes: "[5391292736647209211]",
  stats1: "[5231200819986047254]",
  stats2: "[5429651785352501917]",
  trophy2: "[5316979941181496594]",
  banned: "[5213224006735376143]",
  clapping: "[5215561710189947188]",
  cash_stacking: "[5215706742645599766]",
  neon_money_bag: "[5213094908608392768]",
  clock_timer: "[5285409457654737374]",
  golden_hr1: "[5330422926824974676]",
  golden_hr2: "[5330324636498404771]",
  golden_hr3: "[5330080050995800177]",
  golden_hr4: "[5330271348839163835]",
  golden_hr5: "[5330042023355360451]",
  golden_hr6: "[5328122147204244600]",
  golden_hr7: "[5330026411149240241]",
  golden_hr8: "[5330259073822631724]",
  gold_bullet: "[5249224203567112577]",
  silver_bullet: "[5249028709540701810]",
  golden_sparkle: "[5267389686141166350]",
  simple_coins: "[5271655928695892247]",
  notification_bell: "[5267061559229687802]",
  gold_thumb: "[5271887539102295688]",
  admin_hat: "[5339564150534200424]",
  live: "[4927197721900614739]",
  help: "[5019413195186504264]",
  cowboy: "[5373308531757817004]",
  vip_certificate: "[5431684550424011313]",
  day_24_7: "[5208573502046610594]",
  typing: "[5350752364246606166]",
  vip_badge: "[5996899742611672774]",
  bonus_arrow_left: "[5215229232476596064]",
  bonus_arrow_right: "[5213358684024877471]",
  confetti: "[5201730588351945766]",
  sign_up: "[5197269100878907942]",
  click_below: "[5231102735817918643]",
  refresh: "[6012661228910939253]",
  play_button: "[5215229232476596064]"
};

export const FORWARD_FROM_CHANNELS = [
  "@PublicChannel1",
  "@PublicChannel2"
]; 

// Bot configuration schema
export const botConfigSchema = z.object({
  token: z.string(),
  webhookUrl: z.string().optional(),
  isProduction: z.boolean(),
  baseUrl: z.string(),
  cacheTimeout: z.number().default(300), // 5 minutes default cache
});

export type BotConfig = z.infer<typeof botConfigSchema>;

// Environment-based configuration
export function getBotConfig(): BotConfig {
  const isProduction = process.env.NODE_ENV === 'production';
  const baseUrl = isProduction 
    ? 'https://goatedvips.replit.app'
    : `http://localhost:${process.env.PORT || 5000}`;

  return {
    token: process.env.TELEGRAM_BOT_TOKEN || '',
    webhookUrl: isProduction ? `${baseUrl}/api/telegram/webhook` : undefined,
    isProduction,
    baseUrl,
    cacheTimeout: parseInt(process.env.CACHE_TIMEOUT || '300'),
  };
}

// Cache configuration
export const CACHE_KEYS = {
  CURRENT_RACE: 'current_race',
  LEADERBOARD: 'leaderboard',
  USER_STATS: (userId: string) => `user_stats:${userId}`,
} as const;

// API endpoints for data fetching
export const API_ENDPOINTS = {
  CURRENT_RACE: '/api/wager-races/current',
  LEADERBOARD: '/api/leaderboard',
  USER_STATS: (userId: string) => `/api/users/${userId}/stats`,
} as const;