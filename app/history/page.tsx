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
        return "🔢";
      case "tetris":
        return "🟦";
      case "tower block":
        return "🏗️";
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
    <div className="flex flex-1 items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p>Loading game history...</p>
      </div>
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
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <SiteChrome>
      <h2 className="text-xl font-semibold text-blue-100 mb-6">Game History</h2>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState />
      ) : (
        <div className="mx-auto max-w-5xl">
          {/* Stats Cards */}
          {userData && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="border-white/10">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Trophy className="h-8 w-8 text-yellow-400 mr-3" />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Total Score
                      </p>
                      <p className="text-2xl font-bold">
                        {userData.score.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-white/10">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Target className="h-8 w-8 text-green-400 mr-3" />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Games Played
                      </p>
                      <p className="text-2xl font-bold">{sessions.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-white/10">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Clock className="h-8 w-8 text-blue-400 mr-3" />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Wallet Balance
                      </p>
                      <p className="text-2xl font-bold">
                        {userData.wallet.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Game History Table */}
          <Card className="border-white/10">
            <CardHeader>
              <CardTitle>Recent Games</CardTitle>
              <CardDescription>
                Track your gaming progress and achievements across all games.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sessions.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-lg text-muted-foreground">
                    No games played yet
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Start playing to see your history here!
                  </p>
                </div>
              ) : (
                <div className="relative w-full overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Game</TableHead>
                        <TableHead className="text-right">Score</TableHead>
                        <TableHead className="text-right">Level</TableHead>
                        <TableHead className="text-right">Duration</TableHead>
                        <TableHead className="text-right">Accuracy</TableHead>
                        <TableHead className="text-right">Date</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessions.map((session) => (
                        <TableRow key={session.id}>
                          <TableCell>
                            <div className="flex items-center">
                              <span className="text-2xl mr-3">
                                {getGameIcon(session.gameName)}
                              </span>
                              <span className="font-medium">
                                {session.gameName}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {session.session?.score?.toLocaleString() || "N/A"}
                          </TableCell>
                          <TableCell className="text-right">
                            {session.session?.level || "N/A"}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatDuration(session.session?.duration || 0)}
                          </TableCell>
                          <TableCell className="text-right">
                            {session.session?.sessionData?.averageAccuracy
                              ? `${session.session.sessionData.averageAccuracy.toFixed(
                                  1
                                )}%`
                              : "N/A"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end text-muted-foreground">
                              <Calendar className="h-4 w-4 mr-2" />
                              {formatDate(session.createdAt)}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant={
                                session.session ? "default" : "secondary"
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
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </SiteChrome>
  );
}
