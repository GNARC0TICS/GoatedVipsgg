import { motion } from "framer-motion";
import { FirebaseAuth } from "@/components/FirebaseAuth";

export default function AuthPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <FirebaseAuth />
      </motion.div>
    </div>
  );
}
