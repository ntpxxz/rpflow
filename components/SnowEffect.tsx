"use client";

import { useEffect, useState } from "react";

// New Year Celebration Effect (Confetti)
export default function SnowEffect() {
  // Chinese New Year Celebration Emojis
  const emojis = ["🧧", "🏮", "🐉", "🍊", "🧨", "🌸", "💰", "🏮", "🧧"];

  const [pieces, setPieces] = useState<
    Array<{
      id: number;
      left: string;
      animationDuration: string;
      animationDelay: string;
      fontSize: string;
      opacity: string;
      rotate: string;
      emoji: string;
    }>
  >([]);

  useEffect(() => {
    const count = 60; // slightly fewer pieces for better performance with larger emojis
    const newPieces = [];
    for (let i = 0; i < count; i++) {
      const emoji = emojis[Math.floor(Math.random() * emojis.length)];
      newPieces.push({
        id: i,
        left: `${Math.random() * 100}%`,
        animationDuration: `${Math.random() * 8 + 7}s`, // slower, more graceful fall
        animationDelay: `${Math.random() * 10}s`,
        fontSize: `${Math.random() * 1 + 10}px`,
        opacity: '20%', // more visible for festive feel
        rotate: `${Math.random() * 360}deg`,
        emoji,
      });
    }
    setPieces(newPieces);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden" aria-hidden="true">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="absolute top-[-40px]"
          style={{
            left: p.left,
            fontSize: p.fontSize,
            opacity: p.opacity,
            transform: `rotate(${p.rotate})`,
            animation: `fall ${p.animationDuration} linear infinite`,
            animationDelay: p.animationDelay,
          }}
        >
          {p.emoji}
        </div>
      ))}
      <style jsx>{`
        @keyframes fall {
          0% { 
            transform: translateY(-40px) rotate(0deg) translateX(0); 
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          20% {
            opacity: 1;
          }
          70% { 
            transform: translateY(105vh) rotate(360deg) translateX(30px); 
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
