"use client"

import type React from "react"

import { useGame } from "./use-game"
import type { TileState } from "./types"

export default function Game2048() {
  const { grid, score, bestScore, over, won, keepPlaying, restart, keepPlayingFunc } = useGame()

  return (
    <div className="flex flex-col items-center">
      <div className="flex gap-4 mb-6">
        <div className="bg-[#bbada0] rounded-sm px-6 py-3 text-center min-w-[80px]">
          <div className="text-[#eee4da] text-xs font-bold uppercase tracking-wide">Score</div>
          <div className="text-white text-2xl font-bold">{score}</div>
        </div>
        <div className="bg-[#bbada0] rounded-sm px-6 py-3 text-center min-w-[80px]">
          <div className="text-[#eee4da] text-xs font-bold uppercase tracking-wide">Best</div>
          <div className="text-white text-2xl font-bold">{bestScore}</div>
        </div>
      </div>

      <div className="game-container relative w-[500px] h-[500px] mt-10 p-4 cursor-default select-none touch-none bg-[#bbada0] rounded-md box-border max-sm:w-[280px] max-sm:h-[280px] max-sm:mt-4 max-sm:p-2.5">
        {/* Game Over/Win Message */}
        {(over || won) && (
          <div
            className={`absolute inset-0 z-[100] text-center animate-[fade-in_800ms_ease_1200ms] animation-fill-mode-both ${
              won ? "bg-[rgba(237,194,46,0.5)] text-[#f9f6f2]" : "bg-[rgba(238,228,218,0.5)]"
            }`}
          >
            <p className="text-6xl font-bold h-15 leading-[60px] mt-[222px] max-sm:text-[30px] max-sm:h-[30px] max-sm:leading-[30px] max-sm:mt-[90px]">
              {won ? "You win!" : "Game over!"}
            </p>
            <div className="block mt-[59px] max-sm:mt-[30px]">
              {won && !keepPlaying && (
                <button
                  onClick={keepPlayingFunc}
                  className="inline-block bg-[#8f7a66] rounded-sm px-5 py-0 text-[#f9f6f2] h-10 leading-[42px] ml-2 no-underline border-none cursor-pointer"
                >
                  Keep going
                </button>
              )}
              <button
                onClick={restart}
                className="retry-button inline-block bg-[#8f7a66] rounded-sm px-5 py-0 text-[#f9f6f2] h-10 leading-[42px] ml-2 no-underline border-none cursor-pointer"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        <div className="absolute z-[1] inset-4 max-sm:inset-2.5">
          {Array.from({ length: 4 }).map((_, rowIndex) => (
            <div key={rowIndex} className="flex gap-4 mb-4 last:mb-0 max-sm:gap-2.5 max-sm:mb-2.5">
              {Array.from({ length: 4 }).map((_, colIndex) => (
                <div
                  key={colIndex}
                  className="w-[106.25px] h-[106.25px] rounded-sm bg-[rgba(238,228,218,0.35)] max-sm:w-[57.5px] max-sm:h-[57.5px]"
                />
              ))}
            </div>
          ))}
        </div>

        <div className="absolute z-[2] inset-4 max-sm:inset-2.5">
          {grid
            .flat()
            .filter((tile): tile is TileState => !!tile)
            .map((tile) => {
              const x = tile.position.x
              const y = tile.position.y

              const desktopTransform = `translate(${x * 121}px, ${y * 121}px)`

              const getTileStyles = (value: number) => {
                const styles = {
                  2: "bg-[#eee4da] text-[#776e65]",
                  4: "bg-[#ede0c8] text-[#776e65]",
                  8: "bg-[#f2b179] text-[#f9f6f2]",
                  16: "bg-[#f59563] text-[#f9f6f2]",
                  32: "bg-[#f67c5f] text-[#f9f6f2]",
                  64: "bg-[#f65e3b] text-[#f9f6f2]",
                  128: "bg-[#edcf72] text-[#f9f6f2] text-[45px] max-sm:text-[25px]",
                  256: "bg-[#edcc61] text-[#f9f6f2] text-[45px] max-sm:text-[25px]",
                  512: "bg-[#edc850] text-[#f9f6f2] text-[45px] max-sm:text-[25px]",
                  1024: "bg-[#edc53f] text-[#f9f6f2] text-[35px] max-sm:text-[15px]",
                  2048: "bg-[#edc22e] text-[#f9f6f2] text-[35px] max-sm:text-[15px]",
                }
                return (
                  styles[value as keyof typeof styles] || "bg-[#3c3a32] text-[#f9f6f2] text-[30px] max-sm:text-[10px]"
                )
              }

              return (
                <div
                  key={tile.id}
                  className={`absolute transition-transform duration-100 ease-in-out w-[107px] h-[107px] leading-[107px] max-sm:w-[58px] max-sm:h-[58px] max-sm:leading-[58px]`}
                  style={
                    {
                      transform: desktopTransform,
                      "--mobile-x": `${x * 67}px`,
                      "--mobile-y": `${y * 67}px`,
                    } as React.CSSProperties & { "--mobile-x": string; "--mobile-y": string }
                  }
                >
                  <div
                    className={`rounded-sm text-center font-bold z-10 text-[55px] max-sm:text-[35px] w-full h-full leading-[107px] max-sm:leading-[58px] ${getTileStyles(tile.value)}`}
                  >
                    {tile.value}
                  </div>
                </div>
              )
            })}
        </div>

        <style jsx global>{`
          @media screen and (max-width: 520px) {
            .game-container .absolute {
              transform: translate(var(--mobile-x), var(--mobile-y)) !important;
            }
          }
        `}</style>
      </div>
    </div>
  )
}
