"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import useTranslation from "@/app/lib/useTranslation"
import { Button } from "@/app/components/ui/button"
import { Card } from "@/app/components/ui/card"
import { cn } from "@/app/lib/utils"
import { Pause, Play, RotateCw, Package } from "lucide-react"

// Tetromino shapes and colors
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
}

const BOARD_WIDTH = 10
const BOARD_HEIGHT = 20
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

const createEmptyBoard = (): Board =>
  Array(BOARD_HEIGHT)
    .fill(null)
    .map(() => Array(BOARD_WIDTH).fill(null))

const getRandomTetromino = (): TetrominoType => {
  const types = Object.keys(TETROMINOES) as TetrominoType[]
  return types[Math.floor(Math.random() * types.length)]
}

const createPiece = (type: TetrominoType): Piece => ({
  shape: TETROMINOES[type].shape,
  color: TETROMINOES[type].color,
  position: { x: Math.floor(BOARD_WIDTH / 2) - Math.floor(TETROMINOES[type].shape[0].length / 2), y: 0 },
  type,
})

export default function TetrisGame() {
  const t = useTranslation();
  const [board, setBoard] = useState<Board>(createEmptyBoard())
  const [currentPiece, setCurrentPiece] = useState<Piece | null>(null)
  const [nextPiece, setNextPiece] = useState<TetrominoType>(getRandomTetromino())
  const [heldPiece, setHeldPiece] = useState<TetrominoType | null>(null)
  const [canHold, setCanHold] = useState(true)
  const [score, setScore] = useState(0)
  const [level, setLevel] = useState(1)
  const [lines, setLines] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [dropTime, setDropTime] = useState(INITIAL_DROP_TIME)

  const dropTimeRef = useRef(dropTime)
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null)
  const boardRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)

  // Initialize first piece
  useEffect(() => {
    if (!currentPiece) {
      setCurrentPiece(createPiece(nextPiece))
      setNextPiece(getRandomTetromino())
    }
  }, [currentPiece, nextPiece])

  // Check collision
  const checkCollision = useCallback((piece: Piece, board: Board, dx = 0, dy = 0): boolean => {
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const newX = piece.position.x + x + dx
          const newY = piece.position.y + y + dy

          if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) {
            return true
          }

          if (newY >= 0 && board[newY][newX]) {
            return true
          }
        }
      }
    }
    return false
  }, [])

  // Rotate piece
  const rotatePiece = useCallback((piece: Piece): Piece => {
    const rotated = piece.shape[0].map((_, index) => piece.shape.map((row) => row[index]).reverse())
    return { ...piece, shape: rotated }
  }, [])

  // Place piece on board
  const placePiece = useCallback((piece: Piece, board: Board): Board => {
    const newBoard = board.map((row) => [...row])

    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const boardY = piece.position.y + y
          const boardX = piece.position.x + x
          if (boardY >= 0) {
            newBoard[boardY][boardX] = piece.color
          }
        }
      }
    }

    return newBoard
  }, [])

  // Clear completed lines
  const clearLines = useCallback((board: Board): { newBoard: Board; linesCleared: number } => {
    const newBoard = board.filter((row) => row.some((cell) => cell === null))
    const linesCleared = BOARD_HEIGHT - newBoard.length

    while (newBoard.length < BOARD_HEIGHT) {
      newBoard.unshift(Array(BOARD_WIDTH).fill(null))
    }

    return { newBoard, linesCleared }
  }, [])

  // Calculate score
  const calculateScore = useCallback((linesCleared: number, level: number): number => {
    const baseScores = [0, 40, 100, 300, 1200]
    return baseScores[linesCleared] * level
  }, [])

  // Move piece
  const movePiece = useCallback(
    (dx: number, dy: number) => {
      if (!currentPiece || gameOver || isPaused) return

      if (!checkCollision(currentPiece, board, dx, dy)) {
        setCurrentPiece((prev) =>
          prev
            ? {
                ...prev,
                position: { x: prev.position.x + dx, y: prev.position.y + dy },
              }
            : null,
        )
      } else if (dy > 0) {
        // Piece hit bottom, place it
        const newBoard = placePiece(currentPiece, board)
        const { newBoard: clearedBoard, linesCleared } = clearLines(newBoard)

        setBoard(clearedBoard)
        setLines((prev) => prev + linesCleared)
        setScore((prev) => prev + calculateScore(linesCleared, level))

        // Check game over
        if (currentPiece.position.y <= 0) {
          setGameOver(true)
          return
        }

        // Spawn new piece
        setCurrentPiece(createPiece(nextPiece))
        setNextPiece(getRandomTetromino())
        setCanHold(true)
      }
    },
    [currentPiece, board, gameOver, isPaused, checkCollision, placePiece, clearLines, calculateScore, level, nextPiece],
  )

  // Rotate current piece
  const rotate = useCallback(() => {
    if (!currentPiece || gameOver || isPaused) return

    const rotated = rotatePiece(currentPiece)
    if (!checkCollision(rotated, board)) {
      setCurrentPiece(rotated)
    }
  }, [currentPiece, gameOver, isPaused, rotatePiece, checkCollision, board])

  // Hold piece
  const holdPiece = useCallback(() => {
    if (!currentPiece || !canHold || gameOver || isPaused) return

    if (heldPiece) {
      const newCurrent = createPiece(heldPiece)
      setHeldPiece(currentPiece.type)
      setCurrentPiece(newCurrent)
    } else {
      setHeldPiece(currentPiece.type)
      setCurrentPiece(createPiece(nextPiece))
      setNextPiece(getRandomTetromino())
    }

    setCanHold(false)
  }, [currentPiece, canHold, gameOver, isPaused, heldPiece, nextPiece])

  // Game loop
  useEffect(() => {
    if (gameOver || isPaused) return

    gameLoopRef.current = setInterval(() => {
      movePiece(0, 1)
    }, dropTimeRef.current)

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current)
      }
    }
  }, [movePiece, gameOver, isPaused])

  // Update drop time based on level
  useEffect(() => {
    const newDropTime = Math.max(50, INITIAL_DROP_TIME - (level - 1) * 50)
    setDropTime(newDropTime)
    dropTimeRef.current = newDropTime
  }, [level])

  // Update level based on lines
  useEffect(() => {
    setLevel(Math.floor(lines / 10) + 1)
  }, [lines])

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (gameOver) return

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault()
          movePiece(-1, 0)
          break
        case "ArrowRight":
          e.preventDefault()
          movePiece(1, 0)
          break
        case "ArrowUp":
          e.preventDefault()
          rotate()
          break
        case "ArrowDown":
          e.preventDefault()
          movePiece(0, 1)
          break
        case "c":
        case "C":
          e.preventDefault()
          holdPiece()
          break
        case "p":
        case "P":
        case " ":
          e.preventDefault()
          setIsPaused((prev) => !prev)
          break
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [movePiece, rotate, holdPiece, gameOver])

  // Touch controls for mobile
  useEffect(() => {
    if (!boardRef.current || gameOver || isPaused) return

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault()
      touchStartX.current = e.touches[0].clientX
      touchStartY.current = e.touches[0].clientY
    }

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      const dx = e.touches[0].clientX - touchStartX.current
      const dy = e.touches[0].clientY - touchStartY.current
      const threshold = 30

      if (Math.abs(dx) > threshold) {
        movePiece(Math.sign(dx), 0)
        touchStartX.current = e.touches[0].clientX
      }

      if (dy > threshold) {
        movePiece(0, 1)
        touchStartY.current = e.touches[0].clientY
      } else if (dy < -threshold) {
        rotate()
        touchStartY.current = e.touches[0].clientY
      }
    }

    const element = boardRef.current
    element.addEventListener("touchstart", handleTouchStart)
    element.addEventListener("touchmove", handleTouchMove)

    return () => {
      element.removeEventListener("touchstart", handleTouchStart)
      element.removeEventListener("touchmove", handleTouchMove)
    }
  }, [gameOver, isPaused, movePiece, rotate])

  // Reset game
  const resetGame = () => {
    setBoard(createEmptyBoard())
    setCurrentPiece(null)
    setNextPiece(getRandomTetromino())
    setHeldPiece(null)
    setCanHold(true)
    setScore(0)
    setLevel(1)
    setLines(0)
    setGameOver(false)
    setIsPaused(false)
    setDropTime(INITIAL_DROP_TIME)
  }

  // Render board with current piece
  const renderBoard = () => {
    const displayBoard = board.map((row) => [...row])

    // Add current piece to display board
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

  // Render mini piece for next/hold display
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
                className={cn(
                  "w-2 h-2 sm:w-3 sm:h-3 rounded-sm border",
                  cell ? `${piece.color} border-white/20` : "bg-transparent border-transparent",
                )}
              />
            ))}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-2 sm:p-4 overflow-hidden">
      {/* Header */}
      {/* <div className="text-center mb-4">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-primary mb-1 tracking-tight">TETRIS</h1>
      </div> */}

      {/* Top Info Bar - Mobile & Desktop */}
      <div className="max-w-7xl mx-auto mb-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
          {/* Hold */}
          <Card 
            className={cn(
              "p-2 sm:p-3 bg-card border-border shadow-sm transition-all duration-200",
              canHold ? "cursor-pointer hover:bg-muted/50" : "opacity-50 cursor-not-allowed"
            )}
            onClick={() => canHold && holdPiece()}
          >
            <div className="text-center">
              <h3 className="text-accent text-xs sm:text-sm font-bold mb-2 flex items-center justify-center gap-1 uppercase tracking-wider">
                <Package className="w-3 h-3 sm:w-4 sm:h-4" />
                {t.hold}
              </h3>
              <div className="h-12 sm:h-16 bg-muted/30 border border-border rounded flex items-center justify-center">
                {renderMiniPiece(heldPiece)}
              </div>
            </div>
          </Card>

          {/* Score */}
          <Card className="p-2 sm:p-3 bg-card border-border shadow-sm">
            <div className="text-center space-y-1">
              <div className="text-xs sm:text-sm text-muted-foreground uppercase tracking-wider font-medium">{t.score}</div>
              <div className="font-bold text-sm sm:text-lg text-accent">{score.toLocaleString()}</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="text-muted-foreground">{t.level}</div>
                  <div className="font-bold text-primary">{level}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">{t.lines}</div>
                  <div className="font-bold text-secondary">{lines}</div>
                </div>
              </div>
            </div>
          </Card>

          {/* Next */}
          <Card className="p-2 sm:p-3 bg-card border-border shadow-sm">
            <div className="text-center">
              <h3 className="text-secondary text-xs sm:text-sm font-bold mb-2 flex items-center justify-center gap-1 uppercase tracking-wider">
                <RotateCw className="w-3 h-3 sm:w-4 sm:h-4" />
                {t.next}
              </h3>
              <div className="h-12 sm:h-16 bg-muted/30 border border-border rounded flex items-center justify-center">
                {renderMiniPiece(nextPiece)}
              </div>
            </div>
          </Card>

          {/* Controls */}
          <Card className="p-2 sm:p-3 bg-card border-border shadow-sm">
            <div className="text-center space-y-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsPaused((prev) => !prev)}
                className="w-full h-8 sm:h-10"
              >
                {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                <span className="ml-2 text-xs">{isPaused ? t.resume : t.pause}</span>
              </Button>
              <div className="hidden sm:block text-xs text-muted-foreground space-y-1">
                <div>{t.arrowKeys}</div>
                <div>{t.upToRotate}</div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Game Board - Maximized */}
      <div className="flex justify-center">
        <div className="relative">
          <Card ref={boardRef} className="p-2 sm:p-4 bg-card border-border shadow-xl relative overflow-hidden">
            {(gameOver || isPaused) && (
              <div className="absolute inset-0 bg-background/95 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
                <div className="text-center text-foreground">
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 md:mb-6 text-primary">
                    {gameOver ? t.gameOver : t.pause}
                  </h2>
                  {gameOver && (
                    <Button
                      onClick={resetGame}
                      className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold py-3 px-6 rounded-lg shadow-sm transform hover:scale-105 transition-all duration-200"
                    >
                      {t.play}
                    </Button>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-10 gap-px bg-primary/5 p-2 sm:p-3 rounded-lg border border-border max-w-none">
              {renderBoard().map((row, y) =>
                row.map((cell, x) => (
                  <div
                    key={`${y}-${x}`}
                    className={cn(
                      "w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 border border-border/30 rounded-sm transition-all duration-150",
                      cell ? `${cell} shadow-sm border-white/20` : "bg-muted/30",
                    )}
                  />
                )),
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Mobile Instructions */}
      <div className="sm:hidden text-center mt-4 text-xs text-muted-foreground space-y-1">
        <div>{t.swipeInstructions}</div>
        <div>{t.swipeDown}</div>
      </div>
    </div>
  )
}