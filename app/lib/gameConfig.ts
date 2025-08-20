/**
 * Game Configuration Service
 * Provides a dynamic, scalable system for managing game configurations
 * that can be loaded from API and mapped to frontend implementations.
 */

export interface GameRewardRule {
  id: string;
  name: string;
  formula: string; // JavaScript expression string
  multiplier: number;
  conditions?: string; // Additional conditions as JavaScript expression
}

export interface GameContinueRule {
  costProgression: number[];
  maxContinues: number;
  formula?: string; // Optional dynamic formula for continue costs
}

export interface GameAchievement {
  id: string;
  name: string;
  description: string;
  condition: string; // JavaScript expression
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
  // API properties
  id: string;
  name: string;
  description: string;
  category: string;
  hardness: number;
  entryfee: number;
  rules: string;
  rating: number;
  createdAt: string;

  // Computed properties
  slug: string;

  // Frontend configuration
  frontendConfig?: GameFrontendConfig;

  // Status
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

/**
 * Game Configuration Service
 * Manages dynamic loading and caching of game configurations
 */
export class GameConfigService {
  private static instance: GameConfigService;
  private configs: Map<string, GameConfig> = new Map();
  private apiCache: { data: ApiGameResponse; timestamp: number } | null = null;
  private readonly cacheExpiry = 5 * 60 * 1000; // 5 minutes
  private readonly apiUrl = "/api/game";

