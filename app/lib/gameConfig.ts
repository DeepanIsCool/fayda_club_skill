export interface GameRewardRule {
  id: string;
  name: string;
  formula: string;
  multiplier: number;
  conditions?: string;
}

export interface GameContinueRule {
  costProgression: number[];
  maxContinues: number;
  formula?: string;
}

export interface GameAchievement {
  id: string;
  name: string;
  description: string;
  condition: string;
  reward: number;
  type: "level" | "performance" | "special" | "streak" | "perfect";
  icon?: string;
  rarity: "common" | "rare" | "epic" | "legendary";
}

export interface GameDisplayConfig {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
  icons: {
    main: string;
    difficulty: string;
    category: string;
  };
  theme: "light" | "dark" | "auto";
}

export interface GameFrontendConfig {
  component: string;
  path: string;
  imageUrl: string;
  title: string;
  description: string;
  objective: string;
  rewardRules: GameRewardRule[];
  continueRules: GameContinueRule;
  achievements: GameAchievement[];
  displayConfig: GameDisplayConfig;
  metadata: {
    version: string;
    lastUpdated: string;
    minAppVersion?: string;
  };
}

export interface GameConfig {
  id: string;
  name: string;
  description: string;
  category: string;
  hardness: number;
  entryfee: number;
  rules: string;
  rating: number;
  createdAt: string;
  slug: string;
  frontendConfig?: GameFrontendConfig;
  isAvailable: boolean;
  hasImplementation: boolean;
}

export interface ApiGameResponse {
  success: boolean;
  games: Array<{
    id: string;
    name: string;
    hardness: number;
    entryfee: number;
    description: string;
    category: string;
    rules: string;
    rating: number;
    createdAt: string;
  }>;
}

export interface GameSessionData {
  gameId: string;
  userId: string;
  level: number;
  score: number;
  duration: number;
  sessionData: Record<string, unknown>;
  achievements?: string[];
  metadata: {
    timestamp: number;
    version: string;
    platform: string;
  };
}

let configs = new Map<string, GameConfig>();
let slugToId = new Map<string, string>();

const GAME_IMPLEMENTATIONS: Map<string, Partial<GameFrontendConfig>> = new Map([
  [
    "Tower Block",
    {
      component: "TowerBlockGame",
      path: "/games/tower-block",
      imageUrl: "/images/games/tower.jpeg",
    },
  ],
  [
    "2048",
    {
      component: "Game2048",
      path: "/games/2048",
      imageUrl: "/images/games/2048.jpeg",
    },
  ],
  [
    "Tetris",
    {
      component: "TetrisGame",
      path: "/games/tetris",
      imageUrl: "/images/games/tetris.jpeg",
    },
  ],
]);

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "");
}

function evaluateExpression(
  expression: string,
  context: Record<string, unknown>
): any {
  try {
    const safeContext = { ...context, Math };
    const paramNames = Object.keys(safeContext);
    const paramValues = Object.values(safeContext);
    const func = new Function(...paramNames, `return ${expression}`);
    return func(...paramValues);
  } catch (error) {
    console.error(`Error evaluating expression "${expression}":`, error);
    return 0;
  }
}

// --- Public API Functions ---

export function loadGames(apiGames: ApiGameResponse["games"]): void {
  const newConfigs = new Map<string, GameConfig>();
  const newSlugToId = new Map<string, string>();

  for (const apiGame of apiGames) {
    const slug = slugify(apiGame.name);
    const frontendConfig = GAME_IMPLEMENTATIONS.get(apiGame.name);
    const config: GameConfig = {
      ...apiGame,
      slug,
      frontendConfig: frontendConfig as GameFrontendConfig | undefined,
      isAvailable: true,
      hasImplementation: !!frontendConfig,
    };
    newConfigs.set(config.id, config);
    newSlugToId.set(slug, config.id);
  }

  configs = newConfigs;
  slugToId = newSlugToId;
  console.log(`✨ Processed and loaded ${configs.size} game configurations.`);
}

export function getGameById(id: string): GameConfig | undefined {
  return configs.get(id);
}

export function getGameBySlug(slug: string): GameConfig | undefined {
  const id = slugToId.get(slug);
  return id ? configs.get(id) : undefined;
}

export function getGameByPath(path: string): GameConfig | undefined {
  const slug = path.replace("/games/", "");
  return getGameBySlug(slug);
}

export function getAllGames(): GameConfig[] {
  return Array.from(configs.values());
}

export function getImplementedGames(): GameConfig[] {
  return getAllGames().filter((game) => game.hasImplementation);
}

export function calculateRewards(
  gameId: string,
  gameStats: Record<string, unknown>
): { amount: number; reason: string }[] {
  const game = getGameById(gameId);
  if (!game?.frontendConfig?.rewardRules) return [];

  return game.frontendConfig.rewardRules.reduce((acc, rule) => {
    const conditionsMet = rule.conditions
      ? evaluateExpression(rule.conditions, gameStats)
      : true;
    if (conditionsMet) {
      const formulaResult = evaluateExpression(rule.formula, gameStats);
      const amount = Math.floor((Number(formulaResult) || 0) * rule.multiplier);
      if (amount > 0) {
        acc.push({ amount, reason: rule.name });
      }
    }
    return acc;
  }, [] as { amount: number; reason: string }[]);
}

export function checkAchievements(
  gameId: string,
  gameStats: Record<string, unknown>
): GameAchievement[] {
  const game = getGameById(gameId);
  if (!game?.frontendConfig?.achievements) return [];
  return game.frontendConfig.achievements.filter((ach) =>
    evaluateExpression(ach.condition, gameStats)
  );
}

export function isGameAvailable(gameSlug: string): boolean {
  const game = getGameBySlug(gameSlug);
  return !!game?.hasImplementation;
}

export function getGameEntryCost(gameSlug: string): number {
  return getGameBySlug(gameSlug)?.entryfee ?? 1;
}

export function getGameContinueCosts(gameSlug: string): number[] {
  return (
    getGameBySlug(gameSlug)?.frontendConfig?.continueRules.costProgression ?? [
      2, 4, 8,
    ]
  );
}