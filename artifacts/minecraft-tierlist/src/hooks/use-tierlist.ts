import { useState, useEffect } from "react";

export type TierType = "S" | "A" | "B" | "C" | "D" | "TRICHEUR";
export type Tiers = Record<TierType, string[]>;

const DEFAULT_TIERS: Tiers = {
  S: [],
  A: [],
  B: [],
  C: [],
  D: [],
  TRICHEUR: [],
};

const STORAGE_KEY = "mc-tierlist-state";

export function useTierList() {
  const [tiers, setTiers] = useState<Tiers>(DEFAULT_TIERS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Partial<Tiers>;
        // Merge saved state with defaults (handles new tiers added after initial save)
        setTiers({ ...DEFAULT_TIERS, ...parsed });
      } catch {
        // ignore
      }
    }
    setIsLoaded(true);
  }, []);

  const saveTiers = (newTiers: Tiers) => {
    setTiers(newTiers);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newTiers));
  };

  const movePlayer = (playerId: string, destinationTier: TierType | "UNRANKED") => {
    setTiers((prev) => {
      const newTiers = { ...prev };
      // Remove from all tiers first
      (Object.keys(newTiers) as TierType[]).forEach((key) => {
        newTiers[key] = newTiers[key].filter((id) => id !== playerId);
      });
      // Add to destination if not unranked
      if (destinationTier !== "UNRANKED") {
        newTiers[destinationTier] = [...newTiers[destinationTier], playerId];
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newTiers));
      return newTiers;
    });
  };

  const resetTiers = () => saveTiers({ ...DEFAULT_TIERS });

  return { tiers, movePlayer, resetTiers, isLoaded };
}
