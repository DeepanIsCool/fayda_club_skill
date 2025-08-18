"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/app/components/ui/button"
import { Card } from "@/app/components/ui/card"
import { useMobile } from "@/app/lib/mobile"
import { cn } from "@/app/lib/utils"
import { Pause, Play, RotateCw, ArrowLeft, ArrowRight, Package } from "lucide-react"

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
  const isMobile = useMobile()
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
        case "c":
        case "C":
          e.preventDefault()
          holdPiece()
          break
        case "p":
        case "P":
          e.preventDefault()
          setIsPaused((prev) => !prev)
          break
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [movePiece, rotate, holdPiece, gameOver])

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
      <div className="grid gap-0.5 p-1 md:p-3">
        {piece.shape.map((row, y) => (
          <div key={y} className="flex gap-0.5">
            {row.map((cell, x) => (
              <div
                key={x}
                className={cn(
                  "w-2 h-2 md:w-3 md:h-3 rounded-sm border",
                  cell ? `${piece.color} border-white/20` : "bg-muted border-border",
                )}
              />
            ))}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-1 md:p-4">
      <div className="flex flex-col items-center justify-center w-full max-w-6xl mx-auto">
        <div className="text-center mb-2 md:mb-8">
          <h1 className="text-2xl md:text-6xl font-bold text-primary mb-1 md:mb-2 tracking-tight">TETRIS</h1>
          <p className="text-muted-foreground text-xs md:text-base font-medium">Classic block puzzle game</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-2 md:gap-6 items-center justify-center w-full">
          {/* Mobile: Top info bar with HOLD, SCORE, NEXT in horizontal layout */}
          <div className="flex lg:hidden justify-between items-center w-full max-w-sm gap-2 mb-2">
            <Card className="p-2 bg-card border-border shadow-sm flex-1">
              <h3 className="text-accent text-xs font-bold mb-1 flex items-center gap-1 uppercase tracking-wider">
                <Package className="w-3 h-3" />
                HOLD
              </h3>
              <div className="w-8 h-8 bg-muted border border-border rounded flex items-center justify-center">
                {renderMiniPiece(heldPiece)}
              </div>
            </Card>

            <Card className="p-2 bg-card border-border shadow-sm flex-1">
              <div className="text-card-foreground space-y-1 text-center">
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Score</div>
                  <div className="font-bold text-xs text-accent">{score.toLocaleString()}</div>
                </div>
                <div className="flex justify-between gap-2">
                  <div>
                    <div className="text-xs text-muted-foreground">LVL</div>
                    <div className="font-bold text-xs text-primary">{level}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">LINES</div>
                    <div className="font-bold text-xs text-secondary">{lines}</div>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-2 bg-card border-border shadow-sm flex-1">
              <h3 className="text-secondary text-xs font-bold mb-1 flex items-center gap-1 uppercase tracking-wider">
                <RotateCw className="w-3 h-3" />
                NEXT
              </h3>
              <div className="w-8 h-8 bg-muted border border-border rounded flex items-center justify-center">
                {renderMiniPiece(nextPiece)}
              </div>
            </Card>
          </div>

          {/* Desktop: Side panels */}
          <div className="hidden lg:flex flex-col gap-4 w-auto justify-start">
            <Card className="p-6 bg-card border-border shadow-sm">
              <h3 className="text-accent text-sm font-bold mb-4 flex items-center gap-2 uppercase tracking-wider">
                <Package className="w-4 h-4" />
                HOLD
              </h3>
              <div className="w-20 h-20 bg-muted border border-border rounded-lg flex items-center justify-center">
                {renderMiniPiece(heldPiece)}
              </div>
            </Card>

            <Card className="p-6 bg-card border-border shadow-sm">
              <div className="text-card-foreground space-y-4">
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Score</div>
                  <div className="font-bold text-xl text-accent">{score.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Level</div>
                  <div className="font-bold text-xl text-primary">{level}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Lines</div>
                  <div className="font-bold text-xl text-secondary">{lines}</div>
                </div>
              </div>
            </Card>
          </div>

          <div className="flex flex-col items-center gap-2 md:gap-6">
            <Card className="p-2 md:p-6 bg-card border-border shadow-lg relative overflow-hidden">
              {(gameOver || isPaused) && (
                <div className="absolute inset-0 bg-background/95 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
                  <div className="text-center text-foreground">
                    <h2 className="text-xl md:text-4xl font-bold mb-2 md:mb-6 text-primary">
                      {gameOver ? "GAME OVER" : "PAUSED"}
                    </h2>
                    {gameOver && (
                      <Button
                        onClick={resetGame}
                        className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold py-2 md:py-3 px-4 md:px-8 rounded-lg shadow-sm transform hover:scale-105 transition-all duration-200 text-sm"
                      >
                        Play Again
                      </Button>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-10 gap-px bg-primary/5 p-1 md:p-4 rounded-lg border border-border">
                {renderBoard().map((row, y) =>
                  row.map((cell, x) => (
                    <div
                      key={`${y}-${x}`}
                      className={cn(
                        "w-3 h-3 md:w-7 md:h-7 border border-border/50 rounded-sm transition-all duration-150",
                        cell ? `${cell} shadow-sm` : "bg-muted/50",
                      )}
                    />
                  )),
                )}
              </div>
            </Card>

            <div className="flex flex-col gap-2 md:gap-6 w-full max-w-xs">
              {/* Top row - Hold and Rotate */}
              <div className="flex justify-center gap-2 md:gap-4">
                <Button
                  onTouchStart={() => holdPiece()}
                  onClick={() => holdPiece()}
                  disabled={!canHold}
                  className="bg-secondary hover:bg-secondary/90 disabled:bg-muted disabled:text-muted-foreground text-secondary-foreground font-bold py-2 md:py-4 px-3 md:px-6 rounded-lg shadow-sm transform hover:scale-105 active:scale-95 transition-all duration-200 flex items-center gap-1 md:gap-2 text-xs md:text-sm"
                >
                  <Package className="w-3 h-3 md:w-4 md:h-4" />
                  HOLD
                </Button>

                <Button
                  onTouchStart={e => {
                    e.preventDefault();
                    if (isMobile) rotate();
                  }}
                  onClick={e => {
                    if (!isMobile) rotate();
                  }}
                  className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold py-2 md:py-4 px-3 md:px-6 rounded-lg shadow-sm transform hover:scale-105 active:scale-95 transition-all duration-200 flex items-center gap-1 md:gap-2 text-xs md:text-sm"
                >
                  <RotateCw className="w-3 h-3 md:w-4 md:h-4" />
                  ROTATE
                </Button>
              </div>

              {/* Bottom row - Left, Pause, Right */}
              <div className="grid grid-cols-3 gap-2 md:gap-4 max-w-64 md:max-w-80 mx-auto">
                <Button
                  onTouchStart={() => movePiece(-1, 0)}
                  onClick={() => movePiece(-1, 0)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-10 md:h-16 rounded-lg shadow-sm transform hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center"
                >
                  <ArrowLeft className="w-4 h-4 md:w-6 md:h-6" />
                </Button>

                <Button
                  onTouchStart={() => setIsPaused((prev) => !prev)}
                  onClick={() => setIsPaused((prev) => !prev)}
                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold h-10 md:h-16 rounded-lg shadow-sm transform hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center gap-1 md:gap-2"
                >
                  {isPaused ? <Play className="w-3 h-3 md:w-5 md:h-5" /> : <Pause className="w-3 h-3 md:w-5 md:h-5" />}
                  <span className="text-xs md:text-sm font-bold">{isPaused ? "PLAY" : "PAUSE"}</span>
                </Button>

                <Button
                  onTouchStart={() => movePiece(1, 0)}
                  onClick={() => movePiece(1, 0)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-10 md:h-16 rounded-lg shadow-sm transform hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center"
                >
                  <ArrowRight className="w-4 h-4 md:w-6 md:h-6" />
                </Button>
              </div>
            </div>

            {!isMobile && (
              <Card className="p-6 bg-card border-border shadow-sm">
                <div className="text-card-foreground text-sm space-y-2">
                  <div className="font-bold mb-3 text-accent uppercase tracking-wider">Keyboard Controls:</div>
                  <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                    <div>← → : Move</div>
                    <div>↑ : Rotate</div>
                    <div>C : Hold</div>
                    <div>P : Pause</div>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Desktop: Right side panels */}
          <div className="hidden lg:flex flex-col gap-4 w-auto justify-start">
            <Card className="p-6 bg-card border-border shadow-sm">
              <h3 className="text-secondary text-sm font-bold mb-4 flex items-center gap-2 uppercase tracking-wider">
                <RotateCw className="w-4 h-4" />
                NEXT
              </h3>
              <div className="w-20 h-20 bg-muted border border-border rounded-lg flex items-center justify-center">
                {renderMiniPiece(nextPiece)}
              </div>
            </Card>

            {!gameOver && (
              <Button
                onClick={() => setIsPaused((prev) => !prev)}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold py-4 px-6 rounded-lg shadow-sm transform hover:scale-105 transition-all duration-200 flex items-center gap-2 text-sm"
              >
                {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                {isPaused ? "RESUME" : "PAUSE"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
