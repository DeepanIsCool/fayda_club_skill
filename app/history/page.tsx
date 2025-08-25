"use client";

import { Badge } from "@/ui/badge";
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
import { useAuth } from "@clerk/nextjs";
import {
  Calendar,
  Clock,
  Loader2,
  ShieldAlert,
  Target,
  Trophy,
} from "lucide-react";
import { useEffect, useState } from "react";
import SiteChrome from "../components/layout/SiteChrome";

const API_BASE = "https://ai.rajatkhandelwal.com/arcade";

interface GameSession {
  id: string;
  gameId: string;
  session: {
    level: number;
    score: number;
    userId: string;
    duration: number;
    sessionData: {
      version: string;
      gameType: string;
      platform: string;
      timestamp: string;
      finalLevel: number;
      averageAccuracy: number;
      perfectPlacements: number;
      averageReactionTime: number;
      totalPrecisionScore: number;
    };
  } | null;
  createdAt: string;
}

interface Game {
  id: string;
  uuid: string;
  slug: string;
  name: string;
  image: string | null;
  hardness: number;
  entryfee: number;
  description: string;
  category: string;
}

interface UserData {
  id: string;
  uuid: string;
  wallet: number;
  score: number;
  games: Record<string, GameSession[]>;
}

export default function HistoryPage() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [arcadeUserId, setArcadeUserId] = useState<string | null>(null);

  // Authenticate with arcade API and get user ID
  const authenticateUser = async () => {
    try {
      const token = await getToken();
      if (!token) throw new Error("No authentication token");

      const response = await fetch(`${API_BASE}/auth`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) throw new Error("Authentication failed");

      const data = await response.json();
      if (data.success && data.user) {
        setArcadeUserId(data.user.id);
        return data.user.id;
      }
      throw new Error("Invalid authentication response");
    } catch (err) {
      console.error("Authentication error:", err);
      throw err;
    }
  };

  // Fetch user game history
  const fetchUserHistory = async (userId: string) => {
    try {
      const token = await getToken();
      if (!token) throw new Error("No authentication token");

      const response = await fetch(`${API_BASE}/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch user history");

      const data = await response.json();
      if (data.success && data.user) {
        setUserData(data.user);
      }
    } catch (err) {
      console.error("Error fetching user history:", err);
      throw err;
    }
  };

  // Fetch games list for name mapping
  const fetchGames = async () => {
    try {
      const token = await getToken();
      if (!token) throw new Error("No authentication token");

      const response = await fetch(`${API_BASE}/games`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch games");

      const data = await response.json();
      if (data.success && data.games) {
        setGames(data.games);
      }
    } catch (err) {
      console.error("Error fetching games:", err);
      throw err;
    }
  };

  // Initialize data on component mount
  useEffect(() => {
    const initializeData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Authenticate and get user ID
        const userId = await authenticateUser();

        // Fetch user history and games in parallel
        await Promise.all([fetchUserHistory(userId), fetchGames()]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, [getToken]);

  // Get game name by ID
  const getGameName = (gameId: string): string => {
    const game = games.find((g) => g.id === gameId);
    return game?.name || "Unknown Game";
  };

  // Get game icon by name
  const getGameIcon = (gameName: string): string => {
    switch (gameName.toLowerCase()) {
      case "2048":
        return "";
      case "tetris":
        return "";
      case "tower block":
        return "";
      default:
        return "🎮";
    }
  };

  // Format duration
  const formatDuration = (duration: number): string => {
    if (duration === 0) return "N/A";
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get all sessions sorted by date
  const getAllSessions = (): (GameSession & { gameName: string })[] => {
    if (!userData) return [];

    const allSessions: (GameSession & { gameName: string })[] = [];

    Object.entries(userData.games).forEach(([gameName, sessions]) => {
      sessions.forEach((session) => {
        allSessions.push({
          ...session,
          gameName: getGameName(session.gameId),
        });
      });
    });

    return allSessions.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  };

  const sessions = getAllSessions();

  const LoadingState = () => (
    <div className="flex flex-1 items-center justify-center min-h-[50vh]">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-400" />
        <p className="text-blue-200/70">Loading game history...</p>
      </div>
    </div>
  );

  const ErrorState = () => (
    <div className="flex flex-1 items-center justify-center min-h-[50vh] px-4">
      <Card className="w-full max-w-md text-center bg-gradient-to-br from-[#1a2040] to-[#0f1540] border-red-500/20">
        <CardHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20">
            <ShieldAlert className="h-6 w-6 text-red-400" />
          </div>
          <CardTitle className="mt-4 text-white">
            Something went wrong
          </CardTitle>
          <CardDescription className="text-blue-200/70">
            {error}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <SiteChrome>
      <div className="pb-20 md:pb-0">
        <h2 className="text-xl font-semibold text-blue-100 mb-6">
          Game History
        </h2>

        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState />
        ) : (
          <div className="mx-auto max-w-5xl">
            {/* Stats Cards */}
            {userData && (
              <div className="flex flex-nowrap gap-3 md:gap-6 mb-6 md:mb-8">
                <Card className="relative flex-1 min-w-0 bg-gradient-to-br from-[#1a2040] to-[#0f1540] border-blue-500/20 shadow-lg">
                  <CardContent className="p-4 md:p-6">
                    <div className="flex items-center">
                      <div className="p-1.5 md:p-2 rounded-lg bg-yellow-500/20 mr-2 md:mr-3">
                        <Trophy className="h-4 w-4 md:h-8 md:w-8 text-yellow-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-blue-200/70 truncate">
                          Total Score
                        </p>
                        <p className="text-sm md:text-2xl font-bold text-white truncate">
                          {userData.score.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="relative flex-1 min-w-0 bg-gradient-to-br from-[#1a2040] to-[#0f1540] border-blue-500/20 shadow-lg">
                  <CardContent className="p-4 md:p-6">
                    <div className="flex items-center">
                      <div className="p-1.5 md:p-2 rounded-lg bg-green-500/20 mr-2 md:mr-3">
                        <Target className="h-4 w-4 md:h-8 md:w-8 text-green-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-blue-200/70 truncate">
                          Games Played
                        </p>
                        <p className="text-sm md:text-2xl font-bold text-white truncate">
                          {sessions.length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                {/* <Card className="bg-gradient-to-br from-[#1a2040] to-[#0f1540] border-blue-500/20 shadow-lg">
                  <CardContent className="p-4 md:p-6">
                    <div className="flex items-center">
                      <div className="p-1.5 md:p-2 rounded-lg bg-blue-500/20 mr-2 md:mr-3">
                        <Clock className="h-4 w-4 md:h-8 md:w-8 text-blue-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-blue-200/70 truncate">
                          Wallet Balance
                        </p>
                        <p className="text-sm md:text-2xl font-bold text-white truncate">
                          {userData.wallet.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card> */}
              </div>
            )}

            {/* Game History */}
            <Card className="bg-gradient-to-br from-[#1a2040] to-[#0f1540] border-blue-500/20 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-white text-lg md:text-xl">
                  Recent Games
                </CardTitle>
                <CardDescription className="text-blue-200/70">
                  Track your gaming progress and achievements across all games.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 md:p-6 md:pt-0">
                {sessions.length === 0 ? (
                  <div className="text-center py-12 px-6">
                    <p className="text-lg text-blue-200/70">
                      No games played yet
                    </p>
                    <p className="text-sm text-blue-200/50 mt-2">
                      Start playing to see your history here!
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Mobile Card Layout */}
                    <div className="md:hidden space-y-3 p-4">
                      {sessions.map((session) => (
                        <div
                          key={session.id}
                          className="bg-[#0f1540]/50 rounded-lg p-4 border border-blue-500/10"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center">
                              <span className="text-2xl mr-3">
                                {getGameIcon(session.gameName)}
                              </span>
                              <div>
                                <p className="font-medium text-white text-sm">
                                  {session.gameName}
                                </p>
                                <p className="text-xs text-blue-200/60">
                                  {formatDate(session.createdAt)}
                                </p>
                              </div>
                            </div>
                            <Badge
                              variant={
                                session.session ? "default" : "secondary"
                              }
                              className={
                                session.session
                                  ? "bg-green-500/20 text-green-300 border-green-500/30"
                                  : "bg-gray-500/20 text-gray-300 border-gray-500/30"
                              }
                            >
                              {session.session ? "Completed" : "Incomplete"}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-blue-200/60 text-xs">Score</p>
                              <p className="text-white font-mono">
                                {session.session?.score?.toLocaleString() ||
                                  "N/A"}
                              </p>
                            </div>
                            <div>
                              <p className="text-blue-200/60 text-xs">Level</p>
                              <p className="text-white">
                                {session.session?.level || "N/A"}
                              </p>
                            </div>
                            <div>
                              <p className="text-blue-200/60 text-xs">
                                Duration
                              </p>
                              <p className="text-white font-mono">
                                {formatDuration(session.session?.duration || 0)}
                              </p>
                            </div>
                            <div>
                              <p className="text-blue-200/60 text-xs">
                                Accuracy
                              </p>
                              <p className="text-white">
                                {session.session?.sessionData?.averageAccuracy
                                  ? `${session.session.sessionData.averageAccuracy.toFixed(
                                      1
                                    )}%`
                                  : "N/A"}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop Table Layout */}
                    <div className="hidden md:block relative w-full overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-blue-500/20 hover:bg-blue-500/5">
                            <TableHead className="text-blue-200">
                              Game
                            </TableHead>
                            <TableHead className="text-right text-blue-200">
                              Score
                            </TableHead>
                            <TableHead className="text-right text-blue-200">
                              Level
                            </TableHead>
                            <TableHead className="text-right text-blue-200">
                              Duration
                            </TableHead>
                            <TableHead className="text-right text-blue-200">
                              Accuracy
                            </TableHead>
                            <TableHead className="text-right text-blue-200">
                              Date
                            </TableHead>
                            <TableHead className="text-right text-blue-200">
                              Status
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sessions.map((session) => (
                            <TableRow
                              key={session.id}
                              className="border-blue-500/10 hover:bg-blue-500/5"
                            >
                              <TableCell>
                                <div className="flex items-center">
                                  <span className="text-2xl mr-3">
                                    {getGameIcon(session.gameName)}
                                  </span>
                                  <span className="font-medium text-white">
                                    {session.gameName}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-mono text-white">
                                {session.session?.score?.toLocaleString() ||
                                  "N/A"}
                              </TableCell>
                              <TableCell className="text-right text-white">
                                {session.session?.level || "N/A"}
                              </TableCell>
                              <TableCell className="text-right font-mono text-white">
                                {formatDuration(session.session?.duration || 0)}
                              </TableCell>
                              <TableCell className="text-right text-white">
                                {session.session?.sessionData?.averageAccuracy
                                  ? `${session.session.sessionData.averageAccuracy.toFixed(
                                      1
                                    )}%`
                                  : "N/A"}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end text-blue-200/70">
                                  <Calendar className="h-4 w-4 mr-2" />
                                  {formatDate(session.createdAt)}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <Badge
                                  variant={
                                    session.session ? "default" : "secondary"
                                  }
                                  className={
                                    session.session
                                      ? "bg-green-500/20 text-green-300 border-green-500/30"
                                      : "bg-gray-500/20 text-gray-300 border-gray-500/30"
                                  }
                                >
                                  {session.session ? "Completed" : "Incomplete"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </SiteChrome>
  );
}
