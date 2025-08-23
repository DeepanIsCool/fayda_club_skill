"use client";

import { Swords, LayoutGrid, Trophy, Menu } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { useUser, UserButton, SignInButton } from "@clerk/nextjs";
import { useAuth } from "@clerk/nextjs";
import { GameConfig, gameConfigService } from "./lib/gameConfig";
import { Card, CardContent, CardFooter, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import { HeaderCurrencyDisplay } from "./components/modals/currency";
import { useCurrency } from "./contexts/CurrencyContext"; // Import the hook

export default function Dashboard() {
  const { isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const [games, setGames] = useState<GameConfig[]>([]);
  const [gamesLoading, setGamesLoading] = useState(true);
  const [gamesError, setGamesError] = useState<string | null>(null);
  const { actions } = useCurrency();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const loadGames = async () => {
      while (true) {
        try {
          setGamesLoading(true);
          setGamesError(null);
          const gameConfigs = await gameConfigService.loadGames(getToken); // Pass getToken here
          const availableGames = gameConfigs.filter(
            (game) => game.hasImplementation
          );
          setGames(availableGames);
          setGamesLoading(false);
          return;
        } catch (error) {
          setGamesError("Failed to load games.");
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
    };
    loadGames();
  }, [getToken]);

  useEffect(() => {
    const logClerkAuth = async () => {
      if (isSignedIn && user) {
        try {
          const jwt = await getToken();
          if (jwt) {
            const response = await fetch(`https://ai.rajatkhandelwal.com/arcade/auth`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${jwt}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({ token: jwt }),
            });

            if (response.ok) {
              actions.initialize();
            } else {
              console.error("Backend authentication failed:", response.statusText);
            }
          }
        } catch (err) {
          console.error("Failed to log Clerk auth:", err);
        }
      }
    };
    logClerkAuth();
  }, [isSignedIn, user, getToken, actions]);

  const featuredGames = useMemo(() => games.slice(0, 3), [games]);

  const GameCardSkeleton = () => (
    <div className="flex flex-col gap-2">
      <Skeleton className="aspect-video w-full rounded-lg" />
      <Skeleton className="h-5 w-3/4" />
    </div>
  );

  return (
    <div className="flex min-h-screen w-full bg-[#191948] dark:bg-gray-950">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex w-64 flex-col bg-[#191948] p-4 dark:bg-black dark:border-gray-800">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="w-64 bg-[#191948] dark:bg-black p-4">
            <SidebarContent />
          </div>
          {/* Backdrop */}
          <div
            className="flex-1 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center bg-[#191948] px-6 dark:bg-black dark:border-gray-800">
          {/* Left: Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-gray-200"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>

          {/* Spacer to push right section to extreme right */}
          <div className="flex-1" />

          {/* Right: Currency + User */}
          <div className="flex items-center gap-4">
            <HeaderCurrencyDisplay />
            {isSignedIn ? (
              <UserButton afterSignOutUrl="/" />
            ) : (
              <SignInButton mode="modal">
                <Button>Sign In</Button>
              </SignInButton>
            )}
          </div>
        </header>


        <main className="flex-1 overflow-y-auto p-6 rounded-tl-4xl bg-[#23239b3e]">
          {gamesError && !gamesLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
                <h3 className="text-red-600 dark:text-red-400">❌ {gamesError}</h3>
              </div>
            </div>
          ) : (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold tracking-tight text-gray-200">
                  All Games
                </h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {gamesLoading
                  ? [...Array(3)].map((_, i) => <GameCardSkeleton key={i} />)
                  : games.map((game) => (
                    <Link
                      key={game.id}
                      href={`/games/${game.slug}`}
                      className="block group"
                      onClick={(e) => {
                        if (!isSignedIn) {
                          e.preventDefault();
                          toast.error("Please sign in to play.");
                        }
                      }}
                    >
                      <Card className="overflow-hidden border-none bg-transparent shadow-none">
                        <CardContent className="p-0">
                          <div className="aspect-[3/4] w-full relative overflow-hidden rounded-xl transition-transform">
                            <Image
                              src={
                                game.frontendConfig?.imageUrl ||
                                "/images/games/default.jpeg"
                              }
                              alt={game.name}
                              layout="fill"
                              objectFit="cover"
                            />
                          </div>
                        </CardContent>
                        <CardFooter className="p-0 pt-3">
                          <CardTitle className="text-base font-semibold text-gray-200">
                            {game.name}
                          </CardTitle>
                        </CardFooter>
                      </Card>
                    </Link>
                  ))}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

function SidebarContent() {
  return (
    <>
      <div className="mb-8 flex items-center gap-2">
        <Swords className="h-8 w-8 text-blue-500" />
        <h1 className="text-xl font-bold text-gray-200">Fayda Club</h1>
      </div>
      <nav className="flex flex-col gap-2">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-lg bg-blue-100 dark:bg-gray-800 px-3 py-2 text-blue-600 dark:text-gray-50 font-semibold"
        >
          <LayoutGrid className="h-5 w-5" />
          Games
        </Link>
        <Link
          href="/leaderboard"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-200 transition-colors hover:bg-[#23239b3e] hover:text-gray-200"
        >
          <Trophy className="h-5 w-5" />
          Leaderboard
        </Link>
      </nav>
    </>
  );
}