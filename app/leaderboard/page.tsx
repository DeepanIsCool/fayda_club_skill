// app/leaderboard/page.tsx
"use client";

import { useEffect, useState, JSX } from "react";
import { motion } from "framer-motion";
import { useAuth, useUser } from "@clerk/nextjs";
import { Crown, ShieldAlert, Trophy, User as UserIcon } from "lucide-react";

import SiteChrome from "../components/layout/SiteChrome";

import { Avatar, AvatarFallback, AvatarImage } from "@/ui/avatar";
import { Button } from "@/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/ui/table";

/* ----------------------------- Types ------------------------------ */

interface SessionData {
  finalLevel: number;
  totalScore: number;
  gameType: string;
  timestamp: string;
  gameDuration: number;
  averageAccuracy: number;
}

interface GameSession {
  id: string;
  session: SessionData | null;
  game: { name: string };
}

interface UserData {
  id: string;
  uuid: string;
  wallet: number;
  score: number;
  histories: GameSession[];
  name?: string;
  imageUrl?: string;
  email?: string;
}

interface LeaderboardEntry {
  user: UserData;
  bestLevel: number;
  bestScore: number;
  totalGames: number;
  averageAccuracy: number;
  rank: number;
}

/* --------------------------- Page -------------------------------- */

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getToken } = useAuth();
  const { isSignedIn } = useUser();

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);

    while (true) {
      try {
        const jwt = await getToken();
        const response = await fetch(
          `https://ai.rajatkhandelwal.com/arcade/users`,
          {
            headers: jwt ? { Authorization: `Bearer ${jwt}` } : undefined,
          }
        );
        if (response.ok) {
          const data = await response.json();
          if (data.success && Array.isArray(data.users)) {
            await calculateLeaderboard(data.users);
            setLoading(false);
            return;
          } else {
            setError("Failed to parse users response.");
          }
        } else {
          setError("Unable to load users.");
        }
      } catch (err) {
        console.error("Error fetching users:", err);
        setError("Network error while fetching users.");
      }
      // retry backoff
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  };

  const calculateLeaderboard = async (usersData: UserData[]) => {
    // Enrich with Clerk profile
    const enrichedUsersDataPromises = usersData.map(async (user) => {
      try {
        const clerkResponse = await fetch(`/api/fetchclerkuser/${user.uuid}`);
        if (!clerkResponse.ok) throw new Error("Clerk user not found");
        const clerkData = await clerkResponse.json();

        return {
          ...user,
          name: clerkData.user?.first_name || `User ${user.uuid.slice(-6)}`,
          imageUrl: clerkData.user?.image_url,
          email: `${user.id.slice(0, 12)}...`,
        };
      } catch (e) {
        console.error(`Failed to fetch clerk data for user ${user.uuid}:`, e);
        return {
          ...user,
          name: `User ${user.uuid.slice(-6)}`,
          imageUrl: undefined,
          email: `${user.id.slice(0, 12)}...`,
        };
      }
    });

    const enrichedUsersData = await Promise.all(enrichedUsersDataPromises);

    const entries: LeaderboardEntry[] = enrichedUsersData
      .map((user) => {
        let bestLevel = 0;
        let bestScore = 0;
        let totalAccuracy = 0;
        let validGameCount = 0;

        if (Array.isArray(user.histories)) {
          user.histories.forEach((history) => {
            if (history && history.session) {
              // choose best (level, then score)
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
              validGameCount++;
            }
          });
        }

        return {
          user,
          bestLevel,
          bestScore,
          totalGames: user.histories?.length || 0,
          averageAccuracy:
            validGameCount > 0 ? totalAccuracy / validGameCount : 0,
          rank: 0,
        };
      })
      .sort((a, b) => {
        if (a.bestLevel !== b.bestLevel) return b.bestLevel - a.bestLevel;
        return b.bestScore - a.bestScore;
      })
      .map((entry, index) => ({ ...entry, rank: index + 1 }));

    setLeaderboard(entries);
  };

  const topThree = leaderboard.slice(0, 3);
  const restOfLeaderboard = leaderboard.slice(3);

  /* ------------------------- UI Helpers -------------------------- */

  const Skeleton = ({ className }: { className?: string }) => (
    <div
      className={`animate-pulse rounded-md bg-gray-200 dark:bg-gray-800 ${className}`}
    />
  );

  const PodiumCardSkeleton = () => (
    <div className="flex flex-col items-center rounded-xl border-2 p-6 dark:border-gray-800">
      <Skeleton className="h-20 w-20 rounded-full mt-6 mb-4" />
      <Skeleton className="h-6 w-32 mb-2" />
      <Skeleton className="h-4 w-20" />
      <div className="mt-4 flex flex-col items-center">
        <Skeleton className="h-8 w-24 mb-2" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );

  const TableRowSkeleton = () => (
    <TableRow>
      <TableCell>
        <Skeleton className="h-5 w-8" />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="flex flex-col gap-1">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-3 w-36" />
          </div>
        </div>
      </TableCell>
      <TableCell className="text-right">
        <Skeleton className="h-5 w-16 ml-auto" />
      </TableCell>
      <TableCell className="text-right">
        <Skeleton className="h-5 w-8 ml-auto" />
      </TableCell>
    </TableRow>
  );

  const SkeletonState = () => (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        <PodiumCardSkeleton />
        <PodiumCardSkeleton />
        <PodiumCardSkeleton />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-full max-w-sm mt-2" />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Rank</TableHead>
                <TableHead>Player</TableHead>
                <TableHead className="text-right">Best Score</TableHead>
                <TableHead className="text-right">Games Played</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRowSkeleton key={i} />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

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

  const PodiumCard = ({
    entry,
    rank,
  }: {
    entry: LeaderboardEntry;
    rank: number;
  }) => {
    const rankColors: { [key: number]: string } = {
      1: "border-yellow-400 bg-yellow-400/10",
      2: "border-gray-400 bg-gray-400/10",
      3: "border-amber-600 bg-amber-600/10",
    };
    const rankIcon: { [key: number]: JSX.Element } = {
      1: <Crown className="h-22 w-8 text-yellow-400" />,
      2: <Crown className="h-22 w-8 text-gray-400" />,
      3: <Crown className="h-22 w-8 text-amber-600" />,
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: rank * 0.1 }}
        className={`relative flex flex-col items-center rounded-xl border-2 p-6 ${rankColors[rank]}`}
      >
        <div className="absolute -top-5">{rankIcon[rank]}</div>
        <Avatar className="h-20 w-20 mt-6 mb-4">
          <AvatarImage src={entry.user.imageUrl} />
          <AvatarFallback>
            <UserIcon className="h-10 w-10" />
          </AvatarFallback>
        </Avatar>
        <h3 className="text-xl font-bold text-gray-200">{entry.user.name}</h3>
        <p className="text-sm text-gray-200">Rank #{entry.rank}</p>
      </motion.div>
    );
  };

  /* --------------------------- Render ---------------------------- */

  return (
    <SiteChrome>
      <h2 className="text-xl font-semibold text-blue-100 mb-6">Leaderboard</h2>

      {loading ? (
        <SkeletonState />
      ) : error ? (
        <ErrorState />
      ) : (
        <div className="mx-auto max-w-5xl">
          {/* Podium */}
          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            {topThree[1] && <PodiumCard entry={topThree[1]} rank={2} />}
            {topThree[0] && <PodiumCard entry={topThree[0]} rank={1} />}
            {topThree[2] && <PodiumCard entry={topThree[2]} rank={3} />}
          </div>

          {/* Table */}
          <Card className="border-white/10">
            <CardHeader>
              <CardTitle>All Players</CardTitle>
              <CardDescription>
                Full ranking of all players based on their best level and score.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Rank</TableHead>
                      <TableHead>Player</TableHead>
                      <TableHead className="text-right">Best Score</TableHead>
                      <TableHead className="text-right">Games Played</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {restOfLeaderboard.map((entry) => (
                      <TableRow key={entry.user.id}>
                        <TableCell className="font-bold">
                          #{entry.rank}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={entry.user.imageUrl} />
                              <AvatarFallback>
                                <UserIcon className="h-5 w-5" />
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{entry.user.name}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-primary">
                          {entry.bestScore.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {entry.totalGames}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </SiteChrome>
  );
}
