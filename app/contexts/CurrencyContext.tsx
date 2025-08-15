"use client";

import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useReducer,
} from "react";
import { useAuth } from "./AuthContext";

// Types
interface CurrencyState {
  coins: number;
  points: number;
  totalEarned: number;
  totalSpent: number;
  totalPointsEarned: number;
  isLoading: boolean;
}

interface GameSession {
  isActive: boolean;
  baseEntryCost: number;
  continueCosts: number[];
  currentContinueIndex: number;
  gameId: string;
}

interface CurrencyContextType {
  currency: CurrencyState;
  gameSession: GameSession;
  actions: {
    spendCoins: (amount: number, reason: string) => boolean;
    earnCoins: (amount: number, reason: string) => void;
    earnPoints: (amount: number, reason: string) => void;
    startGameSession: (gameId: string) => boolean;
    endGameSession: () => void;
    getContinueCost: () => number;
    incrementContinueAttempt: () => void;
    resetContinueAttempts: () => void;
    hasEnoughCoins: (amount: number) => boolean;
  };
}

// Action Types
type CurrencyAction =
  | { type: "SPEND_COINS"; payload: { amount: number; reason: string } }
  | { type: "EARN_COINS"; payload: { amount: number; reason: string } }
  | { type: "EARN_POINTS"; payload: { amount: number; reason: string } }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "LOAD_STATE"; payload: CurrencyState }
  | { type: "START_GAME_SESSION"; payload: string }
  | { type: "END_GAME_SESSION" }
  | { type: "INCREMENT_CONTINUE_ATTEMPT" }
  | { type: "RESET_CONTINUE_ATTEMPTS" };

// Initial States
const initialCurrencyState: CurrencyState = {
  coins: 100, // Starting coins for new users
  points: 0, // Starting points for new users
  totalEarned: 100,
  totalSpent: 0,
  totalPointsEarned: 0,
  isLoading: false,
};

const initialGameSession: GameSession = {
  isActive: false,
  baseEntryCost: 1,
  continueCosts: [2, 4, 8, 16], // Exponential progression: 2, 4, 8, 16 coins
  currentContinueIndex: 0,
  gameId: "",
};

// Reducer
function currencyReducer(
  state: CurrencyState,
  action: CurrencyAction
): CurrencyState {
  switch (action.type) {
    case "SPEND_COINS":
      if (state.coins >= action.payload.amount) {
        return {
          ...state,
          coins: state.coins - action.payload.amount,
          totalSpent: state.totalSpent + action.payload.amount,
        };
      }
      return state;

    case "EARN_COINS":
      return {
        ...state,
        coins: state.coins + action.payload.amount,
        totalEarned: state.totalEarned + action.payload.amount,
      };

    case "EARN_POINTS":
      return {
        ...state,
        points: state.points + action.payload.amount,
        totalPointsEarned: state.totalPointsEarned + action.payload.amount,
      };

    case "SET_LOADING":
      return {
        ...state,
        isLoading: action.payload,
      };

    case "LOAD_STATE":
      return action.payload;

    default:
      return state;
  }
}

function gameSessionReducer(
  state: GameSession,
  action: CurrencyAction
): GameSession {
  switch (action.type) {
    case "START_GAME_SESSION":
      return {
        ...state,
        isActive: true,
        gameId: action.payload,
        currentContinueIndex: 0,
      };

    case "END_GAME_SESSION":
      return {
        ...state,
        isActive: false,
        gameId: "",
        currentContinueIndex: 0,
      };

    case "INCREMENT_CONTINUE_ATTEMPT":
      return {
        ...state,
        currentContinueIndex: Math.min(
          state.currentContinueIndex + 1,
          state.continueCosts.length - 1
        ),
      };

    case "RESET_CONTINUE_ATTEMPTS":
      return {
        ...state,
        currentContinueIndex: 0,
      };

    default:
      return state;
  }
}

// Context
const CurrencyContext = createContext<CurrencyContextType | undefined>(
  undefined
);

// Provider Component
interface CurrencyProviderProps {
  children: ReactNode;
}

