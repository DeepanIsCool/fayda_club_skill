// app/page.tsx
"use client";

/**
 * Home page
 * - Uses SiteChrome (shared chrome)
 * - Banner slot
 * - Game thumbnails only (smaller; no extra text)
 * - Logged out: save intended URL and open Clerk modal
 * - After sign-in, SiteChrome reads and redirects
 */

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { SignInButton, useAuth, useUser } from "@clerk/nextjs";

import SiteChrome from "./components/layout/SiteChrome";
import { Card, CardContent } from "@/ui/card";
import { Skeleton } from "@/ui/skeleton";
import { GameConfig, gameConfigService } from "./lib/gameConfig";

/* Public thumbnails (your /public tree) */
const PUBLIC_THUMBS_BY_SLUG: Record<string, string> = {
  "2048": "/images/games/2048.jpeg",
  tetris: "/images/games/tetris.jpeg",
  "tower-block": "/images/games/tower.jpeg",
};

/* Fallback catalog so we show thumbs pre-auth */
type SimpleGame = Pick<
  GameConfig,
  "id" | "slug" | "name" | "frontendConfig" | "hasImplementation"
>;

const FALLBACK_CATALOG: SimpleGame[] = [
  {
    id: "tetris",
    slug: "tetris",
    name: "Tetris",
    hasImplementation: true as any,
    frontendConfig: {
      title: "Tetris",
      imageUrl: PUBLIC_THUMBS_BY_SLUG.tetris,
      component: "",
    } as any,
  },
  {
    id: "2048",
    slug: "2048",
    name: "2048",
    hasImplementation: true as any,
    frontendConfig: {
      title: "2048",
      imageUrl: PUBLIC_THUMBS_BY_SLUG["2048"],
      component: "",
    } as any,
  },
  {
    id: "tower-block",
    slug: "tower-block",
    name: "Tower Block",
    hasImplementation: true as any,
    frontendConfig: {
      title: "Tower Block",
      imageUrl: PUBLIC_THUMBS_BY_SLUG["tower-block"],
      component: "",
    } as any,
  },
];

export default function HomePage() {
  const { isSignedIn } = useUser();
  const { getToken } = useAuth();

  const [games, setGames] = useState<SimpleGame[]>([]);
  const [gamesLoading, setGamesLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setGamesLoading(true);
        // IMPORTANT: pass the function, not the resolved token
        await gameConfigService.loadGames(getToken);
        const all = (gameConfigService.getAllGames?.() as SimpleGame[]) || [];
        const available = all.filter(
          (g) => (g as any).hasImplementation !== false
        );

        const normalized: SimpleGame[] = (
          available.length ? available : FALLBACK_CATALOG
        ).map((g) => {
          const fc: any = (g as any).frontendConfig ?? {};
          return {
            id: g.id,
            slug: g.slug,
            name: g.name,
            hasImplementation: (g as any).hasImplementation !== false,
            frontendConfig: {
              // keep any fields the backend provides
              ...fc,
              // ensure required string fields exist
              component: typeof fc.component === "string" ? fc.component : "",
              path: typeof fc.path === "string" ? fc.path : "",
              // ensure we always have an image
              imageUrl:
                fc.imageUrl ||
                PUBLIC_THUMBS_BY_SLUG[g.slug] ||
                PUBLIC_THUMBS_BY_SLUG["2048"],
            } as any,
          };
        });

        setGames(normalized);
      } catch {
        setGames(FALLBACK_CATALOG);
      } finally {
        setGamesLoading(false);
      }
    })();
  }, [getToken]);

  return (
    <SiteChrome banner={<BannerCarousel />}>
      <section>
        <h2 className="mb-4 text-xl sm:text-2xl font-bold tracking-tight text-blue-100">
          Games
        </h2>

        {/* Smaller, clean thumbnails (no labels/footers) */}
        <div className="grid gap-4 sm:gap-6 grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {gamesLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="aspect-[4/5] w-full rounded-xl bg-white/10"
                />
              ))
            : games.map((game) => {
                const href = `/games/${game.slug}`;
                const cover =
                  (game.frontendConfig as any)?.imageUrl ||
                  PUBLIC_THUMBS_BY_SLUG[game.slug] ||
                  PUBLIC_THUMBS_BY_SLUG["2048"];

                if (isSignedIn) {
                  return (
                    <Link key={game.id} href={href} className="block">
                      <Card className="overflow-hidden border-white/10 bg-[#131a53] hover:bg-[#171e5f] transition-colors">
                        <CardContent className="p-0">
                          <div className="relative aspect-[4/5] w-full overflow-hidden">
                            <Image
                              src={cover}
                              alt={game.name}
                              fill
                              className="object-cover"
                              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                              priority={false}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                }

                // Logged-out: save desired dest, then open Clerk modal
                return (
                  <SignInButton key={game.id} mode="modal">
                    <button
                      type="button"
                      aria-label={`Sign in to play ${game.name}`}
                      onClick={() =>
                        window.localStorage.setItem("postSignInRedirect", href)
                      }
                      className="w-full text-left"
                    >
                      <Card className="overflow-hidden border-white/10 bg-[#131a53] hover:bg-[#171e5f] transition-colors">
                        <CardContent className="p-0">
                          <div className="relative aspect-[4/5] w-full overflow-hidden">
                            <Image
                              src={cover}
                              alt={game.name}
                              fill
                              className="object-cover"
                              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                              priority={false}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    </button>
                  </SignInButton>
                );
              })}
        </div>
      </section>
    </SiteChrome>
  );
}

/* ---------- Simple banner (optional images at /public/banners/*.jpg) ---------- */
function BannerCarousel() {
  const banners = ["/banners/1.jpg", "/banners/2.jpg", "/banners/3.jpg"];
  const [i, setI] = React.useState(0);

  React.useEffect(() => {
    const id = setInterval(() => setI((p) => (p + 1) % banners.length), 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative h-40 sm:h-56 md:h-64 lg:h-72 rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-blue-900/40 to-indigo-900/20">
      {banners.map((src, idx) => (
        <div
          key={src}
          className={[
            "absolute inset-0 transition-opacity duration-700",
            idx === i ? "opacity-100" : "opacity-0",
          ].join(" ")}
        >
          <Image
            src={src}
            alt="Banner"
            fill
            className="object-cover"
            priority={idx === 0}
          />
        </div>
      ))}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0d1030] via-transparent to-transparent" />
    </div>
  );
}
