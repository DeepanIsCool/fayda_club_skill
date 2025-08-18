"use client"
import { useGame } from "../../lib/use-game"
import type { TileState } from "../../lib/types"

export default function Game2048() {
  const { grid, score, bestScore, over, won, keepPlaying, restart, keepPlayingFunc } = useGame()

  return (
    <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom duration-700 delay-300">
      <div className="flex gap-4 mb-8 w-full max-w-md">
        <div className="flex-1 bg-gradient-to-br from-amber-100 to-orange-100 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-amber-200/50 transform hover:scale-105 transition-all duration-200">
          <div className="text-amber-700 text-sm font-bold uppercase tracking-wider mb-1">Score</div>
          <div className="text-amber-900 text-2xl md:text-3xl font-black tabular-nums">{score.toLocaleString()}</div>
        </div>
        <div className="flex-1 bg-gradient-to-br from-yellow-100 to-amber-100 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-yellow-200/50 transform hover:scale-105 transition-all duration-200">
          <div className="text-yellow-700 text-sm font-bold uppercase tracking-wider mb-1">Best</div>
          <div className="text-yellow-900 text-2xl md:text-3xl font-black tabular-nums">
            {bestScore.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="game-container relative w-full max-w-[500px] aspect-square p-4 md:p-6 cursor-default select-none touch-none bg-gradient-to-br from-amber-200 to-orange-200 rounded-3xl shadow-2xl border border-amber-300/50 backdrop-blur-sm">
        {(over || won) && (
          <div
            className={`absolute inset-0 z-[100] flex flex-col items-center justify-center rounded-3xl backdrop-blur-md animate-in fade-in zoom-in duration-500 ${
              won
                ? "bg-gradient-to-br from-yellow-400/90 to-amber-400/90 text-white"
                : "bg-gradient-to-br from-gray-800/90 to-gray-900/90 text-white"
            }`}
          >
            <div className="text-center animate-in slide-in-from-bottom duration-700 delay-200">
              <p className="text-4xl md:text-6xl font-black mb-6 animate-bounce">
                {won ? "🎉 You Win!" : "💀 Game Over!"}
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
                  className="group relative overflow-hidden bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 active:scale-95"
                >
                  <span className="relative z-10">Try Again</span>
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
                  className="flex-1 aspect-square rounded-xl bg-gradient-to-br from-amber-300/40 to-orange-300/40 backdrop-blur-sm border border-amber-400/30 shadow-inner"
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

              const baseSize = "calc((100% - 0.75rem) / 4)" // 3rem total gap / 4 tiles
              const gapSize = "0.25rem" // gap-2 = 0.5rem, so 0.25rem per side

              const getTileStyles = (value: number) => {
                const baseClasses = "text-white font-black shadow-lg border border-white/20"
                const styles = {
                  2: `bg-gradient-to-br from-slate-300 to-slate-400 text-slate-700 ${baseClasses}`,
                  4: `bg-gradient-to-br from-slate-400 to-slate-500 text-slate-800 ${baseClasses}`,
                  8: `bg-gradient-to-br from-orange-400 to-orange-500 ${baseClasses}`,
                  16: `bg-gradient-to-br from-orange-500 to-red-500 ${baseClasses}`,
                  32: `bg-gradient-to-br from-red-500 to-red-600 ${baseClasses}`,
                  64: `bg-gradient-to-br from-red-600 to-red-700 ${baseClasses}`,
                  128: `bg-gradient-to-br from-yellow-400 to-yellow-500 text-2xl md:text-3xl ${baseClasses}`,
                  256: `bg-gradient-to-br from-yellow-500 to-amber-500 text-2xl md:text-3xl ${baseClasses}`,
                  512: `bg-gradient-to-br from-amber-500 to-orange-500 text-2xl md:text-3xl ${baseClasses}`,
                  1024: `bg-gradient-to-br from-orange-500 to-red-500 text-xl md:text-2xl ${baseClasses}`,
                  2048: `bg-gradient-to-br from-yellow-400 to-yellow-500 text-xl md:text-2xl animate-pulse ${baseClasses}`,
                }
                return (
                  styles[value as keyof typeof styles] ||
                  `bg-gradient-to-br from-purple-600 to-purple-700 text-lg md:text-xl ${baseClasses}`
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
                    className={`w-full h-full rounded-xl flex items-center justify-center text-3xl md:text-4xl transform hover:scale-105 transition-all duration-150 ${getTileStyles(tile.value)}`}
                  >
                    {tile.value}
                  </div>
                </div>
              )
            })}
        </div>
      </div>

      <div className="mt-8 text-center max-w-md animate-in fade-in slide-in-from-bottom duration-700 delay-500">
        <p className="text-amber-700/70 text-sm md:text-base leading-relaxed">
          <strong className="text-amber-800">HOW TO PLAY:</strong> Use your arrow keys to move the tiles. When two tiles
          with the same number touch, they merge into one!
        </p>
      </div>
    </div>
  )
}
