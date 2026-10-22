export type PullResult = 'win' | 'lose' | 'guaranteed';
export type BannerType = 'character' | 'chronicled' | 'weapon' | 'standard';

export interface PullEntry {
  id: string;
  banner: BannerType;
  item: string;
  itemType: 'character' | 'weapon';
  rank: number;
  result: PullResult;
  pity: number;
  patch: string;
  region: string;
  timestamp: string;
}

export interface CharacterGoal {
  owned: boolean;
  currentConstellations: number;
  targetConstellations: number;
  currentRefinement: number;
  targetRefinement: number;
  hasSkin: boolean;
  targetSkin: boolean;
}

export interface WeaponGoal {
  owned: boolean;
  currentRefinement: number;
  targetRefinement: number;
}

export interface AccountData {
  version: number;
  account: {
    primogems: number;
    intertwinedFates: number;
    acquaintFates: number;
    currentPity: {
      character: number;
      weapon: number;
      standard: number;
    };
  };
  pulls: {
    character: PullEntry[];
    chronicled: PullEntry[];
    weapon: PullEntry[];
    standard: PullEntry[];
  };
  characters: Record<string, CharacterGoal>;
  weapons: Record<string, WeaponGoal>;
}
