"use client";

import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useReducer,
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
  coins: 0, // Start with 0 until loaded
  points: 0, // Start with 0 until loaded
  totalEarned: 0,
  totalSpent: 0,
  totalPointsEarned: 0,
  isLoading: true, // Start in loading state
};

const initialGameSession: GameSession = {
  isActive: false,
  baseEntryCost: 1,
  continueCosts: [2, 4, 8, 16], // Default progression
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

  // Sync currency from your API when user signs in
  useEffect(() => {
    const fetchUserData = async () => {
      if (isSignedIn && user) {
        try {
          dispatchCurrency({ type: "SET_LOADING", payload: true });
          // The cookie should be sent automatically by the browser
          const response = await fetch(`/api/users/${user.id}`);
          if (!response.ok) {
            throw new Error('Failed to fetch user data');
          }
          const data = await response.json();
          
          // Assuming the API returns a user object with wallet and score
          if (data && data.user) {
            dispatchCurrency({
              type: "LOAD_STATE",
              payload: {
                ...initialCurrencyState, // Reset other stats on load
                coins: data.user.wallet || 0,
                points: data.user.score || 0,
              },
            });
          }
        } catch (error) {
          console.error("Failed to load user currency data from API:", error);
          dispatchCurrency({ type: "SET_LOADING", payload: false });
        }
      }
    };
    fetchUserData();
  }, [user, isSignedIn]);


  // Actions
  const syncToServer = async (newCoins: number, newPoints: number) => {
    if (!isSignedIn || !user) return;

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
    gameConfig: gameSession.gameConfig,
    canStartGame: (gameSlug: string) => {
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