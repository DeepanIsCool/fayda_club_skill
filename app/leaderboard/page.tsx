"use client";

import { AnimatePresence, motion } from "framer-motion";
import Lottie from "lottie-react";
import {
  Clock,
  Crown,
  Medal,
  Star,
  Target,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";

interface GameSession {
  id: string;
  session: {
    finalLevel: number;
    totalScore: number;
    gameType: string;
    timestamp: string;
    gameDuration: number;
    averageAccuracy: number;
  };
  game: {
    name: string;
  };
}

interface User {
  id: string;
  name: string;
  email: string;
  wallet: number;
  score: number;
  histories: GameSession[];
}

interface LeaderboardEntry {
  user: User;
  bestLevel: number;
  bestScore: number;
  totalGames: number;
  averageAccuracy: number;
  rank: number;
}

// Lottie animation data for trophy (simple crown animation)
const crownAnimation = {
  v: "5.5.7",
  fr: 60,
  ip: 0,
  op: 120,
  w: 512,
  h: 512,
  nm: "Crown",
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: "Crown",
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: {
          a: 1,
          k: [
            {
              i: { x: [0.667], y: [1] },
              o: { x: [0.333], y: [0] },
              t: 0,
              s: [-5],
            },
            {
              i: { x: [0.667], y: [1] },
              o: { x: [0.333], y: [0] },
              t: 60,
              s: [5],
            },
            { t: 120, s: [-5] },
          ],
        },
        p: { a: 0, k: [256, 256, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: {
          a: 1,
          k: [
            {
              i: { x: [0.667, 0.667, 0.667], y: [1, 1, 1] },
              o: { x: [0.333, 0.333, 0.333], y: [0, 0, 0] },
              t: 0,
              s: [95, 95, 100],
            },
            {
              i: { x: [0.667, 0.667, 0.667], y: [1, 1, 1] },
              o: { x: [0.333, 0.333, 0.333], y: [0, 0, 0] },
              t: 60,
              s: [105, 105, 100],
            },
            { t: 120, s: [95, 95, 100] },
          ],
        },
      },
      ao: 0,
      shapes: [
        {
          ty: "gr",
          it: [
            {
              ind: 0,
              ty: "sh",
              ks: {
                a: 0,
                k: {
                  i: [
                    [0, 0],
                    [0, 0],
                    [0, 0],
                    [0, 0],
                    [0, 0],
                    [0, 0],
                    [0, 0],
                  ],
                  o: [
                    [0, 0],
                    [0, 0],
                    [0, 0],
                    [0, 0],
                    [0, 0],
                    [0, 0],
                    [0, 0],
                  ],
                  v: [
                    [-80, 40],
                    [-40, -40],
                    [0, -20],
                    [40, -40],
                    [80, 40],
                    [0, 20],
                    [-80, 40],
                  ],
                  c: true,
                },
              },
            },
            {
              ty: "fl",
              c: { a: 0, k: [1, 0.8, 0, 1] },
              o: { a: 0, k: 100 },
            },
          ],
        },
      ],
      ip: 0,
      op: 300,
      st: 0,
    },
  ],
};

