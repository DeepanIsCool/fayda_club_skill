"use client"

import { useState, useEffect, useCallback } from "react"
import type { GridState, Position, TileState } from "./types"

const TILE_SIZE = 4
const LOCAL_STORAGE_KEY = "2048GameState"
const BEST_SCORE_KEY = "2048BestScore"

// LocalStorageManager replacement
const storageManager = {
  getGameState: () => {
    try {
      const state = localStorage.getItem(LOCAL_STORAGE_KEY)
      return state ? JSON.parse(state) : null
    } catch (e) {
      console.error("Failed to load game state from localStorage", e)
      return null
    }
  },
  setGameState: (state: any) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state))
    } catch (e) {
      console.error("Failed to save game state to localStorage", e)
    }
  },
  clearGameState: () => {
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY)
    } catch (e) {
      console.error("Failed to clear game state", e)
    }
  },
  getBestScore: () => {
    if (typeof window === "undefined") return 0;
    try {
      const score = localStorage.getItem(BEST_SCORE_KEY);
      return score ? Number.parseInt(score, 10) : 0;
    } catch (e) {
      console.error("Failed to load best score from localStorage", e);
      return 0;
    }
  },
  setBestScore: (score: number) => {
    try {
      localStorage.setItem(BEST_SCORE_KEY, score.toString())
    } catch (e) {
      console.error("Failed to save best score to localStorage", e)
    }
  },
}

// Grid management functions
const initializeGrid = (): GridState => {
  return Array.from({ length: TILE_SIZE }, () => Array.from({ length: TILE_SIZE }, () => null))
}

const cellsAvailable = (grid: GridState): boolean => {
  return grid.some((row) => row.some((cell) => !cell))
}

const availableCells = (grid: GridState): Position[] => {
  const cells: Position[] = []
  grid.forEach((row, x) => {
    row.forEach((cell, y) => {
      if (!cell) {
        cells.push({ x, y })
      }
    })
  })
  return cells
}

const randomAvailableCell = (grid: GridState): Position | undefined => {
  const cells = availableCells(grid)
  if (cells.length) {
    return cells[Math.floor(Math.random() * cells.length)]
  }
}

const addRandomTile = (grid: GridState): GridState => {
  if (cellsAvailable(grid)) {
    const newGrid = grid.map((row) => [...row])
    const position = randomAvailableCell(newGrid)
    if (position) {
      const value = Math.random() < 0.9 ? 2 : 4
      newGrid[position.x][position.y] = {
        position,
        value,
        id: Date.now() + Math.random(),
        previousPosition: null,
        mergedFrom: null,
      }
    }
    return newGrid
  }
  return grid
}

