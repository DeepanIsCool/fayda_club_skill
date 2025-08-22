
"use client"

import type { Reward, GameStats } from "../modals/reward";

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/app/lib/utils"
import { CurrencyDisplay } from "../modals/currency"
import { GameStartModal } from "../modals/start"
import { ContinueModal } from "../modals/continue"
import { RewardModal } from "../modals/reward"
import { useIsMobile } from "@/ui/use-mobile"
import { useGameCurrency } from "../../contexts/CurrencyContext"
import { getGameEntryCost } from "../../lib/gameConfig"

// Tetrominoes (classic colors)
const TETROMINOES = {
  I: { shape: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], color: "bg-cyan-500" },
  O: { shape: [[1, 1], [1, 1]], color: "bg-yellow-500" },
  T: { shape: [[0, 1, 0], [1, 1, 1], [0, 0, 0]], color: "bg-purple-500" },
  S: { shape: [[0, 1, 1], [1, 1, 0], [0, 0, 0]], color: "bg-green-500" },
  Z: { shape: [[1, 1, 0], [0, 1, 1], [0, 0, 0]], color: "bg-red-500" },
  J: { shape: [[1, 0, 0], [1, 1, 1], [0, 0, 0]], color: "bg-blue-500" },
  L: { shape: [[0, 0, 1], [1, 1, 1], [0, 0, 0]], color: "bg-orange-500" },
}

const BOARD_WIDTH = 10
const BOARD_HEIGHT = 20 // Classic 10x20 board
const INITIAL_DROP_TIME = 1000

type TetrominoType = keyof typeof TETROMINOES
type Board = (string | null)[][]
type Position = { x: number; y: number }

interface Piece {
  shape: number[][]
  color: string
  position: Position
  type: TetrominoType
}

// Fisher-Yates shuffle algorithm
function shuffle<T>(array: T[]): T[] {
  let currentIndex = array.length, randomIndex;

  while (currentIndex != 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }

  return array;
}

