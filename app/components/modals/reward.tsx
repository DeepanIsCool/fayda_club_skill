"use client";

import { AnimatePresence, motion } from "framer-motion";
import { BadgeCent } from "lucide-react";
import React from "react";

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
              {/* Game Statistics Scorecard */}
              {gameStats && (
                <motion.div
                  className="space-y-3"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.8 }}
                >
                  {/* Your stats display here */}
                </motion.div>
              )}

              {/* Total Score */}
              <div className="p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border-2 border-blue-200 dark:border-blue-700">
                <div className="text-center">
                  <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 mb-2 drop-shadow-sm">
                    Game Score
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    {gameStats && (
                      <span className="text-2xl sm:text-3xl font-bold text-blue-600 drop-shadow-md">
                        {rewards
                          .find((r) => r.type === "score")
                          ?.amount?.toFixed(2) || "0.00"}{" "}
                        points
                      </span>
                    )}
                  </div>
                </div>
              </div>

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
