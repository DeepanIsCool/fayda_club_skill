import Link from "next/link";
import { LargeCurrencyDisplay } from "./components/CurrencyDisplay";

export default function Dashboard() {
  const games = [
    {
      name: "Tower Block",
      description: "Build the highest tower possible with precision.",
      path: "/games/tower-block",
      cost: 1,
      difficulty: "Medium",
      rewards: "2-20 coins",
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 text-gray-900 dark:text-white">
      {/* Header with Currency */}
      <div className="w-full max-w-4xl mb-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Fayda Club
          </h1>
          <LargeCurrencyDisplay />
        </div>
        <p className="text-gray-600 dark:text-gray-300 text-center">
          Play skill-based games and earn coins! 🎮
        </p>
      </div>

      {/* Games Grid */}
      <div className="w-full max-w-2xl">
        {games.map((game) => (
          <Link key={game.name} href={game.path} passHref className="block">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 mb-6 cursor-pointer border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                    {game.name}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-3">
                    {game.description}
                  </p>
                </div>
                <div className="text-right">
                  <div className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 rounded-full text-yellow-700 dark:text-yellow-300 text-sm font-medium">
                    🪙 {game.cost} coin
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    🎯 {game.difficulty}
                  </span>
                  <span className="flex items-center gap-1">
                    💰 {game.rewards}
                  </span>
                </div>

                <button
                  className="px-3 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl"
                  title="Open game"
                  aria-label="Open game"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Footer Info */}
      <div className="mt-8 text-center text-gray-500 dark:text-gray-400 text-sm">
        <p>💡 Tip: Perfect plays earn bonus coins!</p>
      </div>
    </div>
  );
}
