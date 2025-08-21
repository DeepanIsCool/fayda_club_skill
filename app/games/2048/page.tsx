"use client"
import Game2048 from "../../components/2048/game-2048"
import { useGame } from "../../lib/use-game"
import { useState, useEffect } from "react"
import useTranslation from "../../lib/useTranslation"

export default function GamePage() {
  const t = useTranslation()
  const { restart } = useGame()
  const [showModal, setShowModal] = useState(true)

  const handleNewGame = () => {
    restart()
    setShowModal(false)
  }

  useEffect(() => {
    // This effect ensures the modal appears when the component mounts.
    // Set to true to show by default on page load.
    setShowModal(true)
  }, [])

  return (
    // --- MODIFIED: Main page background ---
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-950 py-8 px-4 text-white">
      <div className="w-[500px] mx-auto max-sm:w-[320px] max-sm:px-4">
        {/* Modal for New Game */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            {/* --- MODIFIED: Modal styling --- */}
            <div className="bg-slate-800/80 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl p-8 max-w-xs w-full text-center animate-in fade-in">
              <h2 className="text-3xl font-bold mb-4 text-sky-400">{t.startNewGame}</h2>
              <div className="mt-8 text-center max-w-md animate-in fade-in slide-in-from-bottom duration-700 delay-500">
                <p className="text-slate-300 text-sm md:text-base leading-relaxed pb-8">
                  {/* --- MODIFIED: Modal text color --- */}
                  <strong className="text-slate-100">{t.howtoplay}</strong>
                </p>
              </div>
              {/* --- MODIFIED: Modal button --- */}
              <button
                onClick={handleNewGame}
                className="group relative overflow-hidden bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 active:scale-95 restart-button"
              >
                <span className="relative z-10">{t.start}</span>
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              </button>
            </div>
          </div>
        )}

        {/* --- MODIFIED: Header text colors --- */}
        <div className="text-center mb-8 animate-in fade-in slide-in-from-top duration-700">
          <h1 className="text-6xl md:text-8xl font-black bg-gradient-to-r from-sky-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent mb-2 tracking-tight">
            {t.gameNames["2048"]}
          </h1>
          <p className="text-slate-400 text-lg font-medium">
            {t.joinTiles}
          </p>
        </div>

        {/* Game Board (uses its own updated styles) */}
        <Game2048 />
      </div>
    </div>
  )
}