"use client";

import { CheckCircle } from "lucide-react";
import { motion } from "motion/react";

type SuccessScreenProps = {
  title: string;
  desc: string;
  onDone: () => void;
};

export function SuccessScreen({ title, desc, onDone }: SuccessScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-8 text-center">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300 }}>
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <CheckCircle size={44} className="text-green-600" />
        </div>
      </motion.div>
      <h2 className="text-xl font-bold text-foreground mb-2">{title}</h2>
      <p className="text-sm text-muted-foreground mb-8 leading-7">{desc}</p>
      <button onClick={onDone} className="w-full bg-primary text-white rounded-2xl py-4 font-bold text-sm">بازگشت</button>
    </div>
  );
}
