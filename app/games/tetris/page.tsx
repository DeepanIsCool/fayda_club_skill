import TetrisGame from "@/app/components/tetris/game";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GameStartModal } from "../../components/tower-block/GameStartModal";
import useTranslation from "../../lib/useTranslation";

export default function Home() {
  const t = useTranslation();
  const [showStartModal, setShowStartModal] = useState(true);
  const router = useRouter();

  const handleStartGame = () => {
    setShowStartModal(false);
  };
  const handleCancel = () => {
    router.push("/");
  };

  useEffect(() => {
    setShowStartModal(true);
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center p-4 relative">
      <GameStartModal
        isOpen={showStartModal}
        onStart={handleStartGame}
        onCancel={handleCancel}
        gameTitle={t.gameNames["tetris"] || "Tetris"}
        gameDescription={"Stack the blocks and clear lines!"}
      />
      {!showStartModal && <TetrisGame />}
    </main>
  );
}
