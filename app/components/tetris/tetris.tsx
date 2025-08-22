"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/ui/button"
import { Card } from "@/ui/card"
import { cn } from "@/app/lib/utils"
import { RotateCw, Package } from "lucide-react"

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
const isMobile = typeof window !== "undefined" && window.innerWidth < 768
const BOARD_HEIGHT = isMobile ? 20 : 10
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
  let currentIndex = array.length,  randomIndex;

  while (currentIndex != 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }

  return array;
}

export default function TetrisGame() {
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
  const [score, setScore] = useState(24);
  const [level, setLevel] = useState(1);
  const [lines, setLines] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [dropTime, setDropTime] = useState(INITIAL_DROP_TIME);

  const dropTimeRef = useRef(dropTime);
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  useEffect(() => {
    if (!currentPiece) {
      setCurrentPiece(createPiece(nextPiece))
      setNextPiece(getNextTetromino())
    }
  }, [currentPiece, nextPiece])

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
    const handleTouchStart = (e: TouchEvent) => { e.preventDefault(); touchStartX.current = e.touches[0].clientX; touchStartY.current = e.touches[0].clientY }
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      const dx = e.touches[0].clientX - touchStartX.current
      const dy = e.touches[0].clientY - touchStartY.current
      const threshold = 30
      if (Math.abs(dx) > threshold) { movePiece(Math.sign(dx), 0); touchStartX.current = e.touches[0].clientX }
      if (dy > threshold) { movePiece(0, 1); touchStartY.current = e.touches[0].clientY }
      else if (dy < -threshold) { rotate(); touchStartY.current = e.touches[0].clientY }
    }
    const element = boardRef.current
    element.addEventListener("touchstart", handleTouchStart)
    element.addEventListener("touchmove", handleTouchMove)
    return () => { element.removeEventListener("touchstart", handleTouchStart); element.removeEventListener("touchmove", handleTouchMove) }
  }, [gameOver, movePiece, rotate])

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
    return (
      <div className="grid gap-0.5 items-center justify-center">
        {piece.shape.map((row, y) => (
          <div key={y} className="flex gap-0.5 justify-center">
            {row.map((cell, x) => (
              <div
                key={x}
                className={cn("w-2 h-2 sm:w-3 sm:h-3 rounded-sm border", cell ? `${piece.color} border-black/20` : "bg-transparent border-transparent")}
              />
            ))}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 p-2 sm:p-4 text-white flex items-center justify-center">
      <div className="w-full max-w-4xl">
        <div className="grid grid-cols-1 gap-4">
          {/* Top - Score, Level, Lines */}
          <div className="flex justify-between gap-4">
            <Card className="flex-1 p-3 sm:p-4 bg-slate-800 border-slate-700">
              <div className="text-center">
                <div className="text-xs sm:text-sm text-slate-400 mb-1">SCORE</div>
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-white">{score}</div>
              </div>
            </Card>
            <Card className="flex-1 p-3 sm:p-4 bg-slate-800 border-slate-700">
              <div className="text-center">
                <div className="text-xs sm:text-sm text-slate-400 mb-1">LEVEL</div>
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-white">{level}</div>
              </div>
            </Card>
            <Card className="flex-1 p-3 sm:p-4 bg-slate-800 border-slate-700">
              <div className="text-center">
                <div className="text-xs sm:text-sm text-slate-400 mb-1">LINES</div>
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-cyan-400">{lines}</div>
              </div>
            </Card>
          </div>

          {/* Center - Game Board */}
          <div className="flex justify-center">
            <Card ref={boardRef} className="p-3 sm:p-4 lg:p-6 bg-slate-800 border-slate-700 relative">
              {gameOver && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
                  <div className="text-center text-white">
                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 lg:mb-6 text-sky-400">Game Over</h2>
                    <Button onClick={resetGame} className="bg-gradient-to-r from-blue-600 to-sky-600 hover:opacity-90 text-white font-bold py-2 px-4 sm:py-3 sm:px-6 rounded-lg">
                      Play Again
                    </Button>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-10 gap-px bg-slate-950 p-2 sm:p-3 lg:p-4 rounded border-2 border-slate-600">
                {renderBoard().map((row, y) =>
                  row.map((cell, x) => (
                    <div key={`${y}-${x}`} className={cn("w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 xl:w-12 xl:h-12 border border-slate-700 rounded-sm", cell ? `${cell} shadow-sm border-black/20` : "bg-slate-800")} />
                  )),
                )}
              </div>
            </Card>
          </div>

          {/* Bottom - Next and Hold */}
          <div className="flex justify-between gap-4">
            <Card className="flex-1 p-3 sm:p-4 bg-slate-800 border-slate-700">
              <div className="text-center">
                <div className="text-xs sm:text-sm text-slate-400 mb-2">NEXT</div>
                <div className="h-12 sm:h-16 lg:h-20 bg-slate-900 border border-slate-600 rounded flex items-center justify-center">
                  {renderMiniPiece(nextPiece)}
                </div>
              </div>
            </Card>
            <Card 
              className={cn("flex-1 p-3 sm:p-4 bg-red-300 border-slate-700", canHold ? "cursor-pointer hover:bg-red-400" : "opacity-50")}
              onClick={() => canHold && holdPiece()}
            >
              <div className="text-center">
                <div className="text-xs sm:text-sm text-slate-800 font-bold mb-2">HOLD</div>
                <div className="h-12 sm:h-16 lg:h-20 bg-slate-900 border border-slate-600 rounded flex items-center justify-center">
                  {renderMiniPiece(heldPiece)}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}