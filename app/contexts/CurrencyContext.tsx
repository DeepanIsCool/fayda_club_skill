"use client";

import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useReducer,
  useCallback,
  useState, // Import useState
} from "react";
import { GameConfig, gameConfigService } from "../lib/gameConfig";
import { useUser } from '@clerk/nextjs';

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
  gameSlug: string;
  gameConfig: GameConfig | null;
}

interface CurrencyContextType {
  currency: CurrencyState;
  gameSession: GameSession;
  isInitialized: boolean; // Add isInitialized state
  actions: {
    spendCoins: (amount: number, reason: string) => boolean;
    earnCoins: (amount: number, reason: string) => void;
    earnPoints: (amount: number, reason: string) => void;
    startGameSession: (gameSlug: string) => Promise<boolean>;
    endGameSession: () => void;
    getContinueCost: () => number;
    incrementContinueAttempt: () => void;
    resetContinueAttempts: () => void;
    hasEnoughCoins: (amount: number) => boolean;
    initialize: () => void; // Add initialize action
  };
}

// Action Types
type CurrencyAction =
  | { type: "SPEND_COINS"; payload: { amount: number; reason: string } }
  | { type: "EARN_COINS"; payload: { amount: number; reason: string } }
  | { type: "EARN_POINTS"; payload: { amount: number; reason: string } }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "LOAD_STATE"; payload: CurrencyState }
  | {
    type: "START_GAME_SESSION";
    payload: { gameId: string; gameSlug: string; gameConfig: GameConfig };
  }
  | { type: "END_GAME_SESSION" }
  | { type: "INCREMENT_CONTINUE_ATTEMPT" }
  | { type: "RESET_CONTINUE_ATTEMPTS" };

// Initial States
const initialCurrencyState: CurrencyState = {
  coins: 0,
  points: 0,
  totalEarned: 0,
  totalSpent: 0,
  totalPointsEarned: 0,
  isLoading: true,
};

const initialGameSession: GameSession = {
  isActive: false,
  baseEntryCost: 1,
  continueCosts: [2, 4, 8, 16],
  currentContinueIndex: 0,
  gameId: "",
  gameSlug: "",
  gameConfig: null,
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
      return { ...state, ...action.payload, isLoading: false };

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
        gameId: action.payload.gameId,
        gameSlug: action.payload.gameSlug,
        gameConfig: action.payload.gameConfig,
        baseEntryCost: action.payload.gameConfig?.entryfee || 1,
        continueCosts: action.payload.gameConfig?.frontendConfig?.continueRules
          .costProgression || [2, 4, 8, 16],
        currentContinueIndex: 0,
      };

    case "END_GAME_SESSION":
      return {
        ...state,
        isActive: false,
        gameId: "",
        gameSlug: "",
        gameConfig: null,
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
  const { user, isSignedIn } = useUser();
  const [currency, dispatchCurrency] = useReducer(
    currencyReducer,
    initialCurrencyState
  );
  const [gameSession, dispatchGameSession] = useReducer(
    gameSessionReducer,
    initialGameSession
  );
  const [isInitialized, setIsInitialized] = useState(false); // New state

  const fetchUserData = useCallback(async () => {
    // Only fetch if the context is initialized and the user is signed in.
    if (isInitialized && isSignedIn && user) {
      try {
        dispatchCurrency({ type: "SET_LOADING", payload: true });
        const response = await fetch(`/api/user/id`);
        if (!response.ok) {
          throw new Error('Failed to fetch user data');
        }
        const data = await response.json();
        if (data && data.user) {
          dispatchCurrency({
            type: "LOAD_STATE",
            payload: {
              ...initialCurrencyState,
              coins: data.user.wallet || 0,
              points: data.user.score || 0,
            },
          });
        }
      } catch (error) {
        console.error("Failed to load user currency data from API:", error);
      } finally {
        dispatchCurrency({ type: "SET_LOADING", payload: false });
      }
    }
  }, [user, isSignedIn, isInitialized]); // Add isInitialized to dependency array

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);


  // Actions
  const syncToServer = async (newCoins: number, newPoints: number) => {
    if (!isSignedIn || !user) return;

    try {
      const body = {
        wallet: newCoins,
        score: newPoints,
      };
      console.log("Syncing currency to server with body:", body);
      await fetch("/api/user/id", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    } catch (error) {
      console.error("Failed to sync currency to server:", error);
    }
  };

  const spendCoins = (amount: number, reason: string): boolean => {
    if (currency.coins >= amount) {
      const newCoinTotal = currency.coins - amount;
      dispatchCurrency({ type: "SPEND_COINS", payload: { amount, reason } });
      console.log(`💰 Spent ${amount} coins: ${reason}`);
      if (isSignedIn) {
        syncToServer(newCoinTotal, currency.points);
      }
      return true;
    }
    return false;
  };

  const earnCoins = (amount: number, reason: string): void => {
    const newCoinTotal = currency.coins + amount;
    dispatchCurrency({ type: "EARN_COINS", payload: { amount, reason } });
    console.log(`💰 Earned ${amount} coins: ${reason}`);
    if (isSignedIn) {
      syncToServer(newCoinTotal, currency.points);
    }
  };

  const earnPoints = (amount: number, reason: string): void => {
    const newPointTotal = currency.points + amount;
    dispatchCurrency({ type: "EARN_POINTS", payload: { amount, reason } });
    console.log(`⭐ Earned ${amount} points: ${reason}`);
    if (isSignedIn) {
      syncToServer(currency.coins, newPointTotal);
    }
  };

  const startGameSession = async (gameSlug: string): Promise<boolean> => {
    try {
      await gameConfigService.loadGames();
      const gameConfig = gameConfigService.getGameBySlug(gameSlug);
      if (!gameConfig) {
        console.error(`No configuration found for game: ${gameSlug}`);
        return false;
      }
      if (!gameConfig.hasImplementation) {
        console.error(`Game ${gameSlug} does not have a frontend implementation`);
        return false;
      }

      const entryCost = gameConfig.entryfee;
      if (currency.coins >= entryCost) {
        dispatchGameSession({
          type: "START_GAME_SESSION",
          payload: {
            gameId: gameConfig.id,
            gameSlug: gameSlug,
            gameConfig: gameConfig,
          },
        });
        dispatchGameSession({ type: "RESET_CONTINUE_ATTEMPTS" });
        return spendCoins(entryCost, `Started ${gameConfig.name} game`);
      }
      return false;
    } catch (error) {
      console.error("Error starting game session:", error);
      return false;
    }
  };

  const endGameSession = (): void => {
    dispatchGameSession({ type: "END_GAME_SESSION" });
    fetchUserData();
  };

  const getContinueCost = (): number => {
    return gameSession.continueCosts[gameSession.currentContinueIndex] || 32;
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

  const initialize = () => {
    setIsInitialized(true);
  };

  const contextValue: CurrencyContextType = {
    currency,
    gameSession,
    isInitialized,
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
      initialize,
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
    gameConfig: gameSession.gameConfig,
    canStartGame: (gameSlug: string, defaultCost: number) => {
      const gameConfig = gameConfigService.getGameBySlug(gameSlug);
      const entryCost = gameConfig?.entryfee || 1;
      return actions.hasEnoughCoins(entryCost);
    },
    canContinue: actions.hasEnoughCoins(actions.getContinueCost()),
    continueCost: actions.getContinueCost(),
    continueAttempt: gameSession.currentContinueIndex,
    maxContinues: gameSession.continueCosts.length,
    startGame: (gameSlug: string) => actions.startGameSession(gameSlug),
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