export default function LeaderboardPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/users");
      const data = await response.json();

      if (data.success && data.users) {
        setUsers(data.users);
        calculateLeaderboard(data.users);
      } else {
        setError("Failed to fetch users");
      }
    } catch (err) {
      setError("Error fetching data");
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const calculateLeaderboard = (usersData: User[]) => {
    const entries: LeaderboardEntry[] = usersData
      .map((user) => {
        let bestLevel = 0;
        let bestScore = 0;
        let totalAccuracy = 0;
        let gameCount = 0;

        user.histories.forEach((history) => {
          if (history.session.finalLevel > bestLevel) {
            bestLevel = history.session.finalLevel;
            bestScore = history.session.totalScore;
          } else if (
            history.session.finalLevel === bestLevel &&
            history.session.totalScore > bestScore
          ) {
            bestScore = history.session.totalScore;
          }

          totalAccuracy += history.session.averageAccuracy || 0;
          gameCount++;
        });

        return {
          user,
          bestLevel,
          bestScore,
          totalGames: user.histories.length,
          averageAccuracy: gameCount > 0 ? totalAccuracy / gameCount : 0,
          rank: 0,
        };
      })
      .sort((a, b) => {
        if (a.bestLevel !== b.bestLevel) {
          return b.bestLevel - a.bestLevel; // Higher level first
        }
        return b.bestScore - a.bestScore; // Higher score first if same level
      })
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }));

    setLeaderboard(entries);
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-8 h-8 text-yellow-500" />;
      case 2:
        return <Medal className="w-8 h-8 text-gray-400" />;
      case 3:
        return <Medal className="w-8 h-8 text-amber-600" />;
      default:
        return <Trophy className="w-6 h-6 text-gray-600" />;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "from-yellow-400 to-yellow-600";
      case 2:
        return "from-gray-300 to-gray-500";
      case 3:
        return "from-amber-500 to-amber-700";
      default:
        return "from-blue-400 to-blue-600";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 mx-auto mb-4"
          >
            <Trophy className="w-full h-full text-yellow-500" />
          </motion.div>
          <motion.h2
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-2xl font-bold text-white"
          >
            Loading Leaderboard...
          </motion.h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-900 via-purple-900 to-indigo-900">
        <div className="text-center">
          <div className="text-6xl mb-4">💥</div>
          <h2 className="text-2xl font-bold text-white mb-2">Oops!</h2>
          <p className="text-red-300">{error}</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={fetchUsers}
            className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <div className="relative inline-block">
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="w-24 h-24 mx-auto mb-4"
            >
              <div className="w-full h-full bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-lg">
                <Lottie
                  animationData={crownAnimation}
                  className="w-12 h-12"
                  loop={true}
                />
              </div>
            </motion.div>
            <h1 className="text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500 mb-2">
              LEADERBOARD
            </h1>
            <div className="flex items-center justify-center gap-2 text-white/70">
              <Star className="w-5 h-5" />
              <span className="text-lg">Tower Block Champions</span>
              <Star className="w-5 h-5" />
            </div>
          </div>
        </motion.div>

        {/* Stats Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
        >
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 text-center border border-white/20">
            <TrendingUp className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">
              {leaderboard.length}
            </div>
            <div className="text-white/70">Total Players</div>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 text-center border border-white/20">
            <Zap className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">
              {Math.max(...leaderboard.map((l) => l.bestLevel), 0)}
            </div>
            <div className="text-white/70">Highest Level</div>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 text-center border border-white/20">
            <Target className="w-8 h-8 text-purple-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">
              {Math.max(
                ...leaderboard.map((l) => l.bestScore),
                0
              ).toLocaleString()}
            </div>
            <div className="text-white/70">Best Score</div>
          </div>
        </motion.div>

        {/* Leaderboard */}
        <div className="space-y-4">
          <AnimatePresence>
            {leaderboard.map((entry, index) => (
              <motion.div
                key={entry.user.id}
                initial={{ opacity: 0, x: -100 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`
                  relative overflow-hidden rounded-2xl border border-white/20 backdrop-blur-lg
                  ${
                    entry.rank <= 3
                      ? `bg-gradient-to-r ${getRankColor(entry.rank)}/20`
                      : "bg-white/10"
                  }
                  hover:bg-white/20 transition-all duration-300 group
                `}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Rank */}
                      <motion.div
                        whileHover={{ scale: 1.2, rotate: 10 }}
                        className={`
                          w-16 h-16 rounded-full flex items-center justify-center font-bold text-xl
                          bg-gradient-to-br ${getRankColor(entry.rank)}
                          ${entry.rank <= 3 ? "shadow-lg" : ""}
                        `}
                      >
                        {entry.rank <= 3 ? (
                          getRankIcon(entry.rank)
                        ) : (
                          <span className="text-white">#{entry.rank}</span>
                        )}
                      </motion.div>

                      {/* Player Info */}
                      <div>
                        <h3 className="text-2xl font-bold text-white group-hover:text-yellow-300 transition-colors">
                          {entry.user.name}
                        </h3>
                        <div className="flex items-center gap-4 text-white/70 text-sm">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {entry.totalGames} games
                          </span>
                          <span className="flex items-center gap-1">
                            <Target className="w-4 h-4" />
                            {entry.averageAccuracy.toFixed(1)}% accuracy
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="text-right">
                      <div className="text-3xl font-bold text-white mb-1">
                        Level {entry.bestLevel}
                      </div>
                      <div className="text-lg text-yellow-300 font-semibold">
                        {entry.bestScore.toLocaleString()} pts
                      </div>
                      <div className="text-sm text-white/70">
                        💰 {entry.user.wallet} coins
                      </div>
                    </div>
                  </div>
                </div>

                {/* Animated border for top 3 */}
                {entry.rank <= 3 && (
                  <motion.div
                    className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${getRankColor(
                      entry.rank
                    )} opacity-30`}
                    animate={{
                      background: [
                        `linear-gradient(0deg, var(--tw-gradient-from), var(--tw-gradient-to))`,
                        `linear-gradient(360deg, var(--tw-gradient-from), var(--tw-gradient-to))`,
                      ],
                    }}
                    transition={{ duration: 3, repeat: Infinity }}
                  />
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {leaderboard.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="text-6xl mb-4">🎮</div>
            <h3 className="text-2xl font-bold text-white mb-2">
              No Games Played Yet
            </h3>
            <p className="text-white/70">
              Be the first to climb the leaderboard!
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
