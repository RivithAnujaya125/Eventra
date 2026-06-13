import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import EventraLogo from "./EventraLogo";

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 700); // Match fade transition
    }, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="flex flex-col items-center"
          >
            <div className="mb-8 scale-150 transform">
              <EventraLogo className="h-16" />
            </div>
            <p className="text-zinc-500 font-mono tracking-widest uppercase">
              Your Gateway to Experiences
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
