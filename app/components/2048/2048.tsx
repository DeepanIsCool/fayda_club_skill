// app/components/2048/2048.tsx
"use client";

import { useCurrency } from "../../contexts/CurrencyContext";
import { GameConfig, getGameById, loadGames } from "../../lib/gameConfig";
import type { TileState } from "../../lib/types";
import { useGame } from "../../lib/use-game";
import { CurrencyDisplay } from "../modals/currency";
import { RewardModal } from "../modals/reward";
import { GameStartModal } from "../modals/start";

import { Button } from "@/ui/button";
import { useAuth } from "@clerk/nextjs";
import { CircleArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";

export default function Game2048() {
  const router = useRouter();
  const { getToken } = useAuth();
  const {
    grid,
    restart,
    over,
    won,
    keepPlayingFunc,
    markEndTime,
    getFinalScore,
    getSessionData,
  } = useGame();
  const { currency, actions } = useCurrency();

  // Ensure game configs are loaded for getGameById to work
  useEffect(() => {
    const ensureConfigsLoaded = async () => {
      if (!getGameById("2048")) {
        try {
          const jwt = await getToken();
          const response = await fetch(
            "https://ai.rajatkhandelwal.com/arcade/games",
            {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${jwt}`,
              },
              cache: "no-store",
            }
          );
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.games) {
              loadGames(data.games);
            }
          }
        } catch (err) {
          console.error("Failed to load game configs for 2048:", err);
        }
      }
    };
    ensureConfigsLoaded();
  }, [getToken]);

  // Hardcoded config for 2048 fallback
  const HARDCODED_2048_CONFIG: GameConfig = {
    id: "cmeim0f1h0009pa0i1sdezpck",
    // uuid removed, not part of GameConfig
    slug: "2048",
    name: "2048",
    // image removed, not part of GameConfig
    hardness: 2,
    entryfee: 2,
    description: "Puzzle game",
    category: "Board",
    rules: "Merge the numbers",
    frontendConfig: {
      title: "2048",
      description: "Puzzle game",
      objective: "Merge the numbers",
      imageUrl: "",
      path: "2048",
      component: "Game2048",
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
          conditions: "has2048Tile === true",
          multiplier: 1,
        },
      ],
      continueRules: { maxContinues: 5, costProgression: [2, 4, 8, 16, 32] },
      achievements: [
        {
          id: "first_512",
          icon: "🔢",
          name: "First 512",
          type: "performance",
          rarity: "common",
          reward: 10,
          condition: "maxTile >= 512",
          description: "Reach a 512 tile",
        },
        {
          id: "first_2048",
          icon: "🎉",
          name: "2048 Achiever",
          type: "special",
          rarity: "epic",
          reward: 50,
          condition: "maxTile >= 2048",
          description: "Reach a 2048 tile",
        },
        {
          id: "score_5000",
          icon: "🏆",
          name: "Score 5000",
          type: "performance",
          rarity: "rare",
          reward: 25,
          condition: "score >= 5000",
          description: "Score 5000 points in a game",
        },
      ],
      displayConfig: {
        icons: { main: "🔢", category: "🕹️", difficulty: "🧩" },
        theme: "auto",
        colors: {
          accent: "#FFD700",
          primary: "#F59E42",
          secondary: "#F6E58D",
          background: "#FFF8E1",
        },
      },
      metadata: {
        version: "1.0.0",
        lastUpdated: "2025-08-19T13:58:44.792Z",
      },
    },
    rating: 0,
    createdAt: "2025-08-19T13:58:44.792Z",
    isAvailable: true,
    hasImplementation: true,
  };

  let config = getGameById("2048");
  if (!config) config = HARDCODED_2048_CONFIG;
  const configLoading = !config;
  // Prefer config.frontendConfig, else (for fallback) config.config?.displayConfig, else {}
  const fallbackDisplay =
    (config as unknown as { config?: { displayConfig?: unknown } })?.config
      ?.displayConfig ?? {};
  const frontendConfig =
    (config?.frontendConfig as Partial<
      import("../../lib/gameConfig").GameFrontendConfig
    >) ||
    (fallbackDisplay as Partial<
      import("../../lib/gameConfig").GameFrontendConfig
    >);
  const title = frontendConfig?.title || config?.name || "2048";
  const description = frontendConfig?.description || config?.description || "";
  const objective = frontendConfig?.objective || config?.rules || "";

  type Reward = {
    amount: number;
    reason: string;
    type: "level" | "perfect" | "streak" | "bonus" | "achievement" | "score";
  };

  interface GameStats {
    finalLevel: number;
    totalPrecisionScore: number;
    averageAccuracy: number;
    perfectPlacements: number;
    averageReactionTime: number;
    maxConsecutiveStreak?: number;
    totalGameTime?: number;
  }

  type RewardModalState = {
    rewards: Reward[];
    totalCoins: number;
    gameLevel: number;
    gameStats: GameStats;
  } | null;

  const [showStartModal, setShowStartModal] = useState(true);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionPosting, setSessionPosting] = useState(false);
  const [pendingReward, setPendingReward] = useState<RewardModalState>(null);
  const [rewardError, setRewardError] = useState<string | null>(null);

  const submitGameSession = useCallback(
    async (finalStats: GameStats) => {
      if (!config || !finalStats) {
        console.log("[submitGameSession] Missing config or finalStats", {
          config,
          finalStats,
        });
        return;
      }
      try {
        const sessionData = {
          gameId: config.id,
          userId: "guest",
          level: finalStats.finalLevel,
          score: finalStats.totalPrecisionScore,
          duration: finalStats.totalGameTime || 0,
          sessionData: {
            ...finalStats,
            gameType: "2048",
            platform: "web",
            timestamp: new Date().toISOString(),
            version: "1.0.0",
          },
        };
        const jwt = await getToken();
        console.log(
          "[submitGameSession] Sending POST to /arcade/gamesession",
          sessionData
        );
        const response = await fetch(
          `https://ai.rajatkhandelwal.com/arcade/gamesession`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${jwt}`,
            },
            body: JSON.stringify(sessionData),
          }
        );
        console.log(
          "[submitGameSession] POST response status:",
          response.status
        );
      } catch (error) {
        console.error("Error submitting 2048 session:", error);
      }
    },
    [getToken, config]
  );

  // Handler for starting the game
  const handleStartGame = async () => {
    setLoading(true);
    try {
      const success = await actions.startGame("2048");
      if (success) {
        setShowStartModal(false);
        restart();
      } else {
        console.error("Failed to start 2048 game");
      }
    } catch (error) {
      console.error("Error starting 2048 game:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push("/");
  };

  // Show RewardModal on game over
  useEffect(() => {
    if (over || won) {
      markEndTime();
      const finalScore = getFinalScore();
      const stats = getSessionData() as GameStats;
      setShowRewardModal(true);
      setPendingReward({
        rewards: [{ amount: finalScore, reason: "Game Score", type: "score" }],
        totalCoins: 0,
        gameLevel: 0,
        gameStats: stats,
      });
    }
  }, [over, won]);

  const handleRewardClose = () => {
    setShowRewardModal(false);
    setPendingReward(null);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-8 px-4 text-white relative max-sm:py-4 max-sm:px-2">
      {/* Top UI Bar */}
      <div className="fixed top-4 left-4 z-30">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/")}
          aria-label="Back to Dashboard"
          className="bg-yellow-400 text-amber-900 font-extrabold"
        >
          <CircleArrowLeft />
        </Button>
      </div>
      <div className="fixed top-4 right-4 z-20">
        <CurrencyDisplay />
      </div>
      <div className="w-[500px] mx-auto max-sm:w-full max-sm:px-0 flex flex-col items-center">
        {/* Start Modal */}
        <GameStartModal
          isOpen={showStartModal}
          onStart={handleStartGame}
          onCancel={handleCancel}
          gameKey="2048"
          gameTitle={title}
          gameDescription={description}
          gameObjective={objective}
        />
        {/* Reward Modal */}
        <RewardModal
          isOpen={showRewardModal}
          onClose={async () => {
            setRewardError(null);
            if (!pendingReward?.gameStats) {
              setRewardError("Game session data missing. Please try again.");
              return;
            }
            if (configLoading) {
              setRewardError(
                "Game configuration is still loading. Please wait."
              );
              return;
            }
            setSessionPosting(true);
            try {
              await submitGameSession(pendingReward.gameStats);
              setShowRewardModal(false);
              setPendingReward(null);
              router.push("/");
            } catch (error) {
              setRewardError("Failed to save session. Please try again.");
              console.error("Error submitting session:", error);
            } finally {
              setSessionPosting(false);
            }
          }}
          rewards={pendingReward?.rewards || []}
          totalCoins={pendingReward?.totalCoins || 0}
          gameLevel={pendingReward?.gameLevel || 0}
          gameStats={pendingReward?.gameStats}
          disableClose={sessionPosting || configLoading}
          rewardError={
            configLoading ? "Loading game configuration..." : rewardError
          }
        />
        {/* Title */}
        <div className="text-center mb-8 animate-in fade-in slide-in-from-top duration-700">
          <h1 className="text-6xl md:text-8xl font-black bg-gradient-to-r from-sky-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent mb-2 tracking-tight">
            {title}
          </h1>
        </div>
        {/* Game Board */}
        <div className="game-container relative w-full max-w-[500px] aspect-square p-4 md:p-6 cursor-default select-none touch-none bg-gradient-to-br from-slate-900 to-blue-950 rounded-3xl shadow-2xl border border-blue-800/50 backdrop-blur-sm animate-in fade-in slide-in-from-bottom duration-700 delay-300 flex items-center justify-center">
          {/* Background Grid */}
          <div className="absolute inset-4 md:inset-6 z-[1]">
            {Array.from({ length: 4 }).map((_, rowIndex) => (
              <div
                key={rowIndex}
                className="flex gap-2 md:gap-4 mb-2 md:mb-4 last:mb-0"
              >
                {Array.from({ length: 4 }).map((_, colIndex) => (
                  <div
                    key={colIndex}
                    className="flex-1 aspect-square rounded-xl bg-slate-800/50 backdrop-blur-sm border border-blue-900/30 shadow-inner"
                  />
                ))}
              </div>
            ))}
          </div>
          {/* Tiles */}
          <div className="absolute inset-4 md:inset-6 z-[2]">
            {grid
              .flat()
              .filter((tile): tile is TileState => !!tile)
              .map((tile) => {
                const x = tile.position.x;
                const y = tile.position.y;
                const baseSize = "calc((100% - 0.75rem) / 4)";
                const gapSize = "0.25rem";
                const getTileStyles = (value: number) => {
                  const baseClasses =
                    "text-white font-black shadow-lg border border-white/20";
                  const styles = {
                    2: `bg-gradient-to-br from-slate-700 to-slate-800 text-gray-200 ${baseClasses}`,
                    4: `bg-gradient-to-br from-slate-600 to-slate-700 text-gray-100 ${baseClasses}`,
                    8: `bg-gradient-to-br from-blue-700 to-blue-800 ${baseClasses}`,
                    16: `bg-gradient-to-br from-blue-600 to-blue-700 ${baseClasses}`,
                    32: `bg-gradient-to-br from-sky-600 to-sky-700 ${baseClasses}`,
                    64: `bg-gradient-to-br from-sky-500 to-sky-600 ${baseClasses}`,
                    128: `bg-gradient-to-br from-cyan-500 to-cyan-600 text-2xl md:text-3xl ${baseClasses}`,
                    256: `bg-gradient-to-br from-cyan-400 to-cyan-500 text-2xl md:text-3xl ${baseClasses}`,
                    512: `bg-gradient-to-br from-teal-400 to-teal-500 text-2xl md:text-3xl ${baseClasses}`,
                    1024: `bg-gradient-to-br from-indigo-500 to-indigo-600 text-xl md:text-2xl ${baseClasses}`,
                    2048: `bg-gradient-to-br from-indigo-400 to-purple-500 text-xl md:text-2xl animate-pulse ${baseClasses}`,
                  };
                  return (
                    styles[value as keyof typeof styles] ||
                    `bg-gradient-to-br from-purple-600 to-violet-700 text-lg md:text-xl ${baseClasses}`
                  );
                };
                return (
                  <div
                    key={tile.id}
                    className="absolute transition-all duration-200 ease-out animate-in zoom-in"
                    style={{
                      width: baseSize,
                      height: baseSize,
                      left: `calc(${x} * (${baseSize} + ${gapSize}))`,
                      top: `calc(${y} * (${baseSize} + ${gapSize}))`,
                    }}
                  >
                    <div
                      className={`w-full h-full rounded-xl flex items-center justify-center text-3xl md:text-4xl transform hover:scale-105 transition-all duration-150 ${getTileStyles(
                        tile.value
                      )}`}
                    >
                      {tile.value}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}