export function CurrencyProvider({ children }: CurrencyProviderProps) {
  const { user, isAuthenticated } = useAuth();
  const [currency, dispatchCurrency] = useReducer(
    currencyReducer,
    initialCurrencyState
  );
  const [gameSession, dispatchGameSession] = useReducer(
    gameSessionReducer,
    initialGameSession
  );

  // Sync currency with user wallet and score when user changes
  useEffect(() => {
    if (isAuthenticated && user) {
      dispatchCurrency({
        type: "LOAD_STATE",
        payload: {
          coins: user.wallet || currency.coins,
          points: user.score || currency.points,
          totalEarned: currency.totalEarned,
          totalSpent: currency.totalSpent,
          totalPointsEarned: currency.totalPointsEarned,
          isLoading: false,
        },
      });
    }
  }, [user, isAuthenticated]);

  // Load saved state on mount (fallback for when user data is not available)
  useEffect(() => {
    const loadSavedState = () => {
      try {
        const savedState = localStorage.getItem("faydaClubCurrency");
        if (savedState && !isAuthenticated) {
          // Only load from localStorage if not authenticated
          const parsed = JSON.parse(savedState);
          dispatchCurrency({ type: "LOAD_STATE", payload: parsed });
        }
      } catch (error) {
        console.error("Failed to load currency state:", error);
      }
    };

    loadSavedState();
  }, [isAuthenticated]);

  // Save state whenever currency changes (but don't override server data)
  useEffect(() => {
    if (!isAuthenticated) {
      try {
        localStorage.setItem("faydaClubCurrency", JSON.stringify(currency));
      } catch (error) {
        console.error("Failed to save currency state:", error);
      }
    }
  }, [currency, isAuthenticated]);

  // Actions
  const syncToServer = async (newCoins: number, newPoints: number) => {
    if (!isAuthenticated || !user) return;

    try {
      await fetch("/api/auth/sync-currency", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: user.id,
          wallet: newCoins,
          score: newPoints,
        }),
      });
    } catch (error) {
      console.error("Failed to sync currency to server:", error);
    }
  };

  const spendCoins = (amount: number, reason: string): boolean => {
    if (currency.coins >= amount) {
      dispatchCurrency({ type: "SPEND_COINS", payload: { amount, reason } });

      // Log transaction for analytics
      console.log(`💰 Spent ${amount} coins: ${reason}`);

      // Sync to server if authenticated
      if (isAuthenticated && user) {
        syncToServer(currency.coins - amount, currency.points);
      }

      return true;
    }
    return false;
  };

  const earnCoins = (amount: number, reason: string): void => {
    dispatchCurrency({ type: "EARN_COINS", payload: { amount, reason } });

    // Log transaction for analytics
    console.log(`💰 Earned ${amount} coins: ${reason}`);

    // Sync to server if authenticated
    if (isAuthenticated && user) {
      syncToServer(currency.coins + amount, currency.points);
    }
  };

  const earnPoints = (amount: number, reason: string): void => {
    dispatchCurrency({ type: "EARN_POINTS", payload: { amount, reason } });

    // Log transaction for analytics
    console.log(`⭐ Earned ${amount} points: ${reason}`);

    // Sync to server if authenticated
    if (isAuthenticated && user) {
      syncToServer(currency.coins, currency.points + amount);
    }
  };

  const startGameSession = (gameId: string): boolean => {
    const entryCost = gameSession.baseEntryCost;

    if (currency.coins >= entryCost) {
      dispatchGameSession({ type: "START_GAME_SESSION", payload: gameId });
      dispatchGameSession({ type: "RESET_CONTINUE_ATTEMPTS" }); // Reset continue attempts for new game
      return spendCoins(entryCost, `Started ${gameId} game`);
    }

    return false;
  };

  const endGameSession = (): void => {
    dispatchGameSession({ type: "END_GAME_SESSION" });
  };

  const getContinueCost = (): number => {
    const cost =
      gameSession.continueCosts[gameSession.currentContinueIndex] || 32; // Default to 32 (next in sequence) if beyond array
    return cost; // Direct cost, not multiplied by base cost
  };

  const incrementContinueAttempt = (): void => {
    dispatchGameSession({ type: "INCREMENT_CONTINUE_ATTEMPT" });
  };

  const resetContinueAttempts = (): void => {
    dispatchGameSession({ type: "RESET_CONTINUE_ATTEMPTS" });
  };

  const hasEnoughCoins = (amount: number): boolean => {
    return currency.coins >= amount;
  };

  const contextValue: CurrencyContextType = {
    currency,
    gameSession,
    actions: {
      spendCoins,
      earnCoins,
      earnPoints,
      startGameSession,
      endGameSession,
      getContinueCost,
      incrementContinueAttempt,
      resetContinueAttempts,
      hasEnoughCoins,
    },
  };

  return (
    <CurrencyContext.Provider value={contextValue}>
      {children}
    </CurrencyContext.Provider>
  );
}

// Hook
export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}

// Utility hook for game-specific actions
export function useGameCurrency() {
  const { currency, gameSession, actions } = useCurrency();

  return {
    coins: currency.coins,
    points: currency.points,
    canStartGame: actions.hasEnoughCoins(gameSession.baseEntryCost),
    canContinue: actions.hasEnoughCoins(actions.getContinueCost()),
    continueCost: actions.getContinueCost(),
    continueAttempt: gameSession.currentContinueIndex,
    maxContinues: gameSession.continueCosts.length,
    startGame: (gameId: string) => actions.startGameSession(gameId),
    endGame: actions.endGameSession,
    continue: () => {
      const cost = actions.getContinueCost();
      if (actions.spendCoins(cost, "Game continue")) {
        actions.incrementContinueAttempt();
        return true;
      }
      return false;
    },
    earnReward: actions.earnCoins,
    earnPoints: actions.earnPoints,
  };
}
