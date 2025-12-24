"use client";

import { useEffect, useState } from "react";

export default function SnowEffect() {
    const [snowflakes, setSnowflakes] = useState<Array<{ id: number; left: string; animationDuration: string; animationDelay: string; fontSize: string }>>([]);

    useEffect(() => {
        const count = 50;
        const newSnowflakes = [];
        for (let i = 0; i < count; i++) {
            newSnowflakes.push({
                id: i,
                left: `${Math.random() * 100}%`,
                animationDuration: `${Math.random() * 5 + 5}s`,
                animationDelay: `${Math.random() * 5}s`,
                fontSize: `${Math.random() * 10 + 10}px`,
            });
        }
        setSnowflakes(newSnowflakes);
    }, []);

    return (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden" aria-hidden="true">
            {snowflakes.map((flake) => (
                <div
                    key={flake.id}
                    className="absolute top-[-20px] text-white opacity-70"
                    style={{
                        left: flake.left,
                        animation: `fall ${flake.animationDuration} linear infinite`,
                        animationDelay: flake.animationDelay,
                        fontSize: flake.fontSize,
                    }}
                >
                    ❄
                </div>
            ))}
            <style jsx>{`
        @keyframes fall {
          0% {
            transform: translateY(-20px) translateX(0);
          }
          100% {
            transform: translateY(100vh) translateX(20px);
          }
        }
      `}</style>
        </div>
    );
}
