"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Pause, Play, RotateCcw, X } from "lucide-react";
import React from "react";

interface PauseModalProps {
  isOpen: boolean;
  onContinue: () => void;
  onRestart: () => void;
  onExit: () => void;
  gameTitle?: string;
}

export function PauseModal({
  isOpen,
  onContinue,
  onRestart,
  onExit,
  gameTitle = "Tower Block",
}: PauseModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center"
          >
            <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mx-auto mb-4">
              <Pause className="w-8 h-8 text-blue-600" />
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Game Paused
            </h2>
            <p className="text-gray-600 mb-6">{gameTitle} is paused</p>

            <div className="space-y-3">
              <motion.button
                onClick={onContinue}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold transition-all shadow-lg"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Play size={20} />
                Continue Game
              </motion.button>

              <motion.button
                onClick={onRestart}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold transition-all shadow-lg"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <RotateCcw size={20} />
                Restart Game
              </motion.button>

              <motion.button
                onClick={onExit}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gray-500 hover:bg-gray-600 text-white rounded-xl font-semibold transition-all shadow-lg"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <X size={20} />
                Exit Game
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