  // Frontend game mappings - this is where we define which games have implementations
  private readonly frontendMappings: Map<string, Partial<GameFrontendConfig>> =
    new Map([
      [
        "Tower Block",
        {
          component: "TowerBlockGame",
          path: "/games/tower-block",
          rewardRules: [
            {
              id: "level_reward",
              name: "Level Completion",
              formula: "Math.max(2, Math.floor(level * 0.75))",
              multiplier: 1,
            },
            {
              id: "perfect_bonus",
              name: "Perfect Placement",
              formula: "perfectPlacements * 3",
              multiplier: 1,
              conditions: "perfectPlacements > 0",
            },
            {
              id: "streak_bonus",
              name: "Consecutive Streak",
              formula: "Math.floor(maxConsecutiveStreak / 3)",
              multiplier: 1,
              conditions: "maxConsecutiveStreak >= 3",
            },
          ],
          continueRules: {
            costProgression: [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024],
            maxContinues: 100,
          },
          achievements: [
            {
              id: "tower_starter",
              name: "Tower Starter",
              description: "Complete your first level",
              condition: "level >= 1",
              reward: 5,
              type: "level",
              icon: "🏗️",
              rarity: "common",
            },
            {
              id: "tower_builder",
              name: "Tower Builder",
              description: "Reach level 5",
              condition: "level >= 5",
              reward: 10,
              type: "level",
              icon: "🏢",
              rarity: "common",
            },
            {
              id: "tower_master",
              name: "Tower Master",
              description: "Reach level 15",
              condition: "level >= 15",
              reward: 25,
              type: "level",
              icon: "🏗️",
              rarity: "rare",
            },
            {
              id: "precision_expert",
              name: "Precision Expert",
              description: "Achieve 5 perfect placements in one game",
              condition: "perfectPlacements >= 5",
              reward: 15,
              type: "performance",
              icon: "🎯",
              rarity: "rare",
            },
            {
              id: "streak_master",
              name: "Streak Master",
              description: "Achieve a 10+ consecutive streak",
              condition: "maxConsecutiveStreak >= 10",
              reward: 20,
              type: "streak",
              icon: "🔥",
              rarity: "epic",
            },
          ],
          displayConfig: {
            colors: {
              primary: "#3B82F6",
              secondary: "#1E40AF",
              accent: "#10B981",
              background: "#F8FAFC",
            },
            icons: {
              main: "🏗️",
              difficulty: "🎯",
              category: "🎮",
            },
            theme: "auto" as const,
          },
          metadata: {
            version: "1.0.0",
            lastUpdated: new Date().toISOString(),
          },
        },
      ],
      [
        "2048",
        {
          component: "Game2048",
          path: "/games/2048",
          rewardRules: [
            {
              id: "score_reward",
              name: "Score Milestone",
              formula: "Math.floor(score / 256)",
              multiplier: 1,
            },
            {
              id: "tile_2048",
              name: "2048 Tile Bonus",
              formula: "has2048Tile ? 50 : 0",
              multiplier: 1,
              conditions: "has2048Tile === true",
            },
          ],
          continueRules: {
            costProgression: [2, 4, 8, 16, 32],
            maxContinues: 5,
          },
          achievements: [
            {
              id: "first_512",
              name: "First 512",
              description: "Reach a 512 tile",
              condition: "maxTile >= 512",
              reward: 10,
              type: "performance",
              icon: "🔢",
              rarity: "common",
            },
            {
              id: "first_2048",
              name: "2048 Achiever",
              description: "Reach a 2048 tile",
              condition: "maxTile >= 2048",
              reward: 50,
              type: "special",
              icon: "🎉",
              rarity: "epic",
            },
            {
              id: "score_5000",
              name: "Score 5000",
              description: "Score 5000 points in a game",
              condition: "score >= 5000",
              reward: 25,
              type: "performance",
              icon: "🏆",
              rarity: "rare",
            },
          ],
          displayConfig: {
            colors: {
              primary: "#F59E42",
              secondary: "#F6E58D",
              accent: "#FFD700",
              background: "#FFF8E1",
            },
            icons: {
              main: "🔢",
              difficulty: "🧩",
              category: "🕹️",
            },
            theme: "auto" as const,
          },
          metadata: {
            version: "1.0.0",
            lastUpdated: new Date().toISOString(),
          },
        },
      ],
      [
        "Tetris",
        {
          component: "TetrisGame",
          path: "/games/tetris",
          rewardRules: [
            {
              id: "line_clear",
              name: "Line Clear",
              formula: "linesCleared",
              multiplier: 2,
            },
            {
              id: "tetris_clear",
              name: "Tetris (4 lines)",
              formula: "tetrisCount * 10",
              multiplier: 1,
              conditions: "tetrisCount > 0",
            },
          ],
          continueRules: {
            costProgression: [2, 4, 8, 16, 32],
            maxContinues: 3,
          },
          achievements: [
            {
              id: "first_tetris",
              name: "First Tetris",
              description: "Clear 4 lines at once",
              condition: "tetrisCount >= 1",
              reward: 10,
              type: "performance",
              icon: "🟦",
              rarity: "common",
            },
            {
              id: "lines_40",
              name: "40 Lines",
              description: "Clear 40 lines in one game",
              condition: "linesCleared >= 40",
              reward: 25,
              type: "performance",
              icon: "🧱",
              rarity: "rare",
            },
            {
              id: "score_10000",
              name: "Score 10,000",
              description: "Score 10,000 points in a game",
              condition: "score >= 10000",
              reward: 50,
              type: "performance",
              icon: "🏆",
              rarity: "epic",
            },
          ],
          displayConfig: {
            colors: {
              primary: "#3B82F6",
              secondary: "#6366F1",
              accent: "#F59E42",
              background: "#EEF2FF",
            },
            icons: {
              main: "🟦",
              difficulty: "🧩",
              category: "🎮",
            },
            theme: "auto" as const,
          },
          metadata: {
            version: "1.0.0",
            lastUpdated: new Date().toISOString(),
          },
        },
      ],
      // Add more game mappings here as games are implemented
    ]);

  private constructor() {}

  public static getInstance(): GameConfigService {
    if (!GameConfigService.instance) {
      GameConfigService.instance = new GameConfigService();
    }
    return GameConfigService.instance;
  }

