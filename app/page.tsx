import Link from 'next/link';

export default function Dashboard() {
  const games = [
    {
      name: "Tower Block",
      description: "Build the highest tower possible with precision.",
      path: "/games/tower-block"
    }
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
      <h1 className="text-4xl font-bold mb-8">Game Dashboard</h1>
      <div className="w-full max-w-2xl">
        {games.map((game) => (
          <Link key={game.name} href={game.path} passHref className="block">
            <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 mb-4 cursor-pointer">
              <h2 className="text-2xl font-semibold">{game.name}</h2>
              <p className="mt-2 text-gray-600 dark:text-gray-400">{game.description}</p>
              <button className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors">
                Play Now
              </button>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}