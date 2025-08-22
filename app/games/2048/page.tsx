import Game2048 from "../../components/2048/2048"

export default function TwentyFortyEight() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-950 px-4 relative">
      <div className="w-[500px] mx-auto max-sm:w-[320px] max-sm:px-4">
        <Game2048 />
      </div>
    </div>
  );
}
