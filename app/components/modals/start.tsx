// app/components/modals/start.tsx
"use client";

import { getGameEntryCost } from "@/app/lib/gameConfig";
import { AnimatePresence, motion } from "framer-motion";
import { gsap } from "gsap";
import { BadgeCent, Play, Target } from "lucide-react";
import React, { useEffect, useRef } from "react";
import { useGameCurrency } from "../../contexts/CurrencyContext";

interface GameStartModalProps {
  isOpen: boolean;
  onStart: () => void;
  onCancel: () => void;
  gameKey: string; // <-- now dynamic
  gameTitle: string;
  gameDescription?: string;
  gameObjective?: string; // optional objective text
}

export function GameStartModal({
  isOpen,
  onStart,
  onCancel,
  gameKey,
  gameTitle,
  gameDescription,
  gameObjective,
}: GameStartModalProps) {
  const { coins, canStartGame } = useGameCurrency();
  const entryCost = getGameEntryCost(gameKey); // dynamic
  const canStart = canStartGame(gameKey, entryCost); // pass entryCost as second argument
  const startButtonRef = useRef<HTMLButtonElement>(null);

  const handleStart = () => {
    if (canStart) onStart();
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
            <div className="bg-[#191948] p-6 text-white text-center">
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
                    {gameObjective}
                  </p>
                </div>
                <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <BadgeCent
                    className="mx-auto mb-2 text-green-600"
                    size={24}
                  />
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Entry Cost
                  </p>
                  <p className="font-semibold text-gray-800 dark:text-gray-200">
                    {entryCost} Coin{entryCost > 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <motion.button
                  ref={startButtonRef}
                  onClick={handleStart}
                  disabled={!canStart}
                  className={`
                    flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl
                    font-semibold transition-all duration-200
                    ${
                      canStart
                        ? "bg-green-500 hover:bg-green-600 text-white shadow-lg hover:shadow-xl"
                        : "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                    }
                  `}
                  whileHover={canStart ? { scale: 1.02 } : {}}
                  whileTap={canStart ? { scale: 0.98 } : {}}
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
