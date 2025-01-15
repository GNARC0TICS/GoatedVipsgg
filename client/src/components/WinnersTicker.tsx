
import { motion } from "framer-motion";

const mockWinners = [
  { username: "Player123", amount: 1500, game: "Crash" },
  { username: "Winner456", amount: 2300, game: "Dice" },
  { username: "Lucky789", amount: 3400, game: "Plinko" },
];

export function WinnersTicker() {
  return (
    <div className="w-full bg-[#1A1B21]/50 backdrop-blur-sm py-2 overflow-hidden border-y border-[#2A2B31]">
      <motion.div
        animate={{ x: ["100%", "-100%"] }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="flex gap-8 whitespace-nowrap"
      >
        {mockWinners.map((winner, index) => (
          <span key={index} className="text-[#8A8B91]">
            <span className="text-white">{winner.username}</span> won $
            {winner.amount.toLocaleString()} on {winner.game}!
          </span>
        ))}
      </motion.div>
    </div>
  );
}
