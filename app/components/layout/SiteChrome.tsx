// app/components/layout/SiteChrome.tsx
"use client";

import { HeaderCurrencyDisplay } from "@/app/components/modals/currency";
import { cn } from "@/app/lib/utils";
import { Button } from "@/ui/button";
import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/nextjs";
import {
  ChevronLeft,
  ChevronRight,
  Swords,
  Trophy,
  Gamepad2,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect } from "react";
import CompleteProfilePrompt from "@/app/components/account/CompleteProfilePrompt";

type NavItem = { label: string; href: string; icon?: React.ReactNode };

export default function SiteChrome({
  children,
  banner,
  navItems = [
    {
      label: "Fayda Originals",
      href: "/",
      icon: <Gamepad2 className="h-6 w-6" />,
    },
    {
      label: "Leaderboard",
      href: "/leaderboard",
      icon: <Trophy className="h-6 w-6" />,
    },
  ],
}: {
  children: React.ReactNode;
  banner?: React.ReactNode;
  navItems?: NavItem[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { isSignedIn } = useUser();

  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  // Redirect user after sign-in if we stored a target route
  useEffect(() => {
    if (!isSignedIn) return;
    const pending = window.localStorage.getItem("postSignInRedirect");
    if (pending) {
      window.localStorage.removeItem("postSignInRedirect");
      router.push(pending);
    }
  }, [isSignedIn, router]);

  return (
    <div className="flex min-h-screen w-full bg-[#0d1030] text-white">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "relative z-20 hidden md:flex flex-col transition-all duration-300 bg-[#0f1540] border-r border-white/10",
          sidebarOpen ? "w-64" : "w-[68px]"
        )}
      >
        <div className="flex h-16 items-center gap-2 px-4">
          <button
            type="button"
            className={cn(
              "rounded-full p-2 hover:bg-white/10",
              !sidebarOpen && "mx-auto"
            )}
            aria-label="Toggle sidebar"
            onClick={() => setSidebarOpen((s) => !s)}
          >
            {sidebarOpen ? <ChevronLeft /> : <ChevronRight />}
          </button>
        </div>

        <nav className="p-3 space-y-2">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2 text-blue-100 hover:bg-white/10",
                  active && "bg-white/10"
                )}
              >
                <span className="shrink-0">{item.icon}</span>
                {!sidebarOpen && <span className="sr-only">{item.label}</span>}
                {sidebarOpen && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto p-3 text-xs text-white/40">v1.0.0</div>
      </aside>

      {/* Main column */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-gradient-to-b from-[#11184a] to-[#0e1442] shadow-[0_1px_0_0_rgba(255,255,255,0.06)]">
          <div className="flex h-16 items-center gap-3 px-3 sm:px-4">
            {/* Left: logo */}
            <div className="flex items-center gap-2 min-w-0">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-xl px-3 py-1.5 hover:bg-white/10"
              >
                <Swords className="h-5 w-5 text-blue-300" />
                <span className="font-semibold tracking-wide">Fayda Club</span>
              </Link>
            </div>

            {/* Center: wallet */}
            <div className="mx-auto">
              {isSignedIn ? <HeaderCurrencyDisplay /> : null}
            </div>

            {/* Right: auth buttons / user menu */}
            <div className="ml-auto flex items-center gap-2">
              {isSignedIn ? (
                <UserButton />
              ) : (
                <>
                  <SignInButton mode="modal">
                    <Button
                      type="button"
                      size="sm"
                      className="bg-[#11184a] text-white hover:bg-[#1e40af] font-semibold border-none shadow"
                    >
                      Sign In
                    </Button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <Button
                      type="button"
                      size="sm"
                      className="bg-white/95 text-[#0e1442] hover:bg-white transition-colors font-semibold"
                    >
                      Sign Up
                    </Button>
                  </SignUpButton>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Optional banner */}
        {banner ? (
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 pt-6">
            {banner}
          </div>
        ) : null}

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 py-6">
            {children}
          </div>
        </main>

        {/* Profile completion prompt */}
        <CompleteProfilePrompt />

        {/* Mobile bottom nav */}
        <MobileBottomNav navItems={navItems} />
      </div>
    </div>
  );
}

function MobileBottomNav({ navItems }: { navItems: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#0f1540]/95 supports-[backdrop-filter]:backdrop-blur">
      <div className="mx-auto grid max-w-3xl grid-cols-2 gap-3 p-2">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              className={cn(
                "relative flex h-12 items-center justify-center rounded-2xl",
                active ? "bg-white/10 shadow-inner" : "hover:bg-white/5"
              )}
            >
              <span className={cn(active ? "text-white" : "text-blue-200")}>
                {item.icon}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
