"use client"

import Game2048 from "../../components/2048/game-2048"
import { useGame } from "../../components/2048/use-game"

export default function GamePage() {
  const { score, bestScore, restart } = useGame()

  return (
    <div className="bg-[#eee4da]">
    <div className="w-[500px] mx-auto max-sm:w-[280px] max-sm:mx-auto max-sm:px-5 pb-24">
      {/* Header */}
      <div className="after:content-[''] after:block after:clear-both mb-2.5 max-sm:mb-2.5">
        <h1 className="text-[80px] font-bold m-0 block text-center w-full max-sm:text-[27px] max-sm:mt-4 text-amber-900">2048</h1>
      </div>

      {/* Above Game Controls */}
      <div className="after:content-[''] after:block after:clear-both">
        <div className="flex justify-center mb-4">
          <button
            onClick={restart}
            className="bg-[#8f7a66] rounded-sm px-5 text-[#f9f6f2] h-10 leading-[42px] text-center border-none cursor-pointer w-[42%] p-0 box-border mt-0.5 max-sm:w-[42%] max-sm:p-0 max-sm:box-border max-sm:mt-0.5 restart-button"
          >
            New Game
          </button>
        </div>
      </div>
      <Game2048 />
    </div>
    </div>
  )
}
