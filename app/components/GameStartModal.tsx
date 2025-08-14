"use client";

import { AnimatePresence, motion } from "framer-motion";
import { gsap } from "gsap";
import { AlertTriangle, Coins, Play, Target, Trophy } from "lucide-react";
import React, { useEffect, useRef } from "react";
import { useGameCurrency } from "../contexts/CurrencyContext";

interface GameStartModalProps {
  isOpen: boolean;
  onStart: () => void;
  onCancel: () => void;
  gameTitle: string;
  gameDescription?: string;
}

export function GameStartModal({
  isOpen,
  onStart,
  onCancel,
  gameTitle,
  gameDescription = "Test your skills and build the highest tower!",
}: GameStartModalProps) {
  const { coins, canStartGame } = useGameCurrency();
  const coinIconRef = useRef<HTMLDivElement>(null);
  const startButtonRef = useRef<HTMLButtonElement>(null);

  // Coin bounce animation
  useEffect(() => {
    if (isOpen && coinIconRef.current) {
      gsap.to(coinIconRef.current, {
        y: -10,
        duration: 0.6,
        ease: "power2.inOut",
        yoyo: true,
        repeat: -1,
      });
    }

    return () => {
      gsap.killTweensOf(coinIconRef.current);
    };
  }, [isOpen]);

  // Button pulse when ready
  useEffect(() => {
    if (isOpen && canStartGame && startButtonRef.current) {
      gsap.to(startButtonRef.current, {
        scale: 1.05,
        duration: 1,
        ease: "power2.inOut",
        yoyo: true,
        repeat: -1,
      });
    }

    return () => {
      gsap.killTweensOf(startButtonRef.current);
    };
  }, [isOpen, canStartGame]);

  const handleStart = () => {
    if (canStartGame) {
      onStart();
    }
  };

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
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
          />

          {/* Modal */}
          <motion.div
            className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white text-center">
              <motion.div
                className="flex justify-center mb-3"
                initial={{ rotate: 0 }}
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <Trophy size={48} className="drop-shadow-lg" />
              </motion.div>
              <h2 className="text-2xl font-bold mb-2">{gameTitle}</h2>
              <p className="text-blue-100">{gameDescription}</p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Game Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Target className="mx-auto mb-2 text-blue-600" size={24} />
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Objective
                  </p>
                  <p className="font-semibold text-gray-800 dark:text-gray-200">
                    Build High
                  </p>
                </div>
                <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <Coins className="mx-auto mb-2 text-green-600" size={24} />
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Entry Cost
                  </p>
                  <p className="font-semibold text-gray-800 dark:text-gray-200">
                    1 Coin
                  </p>
                </div>
              </div>

              {/* Currency Status */}
              <div
                className={`
                p-4 rounded-xl border-2 transition-all duration-300
                ${
                  canStartGame
                    ? "border-green-300 bg-green-50 dark:bg-green-900/20"
                    : "border-red-300 bg-red-50 dark:bg-red-900/20"
                }
              `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div ref={coinIconRef}>
                      <Coins
                        size={24}
                        className={
                          canStartGame ? "text-green-600" : "text-red-600"
                        }
                      />
                    </div>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      Your Coins
                    </span>
                  </div>
                  <span
                    className={`text-2xl font-bold ${
                      canStartGame ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {coins}
                  </span>
                </div>

                {!canStartGame && (
                  <motion.div
                    className="mt-3 p-3 bg-red-100 dark:bg-red-900/30 rounded-lg"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                  >
                    <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                      <AlertTriangle size={18} />
                      <p className="text-sm">
                        You need at least 1 coin to play this game.
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Game Rules */}
              {/* <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
                  💡 Game Rules
                </h4>
                <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                  <li>• Entry cost: 1 coin</li>
                  <li>• Failed? Continue for extra coins (2x, 3x, 5x)</li>
                  <li>• Higher levels = better rewards</li>
                  <li>• Perfect blocks = bonus points</li>
                </ul>
              </div> */}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <motion.button
                  ref={startButtonRef}
                  onClick={handleStart}
                  disabled={!canStartGame}
                  className={`
                    flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl
                    font-semibold transition-all duration-200
                    ${
                      canStartGame
                        ? "bg-green-500 hover:bg-green-600 text-white shadow-lg hover:shadow-xl"
                        : "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                    }
                  `}
                  whileHover={canStartGame ? { scale: 1.02 } : {}}
                  whileTap={canStartGame ? { scale: 0.98 } : {}}
                >
                  <Play size={18} />
                  Start Game
                </motion.button>

                <motion.button
                  onClick={onCancel}
                  className="
                    px-6 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600
                    text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700
                    font-semibold transition-all duration-200
                  "
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cancel
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
