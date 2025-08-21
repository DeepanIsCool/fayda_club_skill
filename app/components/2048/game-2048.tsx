"use client"
import { useGame } from "../../lib/use-game"
import type { TileState } from "../../lib/types"

export default function Game2048() {
  const { grid, score, bestScore, over, won, keepPlaying, restart, keepPlayingFunc } = useGame()

  return (
    <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom duration-700 delay-300">
      {/* --- MODIFIED: Main game container background --- */}
      <div className="game-container relative w-full max-w-[500px] aspect-square p-4 md:p-6 cursor-default select-none touch-none bg-gradient-to-br from-slate-900 to-blue-950 rounded-3xl shadow-2xl border border-blue-800/50 backdrop-blur-sm">
        {(over || won) && (
          <div
            className={`absolute inset-0 z-[100] flex flex-col items-center justify-center rounded-3xl backdrop-blur-md animate-in fade-in zoom-in duration-500 ${
              won
                ? // --- MODIFIED: "You Win!" overlay ---
                  "bg-gradient-to-br from-sky-500/90 to-cyan-400/90 text-white"
                : "bg-gradient-to-br from-gray-800/90 to-gray-900/90 text-white"
            }`}
          >
            <div className="text-center animate-in slide-in-from-bottom duration-700 delay-200">
              <p className="text-4xl md:text-6xl font-black mb-6 animate-bounce">
                {won ? "🎉 You Win!" : "Start New Game"}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {won && !keepPlaying && (
                  <button
                    onClick={keepPlayingFunc}
                    className="group relative overflow-hidden bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-bold py-3 px-6 rounded-xl border border-white/30 hover:border-white/50 transform hover:scale-105 transition-all duration-200 active:scale-95"
                  >
                    <span className="relative z-10">Keep Going</span>
                  </button>
                )}
                <button
                  onClick={restart}
                  // --- MODIFIED: "Try Again" button ---
                  className="group relative overflow-hidden bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 active:scale-95"
                >
                  <span className="relative z-10">Start</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="absolute inset-4 md:inset-6 z-[1]">
          {Array.from({ length: 4 }).map((_, rowIndex) => (
            <div key={rowIndex} className="flex gap-2 md:gap-4 mb-2 md:mb-4 last:mb-0">
              {Array.from({ length: 4 }).map((_, colIndex) => (
                <div
                  key={colIndex}
                  // --- MODIFIED: Empty grid cell background ---
                  className="flex-1 aspect-square rounded-xl bg-slate-800/50 backdrop-blur-sm border border-blue-900/30 shadow-inner"
                />
              ))}
            </div>
          ))}
        </div>

        <div className="absolute inset-4 md:inset-6 z-[2]">
          {grid
            .flat()
            .filter((tile): tile is TileState => !!tile)
            .map((tile) => {
              const x = tile.position.x
              const y = tile.position.y

              const baseSize = "calc((100% - 0.75rem) / 4)"
              const gapSize = "0.25rem"

              // --- MODIFIED: Entire tile styling function ---
              const getTileStyles = (value: number) => {
                const baseClasses = "text-white font-black shadow-lg border border-white/20"
                const styles = {
                  2: `bg-gradient-to-br from-slate-700 to-slate-800 text-gray-200 ${baseClasses}`,
                  4: `bg-gradient-to-br from-slate-600 to-slate-700 text-gray-100 ${baseClasses}`,
                  8: `bg-gradient-to-br from-blue-700 to-blue-800 ${baseClasses}`,
                  16: `bg-gradient-to-br from-blue-600 to-blue-700 ${baseClasses}`,
                  32: `bg-gradient-to-br from-sky-600 to-sky-700 ${baseClasses}`,
                  64: `bg-gradient-to-br from-sky-500 to-sky-600 ${baseClasses}`,
                  128: `bg-gradient-to-br from-cyan-500 to-cyan-600 text-2xl md:text-3xl ${baseClasses}`,
                  256: `bg-gradient-to-br from-cyan-400 to-cyan-500 text-2xl md:text-3xl ${baseClasses}`,
                  512: `bg-gradient-to-br from-teal-400 to-teal-500 text-2xl md:text-3xl ${baseClasses}`,
                  1024: `bg-gradient-to-br from-indigo-500 to-indigo-600 text-xl md:text-2xl ${baseClasses}`,
                  2048: `bg-gradient-to-br from-indigo-400 to-purple-500 text-xl md:text-2xl animate-pulse ${baseClasses}`,
                }
                return (
                  styles[value as keyof typeof styles] ||
                  `bg-gradient-to-br from-purple-600 to-violet-700 text-lg md:text-xl ${baseClasses}`
                )
              }

              return (
                <div
                  key={tile.id}
                  className="absolute transition-all duration-200 ease-out animate-in zoom-in"
                  style={{
                    width: baseSize,
                    height: baseSize,
                    left: `calc(${x} * (${baseSize} + ${gapSize}))`,
                    top: `calc(${y} * (${baseSize} + ${gapSize}))`,
                  }}
                >
                  <div
                    className={`w-full h-full rounded-xl flex items-center justify-center text-3xl md:text-4xl transform hover:scale-105 transition-all duration-150 ${getTileStyles(
                      tile.value,
                    )}`}
                  >
                    {tile.value}
                  </div>
                </div>
              )
            })}
        </div>
      </div>
    </div>
  )
}