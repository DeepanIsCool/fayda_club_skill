// app/page.tsx
"use client";

import { SignInButton, useAuth, useUser } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useState } from "react";

import { Card, CardContent } from "@/ui/card";
import { Skeleton } from "@/ui/skeleton";
import SiteChrome from "./components/layout/SiteChrome";
import {
  ApiGameResponse,
  GameConfig,
  getAllGames,
  loadGames,
} from "./lib/gameConfig";

/* Public thumbnails (your /public tree) */
const PUBLIC_THUMBS_BY_SLUG: Record<string, string> = {
  "2048": "/images/games/2048.jpg",
  tetris: "/images/games/tetris.jpg",
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
    const fetchAndLoadGames = async () => {
      try {
        setGamesLoading(true);

        const token = await getToken();
        let apiGames: ApiGameResponse["games"] = [];
        if (token) {
          const response = await fetch(
            "https://ai.rajatkhandelwal.com/arcade/games",
            {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            }
          );
          if (response.ok) {
            const data: ApiGameResponse = await response.json();
            if (data.success) {
              apiGames = data.games;
            }
          }
        }

        loadGames(apiGames);

        const all = (getAllGames?.() as SimpleGame[]) || [];
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
              ...fc,
              component: typeof fc.component === "string" ? fc.component : "",
              path: typeof fc.path === "string" ? fc.path : "",
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
    };

    fetchAndLoadGames();
  }, [getToken]);

  // Filter out the Tower Block game
  const visibleGames = games.filter((game) => game.slug !== "tower-block");

  return (
    <SiteChrome banner={<BannerCarousel />}>
      <section>
        <h2 className="mb-4 text-xl sm:text-2xl font-bold tracking-tight text-blue-100">
          Fayda Originals
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
            : visibleGames.map((game) => {
                const href = `/games/${game.slug}`;
                const cover =
                  (game.frontendConfig as any)?.imageUrl ||
                  PUBLIC_THUMBS_BY_SLUG[game.slug] ||
                  PUBLIC_THUMBS_BY_SLUG["2048"];

                if (isSignedIn) {
                  return (
                    <Link key={game.id} href={href} className="block">
                      <Card className="overflow-hidden border-white/10 bg-[#131a53] hover:bg-[#171e5f] transition-colors">
                        <CardContent className="!p-0 !pt-0 !pb-0">
                          <div className="relative aspect-[4/5] w-full overflow-hidden !p-0 !pt-0 !pb-0 flex items-stretch">
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
                        <CardContent className="!p-0 !pt-0 !pb-0">
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

function BannerCarousel() {
  const banners = ["/images/games/banner1.jpg", "/images/games/banner2.jpg"];
  const [i, setI] = React.useState(0);

  React.useEffect(() => {
    const id = setInterval(() => setI((p) => (p + 1) % banners.length), 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="
        relative
        aspect-[16/7]           /* wide, taller than 16/9 for readability */
        w-full
        min-h-[11rem]           /* ~176px on tiny phones */
        sm:min-h-[15rem]
        lg:min-h-[18rem]
        max-h-[28rem]           /* keep it tasteful on very large screens */
        rounded-2xl overflow-hidden
        border border-white/10
        bg-gradient-to-br from-blue-900/40 to-indigo-900/20
      "
    >
      {banners.map((src, idx) => (
        <div
          key={src}
          className={`absolute inset-0 transition-opacity duration-700 ${
            idx === i ? "opacity-100" : "opacity-0"
          }`}
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
      {/* dots */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
        {banners.map((_, idx) => (
          <span
            key={idx}
            className={`h-1.5 w-1.5 rounded-full ${
              idx === i ? "bg-white/80" : "bg-white/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
