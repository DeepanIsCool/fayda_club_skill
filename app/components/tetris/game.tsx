"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/app/components/ui/button"
import { Card } from "@/app/components/ui/card"
import { cn } from "@/app/lib/utils"
import { Play, RotateCw, Package } from "lucide-react"

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
const BOARD_HEIGHT = 10
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

const createEmptyBoard = (): Board => Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(null))
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
  const [board, setBoard] = useState<Board>(createEmptyBoard())
  const [currentPiece, setCurrentPiece] = useState<Piece | null>(null)
  const [nextPiece, setNextPiece] = useState<TetrominoType>(getRandomTetromino())
  const [heldPiece, setHeldPiece] = useState<TetrominoType | null>(null)
  const [canHold, setCanHold] = useState(true)
  const [score, setScore] = useState(0)
  const [level, setLevel] = useState(1)
  const [lines, setLines] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [dropTime, setDropTime] = useState(INITIAL_DROP_TIME)

  const dropTimeRef = useRef(dropTime)
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null)
  const boardRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)

  useEffect(() => {
    if (!currentPiece) {
      setCurrentPiece(createPiece(nextPiece))
      setNextPiece(getRandomTetromino())
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
    return false
  }, [])

  const rotatePiece = useCallback((piece: Piece): Piece => {
    const rotated = piece.shape[0].map((_, index) => piece.shape.map((row) => row[index]).reverse())
    return { ...piece, shape: rotated }
  }, [])

  const placePiece = useCallback((piece: Piece, board: Board): Board => {
    const newBoard = board.map((row) => [...row])
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const boardY = piece.position.y + y
          const boardX = piece.position.x + x
          if (boardY >= 0) newBoard[boardY][boardX] = piece.color
        }
      }
    }
    return newBoard
  }, [])

  const clearLines = useCallback((board: Board): { newBoard: Board; linesCleared: number } => {
    const newBoard = board.filter((row) => row.some((cell) => cell === null))
    const linesCleared = BOARD_HEIGHT - newBoard.length
    while (newBoard.length < BOARD_HEIGHT) newBoard.unshift(Array(BOARD_WIDTH).fill(null))
    return { newBoard, linesCleared }
  }, [])

  const calculateScore = useCallback((linesCleared: number, level: number): number => {
    const baseScores = [0, 40, 100, 300, 1200]
    return baseScores[linesCleared] * level
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
        setNextPiece(getRandomTetromino())
        setCanHold(true)
      }
    },
    [currentPiece, board, gameOver, checkCollision, placePiece, clearLines, calculateScore, level, nextPiece],
  )

  const rotate = useCallback(() => {
    if (!currentPiece || gameOver) return
    const rotated = rotatePiece(currentPiece)
    if (!checkCollision(rotated, board)) setCurrentPiece(rotated)
  }, [currentPiece, gameOver, rotatePiece, checkCollision, board])

  const holdPiece = useCallback(() => {
    if (!currentPiece || !canHold || gameOver) return
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
    setCurrentPiece(null)
    setNextPiece(getRandomTetromino())
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
    <div className="min-h-screen bg-slate-900 p-2 sm:p-4 overflow-hidden text-white flex flex-col items-center justify-center">
      <div className="flex flex-col lg:flex-row items-center lg:items-start gap-4 w-full max-w-6xl">
        {/* Left Side - Score (Vertical) */}
        <Card className="p-3 bg-slate-800/50 border-slate-700 shadow-sm hidden md:flex flex-col items-center justify-center">
          <div className="text-center">
            <div className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-2">Score</div>
            <div className="font-bold text-xl text-sky-400 rotate-0 lg:-rotate-90 transform origin-center whitespace-nowrap">
              {score.toLocaleString()}
            </div>
          </div>
        </Card>

        {/* Mobile Top Bar - Score and Hold */}
        <div className="flex md:hidden w-full justify-between mb-2">
          <Card className="p-2 bg-slate-800/50 border-slate-700 shadow-sm">
            <div className="text-center">
              <div className="text-xs text-slate-400">Score</div>
              <div className="font-bold text-sm text-sky-400">{score.toLocaleString()}</div>
            </div>
          </Card>
          
          <Card 
            className={cn("p-2 bg-slate-800/50 border-slate-700 shadow-sm", canHold ? "cursor-pointer hover:bg-slate-800" : "opacity-50 cursor-not-allowed")}
            onClick={() => canHold && holdPiece()}
          >
            <div className="text-center">
              <div className="text-xs text-slate-400">Hold</div>
              <div className="h-6 w-6 bg-slate-900 border border-slate-700 rounded flex items-center justify-center mx-auto">
                {renderMiniPiece(heldPiece)}
              </div>
            </div>
          </Card>
        </div>

        {/* Game Board */}
        <div className="relative">
          <Card ref={boardRef} className="p-2 sm:p-4 bg-slate-800/50 border-slate-700 shadow-xl relative overflow-hidden">
            {gameOver && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
                <div className="text-center text-white">
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 md:mb-6 text-sky-400">
                    Game Over
                  </h2>
                  <Button
                    onClick={resetGame}
                    className="bg-gradient-to-r from-blue-600 to-sky-600 hover:opacity-90 text-white font-bold py-3 px-6 rounded-lg shadow-sm transform hover:scale-105 transition-all duration-200"
                  >
                    Play Again
                  </Button>
                </div>
              </div>
            )}
            <div className="grid grid-cols-10 gap-px bg-blue-950/20 p-2 sm:p-3 rounded-lg border border-slate-700 max-w-none">
              {renderBoard().map((row, y) =>
                row.map((cell, x) => (
                  <div key={`${y}-${x}`} className={cn("w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 border border-slate-700/50 rounded-sm transition-all duration-150", cell ? `${cell} shadow-md border-black/20` : "bg-slate-900")} />
                )),
              )}
            </div>
          </Card>
        </div>

        {/* Right Side - Hold and Next Pieces (Vertical) */}
        <div className="flex flex-col gap-4">
          {/* Hold Piece */}
          <Card 
            className={cn("p-3 bg-slate-800/50 border-slate-700 shadow-sm hidden md:block", canHold ? "cursor-pointer hover:bg-slate-800" : "opacity-50 cursor-not-allowed")}
            onClick={() => canHold && holdPiece()}
          >
            <div className="text-center">
              <h3 className="text-sky-400 text-xs font-bold mb-2 flex items-center justify-center gap-1 uppercase tracking-wider">
                <Package className="w-3 h-3" />
                Hold
              </h3>
              <div className="h-16 bg-slate-900 border border-slate-700 rounded flex items-center justify-center">
                {renderMiniPiece(heldPiece)}
              </div>
            </div>
          </Card>

          {/* Next Piece */}
          <Card className="p-3 bg-slate-800/50 border-slate-700 shadow-sm hidden md:block">
            <div className="text-center">
              <h3 className="text-cyan-400 text-xs font-bold mb-2 flex items-center justify-center gap-1 uppercase tracking-wider">
                <RotateCw className="w-3 h-3" />
                Next
              </h3>
              <div className="h-16 bg-slate-900 border border-slate-700 rounded flex items-center justify-center">
                {renderMiniPiece(nextPiece)}
              </div>
            </div>
          </Card>

          {/* Mobile Bottom Bar - Next Piece */}
          <Card className="p-2 bg-slate-800/50 border-slate-700 shadow-sm md:hidden mt-2">
            <div className="text-center">
              <h3 className="text-cyan-400 text-xs font-bold mb-1 flex items-center justify-center gap-1">
                <RotateCw className="w-3 h-3" />
                Next
              </h3>
              <div className="h-8 bg-slate-900 border border-slate-700 rounded flex items-center justify-center mx-auto">
                {renderMiniPiece(nextPiece)}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Mobile Level and Lines */}
      <div className="flex md:hidden justify-center mt-4 gap-4">
        <Card className="p-2 bg-slate-800/50 border-slate-700 shadow-sm">
          <div className="text-center">
            <div className="text-xs text-slate-400">Level</div>
            <div className="font-bold text-sm text-white">{level}</div>
          </div>
        </Card>
        <Card className="p-2 bg-slate-800/50 border-slate-700 shadow-sm">
          <div className="text-center">
            <div className="text-xs text-slate-400">Lines</div>
            <div className="font-bold text-sm text-cyan-400">{lines}</div>
          </div>
        </Card>
      </div>
    </div>
  )
}