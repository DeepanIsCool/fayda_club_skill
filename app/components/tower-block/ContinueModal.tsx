"use client";

import { AnimatePresence, motion } from "framer-motion";
import { gsap } from "gsap";
import { AlertCircle, Coins, Heart, X } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { useGameCurrency } from "../../contexts/CurrencyContext";

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
  const { coins, continueCost, canContinue, continueAttempt } =
    useGameCurrency();
  const [showGameOver, setShowGameOver] = useState(false);

  // Use centralized continue cost system
  const currentCost = continueCost;

  const modalRef = useRef<HTMLDivElement>(null);
  const pulseRef = useRef<HTMLDivElement>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setShowGameOver(false);

      // After 3 seconds, show the Game Over button
      const timer = setTimeout(() => {
        setShowGameOver(true);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Pulse animation for urgency
  useEffect(() => {
    const el = pulseRef.current; // capture ref for cleanup safety
    if (isOpen && el) {
      gsap.to(el, {
        scale: 1.05,
        duration: 0.8,
        ease: "power2.inOut",
        yoyo: true,
        repeat: -1,
      });
    }

    return () => {
      if (el) gsap.killTweensOf(el);
    };
  }, [isOpen]);

  const handleContinue = () => {
    if (canContinue) {
      onContinue();
    } else {
      toast.error("Not enough coins to continue!");
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
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => {
              e.stopPropagation();
              onGameOver();
            }}
          />

          {/* Modal */}
          <motion.div
            ref={modalRef}
            className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            onClick={(e) => e.stopPropagation()}
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
                  Don&apos;t give up! Continue your progress:
                </p>
              </div>

              {/* Single Continue Button */}
              <div className="space-y-4">
                <div className="text-center">
                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleContinue();
                    }}
                    className={`
                      inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-lg
                      transition-all duration-300 shadow-lg hover:shadow-xl
                      ${
                        canContinue
                          ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-green-200 dark:shadow-green-900/30"
                          : "bg-gradient-to-r from-red-500 to-red-600 text-white opacity-60 cursor-not-allowed shadow-red-200 dark:shadow-red-900/30"
                      }
                    `}
                    whileHover={canContinue ? { scale: 1.05, y: -2 } : {}}
                    whileTap={canContinue ? { scale: 0.95 } : {}}
                    disabled={!canContinue}
                  >
                    <Heart size={24} className="text-white" />
                    <span>Continue Playing</span>
                    <div className="flex items-center gap-1 bg-white/20 rounded-full px-3 py-1">
                      <Coins size={18} className="text-yellow-200" />
                      <span className="font-bold">{currentCost}</span>
                    </div>
                  </motion.button>
                </div>

                {/* Current coins display */}
                <div className="flex items-center justify-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <Coins size={20} className="text-yellow-600" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Your coins:{" "}
                    <span className="font-bold text-yellow-600">{coins}</span>
                  </span>
                </div>

                {/* Continue count info */}
                <div className="text-center text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                  {continueAttempt === 0 ? (
                    <span>💪 First continue attempt - Keep going!</span>
                  ) : (
                    <span>
                      🔥 Continue attempt #{continueAttempt + 1} - You&apos;ve
                      got this!
                    </span>
                  )}
                </div>
              </div>

              {/* Game Over Button (appears after 3 seconds) */}
              <AnimatePresence>
                {showGameOver && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <motion.button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onGameOver();
                      }}
                      className="
                        w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl
                        bg-gray-500 hover:bg-gray-600 text-white
                        font-semibold transition-all duration-200 shadow-lg hover:shadow-xl
                      "
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <X size={18} />
                      Game Over / Exit Game
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
