"use client";

import { AnimatePresence, motion } from "framer-motion";
import { gsap } from "gsap";
import { Minus, Plus, CircleStar, BadgeCent } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

interface CoinTransaction {
  id: string;
  amount: number;
  type: "earn" | "spend";
  reason: string;
  timestamp: number;
}

interface CurrencyDisplayProps {
  className?: string;
  showTransactions?: boolean;
  size?: "sm" | "md" | "lg";
}

interface UserData {
  coins: number;
  points: number;
}

export function CurrencyDisplay({
  className = "",
  showTransactions = true,
  size = "md",
}: CurrencyDisplayProps) {
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  const [displayCoins, setDisplayCoins] = useState(0);
  const [coins, setCoins] = useState(0);
  const [points, setPoints] = useState(0);
  const coinRef = useRef<HTMLDivElement>(null);
  const previousCoins = useRef(0);

  const sizeConfig = {
    sm: { container: "px-3 py-1.5 text-sm", icon: 20, text: "text-sm font-medium" },
    md: { container: "px-4 py-2 text-base", icon: 24, text: "text-base font-semibold" },
    lg: { container: "px-6 py-3 text-lg", icon: 28, text: "text-lg font-bold" },
  };
  const config = sizeConfig[size];

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/user/id");
        const data = await res.json();

        if (data.success && data.user) {
          setCoins(data.user.wallet);
          setPoints(data.user.score);
          setDisplayCoins(data.user.wallet);
          previousCoins.current = data.user.wallet;
        }
      } catch (err) {
        console.error("Failed to fetch user data:", err);
      }
    }

    fetchUser();
  }, []);

  useEffect(() => {
    const difference = coins - previousCoins.current;

    if (difference !== 0) {
      if (showTransactions) {
        const transaction: CoinTransaction = {
          id: Math.random().toString(36),
          amount: Math.abs(difference),
          type: difference > 0 ? "earn" : "spend",
          reason: difference > 0 ? "Earned" : "Spent",
          timestamp: Date.now(),
        };

        setTransactions((prev) => [...prev, transaction]);

        setTimeout(() => {
          setTransactions((prev) => prev.filter((t) => t.id !== transaction.id));
        }, 2000);
      }

      if (coinRef.current) {
        gsap.to(coinRef.current, {
          scale: 1.2,
          rotation: difference > 0 ? 360 : -180,
          duration: 0.3,
          ease: "back.out(1.7)",
          yoyo: true,
          repeat: 1,
        });
      }

      const startValue = previousCoins.current;
      const endValue = coins;
      gsap.to({ value: startValue }, {
        value: endValue,
        duration: 0.5,
        ease: "power2.out",
        onUpdate() {
          setDisplayCoins(Math.round(this.targets()[0].value));
        },
      });

      previousCoins.current = coins;
    }
  }, [coins, showTransactions]);

  return (
    <div className={`relative ${className}`}>
      <motion.div
        className={`
          inline-flex items-center gap-2 
          bg-gradient-to-r from-yellow-400 to-yellow-500 
          text-yellow-900 rounded-full shadow-lg
          border-2 border-yellow-300
          ${config.container}
        `}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <motion.div ref={coinRef} className="flex items-center justify-center">
          <BadgeCent size={config.icon} className="drop-shadow-sm" />
        </motion.div>
        <span className={`${config.text} drop-shadow-sm tabular-nums`}>
          {displayCoins.toLocaleString()}
        </span>
      </motion.div>

      <AnimatePresence>
        {transactions.map((transaction, index) => (
          <motion.div
            key={transaction.id}
            className={`
              absolute left-1/2 top-0 z-50
              flex items-center gap-1 px-2 py-1
              rounded-md text-sm font-medium
              pointer-events-none
              ${transaction.type === "earn" ? "bg-green-500 text-white" : "bg-red-500 text-white"}
            `}
            style={{ transform: "translateX(-50%)", marginTop: `${index * -40}px` }}
            initial={{ y: 0, opacity: 0, scale: 0.8 }}
            animate={{ y: -60, opacity: 1, scale: 1 }}
            exit={{ y: -100, opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            {transaction.type === "earn" ? <Plus size={14} /> : <Minus size={14} />}
            {transaction.amount}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function HeaderCurrencyDisplay() {
  const [coins, setCoins] = useState(0);
  const [points, setPoints] = useState(0);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/user/id");
        const data = await res.json();
        if (data.success && data.user) {
          setCoins(data.user.wallet);
          setPoints(data.user.score);
        }
      } catch (err) {
        console.error(err);
      }
    }
    fetchUser();
  }, []);

  return (
    <div className="flex items-center gap-3">
      <div className="hidden sm:flex items-center gap-4">
        <div className="flex items-center gap-1 px-3 py-1.5 bg-yellow-100 dark:bg-yellow-900/30 rounded-full text-yellow-700 dark:text-yellow-300 font-semibold">
          <BadgeCent size={18} /> <span>{coins}</span>
        </div>
        <div className="flex items-center gap-1 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-full text-purple-700 dark:text-purple-300 font-semibold">
          <CircleStar size={18} /> <span>{points}</span>
        </div>
      </div>
      <div className="flex sm:hidden items-center gap-2">
        <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 rounded-full text-yellow-700 dark:text-yellow-300 text-sm font-semibold">
          <BadgeCent size={14} /> <span>{coins}</span>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 rounded-full text-purple-700 dark:text-purple-300 text-sm font-semibold">
          <CircleStar size={14} /> <span>{points}</span>
        </div>
      </div>
    </div>
  );
}
