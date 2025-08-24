// app/components/tetris/tetris.tsx
"use client";

import type { GameStats, Reward } from "../modals/reward";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/app/lib/utils";
import { Button } from "@/ui/button";
import { Card } from "@/ui/card";

import { useCurrency } from "@/app/contexts/CurrencyContext";
import {
  GameConfig,
  getGameById,
  getGameEntryCostById,
} from "@/app/lib/gameConfig";
import { RewardModal } from "../modals/reward";
import { GameStartModal } from "../modals/start";

/* ----------------------------------------------------------------------------
 * Game constants
 * ------------------------------------------------------------------------- */

const TETROMINOES = {
  I: {
    shape: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    color: "bg-cyan-500",
    glow: "shadow-[0_0_10px_rgba(34,211,238,0.25)]",
  },
  O: {
    shape: [
      [1, 1],
      [1, 1],
    ],
    color: "bg-yellow-500",
    glow: "shadow-[0_0_10px_rgba(234,179,8,0.25)]",
  },
  T: {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: "bg-purple-500",
    glow: "shadow-[0_0_10px_rgba(168,85,247,0.25)]",
  },
  S: {
    shape: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0],
    ],
    color: "bg-green-500",
    glow: "shadow-[0_0_10px_rgba(34,197,94,0.25)]",
  },
  Z: {
    shape: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0],
    ],
    color: "bg-red-500",
    glow: "shadow-[0_0_10px_rgba(239,68,68,0.25)]",
  },
  J: {
    shape: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: "bg-blue-500",
    glow: "shadow-[0_0_10px_rgba(59,130,246,0.25)]",
  },
  L: {
    shape: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: "bg-orange-500",
    glow: "shadow-[0_0_10px_rgba(249,115,22,0.25)]",
  },
} as const;

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const INITIAL_DROP_MS = 1000;

type TetrominoType = keyof typeof TETROMINOES;
type Board = (string | null)[][];
type Position = { x: number; y: number };

interface Piece {
  shape: number[][];
  color: string;
  glow: string;
  position: Position;
  type: TetrominoType;
}

/* ----------------------------------------------------------------------------
 * Utilities
 * ------------------------------------------------------------------------- */