  /**
   * Fetch games from API with caching
   */
  public async fetchGamesFromAPI(): Promise<ApiGameResponse["games"]> {
    // Check cache first
    if (
      this.apiCache &&
      Date.now() - this.apiCache.timestamp < this.cacheExpiry
    ) {
      return this.apiCache.data.games;
    }

    try {
      const response = await fetch(this.apiUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        // Add timeout
        signal: AbortSignal.timeout(10000), // 10 seconds
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiGameResponse = await response.json();

      if (!data.success) {
        throw new Error("API returned unsuccessful response");
      }

      // Cache the result
      this.apiCache = {
        data,
        timestamp: Date.now(),
      };

      console.log(`✅ Loaded ${data.games.length} games from API`);
      return data.games;
    } catch (error) {
      console.error("❌ Error fetching games from API:", error);

      // Return empty array on error, but don't cache the failure
      return [];
    }
  }

  /**
   * Create a URL-friendly slug from game name
   */
  private slugify(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "") // Remove special characters
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/-+/g, "-"); // Replace multiple hyphens with single
  }

  /**
   * Load and process all games
   */
  public async loadGames(): Promise<GameConfig[]> {
    try {
      const apiGames = await this.fetchGamesFromAPI();
      console.log("🔍 Raw API games:", apiGames);

      const configs = apiGames.map((apiGame) => {
        const slug = this.slugify(apiGame.name);
        const frontendMapping = this.frontendMappings.get(apiGame.name);

        console.log(
          `🎮 Processing game: "${
            apiGame.name
          }" -> slug: "${slug}", hasMapping: ${!!frontendMapping}`
        );

        const config: GameConfig = {
          // API properties
          id: apiGame.id,
          name: apiGame.name,
          description: apiGame.description,
          category: apiGame.category,
          hardness: apiGame.hardness,
          entryfee: apiGame.entryfee,
          rules: apiGame.rules,
          rating: apiGame.rating,
          createdAt: apiGame.createdAt,

          // Computed properties
          slug,

          // Frontend configuration (if available)
          frontendConfig: frontendMapping
            ? ({
                ...this.getDefaultFrontendConfig(slug),
                ...frontendMapping,
              } as GameFrontendConfig)
            : undefined,

          // Status
          isAvailable: true,
          hasImplementation: !!frontendMapping,
        };

        // Store by both slug and ID for quick lookup
        this.configs.set(slug, config);
        this.configs.set(apiGame.id, config);

        return config;
      });

      console.log(`✅ Processed ${configs.length} game configurations`);
      console.log(
        "🎯 Available frontend mappings:",
        Array.from(this.frontendMappings.keys())
      );
      return configs;
    } catch (error) {
      console.error("❌ Error loading games:", error);
      return [];
    }
  }

  /**
   * Get default frontend configuration for a game
   */
  private getDefaultFrontendConfig(slug: string): GameFrontendConfig {
    return {
      component: "GenericGame",
      path: `/games/${slug}`,
      rewardRules: [
        {
          id: "level_reward",
          name: "Level Completion",
          formula: "level",
          multiplier: 1,
        },
      ],
      continueRules: {
        costProgression: [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024],
        maxContinues: 100,
      },
      achievements: [],
      displayConfig: {
        colors: {
          primary: "#6B7280",
          secondary: "#4B5563",
          accent: "#9CA3AF",
          background: "#F9FAFB",
        },
        icons: {
          main: "🎮",
          difficulty: "⭐",
          category: "🎲",
        },
        theme: "auto",
      },
      metadata: {
        version: "1.0.0",
        lastUpdated: new Date().toISOString(),
      },
    };
  }

  /**
   * Get game configuration by slug
   */
  public getGameBySlug(slug: string): GameConfig | undefined {
    return this.configs.get(slug);
  }

  /**
   * Get game configuration by ID
   */
  public getGameById(id: string): GameConfig | undefined {
    return this.configs.get(id);
  }

  /**
   * Get game configuration by path
   */
  public getGameByPath(path: string): GameConfig | undefined {
    const slug = path.replace("/games/", "");
    return this.getGameBySlug(slug);
  }

  /**
   * Get all available games
   */
  public getAllGames(): GameConfig[] {
    const games = Array.from(this.configs.values());
    // Remove duplicates (since we store by both slug and ID)
    const uniqueGames = games.filter(
      (game, index, arr) => arr.findIndex((g) => g.id === game.id) === index
    );
    return uniqueGames;
  }

