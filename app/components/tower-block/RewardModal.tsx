"use client";

import { AnimatePresence, motion } from "framer-motion";
import { gsap } from "gsap";
import { BadgeCent } from "lucide-react";
import React, { useEffect, useRef } from "react";

interface Reward {
  amount: number;
  reason: string;
  type: "level" | "perfect" | "streak" | "bonus" | "achievement" | "score";
}

interface GameStats {
  finalLevel: number;
  totalPrecisionScore: number;
  averageAccuracy: number;
  perfectPlacements: number;
  averageReactionTime: number;
  maxConsecutiveStreak?: number;
  totalGameTime?: number;
}

interface RewardModalProps {
  isOpen: boolean;
  onClose: () => void;
  rewards: Reward[];
  totalCoins: number;
  gameLevel?: number;
  gameStats?: GameStats;
}

export function RewardModal({
  isOpen,
  onClose,
  rewards,
  totalCoins,
  gameLevel = 0,
  gameStats,
}: RewardModalProps) {
  const lightningRainRef = useRef<HTMLDivElement>(null);
  const totalRef = useRef<HTMLDivElement>(null);

  // Lightning rain animation for points
  useEffect(() => {
    if (isOpen && lightningRainRef.current) {
      const container = lightningRainRef.current;

      // Create falling lightning bolts
      for (let i = 0; i < 15; i++) {
        const lightning = document.createElement("div");
        lightning.className =
          "absolute text-yellow-400 text-2xl pointer-events-none";
        lightning.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-zap"><polygon points="13,2 3,14 12,14 11,22 21,10 12,10"></polygon></svg>`;
        lightning.style.left = Math.random() * 100 + "%";
        lightning.style.top = "-20px";
        container.appendChild(lightning);

        gsap.to(lightning, {
          y: window.innerHeight + 100,
          rotation: 360,
          duration: 1.5 + Math.random() * 1.5,
          ease: "power2.in",
          delay: i * 0.15,
          onComplete: () => {
            container.removeChild(lightning);
          },
        });
      }
    }
  }, [isOpen]);

  // Animate total counter
  useEffect(() => {
    if (isOpen && totalRef.current) {
      gsap.fromTo(
        totalRef.current,
        { scale: 0.5, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: 0.5,
          delay: 0.5,
          ease: "back.out(1.7)",
        }
      );
    }
  }, [isOpen]);

  // Note: reward icon helpers removed as reward list is currently commented out.
  // const totalEarned = rewards.reduce((sum, r) => sum + r.amount, 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          />

          {/* Lightning Rain Container */}
          <div
            ref={lightningRainRef}
            className="absolute inset-0 pointer-events-none"
          />

          {/* Modal */}
          <motion.div
            className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-2 sm:mx-4 overflow-hidden"
            initial={{ scale: 0.5, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.5, opacity: 0, y: 50 }}
            transition={{
              type: "spring",
              damping: 15,
              stiffness: 300,
              delay: 0.2,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-[#191948] p-4 sm:p-6 text-white text-center relative overflow-hidden">
              {/* Animated background pattern */}
              <motion.div
                className="absolute inset-0 opacity-20"
                initial={{ x: -100 }}
                animate={{ x: 100 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              >
                <div className="h-full w-full bg-gradient-to-r from-transparent via-white to-transparent skew-x-12" />
              </motion.div>

              <motion.div
                className="relative z-10"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <div className="flex justify-center mb-2 sm:mb-3">
                  <BadgeCent
                    size={40}
                    className="sm:w-12 sm:h-12 drop-shadow-lg"
                  />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2 drop-shadow-lg text-shadow-glow">
                  Congratulations
                </h2>
              </motion.div>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
              {/* {rewards.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-center font-semibold text-gray-800 dark:text-gray-200">
                    Rewards Earned
                  </h3>
                  <ul className="max-h-40 overflow-y-auto divide-y divide-gray-200 dark:divide-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
                    {rewards.map((r, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between px-3 py-2 text-sm"
                      >
                        <span className="text-gray-700 dark:text-gray-300">
                          {r.reason}
                        </span>
                        <span className="flex items-center gap-1 font-semibold text-green-600 dark:text-green-400">
                          <BadgeCent size={14} /> {r.amount}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                    Total Earned: {totalEarned} coins
                  </p>
                </div>
              )} */}
              {/* Rewards List */}
              {/* <div className="space-y-3">
                <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-center mb-4">
                  🎉 Rewards Earned
                </h3>

                {rewards.map((reward, index) => (
                  <motion.div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                  >
                    <div className="flex items-center gap-3">
                      {getRewardIcon(reward.type)}
                      <span className="text-gray-700 dark:text-gray-300">
                        {reward.reason}
                      </span>
                    </div>
                    <motion.div
                      className="flex items-center gap-1 font-semibold text-green-600"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        delay: 0.6 + index * 0.1,
                        type: "spring",
                        stiffness: 300,
                      }}
                    >
                      <BadgeCent size={16} />+{reward.amount}
                    </motion.div>
                  </motion.div>
                ))}
              </div> */}

              {/* Game Statistics Scorecard */}
              {gameStats && (
                <motion.div
                  className="space-y-3"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.8 }}
                >
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-center mb-3 sm:mb-4 text-base sm:text-lg drop-shadow-sm">
                  </h3>

                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    {/* Level */}
                    {/* <motion.div
                      className="p-2 sm:p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700"
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.9 }}
                    >
                      <div className="flex items-center gap-1 sm:gap-2 mb-1">
                        <Trophy
                          size={14}
                          className="sm:w-4 sm:h-4 text-blue-600"
                        />
                        <span className="text-xs sm:text-sm font-medium text-blue-700 dark:text-blue-300 drop-shadow-sm">
                          Level
                        </span>
                      </div>
                      <p className="text-lg sm:text-xl font-bold text-blue-800 dark:text-blue-200 drop-shadow-sm">
                        {gameStats.finalLevel}
                      </p>
                    </motion.div> */}

                    {/* Average Accuracy */}
                    {/* <motion.div
                      className="p-2 sm:p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700"
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 1.0 }}
                    >
                      <div className="flex items-center gap-1 sm:gap-2 mb-1">
                        <Crosshair
                          size={14}
                          className="sm:w-4 sm:h-4 text-green-600"
                        />
                        <span className="text-xs sm:text-sm font-medium text-green-700 dark:text-green-300 drop-shadow-sm">
                          Average Accuracy
                        </span>
                      </div>
                      <p className="text-lg sm:text-xl font-bold text-green-800 dark:text-green-200 drop-shadow-sm">
                        {gameStats.averageAccuracy.toFixed(1)}%
                      </p>
                    </motion.div> */}

                    {/* Perfect Hits */}
                    {/* <motion.div
                      className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700"
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 1.1 }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Star size={16} className="text-yellow-600" />
                        <span className="text-xs font-medium text-yellow-700 dark:text-yellow-300">
                          Perfect Hits
                        </span>
                      </div>
                      <p className="text-lg font-bold text-yellow-800 dark:text-yellow-200">
                        {gameStats.perfectPlacements}
                      </p>
                    </motion.div> */}
                  </div>

                  {/* Avg Reaction Time - Full Width */}
                  {/* <motion.div
                    className="p-2 sm:p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-700"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 1.2 }}
                  >
                    <div className="flex items-center justify-center gap-1 sm:gap-2 mb-1">
                      <Zap
                        size={14}
                        className="sm:w-4 sm:h-4 text-indigo-600"
                      />
                      <span className="text-xs sm:text-sm font-medium text-indigo-700 dark:text-indigo-300 drop-shadow-sm">
                        Avg Reaction Time
                      </span>
                    </div>
                    <p className="text-lg sm:text-xl font-bold text-indigo-800 dark:text-indigo-200 text-center drop-shadow-sm">
                      {gameStats.averageReactionTime.toFixed(2)}s
                    </p>
                  </motion.div> */}
                </motion.div>
              )}

              {/* Total Score */}
              <motion.div
                ref={totalRef}
                className="p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border-2 border-blue-200 dark:border-blue-700"
              >
                <div className="text-center">
                  <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 mb-2 drop-shadow-sm">
                    Game Score
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    {gameStats && (
                      <>
                        <span className="text-2xl sm:text-3xl font-bold text-blue-600 drop-shadow-md">
                          {rewards
                            .find((r) => r.type === "score")
                            ?.amount?.toFixed(2) || "0.00"}{" "}
                          points
                        </span>
                      </>
                    )}
                  </div>
                  {/* <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 mt-2 drop-shadow-sm">
                    Total coins: {totalCoins}
                  </p> */}
                </div>
              </motion.div>

              {/* Close Button */}
              <motion.button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  window.location.href = "/";
                }}
                className="
                  w-full py-3 sm:py-4 px-4 rounded-xl
                  bg-[#191948]
                  text-white font-semibold shadow-lg hover:shadow-xl
                  transition-all duration-200 text-base sm:text-lg drop-shadow-md
                "
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Awesome! Go to Dashboard
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