// Game logic hook
export const useGame = () => {
  const [grid, setGrid] = useState<GridState>(initializeGrid)
  const [score, setScore] = useState<number>(0)
  const [bestScore, setBestScore] = useState<number>(storageManager.getBestScore())
  const [over, setOver] = useState<boolean>(false)
  const [won, setWon] = useState<boolean>(false)
  const [keepPlaying, setKeepPlaying] = useState<boolean>(false)

  const isGameTerminated = over || (won && !keepPlaying)

  const setup = useCallback((fromStorage = false) => {
    let newGrid = initializeGrid()
    let newScore = 0
    let loadedState = null

    if (fromStorage) {
      loadedState = storageManager.getGameState()
      if (loadedState) {
        newGrid = loadedState.grid.map((col: TileState[] | null) =>
          (col ? col.map((cell: TileState | null) =>
            cell
              ? {
                  position: { x: cell.position.x, y: cell.position.y },
                  value: cell.value,
                  id: cell.id,
                  previousPosition: null,
                  mergedFrom: null,
                }
              : null,
          ) : [])
        )
        newScore = loadedState.score
        setOver(loadedState.over)
        setWon(loadedState.won)
        setKeepPlaying(loadedState.keepPlaying)
      }
 {
        newGrid = loadedState.grid.cells.map((col: any) =>
          col.map((cell: any) =>
            cell
              ? {
                  position: { x: cell.position.x, y: cell.position.y },
                  value: cell.value,
                  id: cell.id,
                  previousPosition: null,
                  mergedFrom: null,
                }
              : null,
          ),
        )
        newScore = loadedState.score
        setOver(loadedState.over)
        setWon(loadedState.won)
        setKeepPlaying(loadedState.keepPlaying)
      }
    }

    if (!loadedState) {
      newGrid = addRandomTile(newGrid)
      newGrid = addRandomTile(newGrid)
    }
    setGrid(newGrid)
    setScore(newScore)
    setOver(false)
    setWon(false)
    setKeepPlaying(false)
  }, [])

  useEffect(() => {
    setup(true)
  }, [setup])

  useEffect(() => {
    if (score > bestScore) {
      setBestScore(score)
      storageManager.setBestScore(score)
    }
    if (over) {
      storageManager.clearGameState()
    } else {
      storageManager.setGameState({
        grid: { cells: grid },
        score,
        over,
        won,
        keepPlaying,
      })
    }
  }, [grid, score, over, won, keepPlaying, bestScore])

  const getVector = (direction: number) => {
    const map = {
      0: { x: 0, y: -1 },
      1: { x: 1, y: 0 },
      2: { x: 0, y: 1 },
      3: { x: -1, y: 0 },
    }
    return map[direction as keyof typeof map]
  }

  const positionsEqual = (first: Position, second: Position) => {
    return first.x === second.x && first.y === second.y
  }

  const movesAvailable = (currentGrid: GridState): boolean => {
    const cells = availableCells(currentGrid)
    if (cells.length > 0) return true

    for (let x = 0; x < TILE_SIZE; x++) {
      for (let y = 0; y < TILE_SIZE; y++) {
        const tile = currentGrid[x][y]
        if (tile) {
          for (let direction = 0; direction < 4; direction++) {
            const vector = getVector(direction)
            const cell = { x: x + vector.x, y: y + vector.y }
            if (cell.x >= 0 && cell.x < TILE_SIZE && cell.y >= 0 && cell.y < TILE_SIZE) {
              const other = currentGrid[cell.x][cell.y]
              if (other && other.value === tile.value) {
                return true
              }
            }
          }
        }
      }
    }
    return false
  }

  const move = useCallback(
    (direction: number) => {
      console.log("[v0] Move function called with direction:", direction)
      if (isGameTerminated) {
        console.log("[v0] Game is terminated, not moving")
        return
      }

      const vector = getVector(direction)
      const traversals = {
        x: Array.from({ length: TILE_SIZE }, (_, i) => i),
        y: Array.from({ length: TILE_SIZE }, (_, i) => i),
      }
      if (vector.x === 1) traversals.x = traversals.x.reverse()
      if (vector.y === 1) traversals.y = traversals.y.reverse()

      let moved = false
      let newGrid = grid.map((row) =>
        row.map((tile) => {
          if (tile) {
            return {
              ...tile,
              previousPosition: tile.position ? { ...tile.position } : null,
              mergedFrom: null as TileState[] | null,
            }
          }
          return null
        }),
      )
      let newScore = score

      traversals.x.forEach((x) => {
        traversals.y.forEach((y) => {
          const tile = newGrid[x][y]

          if (tile) {
            let farthest = { ...tile.position }
            let next = { x: tile.position.x + vector.x, y: tile.position.y + vector.y }

            while (next.x >= 0 && next.x < TILE_SIZE && next.y >= 0 && next.y < TILE_SIZE && !newGrid[next.x][next.y]) {
              farthest = next
              next = { x: next.x + vector.x, y: next.y + vector.y }
            }

            const nextTile =
              next.x >= 0 && next.x < TILE_SIZE && next.y >= 0 && next.y < TILE_SIZE ? newGrid[next.x][next.y] : null

            if (nextTile && nextTile.value === tile.value && !nextTile.mergedFrom) {
              newGrid[tile.position.x][tile.position.y] = null
              newGrid[next.x][next.y] = {
                ...nextTile,
                position: next,
                value: nextTile.value * 2,
                id: Date.now() + Math.random(),
                previousPosition: tile.position ? { ...tile.position } : null,
                mergedFrom: [{ ...tile }, { ...nextTile }],
              }
              newScore += nextTile.value * 2
              if (nextTile.value * 2 === 2048) setWon(true)
              moved = true
            } else {
              if (!positionsEqual(farthest, tile.position)) {
                newGrid[farthest.x][farthest.y] = tile
                newGrid[tile.position.x][tile.position.y] = null
                tile.position = farthest
                moved = true
              }
            }
          }
        })
      })

      if (moved) {
        newGrid = addRandomTile(newGrid)
        setGrid(newGrid)
        setScore(newScore)
        if (!movesAvailable(newGrid)) {
          setOver(true)
        }
      }
    },
    [grid, score, isGameTerminated],
  )

  const restart = useCallback(() => {
    storageManager.clearGameState()
    setup()
  }, [setup])

  const keepPlayingFunc = useCallback(() => {
    setKeepPlaying(true)
    setOver(false)
  }, [])

  useEffect(() => {
    console.log("[v0] Setting up event listeners")

    const keydownHandler = (event: KeyboardEvent) => {
      console.log("[v0] Key pressed:", event.which, event.key)

      const map: { [key: number]: number } = {
        38: 0, // Up
        39: 1, // Right
        40: 2, // Down
        37: 3, // Left
        75: 0, // Vim up
        76: 1, // Vim right
        74: 2, // Vim down
        72: 3, // Vim left
        87: 0, // W
        68: 1, // D
        83: 2, // S
        65: 3, // A
      }
      const mapped = map[event.which]

      if (mapped !== undefined) {
        console.log("[v0] Moving in direction:", mapped)
        event.preventDefault()
        event.stopPropagation()
        move(mapped)
      }
    }

    document.addEventListener("keydown", keydownHandler)

    const restartButton = document.querySelector(".restart-button")
    const retryButton = document.querySelector(".retry-button")

    const handleRestartClick = (event: Event) => {
      event.preventDefault()
      restart()
    }

    if (restartButton) {
      restartButton.addEventListener("click", handleRestartClick)
    }
    if (retryButton) {
      retryButton.addEventListener("click", handleRestartClick)
    }

    const gameContainer = document.querySelector(".game-container")
    if (gameContainer) {
      console.log("[v0] Game container found, adding touch listeners")
      let touchStartClientX: number, touchStartClientY: number

      const handleTouchStart = (event: TouchEvent) => {
        console.log("[v0] Touch start")
        if (event.touches.length > 1) {
          return
        }
        touchStartClientX = event.touches[0].clientX
        touchStartClientY = event.touches[0].clientY
        event.preventDefault()
      }

      const handleTouchEnd = (event: TouchEvent) => {
        console.log("[v0] Touch end")
        if (event.changedTouches.length === 0) {
          return
        }
        const touchEndClientX = event.changedTouches[0].clientX
        const touchEndClientY = event.changedTouches[0].clientY

        const dx = touchEndClientX - touchStartClientX
        const absDx = Math.abs(dx)
        const dy = touchEndClientY - touchStartClientY
        const absDy = Math.abs(dy)

        if (Math.max(absDx, absDy) > 10) {
          const direction = absDx > absDy ? (dx > 0 ? 1 : 3) : dy > 0 ? 2 : 0
          console.log("[v0] Touch move detected, direction:", direction)
          move(direction)
        }
      }

      gameContainer.addEventListener("touchstart", handleTouchStart as EventListener)
      gameContainer.addEventListener("touchmove", (event) => event.preventDefault(), { passive: false })
      gameContainer.addEventListener("touchend", handleTouchEnd as EventListener)

      return () => {
        document.removeEventListener("keydown", keydownHandler)
        gameContainer.removeEventListener("touchstart", handleTouchStart as EventListener)
        gameContainer.removeEventListener("touchend", handleTouchEnd as EventListener)
        if (restartButton) {
          restartButton.removeEventListener("click", handleRestartClick)
        }
        if (retryButton) {
          retryButton.removeEventListener("click", handleRestartClick)
        }
      }
    } else {
      console.log("[v0] Game container not found!")
      return () => {
        document.removeEventListener("keydown", keydownHandler)
      }
    }
  }, [restart, move])

  return { grid, score, bestScore, over, won, keepPlaying, restart, keepPlayingFunc }
}
