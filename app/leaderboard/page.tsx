"use client";
import useTranslation from "../lib/useTranslation";

import { motion } from "framer-motion";
import {
  Crown,
  Gamepad2,
  LayoutGrid,
  Loader2,
  Medal,
  ShieldAlert,
  Trophy,
  User,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";

// Interfaces for data structures
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

interface UserData {
  id: string;
  name: string;
  email: string;
  wallet: number;
  score: number;
  histories: GameSession[];
  imageUrl?: string; // Add imageUrl for avatars
}

interface LeaderboardEntry {
  user: UserData;
  bestLevel: number;
  bestScore: number;
  totalGames: number;
  averageAccuracy: number;
  rank: number;
}

export default function LeaderboardPage() {
  const t = useTranslation();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/users");
      const data = await response.json();

      if (data.success && data.users) {
        calculateLeaderboard(data.users);
      } else {
        setError("Failed to fetch leaderboard data.");
      }
    } catch (err) {
      setError("An error occurred while fetching data.");
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const calculateLeaderboard = (usersData: UserData[]) => {
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
          return b.bestLevel - a.bestLevel;
        }
        return b.bestScore - a.bestScore;
      })
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }));

    setLeaderboard(entries);
  };

  const topThree = leaderboard.slice(0, 3);
  const restOfLeaderboard = leaderboard.slice(3);

  // Loading State Component
  const LoadingState = () => (
    <div className="flex flex-1 items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-muted-foreground">Loading Leaderboard...</p>
      </div>
    </div>
  );

  // Error State Component
  const ErrorState = () => (
    <div className="flex flex-1 items-center justify-center">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
            <ShieldAlert className="h-6 w-6 text-red-500" />
          </div>
          <CardTitle className="mt-4">Something went wrong</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={fetchUsers}>Try Again</Button>
        </CardContent>
      </Card>
    </div>
  );

  // Podium Card Component
  const PodiumCard = ({ entry, rank }: { entry: LeaderboardEntry, rank: number }) => {
    const rankColors = {
      1: "border-yellow-400 bg-yellow-400/10",
      2: "border-gray-400 bg-gray-400/10",
      3: "border-amber-600 bg-amber-600/10",
    };
    const rankIcon = {
      1: <Crown className="h-22 w-8 text-yellow-400" />,
      2: <Crown className="h-22 w-8 text-gray-400" />,
      3: <Crown className="h-22 w-8 text-amber-600" />,
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: rank * 0.1 }}
        className={`relative flex flex-col items-center rounded-xl border-2 p-6 ${rankColors[rank as keyof typeof rankColors]}`}
      >
        <div className="absolute -top-5">{rankIcon[rank as keyof typeof rankIcon]}</div>
        <Avatar className="h-20 w-20 mt-6 mb-4">
          <AvatarImage src={entry.user.imageUrl} />
          <AvatarFallback>
            <User className="h-10 w-10" />
          </AvatarFallback>
        </Avatar>
        <h3 className="text-xl font-bold">{entry.user.name}</h3>
        <p className="text-sm text-muted-foreground">Rank #{entry.rank}</p>
        <div className="mt-4 text-center">
          <p className="text-2xl font-bold text-primary">{entry.bestScore.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Level {entry.bestLevel}</p>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="flex min-h-screen w-full bg-gray-100 dark:bg-gray-950">
      {/* Sidebar Navigation */}
      <aside className="hidden w-64 flex-col border-r bg-white p-4 dark:bg-black dark:border-gray-800 md:flex">
        <div className="mb-8 flex items-center gap-2">
          <Gamepad2 className="h-8 w-8 text-blue-500" />
          <h1 className="text-xl font-bold">{t.title}</h1>
        </div>
        <nav className="flex flex-col gap-2">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-600 dark:text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-50"
          >
            <LayoutGrid className="h-5 w-5" />
            {t.games}
          </Link>
          <Link
            href="/leaderboard"
            className="flex items-center gap-3 rounded-lg bg-blue-100 dark:bg-gray-800 px-3 py-2 text-blue-600 dark:text-gray-50 font-semibold"
          >
            <Trophy className="h-5 w-5" />
            {t.leaderboard}
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center border-b bg-white px-6 dark:bg-black dark:border-gray-800">
          <h2 className="text-xl font-semibold">{t.leaderboard}</h2>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState />
          ) : (
            <div className="mx-auto max-w-5xl">
              {/* Top 3 Podium */}
              <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
                {topThree[1] && <PodiumCard entry={topThree[1]} rank={2} />}
                {topThree[0] && <PodiumCard entry={topThree[0]} rank={1} />}
                {topThree[2] && <PodiumCard entry={topThree[2]} rank={3} />}
              </div>

              {/* Rest of the Leaderboard */}
              <Card>
                <CardHeader>
                  <CardTitle>{t.allPlayers || "All Players"}</CardTitle>
                  <CardDescription>
                    {t.fullRanking || "Full ranking of all players based on their performance."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">{t.rank || "Rank"}</TableHead>
                        <TableHead>{t.player || "Player"}</TableHead>
                        <TableHead className="text-right">{t.bestScore || "Best Score"}</TableHead>
                        <TableHead className="text-right">{t.highestLevel || "Highest Level"}</TableHead>
                        <TableHead className="text-right">{t.gamesPlayed || "Games Played"}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {restOfLeaderboard.map((entry) => (
                        <TableRow key={entry.user.id}>
                          <TableCell className="font-bold">#{entry.rank}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarImage src={entry.user.imageUrl} />
                                <AvatarFallback>
                                  <User className="h-5 w-5" />
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{entry.user.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {entry.user.email}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-primary">
                            {entry.bestScore.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            {entry.bestLevel}
                          </TableCell>
                          <TableCell className="text-right">
                            {entry.totalGames}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
