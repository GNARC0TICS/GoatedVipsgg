export type AchievementCategory = 
  | 'wager'
  | 'race'
  | 'social'
  | 'loyalty'
  | 'special';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  condition: {
    type: 'wager_total' | 'races_won' | 'races_participated' | 'days_active' | 'referrals' | 'custom';
    value: number;
    customCheck?: (userData: any) => boolean;
  };
  reward?: {
    type: 'badge' | 'title' | 'bonus';
    value: string | number;
  };
}

// Initial achievement definitions
export const ACHIEVEMENTS: Achievement[] = [
  // Wager Achievements
  {
    id: 'wager_1000',
    name: 'Getting Started',
    description: 'Wager your first $1,000',
    category: 'wager',
    icon: '[5231200819986047254]', // Using custom stats emoji
    rarity: 'common',
    condition: {
      type: 'wager_total',
      value: 1000
    }
  },
  {
    id: 'wager_10000',
    name: 'High Roller',
    description: 'Wager $10,000 in total',
    category: 'wager',
    icon: '[5391292736647209211]', // Money eyes emoji
    rarity: 'rare',
    condition: {
      type: 'wager_total',
      value: 10000
    }
  },
  {
    id: 'wager_100000',
    name: 'Whale Status',
    description: 'Wager $100,000 in total',
    category: 'wager',
    icon: '[5215706742645599766]', // Cash stacking emoji
    rarity: 'epic',
    condition: {
      type: 'wager_total',
      value: 100000
    }
  },
  
  // Race Achievements
  {
    id: 'race_first_win',
    name: 'Victory Lap',
    description: 'Win your first wager race',
    category: 'race',
    icon: '[5222141780476046109]', // Goat race emoji
    rarity: 'rare',
    condition: {
      type: 'races_won',
      value: 1
    }
  },
  {
    id: 'race_5_wins',
    name: 'Race Champion',
    description: 'Win 5 wager races',
    category: 'race',
    icon: '[5280769763398671636]', // Trophy emoji
    rarity: 'epic',
    condition: {
      type: 'races_won',
      value: 5
    }
  },
  
  // Loyalty Achievements
  {
    id: 'loyalty_30_days',
    name: 'Dedicated Player',
    description: 'Stay active for 30 days',
    category: 'loyalty',
    icon: '[5285409457654737374]', // Clock timer emoji
    rarity: 'rare',
    condition: {
      type: 'days_active',
      value: 30
    }
  },
  
  // Social Achievements
  {
    id: 'social_first_referral',
    name: 'Friend Maker',
    description: 'Get your first referral',
    category: 'social',
    icon: '[5215561710189947188]', // Clapping emoji
    rarity: 'common',
    condition: {
      type: 'referrals',
      value: 1
    }
  },
  
  // Special Achievements
  {
    id: 'special_early_adopter',
    name: 'Early Adopter',
    description: 'Join during platform launch phase',
    category: 'special',
    icon: '[5267389686141166350]', // Golden sparkle emoji
    rarity: 'legendary',
    condition: {
      type: 'custom',
      value: 0,
      customCheck: (userData) => {
        const joinDate = new Date(userData.createdAt);
        const launchEndDate = new Date('2024-03-31'); // Example launch phase end date
        return joinDate <= launchEndDate;
      }
    },
    reward: {
      type: 'badge',
      value: 'early_adopter'
    }
  }
];

export interface UserAchievement {
  achievementId: string;
  unlockedAt: Date;
  progress?: number; // For achievements that can track progress
}

// Helper function to get achievement rarity color
export function getRarityColor(rarity: Achievement['rarity']): string {
  switch (rarity) {
    case 'common':
      return '#A0A0A0';
    case 'rare':
      return '#3B82F6';
    case 'epic':
      return '#8B5CF6';
    case 'legendary':
      return '#D7FF00';
    default:
      return '#FFFFFF';
  }
} 