"use client";

import { AnimatePresence, motion } from "framer-motion";
import { gsap } from "gsap";
import { Coins, Gift, Star, Trophy, Zap } from "lucide-react";
import React, { useEffect, useRef } from "react";

interface Reward {
  amount: number;
  reason: string;
  type: "level" | "perfect" | "streak" | "bonus" | "achievement";
}

interface RewardModalProps {
  isOpen: boolean;
  onClose: () => void;
  rewards: Reward[];
  totalCoins: number;
  gameLevel?: number;
}

export function RewardModal({
  isOpen,
  onClose,
  rewards,
  totalCoins,
  gameLevel = 0,
}: RewardModalProps) {
  const coinRainRef = useRef<HTMLDivElement>(null);
  const totalRef = useRef<HTMLDivElement>(null);

  // Coin rain animation
  useEffect(() => {
    if (isOpen && coinRainRef.current) {
      const container = coinRainRef.current;

      // Create falling coins
      for (let i = 0; i < 20; i++) {
        const coin = document.createElement("div");
        coin.className =
          "absolute text-yellow-500 text-2xl pointer-events-none";
        coin.innerHTML = "🪙";
        coin.style.left = Math.random() * 100 + "%";
        coin.style.top = "-20px";
        container.appendChild(coin);

        gsap.to(coin, {
          y: window.innerHeight + 100,
          rotation: 720,
          duration: 2 + Math.random() * 2,
          ease: "power2.in",
          delay: i * 0.1,
          onComplete: () => {
            container.removeChild(coin);
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

  const getRewardIcon = (type: string) => {
    switch (type) {
      case "level":
        return <Trophy className="text-yellow-500" size={20} />;
      case "perfect":
        return <Star className="text-blue-500" size={20} />;
      case "streak":
        return <Zap className="text-orange-500" size={20} />;
      case "bonus":
        return <Gift className="text-purple-500" size={20} />;
      default:
        return <Coins className="text-green-500" size={20} />;
    }
  };

  const getTotalEarned = () => {
    return rewards.reduce((sum, reward) => sum + reward.amount, 0);
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
            onClick={onClose}
          />

          {/* Coin Rain Container */}
          <div
            ref={coinRainRef}
            className="absolute inset-0 pointer-events-none"
          />

          {/* Modal */}
          <motion.div
            className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
            initial={{ scale: 0.5, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.5, opacity: 0, y: 50 }}
            transition={{
              type: "spring",
              damping: 15,
              stiffness: 300,
              delay: 0.2,
            }}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-orange-500 p-6 text-white text-center relative overflow-hidden">
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
                <div className="flex justify-center mb-3">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  >
                    <Coins size={48} className="drop-shadow-lg" />
                  </motion.div>
                </div>
                <h2 className="text-2xl font-bold mb-2">Congratulations!</h2>
                <p className="text-yellow-100">Level {gameLevel} Complete</p>
              </motion.div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Rewards List */}
              <div className="space-y-3">
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
                      <Coins size={16} />+{reward.amount}
                    </motion.div>
                  </motion.div>
                ))}
              </div>

              {/* Total Earned */}
              <motion.div
                ref={totalRef}
                className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border-2 border-green-200 dark:border-green-700"
              >
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Total Earned This Game
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <Coins size={24} className="text-yellow-500" />
                    <span className="text-2xl font-bold text-green-600">
                      +{getTotalEarned()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    Total coins: {totalCoins}
                  </p>
                </div>
              </motion.div>

              {/* Close Button */}
              <motion.button
                onClick={onClose}
                className="
                  w-full py-3 px-4 rounded-xl
                  bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700
                  text-white font-semibold shadow-lg hover:shadow-xl
                  transition-all duration-200
                "
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Awesome! Continue Playing
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