export default function TetrisGame() {
  const router = useRouter();
  // Start modal state
  const [showStartModal, setShowStartModal] = useState(true);
  const [showContinueModal, setShowContinueModal] = useState(false);
  const [showRewardModal, setShowRewardModal] = useState(false);


  type PendingReward = {
    rewards: Reward[];
    totalCoins: number;
    gameLevel: number;
    gameStats: GameStats;
  } | null;

  const [pendingReward, setPendingReward] = useState<PendingReward>(null);

  const isMobile = useIsMobile();
  const {
    coins,
    canStartGame,
    startGame,
    earnPoints,
  } = useGameCurrency();
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
  const createEmptyBoard = (): Board => Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(null));

  const createPiece = (type: TetrominoType): Piece => ({
    shape: TETROMINOES[type].shape,
    color: TETROMINOES[type].color,
    position: { x: Math.floor(BOARD_WIDTH / 2) - Math.floor(TETROMINOES[type].shape[0].length / 2), y: 0 },
    type,
  });
  const rotatePiece = (piece: Piece): Piece => {
    const rotated = piece.shape[0].map((_, index) => piece.shape.map((row) => row[index]).reverse());
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
  const clearLines = (board: Board): { newBoard: Board; linesCleared: number } => {
    const newBoard = board.filter((row) => row.some((cell) => cell === null));
    const linesCleared = BOARD_HEIGHT - newBoard.length;
    while (newBoard.length < BOARD_HEIGHT) newBoard.unshift(Array(BOARD_WIDTH).fill(null));
    return { newBoard, linesCleared };
  };
  const calculateScore = (linesCleared: number, level: number): number => {
    const baseScores = [0, 40, 100, 300, 1200];
    return baseScores[linesCleared] * level;
  };

  const [board, setBoard] = useState<Board>(createEmptyBoard());
  const [currentPiece, setCurrentPiece] = useState<Piece | null>(null);
  const [nextPiece, setNextPiece] = useState<TetrominoType>(() => getNextTetromino());
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
      setCurrentPiece(createPiece(nextPiece))
      setNextPiece(getNextTetromino())
    }
  }, [currentPiece, nextPiece, showStartModal])

  const checkCollision = useCallback((piece: Piece, board: Board, dx = 0, dy = 0): boolean => {
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const newX = piece.position.x + x + dx
          const newY = piece.position.y + y + dy
          if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) return true
          if (newY >= 0 && board[newY][newX]) return true
        }
      }
    }
    return false;
  }, [])

  const movePiece = useCallback(
    (dx: number, dy: number) => {
      if (!currentPiece || gameOver) return
      if (!checkCollision(currentPiece, board, dx, dy)) {
        setCurrentPiece((prev) => (prev ? { ...prev, position: { x: prev.position.x + dx, y: prev.position.y + dy } } : null))
      } else if (dy > 0) {
        const newBoard = placePiece(currentPiece, board)
        const { newBoard: clearedBoard, linesCleared } = clearLines(newBoard)
        setBoard(clearedBoard)
        setLines((prev) => prev + linesCleared)
        setScore((prev) => prev + calculateScore(linesCleared, level))
        if (currentPiece.position.y <= 0) {
          setTimeout(() => setShowContinueModal(true), 300);
          setGameOver(true)
          return
        }
        setCurrentPiece(createPiece(nextPiece))
        setNextPiece(getNextTetromino())
        setCanHold(true)
      }
    },
    [currentPiece, board, gameOver, checkCollision, level, nextPiece],
  )

  const rotate = useCallback(() => {
    if (!currentPiece || gameOver) return
    const rotated = rotatePiece(currentPiece)
    if (!checkCollision(rotated, board)) setCurrentPiece(rotated)
  }, [currentPiece, gameOver, checkCollision, board])

  const holdPiece = useCallback(() => {
    if (!currentPiece || !canHold || gameOver) return
    if (heldPiece) {
      const newCurrent = createPiece(heldPiece)
      setHeldPiece(currentPiece.type)
      setCurrentPiece(newCurrent)
    } else {
      setHeldPiece(currentPiece.type)
      setCurrentPiece(createPiece(nextPiece))
      setNextPiece(getNextTetromino())
    }
    setCanHold(false)
  }, [currentPiece, canHold, gameOver, heldPiece, nextPiece])

  useEffect(() => {
    if (gameOver) return
    gameLoopRef.current = setInterval(() => movePiece(0, 1), dropTimeRef.current)
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current)
    }
  }, [movePiece, gameOver])

  useEffect(() => {
    const newDropTime = Math.max(50, INITIAL_DROP_TIME - (level - 1) * 50)
    setDropTime(newDropTime)
    dropTimeRef.current = newDropTime
  }, [level])

  useEffect(() => {
    setLevel(Math.floor(lines / 10) + 1)
  }, [lines])

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (gameOver) return
      switch (e.key) {
        case "ArrowLeft": e.preventDefault(); movePiece(-1, 0); break
        case "ArrowRight": e.preventDefault(); movePiece(1, 0); break
        case "ArrowUp": e.preventDefault(); rotate(); break
        case "ArrowDown": e.preventDefault(); movePiece(0, 1); break
        case "c": case "C": e.preventDefault(); holdPiece(); break
      }
    }
    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [movePiece, rotate, holdPiece, gameOver])

  useEffect(() => {
    if (!boardRef.current || gameOver) return
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
      const dx = (e.changedTouches[0].clientX - touchStartX.current);
      const dy = (e.changedTouches[0].clientY - touchStartY.current);
      const duration = Date.now() - lastTap;
      const tapThreshold = 15;
      if (Math.abs(dx) < tapThreshold && Math.abs(dy) < tapThreshold && duration < 250) {
        rotate();
      }
    };
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const dx = e.touches[0].clientX - touchStartX.current;
      const dy = e.touches[0].clientY - touchStartY.current;
      const threshold = 30;
      if (Math.abs(dx) > threshold) { movePiece(Math.sign(dx), 0); touchStartX.current = e.touches[0].clientX }
      if (dy > threshold) { movePiece(0, 1); touchStartY.current = e.touches[0].clientY }
      else if (dy < -threshold) { rotate(); touchStartY.current = e.touches[0].clientY }
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
    setBoard(createEmptyBoard())
    fillBag();
    setCurrentPiece(null)
    setNextPiece(getNextTetromino())
    setHeldPiece(null)
    setCanHold(true)
    setScore(0)
    setLevel(1)
    setLines(0)
    setGameOver(false)
    setDropTime(INITIAL_DROP_TIME)
    setShowStartModal(true);
    setContinuesUsed(0);
    setShowContinueModal(false);
    setShowRewardModal(false);
    setPendingReward(null);
  }

  const renderBoard = () => {
    const displayBoard = board.map((row) => [...row])
    if (currentPiece) {
      for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
          if (currentPiece.shape[y][x]) {
            const boardY = currentPiece.position.y + y
            const boardX = currentPiece.position.x + x
            if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
              displayBoard[boardY][boardX] = currentPiece.color
            }
          }
        }
      }
    }
    return displayBoard
  }

  const renderMiniPiece = (type: TetrominoType | null) => {
    if (!type) return null
    const piece = TETROMINOES[type]
    // Filter out empty rows to center the piece vertically
    const shape = piece.shape.filter(row => row.some(cell => cell === 1));
    return (
      <div className="grid gap-0.5 items-center justify-center">
        {shape.map((row, y) => (
          <div key={y} className="flex gap-0.5 justify-center">
            {row.map((cell, x) => (
              <div
                key={x}
                className={cn("w-3 h-3 md:w-4 md:h-4", cell ? `${piece.color}` : "bg-transparent")}
              />
            ))}
          </div>
        ))}
      </div>
    )
  }

  // Continue/Reward modal handlers
  const handleContinue = () => {
    setShowContinueModal(false);
    setGameOver(false);
    setContinuesUsed((c) => c + 1);
    resetGame();
    setShowStartModal(false); // skip start modal for continue
  };
  // (removed duplicate handleGameOver)
  const handleRewardClose = () => {
    setShowRewardModal(false);
    setPendingReward(null);
    resetGame();
  };

  // Continue cost progression (example: [2,4,8,16,32])
  const continueCosts = [2, 4, 8, 16, 32];
  const continueCost = continueCosts[continuesUsed] || continueCosts[continueCosts.length - 1];

  // Handler for starting the game: deduct entry cost
  const handleStartGame = () => {
    if (canStartGame("tetris", entryCost)) {
      startGame("tetris");
      setShowStartModal(false);
    }
  };

  // Handler for cancel: go back to dashboard
  const handleCancel = () => {
    router.push("/");
  };

  // On game over, update points
  const handleGameOver = () => {
    setShowContinueModal(false);
    setShowRewardModal(true);
    setPendingReward({
      rewards: [
        { amount: score, reason: "score", type: "score" },
      ],
      totalCoins: score,
      gameLevel: level,
      gameStats: {
        finalLevel: level,
        totalPrecisionScore: 0,
        averageAccuracy: 0,
        perfectPlacements: 0,
        averageReactionTime: 0,
        totalGameTime: 0,
      },
    });
  earnPoints(score, "tetris game over");
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-2 relative">
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
      {/* Continue Modal */}
      <ContinueModal
        isOpen={showContinueModal}
        onContinue={handleContinue}
        onGameOver={handleGameOver}
        currentLevel={level}
  gameKey="tetris"
  gameTitle="Tetris"
        continueCost={continueCost}
        continueLabel="Continue Playing"
        exitLabel="Exit"
        showExitAfterMs={1000}
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
      {/* CurrencyDisplay at top right on mobile */}
      {isMobile && (
        <div className="fixed top-2 right-2 z-50">
          <CurrencyDisplay />
        </div>
      )}
      <div className="flex flex-row items-start gap-3 md:gap-5">
        {/* Left Column */}
        <div className="flex flex-col gap-3 md:gap-4 w-20 md:w-28">
          {/* Hold */}
          <div
            className={cn("bg-black border-2 border-gray-700 rounded-md p-2", canHold ? "cursor-pointer" : "opacity-60")}
            onClick={() => canHold && holdPiece()}
          >
            <p className="text-center text-xs text-gray-400 mb-2">HOLD</p>
            <div className="h-16 md:h-20 bg-slate-900 rounded-sm flex items-center justify-center">
              {renderMiniPiece(heldPiece)}
            </div>
          </div>
          {/* Level */}
          <div className="bg-black border-2 border-gray-700 rounded-md p-2 text-center">
            <p className="text-xs text-gray-400">LEVEL</p>
            <p className="text-lg md:text-xl font-bold">{level}</p>
          </div>
          {/* Lines */}
          <div className="bg-black border-2 border-gray-700 rounded-md p-2 text-center">
            <p className="text-xs text-gray-400">LINES</p>
            <p className="text-lg md:text-xl font-bold">{lines}</p>
          </div>
        </div>

        {/* Center Column */}
        <div className="flex flex-col items-center gap-2">
          {/* Score */}
          <div className="bg-black border-2 border-gray-700 rounded-md p-2 w-full text-center">
            <p className="text-xs text-gray-400">SCORE</p>
            <p className="text-lg md:text-xl font-bold">{score}</p>
          </div>
          {/* Game Board */}
          <div
            ref={boardRef}
            className="relative bg-black border-4 border-gray-600 border-t-gray-500 border-l-gray-500 rounded-md"
            style={{ touchAction: "manipulation" }}
            onClick={rotate}
          >
            {/* {gameOver && (
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-10 rounded-sm">
                <div className="text-center text-white">
                  <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-red-500">Game Over</h2>
                  <button onClick={resetGame} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-md">
                    Again
                  </button>
                </div>
              </div>
            )} */}
            <div className="grid grid-cols-10 gap-px bg-slate-900 p-px">
              {renderBoard().map((row, y) =>
                row.map((cell, x) => (
                  <div
                    key={`${y}-${x}`}
                    className={cn(
                      "w-[22px] h-[22px] sm:w-6 sm:h-6 md:w-7 md:h-7",
                      cell ? cell : "bg-black"
                    )}
                  />
                )),
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-4 w-20 md:w-28">
          {/* Next */}
          <div className="bg-black border-2 border-gray-700 rounded-md p-2">
            <p className="text-center text-xs text-gray-400 mb-2">NEXT</p>
            <div className="h-24 md:h-28 bg-slate-900 rounded-sm flex items-center justify-center">
              {renderMiniPiece(nextPiece)}
            </div>
          </div>
          {/* CurrencyDisplay below NEXT on desktop */}
          {!isMobile && (
            <div>
              <CurrencyDisplay />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}