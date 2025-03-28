export type TierLevel =
  | "COPPER"
  | "BRONZE"
  | "SILVER"
  | "GOLD"
  | "PLATINUM"
  | "PEARL"
  | "SAPPHIRE"
  | "EMERALD"
  | "DIAMOND";

export const tierThresholds = {
  COPPER: 0,
  BRONZE: 10000,
  SILVER: 40000,
  GOLD: 100000,
  PLATINUM: 450000,
  PEARL: 1500000,
  SAPPHIRE: 3000000,
  EMERALD: 7000000,
  DIAMOND: 20000000,
};

export function getTierFromWager(wagerAmount: number): TierLevel {
  const tiers = Object.entries(tierThresholds).reverse();
  const tier = tiers.find(([_, threshold]) => wagerAmount >= threshold);
  return (tier ? tier[0] : "COPPER") as TierLevel;
}

export function getTierIcon(tier: TierLevel): string {
  // Update paths to point directly to the assets in public folder
  const icons: Record<TierLevel, string> = {
    COPPER: "/images/Goated%20Emblems/copper.548d79cf.svg",
    BRONZE: "/images/Goated%20Emblems/bronze.e6ea941b.svg",
    SILVER: "/images/Goated%20Emblems/silver.8e3ec67f.svg",
    GOLD: "/images/Goated%20Emblems/gold.1c810178.svg",
    PLATINUM: "/images/Goated%20Emblems/platinum.d258f583.svg",
    PEARL: "/images/Goated%20Emblems/pearl.1815809f.svg",
    SAPPHIRE: "/images/Goated%20Emblems/sapphire.91e6756b.svg",
    EMERALD: "/images/Goated%20Emblems/emerald.46bd38eb.svg",
    DIAMOND: "/images/Goated%20Emblems/diamond.ddf47a1e.svg",
  };
  return icons[tier];
}
