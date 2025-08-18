"use client"


import Game2048 from "../../components/2048/game-2048"
import { useGame } from "../../lib/use-game"
import { useState, useEffect } from "react"

export default function GamePage() {
  const { restart } = useGame()
  const [showModal, setShowModal] = useState(true)

  const handleNewGame = () => {
    restart()
    setShowModal(false)
  }

  useEffect(() => {
    setShowModal(true)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 py-8 px-4">
      <div className="w-[500px] mx-auto max-sm:w-[320px] max-sm:px-4">
        {/* Modal for New Game */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-2xl p-8 max-w-xs w-full text-center animate-in fade-in">
              <h2 className="text-3xl font-bold mb-4 text-amber-700">Start New Game</h2>
              <button
                onClick={handleNewGame}
                className="group relative overflow-hidden bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 active:scale-95 restart-button"
              >
                <span className="relative z-10">Start</span>
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-8 animate-in fade-in slide-in-from-top duration-700">
          <h1 className="text-6xl md:text-8xl font-black bg-gradient-to-r from-amber-600 via-orange-600 to-yellow-600 bg-clip-text text-transparent mb-2 tracking-tight">
            2048
          </h1>
          <p className="text-amber-700/70 text-lg font-medium">
            Join the tiles, get to 2048!
          </p>
        </div>

        {/* Game Board */}
        <Game2048 />
      </div>
    </div>
  )
}