function shuffle<T>(arr: T[]): T[] {
  let i = arr.length;
  while (i) {
    const j = Math.floor(Math.random() * i--);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const createEmptyBoard = (): Board =>
  Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(null));

const createPiece = (type: TetrominoType): Piece => ({
  shape: TETROMINOES[type].shape.map((r) => [...r]),
  color: TETROMINOES[type].color,
  glow: TETROMINOES[type].glow,
  position: {
    x:
      Math.floor(BOARD_WIDTH / 2) -
      Math.floor(TETROMINOES[type].shape[0].length / 2),
    y: 0,
  },
  type,
});

const rotateShapeCW = (shape: number[][]) =>
  shape[0].map((_, i) => shape.map((row) => row[i]).reverse());

const rotatePiece = (p: Piece): Piece => ({
  ...p,
  shape: rotateShapeCW(p.shape),
});

const placePieceOnBoard = (p: Piece, board: Board): Board => {
  const next = board.map((r) => [...r]);
  for (let y = 0; y < p.shape.length; y++) {
    for (let x = 0; x < p.shape[y].length; x++) {
      if (!p.shape[y][x]) continue;
      const by = p.position.y + y;
      const bx = p.position.x + x;
      if (by >= 0) next[by][bx] = p.color; // color token
    }
  }
  return next;
};

const clearLines = (board: Board) => {
  const rows = board.filter((row) => row.some((c) => c === null));
  const cleared = BOARD_HEIGHT - rows.length;
  while (rows.length < BOARD_HEIGHT)
    rows.unshift(Array(BOARD_WIDTH).fill(null));
  return { newBoard: rows, linesCleared: cleared };
};

const lineScore = (linesCleared: number, level: number) => {
  const base = [0, 40, 100, 300, 1200];
  return base[linesCleared] * level;
};

/* ----------------------------------------------------------------------------
 * Auto cell sizing (keep frame size, shrink cells)
 * ------------------------------------------------------------------------- */

function useAutoCellSize() {
  const [cell, setCell] = useState<number>(22);
  useEffect(() => {
    const compute = () => {
      const vh = window.innerHeight;
      const reservedTop = 100;
      const reservedBottom = 96;
      const available = Math.max(200, vh - reservedTop - reservedBottom - 56);

      const maxCell = 26;
      const minCell = 14;
      const ideal = Math.floor((available - 19) / BOARD_HEIGHT);
      const next = Math.max(minCell, Math.min(maxCell, ideal));
      setCell(next);
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);
  return cell;
}

/* ----------------------------------------------------------------------------
 * Component
 * ------------------------------------------------------------------------- */

export default function TetrisGame() {
  const router = useRouter();
  const { getToken } = useAuth();

  // currency + entry
  const { currency, actions } = useCurrency();
  const entryCost = getGameEntryCostById("tetris");

  // modals
  const [showStartModal, setShowStartModal] = useState(true);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [pendingReward, setPendingReward] = useState<{
    rewards: Reward[];
    totalCoins: number;
    gameLevel: number;
    gameStats: GameStats;
  } | null>(null);

  // board state
  const [board, setBoard] = useState<Board>(createEmptyBoard());
  const [current, setCurrent] = useState<Piece | null>(null);
  const [nextType, setNextType] = useState<TetrominoType>("I");
  const [heldType, setHeldType] = useState<TetrominoType | null>(null);
  const [canHold, setCanHold] = useState(true);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lines, setLines] = useState(0);
  const [over, setOver] = useState(false);

  // timing
  const [dropMs, setDropMs] = useState(INITIAL_DROP_MS);
  const dropRef = useRef(dropMs);
  const loopRef = useRef<NodeJS.Timeout | null>(null);

  // interaction
  const boardRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  // bag
  const bagRef = useRef<TetrominoType[]>([]);
  const fillBag = () => {
    bagRef.current = shuffle(Object.keys(TETROMINOES) as TetrominoType[]);
  };
  const popBag = (): TetrominoType => {
    if (!bagRef.current.length) fillBag();
    return bagRef.current.pop()!;
  };

  // prevent re-entrant locking from gravity + drag
  const lockingRef = useRef(false);

  // cell sizing
  const cellSize = useAutoCellSize();
  const boardStyle = useMemo(
    () =>
      ({
        "--cell": `${cellSize}px`,
        "--gap": "1px",
        gridTemplateColumns: "repeat(10, var(--cell))",
        gridAutoRows: "var(--cell)",
        gap: "var(--gap)",
        width: `calc(${BOARD_WIDTH} * var(--cell) + ${
          BOARD_WIDTH - 1
        } * var(--gap))`,
        height: `calc(${BOARD_HEIGHT} * var(--cell) + ${
          BOARD_HEIGHT - 1
        } * var(--gap))`,
      } as React.CSSProperties),
    [cellSize]
  );

  /* ------------------------------- helpers -------------------------------- */

  const collides = useCallback((p: Piece, b: Board, dx = 0, dy = 0) => {
    for (let y = 0; y < p.shape.length; y++) {
      for (let x = 0; x < p.shape[y].length; x++) {
        if (!p.shape[y][x]) continue;
        const nx = p.position.x + x + dx;
        const ny = p.position.y + y + dy;
        if (nx < 0 || nx >= BOARD_WIDTH || ny >= BOARD_HEIGHT) return true;
        if (ny >= 0 && b[ny][nx]) return true;
      }
    }
    return false;
  }, []);

  /* ---------------------------- game over first ---------------------------- */

  const onGameOver = useCallback(() => {
    setOver(true);
    setPendingReward({
      rewards: [{ amount: score, reason: "Game completion", type: "score" }],
      totalCoins: 0,
      gameLevel: level,
      gameStats: {
        finalLevel: level,
        totalPrecisionScore: score,
        averageAccuracy: 0,
        perfectPlacements: 0,
        averageReactionTime: 0,
        totalGameTime: 0,
      },
    });
    setShowRewardModal(true);
    // release any lock guard so the board can reset properly
    lockingRef.current = false;
  }, [level, score]);

  /* ------------------------------ movement/drop ---------------------------- */

  const softDrop = useCallback(
    (steps = 1) => {
      if (!current || over) return;

      // if another call is already processing a lock/spawn, skip
      if (lockingRef.current) return;

      // can move down?
      if (!collides(current, board, 0, steps)) {
        setCurrent((prev) =>
          prev
            ? {
                ...prev,
                position: { x: prev.position.x, y: prev.position.y + steps },
              }
            : null
        );
        return;
      }

      // lock piece (guard re-entrancy until next frame)
      lockingRef.current = true;

      const placed = placePieceOnBoard(current, board);
      const { newBoard, linesCleared } = clearLines(placed);
      setBoard(newBoard);
      if (linesCleared) {
        setLines((v) => v + linesCleared);
        setScore((s) => s + lineScore(linesCleared, level));
      }

      // top collision => game over
      if (current.position.y <= 0) {
        onGameOver();
        return;
      }

      // spawn next
      const t = popBag();
      setCurrent(createPiece(nextType));
      setNextType(t);
      setCanHold(true);

      // allow further drops next animation frame
      requestAnimationFrame(() => {
        lockingRef.current = false;
      });
    },
    [board, collides, current, level, nextType, onGameOver, over]
  );

  const moveLR = useCallback(
    (dx: number) => {
      if (!current || over) return;
      if (lockingRef.current) return; // avoid moving during a lock
      if (!collides(current, board, dx, 0)) {
        setCurrent((prev) =>
          prev
            ? {
                ...prev,
                position: { x: prev.position.x + dx, y: prev.position.y },
              }
            : null
        );
      }
    },
    [board, collides, current, over]
  );

  const rotate = useCallback(() => {
    if (!current || over) return;
    if (lockingRef.current) return;
    const rotated = rotatePiece(current);
    if (!collides(rotated, board)) setCurrent(rotated);
  }, [board, collides, current, over]);

  // Hold (store only)
  const holdOnly = useCallback(() => {
    if (!current || !canHold || over) return;
    if (lockingRef.current) return;
    setHeldType(current.type);
    setCurrent(createPiece(nextType));
    setNextType(popBag());
    setCanHold(false);
  }, [canHold, current, nextType, over]);

  // Insert (swap immediate)
  const insertSwap = useCallback(() => {
    if (!current || !heldType || over) return;
    if (lockingRef.current) return;
    const incoming = createPiece(heldType);
    setHeldType(current.type);
    setCurrent(incoming);
    setCanHold(false);
  }, [current, heldType, over]);

  /* ------------------------------ main loop -------------------------------- */

  useEffect(() => {
    if (over || showStartModal) return;
    loopRef.current = setInterval(() => softDrop(1), dropRef.current);
    return () => {
      if (loopRef.current) clearInterval(loopRef.current);
    };
  }, [softDrop, over, showStartModal]);

  useEffect(() => {
    const ms = Math.max(50, INITIAL_DROP_MS - (level - 1) * 50);
    setDropMs(ms);
    dropRef.current = ms;
  }, [level]);

  useEffect(() => {
    setLevel(Math.floor(lines / 10) + 1);
  }, [lines]);

  // first piece after Start
  useEffect(() => {
    if (current || showStartModal) return;
    const first = popBag();
    const second = popBag();
    setCurrent(createPiece(first));
    setNextType(second);
    lockingRef.current = false;
  }, [current, showStartModal]);

  /* ------------------------------ controls --------------------------------- */

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (over || showStartModal) return;
      if (
        [
          "ArrowLeft",
          "ArrowRight",
          "ArrowDown",
          "ArrowUp",
          "c",
          "C",
          "x",
          "X",
        ].includes(e.key)
      )
        e.preventDefault();
      switch (e.key) {
        case "ArrowLeft":
          moveLR(-1);
          break;
        case "ArrowRight":
          moveLR(1);
          break;
        case "ArrowDown":
          softDrop(1);
          break;
        case "ArrowUp":
          rotate();
          break;
        case "c":
        case "C":
          holdOnly();
          break;
        case "x":
        case "X":
          insertSwap();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [holdOnly, insertSwap, moveLR, over, rotate, showStartModal, softDrop]);

  // touch / drag (tap=rotate, horizontal drag=move, vertical drag=accelerate)
  useEffect(() => {
    const el = boardRef.current;
    if (!el || over || showStartModal) return;

    let lastX = 0;
    let lastY = 0;
    let lastMoveAt = 0;

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      touchStartX.current = lastX = t.clientX;
      touchStartY.current = lastY = t.clientY;
    };

    const onMove = (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0];
      const dx = t.clientX - lastX;
      const dy = t.clientY - lastY;
      const now = Date.now();

      const H = Math.max(8, cellSize * 0.6);
      if (dx > H) {
        moveLR(1);
        lastX = t.clientX;
      } else if (dx < -H) {
        moveLR(-1);
        lastX = t.clientX;
      }

      const V = Math.max(8, cellSize * 0.5);
      if (dy > V && now - lastMoveAt > 30) {
        softDrop(1);
        lastY = t.clientY;
        lastMoveAt = now;
      }
    };

    const onEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      const dy = e.changedTouches[0].clientY - touchStartY.current;
      if (Math.abs(dx) < 12 && Math.abs(dy) < 12) rotate();
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
    };
  }, [cellSize, moveLR, over, rotate, showStartModal, softDrop]);

  /* ------------------------------ start / end ------------------------------- */

  // Hardcoded config fallback (kept)
  const HARDCODED_TETRIS_CONFIG: GameConfig = {
    id: "cmeim0pkl000apa0ihp7sqvti",
    slug: "tetris",
    name: "Tetris",
    hardness: 8,
    entryfee: 2,
    description: "Puzzle game",
    category: "Board",
    rules: "Match and erase",
    frontendConfig: {
      title: "Tetris",
      description: "Puzzle game",
      objective: "Match and erase",
      imageUrl: "/images/games/tetris.jpg",
      path: "tetris",
      component: "TetrisGame",
      rewardRules: [
        {
          id: "line_clear",
          name: "Line Clear",
          formula: "linesCleared",
          multiplier: 2,
        },
        {
          id: "tetris_clear",
          name: "Tetris (4 lines)",
          formula: "tetrisCount * 10",
          conditions: "tetrisCount > 0",
          multiplier: 1,
        },
      ],
      continueRules: { maxContinues: 3, costProgression: [2, 4, 8, 16, 32] },
      achievements: [
        {
          id: "first_tetris",
          icon: "🟦",
          name: "First Tetris",
          type: "performance",
          rarity: "common",
          reward: 10,
          condition: "tetrisCount >= 1",
          description: "Clear 4 lines at once",
        },
        {
          id: "lines_40",
          icon: "🧱",
          name: "40 Lines",
          type: "performance",
          rarity: "rare",
          reward: 25,
          condition: "linesCleared >= 40",
          description: "Clear 40 lines in one game",
        },
        {
          id: "score_10000",
          icon: "🏆",
          name: "Score 10,000",
          type: "performance",
          rarity: "epic",
          reward: 50,
          condition: "score >= 10000",
          description: "Score 10,000 points in a game",
        },
      ],
      displayConfig: {
        icons: { main: "🟦", category: "🎮", difficulty: "🧩" },
        theme: "auto",
        colors: {
          accent: "#F59E42",
          primary: "#3B82F6",
          secondary: "#6366F1",
          background: "#EEF2FF",
        },
      },
      metadata: { version: "1.0.0", lastUpdated: "2025-08-19T13:58:58.677Z" },
    },
    rating: 0,
    createdAt: "2025-08-19T13:58:58.677Z",
    isAvailable: true,
    hasImplementation: true,
  };

  let config = getGameById("tetris");
  if (!config) config = HARDCODED_TETRIS_CONFIG;

  const submitGameSession = useCallback(
    async (finalStats: GameStats) => {
      if (!config) return;
      try {
        const jwt = await getToken();
        await fetch("https://ai.rajatkhandelwal.com/arcade/gamesession", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwt}`,
          },
          body: JSON.stringify({
            gameId: config.id,
            userId: "guest",
            level: finalStats.finalLevel,
            score: finalStats.totalPrecisionScore,
            duration: finalStats.totalGameTime ?? 0,
            sessionData: {
              ...finalStats,
              gameType: "tetris",
              platform: "web",
              timestamp: new Date().toISOString(),
              version: "1.0.0",
            },
          }),
        });
      } catch (e) {
        console.error("submit tetris session failed:", e);
      }
    },
    [getToken, config]
  );

  const reset = () => {
    setBoard(createEmptyBoard());
    bagRef.current = [];
    setCurrent(null);
    setNextType("I");
    setHeldType(null);
    setCanHold(true);
    setScore(0);
    setLevel(1);
    setLines(0);
    setOver(false);
    setShowStartModal(true);
    setShowRewardModal(false);
    setPendingReward(null);
    lockingRef.current = false;
  };

  const handleStart = async () => {
    if (currency.isLoading || currency.coins < entryCost) return;
    await actions.startGame("tetris");
    setShowStartModal(false);
  };

  const handleCancel = () => router.push("/");

  /* --------------------------------- render -------------------------------- */

  const renderBoard = () => {
    const display = board.map((r) => [...r]);
    if (current) {
      for (let y = 0; y < current.shape.length; y++) {
        for (let x = 0; x < current.shape[y].length; x++) {
          if (!current.shape[y][x]) continue;
          const by = current.position.y + y;
          const bx = current.position.x + x;
          if (by >= 0 && by < BOARD_HEIGHT && bx >= 0 && bx < BOARD_WIDTH) {
            display[by][bx] = `${current.color} ${current.glow}`;
          }
        }
      }
    }
    return display;
  };

  const renderMini = (type: TetrominoType | null) => {
    if (!type) return null;
    const { shape, color, glow } = TETROMINOES[type];
    const compact = shape.filter((r) => r.some((c) => c === 1));
    return (
      <div className="grid gap-0.5 items-center justify-center">
        {compact.map((row, y) => (
          <div key={y} className="flex gap-0.5 justify-center">
            {row.map((c, x) => (
              <div
                key={x}
                className={cn(
                  "w-2.5 h-2.5 rounded-[2px]",
                  c ? `${color} ${glow}` : "bg-transparent"
                )}
              />
            ))}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-stretch justify-center">
      {/* Start modal */}
      <GameStartModal
        isOpen={showStartModal}
        onStart={handleStart}
        onCancel={handleCancel}
        gameKey="tetris"
        gameTitle="Tetris"
        gameDescription="Clear lines and score as high as possible!"
        gameObjective="Clear lines by arranging falling blocks"
      />

      {/* Reward modal */}
      <RewardModal
        isOpen={showRewardModal}
        onClose={async () => {
          if (pendingReward?.gameStats) {
            await submitGameSession(pendingReward.gameStats);
          }
          setShowRewardModal(false);
          reset();
          router.push("/");
        }}
        rewards={pendingReward?.rewards || []}
        totalCoins={pendingReward?.totalCoins || 0}
        gameLevel={pendingReward?.gameLevel || 0}
        gameStats={pendingReward?.gameStats}
      />

      <div className="w-full max-w-[480px] px-3 pb-3 pt-2 flex flex-col gap-2">
        {/* Top info row */}
        <div className="grid grid-cols-4 gap-2">
          <Card className="bg-slate-800 border-slate-700 p-2">
            <div className="text-[10px] text-slate-400 -mt-1 mb-1">Score</div>
            <div className="text-lg font-bold">{score}</div>
          </Card>
          <Card className="bg-slate-800 border-slate-700 p-2">
            <div className="text-[10px] text-slate-400 -mt-1 mb-1">Level</div>
            <div className="text-lg font-bold">{level}</div>
          </Card>
          <Card className="bg-slate-800 border-slate-700 p-2">
            <div className="text-[10px] text-slate-400 -mt-1 mb-1">Lines</div>
            <div className="text-lg font-bold text-cyan-400">{lines}</div>
          </Card>
          <Card className="bg-slate-800 border-slate-700 p-2">
            <div className="text-[10px] text-slate-400 -mt-1 mb-1">Next</div>
            <div className="h-6 flex items-center justify-center">
              {renderMini(nextType)}
            </div>
          </Card>
        </div>

        {/* Play area */}
        <Card className="flex items-center justify-center bg-slate-800/80 border-slate-700 p-2">
          <div
            ref={boardRef}
            className="relative rounded-lg border-2 border-slate-600/70 bg-slate-950 p-2"
            style={{
              width: `calc(${BOARD_WIDTH} * var(--cell) + ${
                BOARD_WIDTH - 1
              } * var(--gap) + 1rem)`,
              height: `calc(${BOARD_HEIGHT} * var(--cell) + ${
                BOARD_HEIGHT - 1
              } * var(--gap) + 1rem)`,
            }}
            onClick={() => !showStartModal && rotate()}
          >
            <div className="grid" style={boardStyle}>
              {renderBoard().map((row, y) =>
                row.map((token, x) => (
                  <div
                    key={`${y}-${x}`}
                    className={cn(
                      "rounded-[3px] border",
                      token
                        ? `${token} border-black/20`
                        : "bg-slate-800/60 border-slate-700/70"
                    )}
                  />
                ))
              )}
            </div>

            {over && (
              <div className="absolute inset-0 rounded-lg bg-slate-950/80 backdrop-blur-sm flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="text-2xl font-bold text-sky-400">
                    Game Over
                  </div>
                  <Button
                    type="button"
                    onClick={reset}
                    className="bg-gradient-to-r from-blue-600 to-sky-600 text-white font-semibold"
                  >
                    Play Again
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Bottom controls */}
        <div className="grid grid-cols-3 gap-2">
          <Button
            type="button"
            onClick={insertSwap}
            disabled={!heldType || !canHold || over || showStartModal}
            className={cn(
              "h-11 rounded-xl font-semibold",
              heldType && canHold
                ? "bg-amber-600 hover:bg-amber-500 text-black"
                : "bg-slate-700 text-slate-300"
            )}
            title="Insert held piece (swap)"
          >
            Insert
          </Button>

          <Card className="h-11 bg-slate-800 border-slate-700 flex items-center justify-center">
            {renderMini(heldType)}
          </Card>

          <Button
            type="button"
            onClick={holdOnly}
            disabled={!current || !canHold || over || showStartModal}
            className={cn(
              "h-11 rounded-xl font-semibold",
              canHold
                ? "bg-amber-500 hover:bg-amber-400 text-black"
                : "bg-slate-700 text-slate-300"
            )}
            title="Hold current piece"
          >
            Hold
          </Button>
        </div>
      </div>
    </div>
  );
}
