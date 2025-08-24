// app/contexts/CurrencyContext.tsx
"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "https://ai.rajatkhandelwal.com/arcade";

type CurrencyState = {
  wallet: number;
  score: number;
  loading: boolean;
  error?: string | null;
};

type CurrencyActions = {
  /** Initialize once after sign-in; safe to call again (no-ops if already initialized). */
  initialize: () => Promise<void>;
  /** Optimistically add coins locally. */
  addCoins: (amount: number) => void;
  /** Spend coins if available; returns whether the spend was applied. */
  spendCoins: (amount: number) => boolean;
  /** Optional re-fetch if you need to force refresh (calls /auth again). */
  refresh: () => Promise<void>;
};

type CurrencyContextType = {
  currency: {
    coins: number;
    points: number;
    isLoading: boolean;
    error?: string | null;
  };
  actions: CurrencyActions;
};

const CurrencyContext = createContext<CurrencyContextType>({
  currency: { coins: 0, points: 0, isLoading: false },
  actions: {
    initialize: async () => {},
    addCoins: () => {},
    spendCoins: () => false,
    refresh: async () => {},
  },
});

export const useCurrency = () => useContext(CurrencyContext);

export const CurrencyProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { isSignedIn } = useUser();
  const { getToken } = useAuth();

  const [state, setState] = useState<CurrencyState>({
    wallet: 0,
    score: 0,
    loading: false,
    error: null,
  });

  // guard: run initialize() only once per sign-in session (even under StrictMode)
  const initOnceRef = useRef(false);

  const fetchViaAuth = useCallback(async () => {
    console.log("🔐 CurrencyContext: Starting authentication...");

    const jwt = await getToken();
    if (!jwt) {
      console.error("❌ CurrencyContext: No JWT token available");
      throw new Error("No JWT available yet");
    }

    console.log(
      "✅ CurrencyContext: JWT token obtained:",
      jwt.substring(0, 20) + "..."
    );

    const requestBody = { token: jwt };
    console.log(
      "📤 CurrencyContext: Making auth request to:",
      `${API_BASE}/auth`
    );

    const res = await fetch(`${API_BASE}/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
      cache: "no-store",
    });

    console.log("📥 CurrencyContext: Auth response status:", res.status);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("❌ CurrencyContext: Auth failed:", res.status, text);
      throw new Error(`Auth failed: ${res.status} ${text}`);
    }

    const data = await res.json();
    console.log("✅ CurrencyContext: Auth successful, user data:", data);

    const w = Number(data?.user?.wallet ?? 0);
    const s = Number(data?.user?.score ?? 0);

    console.log("💰 CurrencyContext: Setting wallet:", w, "score:", s);
    setState({ wallet: w, score: s, loading: false, error: null });
  }, [getToken]);

  const initialize = useCallback(async () => {
    if (initOnceRef.current) return;
    initOnceRef.current = true;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await fetchViaAuth();
    } catch (e: any) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: e?.message ?? "Failed to initialize wallet",
      }));
      // Allow manual refresh later; keep initOnceRef true to avoid loops
    }
  }, [fetchViaAuth]);

  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await fetchViaAuth();
    } catch (e: any) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: e?.message ?? "Failed to refresh wallet",
      }));
    }
  }, [fetchViaAuth]);

  const addCoins = useCallback((amount: number) => {
    if (!Number.isFinite(amount)) return;
    setState((s) => ({ ...s, wallet: Math.max(0, s.wallet + amount) }));
  }, []);

  const spendCoins = useCallback((amount: number) => {
    if (!Number.isFinite(amount) || amount <= 0) return false;
    let applied = false;
    setState((s) => {
      if (s.wallet >= amount) {
        applied = true;
        return { ...s, wallet: s.wallet - amount };
      }
      return s;
    });
    return applied;
  }, []);

  // React to sign-in / sign-out
  useEffect(() => {
    if (isSignedIn) {
      // initialize once after sign-in
      void initialize();
    } else {
      // reset on sign-out
      initOnceRef.current = false;
      setState({ wallet: 0, score: 0, loading: false, error: null });
    }
  }, [isSignedIn, initialize]);

  const value = useMemo<CurrencyContextType>(
    () => ({
      currency: {
        coins: state.wallet,
        points: state.score,
        isLoading: state.loading,
        error: state.error,
      },
      actions: { initialize, addCoins, spendCoins, refresh },
    }),
    [state, initialize, addCoins, spendCoins, refresh]
  );

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};
