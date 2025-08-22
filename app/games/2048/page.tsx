"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Game2048 from "../../components/2048/game-2048";
import { GameStartModal } from "../../components/tower-block/GameStartModal";
import { useGame } from "../../lib/use-game";
import useTranslation from "../../lib/useTranslation";

export default function Page2048() {
  const t = useTranslation();
  const { restart } = useGame();
  const [showStartModal, setShowStartModal] = useState(true);
  const router = useRouter();

  const handleStartGame = () => {
    restart();
    setShowStartModal(false);
  };
  const handleCancel = () => {
    router.push("/");
  };

  useEffect(() => {
    setShowStartModal(true);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-950 py-8 px-4 text-white relative">
      <div className="w-[500px] mx-auto max-sm:w-[320px] max-sm:px-4">
        <GameStartModal
          isOpen={showStartModal}
          onStart={handleStartGame}
          onCancel={handleCancel}
          gameTitle={t.gameNames["2048"] || "2048"}
          gameDescription={"Join tiles to reach 2048!"}
        />

        {!showStartModal && (
          <>
            <div className="text-center mb-8 animate-in fade-in slide-in-from-top duration-700">
              <h1 className="text-6xl md:text-8xl font-black bg-gradient-to-r from-sky-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent mb-2 tracking-tight">
                {t.gameNames["2048"]}
              </h1>
              <p className="text-slate-400 text-lg font-medium">
                {t.joinTiles}
              </p>
            </div>
            <Game2048 />
          </>
        )}
      </div>
    </div>
  );
}
