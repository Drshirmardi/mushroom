"use client";

import { useEffect } from "react";
import { motion } from "motion/react";
import { Stethoscope } from "lucide-react";

export function SplashScreen({ onDone }: { onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 2400); return () => clearTimeout(t); }, [onDone]);
  return (
    <motion.div className="fixed inset-0 z-[100] bg-primary flex flex-col items-center justify-center"
      exit={{ opacity: 0 }} transition={{ duration: 0.6 }}>
      <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 200, delay: 0.2 }}>
        <div className="w-24 h-24 bg-white/20 rounded-3xl flex items-center justify-center mb-6 shadow-2xl">
          <Stethoscope size={44} className="text-white" />
        </div>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="text-center">
        <h1 className="text-3xl font-black text-white mb-2">سبز زندگی</h1>
        <p className="text-white/70 text-sm">همراه سلامت شما</p>
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
        className="absolute bottom-12 flex flex-col items-center gap-3">
        <motion.div className="w-8 h-1 bg-white/40 rounded-full overflow-hidden">
          <motion.div className="h-full bg-white rounded-full" initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 1.2, delay: 1.2 }} />
        </motion.div>
        <p className="text-white/50 text-xs">در حال بارگذاری...</p>
      </motion.div>
    </motion.div>
  );
}