  /**
   * Get only games with frontend implementations
   */
  public getImplementedGames(): GameConfig[] {
    return this.getAllGames().filter((game) => game.hasImplementation);
  }

  /**
   * Calculate dynamic rewards for a game
   */
  public calculateRewards(
    gameConfig: GameConfig,
  gameStats: Record<string, unknown>
  ): Array<{ amount: number; reason: string; type: string }> {
    if (!gameConfig.frontendConfig) {
      return [];
    }

    const rewards: Array<{ amount: number; reason: string; type: string }> = [];
    const { rewardRules } = gameConfig.frontendConfig;

    for (const rule of rewardRules) {
      try {
        // Check conditions if any
        if (rule.conditions) {
          const conditionResult = this.evaluateExpression(
            rule.conditions,
            gameStats
          );
          if (!conditionResult) continue;
        }

        // Calculate reward amount
  const formulaResult = this.evaluateExpression(rule.formula, gameStats);
  const amount = (typeof formulaResult === 'number' ? formulaResult : 0) * rule.multiplier;

        if (amount > 0) {
          rewards.push({
            amount: Math.floor(amount),
            reason: rule.name,
            type: rule.id,
          });
        }
      } catch (error) {
        console.error(`Error calculating reward for rule ${rule.id}:`, error);
      }
    }

    return rewards;
  }

  /**
   * Calculate dynamic achievements for a game
   */
  public calculateAchievements(
    gameConfig: GameConfig,
  gameStats: Record<string, unknown>
  ): GameAchievement[] {
    if (!gameConfig.frontendConfig) {
      return [];
    }

    const achievements: GameAchievement[] = [];
    const { achievements: achievementRules } = gameConfig.frontendConfig;

    for (const achievement of achievementRules) {
      try {
        const conditionMet = this.evaluateExpression(
          achievement.condition,
          gameStats
        );
        if (conditionMet) {
          achievements.push(achievement);
        }
      } catch (error) {
        console.error(`Error checking achievement ${achievement.id}:`, error);
      }
    }

    return achievements;
  }

  /**
   * Safely evaluate JavaScript expressions with game stats context
   */
  private evaluateExpression(
    expression: string,
    context: Record<string, unknown>
  ): unknown {
    try {
      // Create a safe evaluation context
      const safeContext = {
        ...context,
        Math,
        // Add other safe globals as needed
      };

      // Create function with context variables as parameters
      const paramNames = Object.keys(safeContext);
      const paramValues = Object.values(safeContext);

      const func = new Function(...paramNames, `return ${expression}`);
      return func(...paramValues);
    } catch (error) {
      console.error("Error evaluating expression:", expression, error);
      return 0;
    }
  }

  /**
   * Clear cache to force refresh
   */
  public clearCache(): void {
    this.apiCache = null;
    this.configs.clear();
    console.log("✅ Game configuration cache cleared");
  }

  /**
   * Get cache status
   */
  public getCacheStatus(): {
    isValid: boolean;
    timestamp: number | null;
    gameCount: number;
  } {
    return {
      isValid:
        this.apiCache !== null &&
        Date.now() - this.apiCache.timestamp < this.cacheExpiry,
      timestamp: this.apiCache?.timestamp || null,
      gameCount: this.configs.size,
    };
  }
}

// Export singleton instance
export const gameConfigService = GameConfigService.getInstance();

// Utility functions
export function isGameAvailable(gameSlug: string): boolean {
  const game = gameConfigService.getGameBySlug(gameSlug);
  return (game?.isAvailable && game?.hasImplementation) || false;
}

export function getGameEntryCost(gameSlug: string): number {
  const game = gameConfigService.getGameBySlug(gameSlug);
  return game?.entryfee || 1;
}

export function getGameContinueCosts(gameSlug: string): number[] {
  const game = gameConfigService.getGameBySlug(gameSlug);
  return game?.frontendConfig?.continueRules.costProgression || [2, 4, 8];
}
