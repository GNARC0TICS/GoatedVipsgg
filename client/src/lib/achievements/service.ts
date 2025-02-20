import { Achievement, ACHIEVEMENTS, UserAchievement } from './types';

export class AchievementService {
  private static instance: AchievementService;
  
  private constructor() {}
  
  public static getInstance(): AchievementService {
    if (!AchievementService.instance) {
      AchievementService.instance = new AchievementService();
    }
    return AchievementService.instance;
  }

  // Check if user meets conditions for an achievement
  async checkAchievement(
    achievementId: string,
    userData: any
  ): Promise<boolean> {
    const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
    if (!achievement) return false;

    switch (achievement.condition.type) {
      case 'wager_total':
        return userData.totalWagered >= achievement.condition.value;
      
      case 'races_won':
        return userData.races?.won >= achievement.condition.value;
      
      case 'races_participated':
        return userData.races?.participated >= achievement.condition.value;
      
      case 'days_active':
        const daysSinceJoin = this.calculateDaysActive(userData.createdAt);
        return daysSinceJoin >= achievement.condition.value;
      
      case 'referrals':
        return userData.referrals?.length >= achievement.condition.value;
      
      case 'custom':
        return achievement.condition.customCheck?.(userData) || false;
      
      default:
        return false;
    }
  }

  // Calculate achievement progress
  async calculateProgress(
    achievementId: string,
    userData: any
  ): Promise<number> {
    const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
    if (!achievement) return 0;

    let current = 0;
    let target = achievement.condition.value;

    switch (achievement.condition.type) {
      case 'wager_total':
        current = userData.totalWagered || 0;
        break;
      
      case 'races_won':
        current = userData.races?.won || 0;
        break;
      
      case 'races_participated':
        current = userData.races?.participated || 0;
        break;
      
      case 'days_active':
        current = this.calculateDaysActive(userData.createdAt);
        break;
      
      case 'referrals':
        current = userData.referrals?.length || 0;
        break;
    }

    return Math.min((current / target) * 100, 100);
  }

  // Check all achievements for a user
  async checkAllAchievements(userData: any): Promise<string[]> {
    const unlockedAchievements: string[] = [];
    
    for (const achievement of ACHIEVEMENTS) {
      const isUnlocked = await this.checkAchievement(achievement.id, userData);
      if (isUnlocked) {
        unlockedAchievements.push(achievement.id);
      }
    }
    
    return unlockedAchievements;
  }

  // Get achievement details
  getAchievementDetails(achievementId: string): Achievement | undefined {
    return ACHIEVEMENTS.find(a => a.id === achievementId);
  }

  // Helper function to calculate days active
  private calculateDaysActive(createdAt: string): number {
    const start = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Get achievements by category
  getAchievementsByCategory(category: Achievement['category']): Achievement[] {
    return ACHIEVEMENTS.filter(a => a.category === category);
  }

  // Get all achievements
  getAllAchievements(): Achievement[] {
    return ACHIEVEMENTS;
  }
} 