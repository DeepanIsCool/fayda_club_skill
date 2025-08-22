"use client";

import { AnimatePresence, motion } from "framer-motion";
import { gsap } from "gsap";
import { BadgeCent } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { useGameCurrency } from "../../contexts/CurrencyContext";

interface ContinueModalProps {
  isOpen: boolean;
  onContinue: () => void;
  onGameOver: () => void;
  currentLevel: number;
  gameKey: string;
  gameTitle: string;
  continueCost: number;
  continueLabel: string;
  exitLabel: string;
  showExitAfterMs: number; // optional delay to show exit button
}

export function ContinueModal({
  isOpen,
  onContinue,
  onGameOver,
  currentLevel,
  gameKey,
  gameTitle = "Game",
  continueCost,
  continueLabel = "Continue Playing",
  exitLabel = "Exit",
  showExitAfterMs = 1000,
}: ContinueModalProps) {
  const { coins, canContinue } = useGameCurrency();
  const [showExit, setShowExit] = useState(false);

<<<<<<< Updated upstream:app/components/modals/continue.tsx
  const currentCost = continueCost ?? 0;
=======
  // Use centralized continue cost system
  const currentCost = continueCost;
>>>>>>> Stashed changes:app/components/tower-block/ContinueModal.tsx

  const modalRef = useRef<HTMLDivElement>(null);
  const pulseRef = useRef<HTMLDivElement>(null);

  // Determine if user can continue
  const isAbleToContinue = canContinue ?? coins >= currentCost;

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setShowExit(false);
      const timer = setTimeout(() => setShowExit(true), showExitAfterMs);
      return () => clearTimeout(timer);
    }
  }, [isOpen, showExitAfterMs]);

  // Pulse animation for urgency
  useEffect(() => {
    const el = pulseRef.current;
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
    if (isAbleToContinue) {
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
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
          >
            {/* Header with pulse */}
            <div
              ref={pulseRef}
              className="bg-[#191948] p-6 text-white text-center"
            >
              <h2 className="text-2xl font-bold mb-2">{gameTitle}</h2>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Continue Button */}
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
                      isAbleToContinue
                        ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-green-200 dark:shadow-green-900/30"
                        : "bg-gradient-to-r from-red-500 to-red-600 text-white opacity-60 cursor-not-allowed shadow-red-200 dark:shadow-red-900/30"
                    }
                  `}
                  whileHover={isAbleToContinue ? { scale: 1.05, y: -2 } : {}}
                  whileTap={isAbleToContinue ? { scale: 0.95 } : {}}
                  disabled={!isAbleToContinue}
                >
                  <span>{continueLabel}</span>
                  <div className="flex items-center gap-1 bg-white/20 rounded-full px-3 py-1">
                    <BadgeCent size={18} className="text-yellow-200" />
                    <span className="font-bold">{currentCost}</span>
                  </div>
                </motion.button>
              </div>

              {/* Exit Button */}
              <AnimatePresence>
                {showExit && (
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
                      {exitLabel}
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