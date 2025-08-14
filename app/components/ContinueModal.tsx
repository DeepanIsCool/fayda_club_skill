"use client";

import { AnimatePresence, motion } from "framer-motion";
import { gsap } from "gsap";
import { AlertCircle, Coins, Heart, RotateCcw, X } from "lucide-react";
import React, { useEffect, useRef } from "react";
import { useGameCurrency } from "../contexts/CurrencyContext";

interface ContinueModalProps {
  isOpen: boolean;
  onContinue: () => void;
  onGameOver: () => void;
  currentLevel: number;
  gameTitle?: string;
}

export function ContinueModal({
  isOpen,
  onContinue,
  onGameOver,
  currentLevel,
  gameTitle = "Tower Block",
}: ContinueModalProps) {
  const {
    coins,
    canContinue,
    continueCost,
    continueAttempt,
    maxContinues,
    continue: continuePay,
  } = useGameCurrency();

  const modalRef = useRef<HTMLDivElement>(null);
  const pulseRef = useRef<HTMLDivElement>(null);
  const coinRef = useRef<HTMLDivElement>(null);

  // Pulse animation for urgency
  useEffect(() => {
    if (isOpen && pulseRef.current) {
      gsap.to(pulseRef.current, {
        scale: 1.05,
        duration: 0.8,
        ease: "power2.inOut",
        yoyo: true,
        repeat: -1,
      });
    }

    return () => {
      gsap.killTweensOf(pulseRef.current);
    };
  }, [isOpen]);

  // Coin shake animation when insufficient funds
  useEffect(() => {
    if (isOpen && !canContinue && coinRef.current) {
      gsap.to(coinRef.current, {
        x: "-=10",
        duration: 0.1,
        ease: "power2.inOut",
        repeat: 4,
        yoyo: true,
      });
    }
  }, [isOpen, canContinue]);

  const handleContinue = () => {
    if (canContinue && continuePay()) {
      // Success animation
      if (modalRef.current) {
        gsap.to(modalRef.current, {
          scale: 1.1,
          duration: 0.2,
          ease: "back.out(1.7)",
          yoyo: true,
          repeat: 1,
          onComplete: onContinue,
        });
      } else {
        onContinue();
      }
    }
  };

  const getEncouragementText = () => {
    if (continueAttempt === 0) {
      return "Don't give up! You were doing great!";
    } else if (continueAttempt === 1) {
      return "You're so close to your best score!";
    } else {
      return "This could be your breakthrough moment!";
    }
  };

  const getCostMultiplierText = () => {
    const multipliers = ["2x", "3x", "5x"];
    return multipliers[continueAttempt] || "5x";
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
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onGameOver}
          />

          {/* Modal */}
          <motion.div
            ref={modalRef}
            className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
          >
            {/* Header with pulse effect */}
            <div
              ref={pulseRef}
              className="bg-gradient-to-r from-orange-500 to-red-500 p-6 text-white text-center"
            >
              <div className="flex justify-center mb-3">
                <AlertCircle size={48} className="drop-shadow-lg" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Game Over!</h2>
              <p className="text-orange-100">
                Level {currentLevel} • {gameTitle}
              </p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Encouragement */}
              <div className="text-center">
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  {getEncouragementText()}
                </p>
              </div>

              {/* Continue Option */}
              <div className="space-y-4">
                <div
                  ref={coinRef}
                  className={`
                    p-4 rounded-xl border-2 transition-all duration-300
                    ${
                      canContinue
                        ? "border-green-300 bg-green-50 dark:bg-green-900/20"
                        : "border-red-300 bg-red-50 dark:bg-red-900/20"
                    }
                  `}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Heart
                        size={20}
                        className={
                          canContinue ? "text-green-600" : "text-red-600"
                        }
                      />
                      <span className="font-semibold text-gray-800 dark:text-gray-200">
                        Continue Playing
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Coins size={16} className="text-yellow-500" />
                      <span
                        className={`font-bold ${
                          canContinue ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {continueCost}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      Cost multiplier: {getCostMultiplierText()}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">
                      Attempt {continueAttempt + 1}/{maxContinues}
                    </span>
                  </div>

                  {!canContinue && (
                    <motion.div
                      className="mt-3 p-2 bg-red-100 dark:bg-red-900/30 rounded-lg"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                    >
                      <p className="text-red-700 dark:text-red-300 text-sm flex items-center gap-2">
                        <AlertCircle size={16} />
                        Insufficient coins! You have {coins} coins.
                      </p>
                    </motion.div>
                  )}
                </div>

                {/* Current coins display */}
                <div className="flex items-center justify-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <Coins size={20} className="text-yellow-600" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Your coins:{" "}
                    <span className="font-bold text-yellow-600">{coins}</span>
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <motion.button
                  onClick={handleContinue}
                  disabled={!canContinue}
                  className={`
                    flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl
                    font-semibold transition-all duration-200
                    ${
                      canContinue
                        ? "bg-green-500 hover:bg-green-600 text-white shadow-lg hover:shadow-xl"
                        : "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                    }
                  `}
                  whileHover={canContinue ? { scale: 1.02 } : {}}
                  whileTap={canContinue ? { scale: 0.98 } : {}}
                >
                  <RotateCcw size={18} />
                  Continue
                </motion.button>

                <motion.button
                  onClick={onGameOver}
                  className="
                    flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl
                    bg-gray-500 hover:bg-gray-600 text-white
                    font-semibold transition-all duration-200 shadow-lg hover:shadow-xl
                  "
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <X size={18} />
                  End Game
                </motion.button>
              </div>

              {/* Progress indicator */}
              <div className="flex justify-center gap-2">
                {Array.from({ length: maxContinues }, (_, i) => (
                  <div
                    key={i}
                    className={`
                      w-2 h-2 rounded-full transition-all duration-300
                      ${
                        i <= continueAttempt
                          ? "bg-orange-500"
                          : "bg-gray-300 dark:bg-gray-600"
                      }
                    `}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
