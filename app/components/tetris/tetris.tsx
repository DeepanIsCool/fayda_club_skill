// app/components/tetris/tetris.tsx
"use client";

import type { GameStats, Reward } from "../modals/reward";

import { cn } from "@/app/lib/utils";
import { useIsMobile } from "@/ui/use-mobile";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCurrency } from "../../contexts/CurrencyContext";
import { getGameEntryCost } from "../../lib/gameConfig";
import { RewardModal } from "../modals/reward";
import { GameStartModal } from "../modals/start";

// For session submission
import { useAuth } from "@clerk/nextjs";
import { gameConfigService } from "../../lib/gameConfig";
// Submit game session data to API
const useSubmitGameSession = (
  config: any,
  getToken: () => Promise<string | null>
) => {
  return useCallback(
    async (finalStats: GameStats) => {
      if (!config || !finalStats) return;
      try {
        const sessionData = {
          gameId: config.id,
          userId: "guest",
          level: finalStats.finalLevel,
          score: finalStats.totalPrecisionScore,
          duration: finalStats.totalGameTime || 0,
          sessionData: {
            ...finalStats,
            gameType: "tetris",
            platform: "web",
            timestamp: new Date().toISOString(),
            version: "1.0.0",
          },
        };

        const jwt = await getToken();
        await fetch(`https://ai.rajatkhandelwal.com/arcade/gamesession`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwt}`,
          },
          body: JSON.stringify(sessionData),
        });
      } catch (error) {
        console.error("Error submitting tetris session:", error);
      }
    },
    [config, getToken]
  );
};

// Tetrominoes (classic colors)
const TETROMINOES = {
  I: {
    shape: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    color: "bg-cyan-500",
  },
  O: {
    shape: [
      [1, 1],
      [1, 1],
    ],
    color: "bg-yellow-500",
  },
  T: {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: "bg-purple-500",
  },
  S: {
    shape: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0],
    ],
    color: "bg-green-500",
  },
  Z: {
    shape: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0],
    ],
    color: "bg-red-500",
  },
  J: {
    shape: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: "bg-blue-500",
  },
  L: {
    shape: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: "bg-orange-500",
  },
};

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20; // Classic 10x20 board
const INITIAL_DROP_TIME = 1000;

type TetrominoType = keyof typeof TETROMINOES;
type Board = (string | null)[][];
type Position = { x: number; y: number };

interface Piece {
  shape: number[][];
  color: string;
  position: Position;
  type: TetrominoType;
}

// Fisher-Yates shuffle algorithm
function shuffle<T>(array: T[]): T[] {
  let currentIndex = array.length,
    randomIndex;

  while (currentIndex != 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }

  return array;
}

export default function TetrisGame() {
  const router = useRouter();
  const { getToken } = useAuth(); // Get getToken here

  // Start modal state
  const [showStartModal, setShowStartModal] = useState(true);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [loading, setLoading] = useState(false);

  type PendingReward = {
    rewards: Reward[];
    totalCoins: number;
    gameLevel: number;
    gameStats: GameStats;
  } | null;

  const [pendingReward, setPendingReward] = useState<PendingReward>(null);

  const isMobile = useIsMobile();
  const { currency, actions } = useCurrency();
  const entryCost = getGameEntryCost("tetris");
  const bagRef = useRef<TetrominoType[]>([]);

  const fillBag = () => {
    const types = Object.keys(TETROMINOES) as TetrominoType[];
    bagRef.current = shuffle(types);
  };

  const getNextTetromino = (): TetrominoType => {
    if (bagRef.current.length === 0) {
      fillBag();
    }
    return bagRef.current.pop()!;
  };

  // Helper functions inside the component
  const createEmptyBoard = (): Board =>
    Array(BOARD_HEIGHT)
      .fill(null)
      .map(() => Array(BOARD_WIDTH).fill(null));

  const createPiece = (type: TetrominoType): Piece => ({
    shape: TETROMINOES[type].shape,
    color: TETROMINOES[type].color,
    position: {
      x:
        Math.floor(BOARD_WIDTH / 2) -
        Math.floor(TETROMINOES[type].shape[0].length / 2),
      y: 0,
    },
    type,
  });
  const rotatePiece = (piece: Piece): Piece => {
    const rotated = piece.shape[0].map((_, index) =>
      piece.shape.map((row) => row[index]).reverse()
    );
    return { ...piece, shape: rotated };
  };
  const placePiece = (piece: Piece, board: Board): Board => {
    const newBoard = board.map((row) => [...row]);
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const boardY = piece.position.y + y;
          const boardX = piece.position.x + x;
          if (boardY >= 0) newBoard[boardY][boardX] = piece.color;
        }
      }
    }
    return newBoard;
  };
  const clearLines = (
    board: Board
  ): { newBoard: Board; linesCleared: number } => {
    const newBoard = board.filter((row) => row.some((cell) => cell === null));
    const linesCleared = BOARD_HEIGHT - newBoard.length;
    while (newBoard.length < BOARD_HEIGHT)
      newBoard.unshift(Array(BOARD_WIDTH).fill(null));
    return { newBoard, linesCleared };
  };
  const calculateScore = (linesCleared: number, level: number): number => {
    const baseScores = [0, 40, 100, 300, 1200];
    return baseScores[linesCleared] * level;
  };

  const [board, setBoard] = useState<Board>(createEmptyBoard());
  const [currentPiece, setCurrentPiece] = useState<Piece | null>(null);
  const [nextPiece, setNextPiece] = useState<TetrominoType>(() =>
    getNextTetromino()
  );
  const [heldPiece, setHeldPiece] = useState<TetrominoType | null>(null);
  const [canHold, setCanHold] = useState(true);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lines, setLines] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  // Track continues used
  const [continuesUsed, setContinuesUsed] = useState(0);
  const [dropTime, setDropTime] = useState(INITIAL_DROP_TIME);

  const dropTimeRef = useRef(dropTime);
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  useEffect(() => {
    if (!currentPiece && !showStartModal) {
      setCurrentPiece(createPiece(nextPiece));
      setNextPiece(getNextTetromino());
    }
  }, [currentPiece, nextPiece, showStartModal]);

  const checkCollision = useCallback(
    (piece: Piece, board: Board, dx = 0, dy = 0): boolean => {
      for (let y = 0; y < piece.shape.length; y++) {
        for (let x = 0; x < piece.shape[y].length; x++) {
          if (piece.shape[y][x]) {
            const newX = piece.position.x + x + dx;
            const newY = piece.position.y + y + dy;
            if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT)
              return true;
            if (newY >= 0 && board[newY][newX]) return true;
          }
        }
      }
      return false;
    },
    []
  );

  const movePiece = useCallback(
    (dx: number, dy: number) => {
      if (!currentPiece || gameOver) return;
      if (!checkCollision(currentPiece, board, dx, dy)) {
        setCurrentPiece((prev) =>
          prev
            ? {
                ...prev,
                position: { x: prev.position.x + dx, y: prev.position.y + dy },
              }
            : null
        );
      } else if (dy > 0) {
        const newBoard = placePiece(currentPiece, board);
        const { newBoard: clearedBoard, linesCleared } = clearLines(newBoard);
        setBoard(clearedBoard);
        setLines((prev) => prev + linesCleared);
        setScore((prev) => prev + calculateScore(linesCleared, level));
        if (currentPiece.position.y <= 0) {
          setGameOver(true);
          handleGameOver();
          return;
        }
        setCurrentPiece(createPiece(nextPiece));
        setNextPiece(getNextTetromino());
        setCanHold(true);
      }
    },
    [currentPiece, board, gameOver, checkCollision, level, nextPiece]
  );

  const rotate = useCallback(() => {
    if (!currentPiece || gameOver) return;
    const rotated = rotatePiece(currentPiece);
    if (!checkCollision(rotated, board)) setCurrentPiece(rotated);
  }, [currentPiece, gameOver, checkCollision, board]);

  const holdPiece = useCallback(() => {
    if (!currentPiece || !canHold || gameOver) return;
    if (heldPiece) {
      const newCurrent = createPiece(heldPiece);
      setHeldPiece(currentPiece.type);
      setCurrentPiece(newCurrent);
    } else {
      setHeldPiece(currentPiece.type);
      setCurrentPiece(createPiece(nextPiece));
      setNextPiece(getNextTetromino());
    }
    setCanHold(false);
  }, [currentPiece, canHold, gameOver, heldPiece, nextPiece]);

  useEffect(() => {
    if (gameOver) return;
    gameLoopRef.current = setInterval(
      () => movePiece(0, 1),
      dropTimeRef.current
    );
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [movePiece, gameOver]);

  useEffect(() => {
    const newDropTime = Math.max(50, INITIAL_DROP_TIME - (level - 1) * 50);
    setDropTime(newDropTime);
    dropTimeRef.current = newDropTime;
  }, [level]);

  useEffect(() => {
    setLevel(Math.floor(lines / 10) + 1);
  }, [lines]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (gameOver) return;
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          movePiece(-1, 0);
          break;
        case "ArrowRight":
          e.preventDefault();
          movePiece(1, 0);
          break;
        case "ArrowUp":
          e.preventDefault();
          rotate();
          break;
        case "ArrowDown":
          e.preventDefault();
          movePiece(0, 1);
          break;
        case "c":
        case "C":
          e.preventDefault();
          holdPiece();
          break;
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [movePiece, rotate, holdPiece, gameOver]);

  useEffect(() => {
    if (!boardRef.current || gameOver) return;
    let tapTimeout: NodeJS.Timeout | null = null;
    let lastTap = 0;
    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const now = Date.now();
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      if (tapTimeout) clearTimeout(tapTimeout);
      tapTimeout = setTimeout(() => {
        tapTimeout = null;
      }, 300);
      lastTap = now;
    };
    const handleTouchEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      const dy = e.changedTouches[0].clientY - touchStartY.current;
      const duration = Date.now() - lastTap;
      const tapThreshold = 15;
      if (
        Math.abs(dx) < tapThreshold &&
        Math.abs(dy) < tapThreshold &&
        duration < 250
      ) {
        rotate();
      }
    };
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const dx = e.touches[0].clientX - touchStartX.current;
      const dy = e.touches[0].clientY - touchStartY.current;
      const threshold = 30;
      if (Math.abs(dx) > threshold) {
        movePiece(Math.sign(dx), 0);
        touchStartX.current = e.touches[0].clientX;
      }
      if (dy > threshold) {
        movePiece(0, 1);
        touchStartY.current = e.touches[0].clientY;
      } else if (dy < -threshold) {
        rotate();
        touchStartY.current = e.touches[0].clientY;
      }
    };
    const element = boardRef.current;
    element.addEventListener("touchstart", handleTouchStart);
    element.addEventListener("touchend", handleTouchEnd);
    element.addEventListener("touchmove", handleTouchMove);
    return () => {
      element.removeEventListener("touchstart", handleTouchStart);
      element.removeEventListener("touchend", handleTouchEnd);
      element.removeEventListener("touchmove", handleTouchMove);
    };
  }, [gameOver, movePiece, rotate]);

  const resetGame = () => {
    setBoard(createEmptyBoard());
    fillBag();
    setCurrentPiece(null);
    setNextPiece(getNextTetromino());
    setHeldPiece(null);
    setCanHold(true);
    setScore(0);
    setLevel(1);
    setLines(0);
    setGameOver(false);
    setDropTime(INITIAL_DROP_TIME);
    setShowStartModal(true);
    setContinuesUsed(0);
    setShowRewardModal(false);
    setPendingReward(null);
  };

  const renderBoard = () => {
    const displayBoard = board.map((row) => [...row]);
    if (currentPiece) {
      for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
          if (currentPiece.shape[y][x]) {
            const boardY = currentPiece.position.y + y;
            const boardX = currentPiece.position.x + x;
            if (
              boardY >= 0 &&
              boardY < BOARD_HEIGHT &&
              boardX >= 0 &&
              boardX < BOARD_WIDTH
            ) {
              displayBoard[boardY][boardX] = currentPiece.color;
            }
          }
        }
      }
    }
    return displayBoard;
  };

  const renderMiniPiece = (type: TetrominoType | null) => {
    if (!type) return null;
    const piece = TETROMINOES[type];
    // Filter out empty rows to center the piece vertically
    const shape = piece.shape.filter((row) => row.some((cell) => cell === 1));
    return (
      <div className="grid gap-0.5 items-center justify-center">
        {shape.map((row, y) => (
          <div key={y} className="flex gap-0.5 justify-center">
            {row.map((cell, x) => (
              <div
                key={x}
                className={cn(
                  "w-3 h-3 md:w-4 md:h-4",
                  cell ? `${piece.color}` : "bg-transparent"
                )}
              />
            ))}
          </div>
        ))}
      </div>
    );
  };

  // Reward modal handler
  const handleRewardClose = () => {
    setShowRewardModal(false);
    setPendingReward(null);
    resetGame();
  };

  // Handler for starting the game: deduct entry cost
  const handleStartGame = async () => {
    if (currency.coins >= entryCost && !currency.isLoading) {
      try {
        setLoading(true);
        await actions.startGame("tetris");
        setShowStartModal(false);
      } catch (error) {
        console.error("Failed to start game:", error);
      } finally {
        setLoading(false);
      }
    }
  };

  // Handler for cancel: go back to dashboard
  const handleCancel = () => {
    router.push("/");
  };

  // On game over, update points and submit session
  const config = gameConfigService.getGameBySlug("tetris");
  const submitGameSession = useSubmitGameSession(config, getToken);
  const handleGameOver = async () => {
    setGameOver(true);
    setShowRewardModal(true);
    const stats = {
      finalLevel: level,
      totalPrecisionScore: score,
      averageAccuracy: 0,
      perfectPlacements: 0,
      averageReactionTime: 0,
      totalGameTime: 0,
    };

    // Submit session and earn reward
    await submitGameSession(stats);

    try {
      await actions.earnReward(score, level, "score");
      setPendingReward({
        rewards: [{ amount: score, reason: "Game completion", type: "score" }],
        totalCoins: score,
        gameLevel: level,
        gameStats: stats,
      });
    } catch (error) {
      console.error("Failed to earn reward:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-blue-950 text-white flex flex-col items-center justify-center p-4 relative">
      {/* Start Modal */}
      <GameStartModal
        isOpen={showStartModal}
        onStart={handleStartGame}
        onCancel={handleCancel}
        gameKey="tetris"
        gameTitle="Tetris"
        gameDescription="Clear lines and score as high as possible!"
        gameObjective="Clear lines by arranging falling blocks"
      />

      {/* Reward Modal */}
      <RewardModal
        isOpen={showRewardModal}
        onClose={handleRewardClose}
        rewards={pendingReward?.rewards || []}
        totalCoins={pendingReward?.totalCoins || 0}
        gameLevel={pendingReward?.gameLevel || 0}
        gameStats={pendingReward?.gameStats}
      />

      {/* Top row with back button, score, and coins */}
      <div className="w-full max-w-sm mb-4 flex justify-between items-center gap-3">
        {/* Back Button */}
        <div
          className="bg-blue-600 hover:bg-blue-700 rounded-2xl p-3 cursor-pointer transition-colors"
          onClick={handleCancel}
        >
          <svg
            className="w-6 h-6 text-yellow-400"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
          </svg>
        </div>

        {/* Score Display */}
        <div className="bg-blue-600 rounded-2xl px-6 py-3 flex-1 text-center">
          <span className="text-yellow-400 text-2xl font-bold">{score}</span>
        </div>

        {/* Coins Display */}
        <div className="bg-blue-600 rounded-2xl px-4 py-3 flex items-center gap-2">
          <svg
            className="w-5 h-5 text-yellow-400"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <circle cx="12" cy="12" r="10" />
            <text
              x="12"
              y="16"
              textAnchor="middle"
              className="text-xs font-bold fill-blue-600"
            >
              $
            </text>
          </svg>
          <span className="text-yellow-400 text-lg font-bold">
            {currency.coins.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Level and Line display row */}
      <div className="w-full max-w-sm mb-4 flex gap-3">
        {/* Level Display */}
        <div className="bg-blue-600 rounded-2xl p-4 flex-1 text-center border-2 border-blue-500">
          <span className="text-yellow-400 text-xl font-bold">
            Level {level}
          </span>
        </div>

        {/* Line Display */}
        <div className="bg-blue-600 rounded-2xl p-4 flex-1 text-center border-2 border-blue-500">
          <span className="text-yellow-400 text-xl font-bold">
            Line {lines}
          </span>
        </div>
      </div>

      {/* Main game board */}
      <div className="w-full max-w-sm mb-4">
        <div
          ref={boardRef}
          className="relative bg-gradient-to-b from-blue-800 to-blue-900 border-4 border-blue-600 rounded-sm"
          style={{
            touchAction: "manipulation",
            aspectRatio: "10/20",
            minHeight: "400px",
          }}
          onClick={rotate}
        >
          <div className="grid grid-cols-10 gap-px bg-transparent h-full">
            {renderBoard().map((row, y) =>
              row.map((cell, x) => (
                <div
                  key={`${y}-${x}`}
                  className={cn(
                    "aspect-square",
                    cell ? cell : "bg-transparent"
                  )}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom row with Next and Hold sections */}
      <div className="w-full max-w-sm flex gap-3">
        {/* Next Piece Display */}
        <div className="bg-blue-600 rounded-2xl p-4 flex-1 border-2 border-blue-500">
          <div className="text-center mb-2">
            <span className="text-yellow-400 text-sm font-bold">Next</span>
          </div>
          <div className="bg-blue-800 rounded-lg p-3 h-20 flex items-center justify-center">
            {renderMiniPiece(nextPiece)}
          </div>
        </div>

        {/* Hold Piece Display */}
        <div
          className={cn(
            "bg-blue-600 rounded-2xl p-4 flex-1 border-2 border-blue-500",
            canHold ? "cursor-pointer hover:bg-blue-700" : "opacity-60"
          )}
          onClick={() => canHold && holdPiece()}
        >
          <div className="text-center mb-2">
            <span className="text-yellow-400 text-sm font-bold">Hold</span>
          </div>
          <div className="bg-blue-800 rounded-lg p-3 h-20 flex items-center justify-center">
            {renderMiniPiece(heldPiece)}
          </div>
        </div>
      </div>
    </div>
  );
}
