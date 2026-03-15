"use client";

import * as React from "react";
import { motion } from "framer-motion";

export function DNABackground() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
            <svg
                className="h-full w-full"
                viewBox="0 0 800 600"
                xmlns="http://www.w3.org/2000/svg"
            >
                <motion.g
                    animate={{
                        y: [0, -20, 0],
                    }}
                    transition={{
                        duration: 5,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                >
                    {Array.from({ length: 20 }).map((_, i) => (
                        <React.Fragment key={i}>
                            <motion.circle
                                cx={400 + Math.sin(i * 0.5) * 100}
                                cy={i * 40}
                                r="4"
                                fill="currentColor"
                                className="text-primary"
                                animate={{
                                    cx: [400 + Math.sin(i * 0.5) * 100, 400 - Math.sin(i * 0.5) * 100],
                                }}
                                transition={{
                                    duration: 3,
                                    repeat: Infinity,
                                    repeatType: "reverse",
                                    delay: i * 0.1,
                                }}
                            />
                            <motion.circle
                                cx={400 - Math.sin(i * 0.5) * 100}
                                cy={i * 40}
                                r="4"
                                fill="currentColor"
                                className="text-secondary"
                                animate={{
                                    cx: [400 - Math.sin(i * 0.5) * 100, 400 + Math.sin(i * 0.5) * 100],
                                }}
                                transition={{
                                    duration: 3,
                                    repeat: Infinity,
                                    repeatType: "reverse",
                                    delay: i * 0.1,
                                }}
                            />
                            <motion.line
                                x1={400 + Math.sin(i * 0.5) * 100}
                                y1={i * 40}
                                x2={400 - Math.sin(i * 0.5) * 100}
                                y2={i * 40}
                                stroke="currentColor"
                                strokeWidth="1"
                                className="text-muted-foreground/30"
                                animate={{
                                    x1: [400 + Math.sin(i * 0.5) * 100, 400 - Math.sin(i * 0.5) * 100],
                                    x2: [400 - Math.sin(i * 0.5) * 100, 400 + Math.sin(i * 0.5) * 100],
                                }}
                                transition={{
                                    duration: 3,
                                    repeat: Infinity,
                                    repeatType: "reverse",
                                    delay: i * 0.1,
                                }}
                            />
                        </React.Fragment>
                    ))}
                </motion.g>
            </svg>
        </div>
    );
}
