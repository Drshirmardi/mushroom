"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";
import React from "react";

type AnimatedGroupPreset = "fade" | "slide" | "scale" | "blur-slide";

const PRESETS: Record<AnimatedGroupPreset, { container: Variants; item: Variants }> = {
  fade: {
    container: { hidden: {}, show: { transition: { staggerChildren: 0.04 } } },
    item: { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.3 } } },
  },
  slide: {
    container: { hidden: {}, show: { transition: { staggerChildren: 0.04 } } },
    item: {
      hidden: { opacity: 0, y: 8 },
      show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
    },
  },
  scale: {
    container: { hidden: {}, show: { transition: { staggerChildren: 0.04 } } },
    item: {
      hidden: { opacity: 0, scale: 0.97 },
      show: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: "easeOut" } },
    },
  },
  "blur-slide": {
    container: { hidden: {}, show: { transition: { staggerChildren: 0.04 } } },
    item: {
      hidden: { opacity: 0, y: 8, filter: "blur(4px)" },
      show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.35, ease: "easeOut" } },
    },
  },
};

type AnimatedGroupProps = {
  children: React.ReactNode;
  className?: string;
  preset?: AnimatedGroupPreset;
  variants?: { container?: Variants; item?: Variants };
};

export function AnimatedGroup({ children, className, preset = "slide", variants }: AnimatedGroupProps) {
  const reduce = useReducedMotion();
  const resolved = PRESETS[preset] ?? {
    container: variants?.container ?? {},
    item: variants?.item ?? {},
  };
  return (
    <motion.div
      initial={reduce ? false : "hidden"}
      animate={reduce ? false : "show"}
      variants={resolved.container}
      className={className}
    >
      {React.Children.map(children, (child) => {
        const key = React.isValidElement(child) && child.key != null ? child.key : undefined;
        return (
          <motion.div key={key} variants={resolved.item}>
            {child}
          </motion.div>
        );
      })}
    </motion.div>
  );
}
