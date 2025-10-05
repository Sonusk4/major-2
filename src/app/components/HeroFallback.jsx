"use client";

import { useState, useEffect, useRef } from "react";

export default function HeroFallback() {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const handle = (e) => {
      const rect = node.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      setMouse({ x, y });
    };
    window.addEventListener("mousemove", handle);
    return () => window.removeEventListener("mousemove", handle);
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full overflow-hidden" style={{ zIndex: 0 }}>
      {/* Solid base to ensure visibility */}
      <div className="absolute inset-0" style={{ background: "#0b1220" }} />
      {/* Animated gradient background */}
      <div className="absolute inset-0 opacity-90 animate-gradient"
           style={{
             background: "linear-gradient(135deg, hsl(190 100% 50% / 0.35), hsl(158 64% 52% / 0.35), hsl(271 81% 56% / 0.35))",
             backgroundSize: "200% 200%",
           }}
      />

      {/* Parallax layers */}
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(190_100%_50%_/_0.25),transparent_70%)] blur-2xl"
        style={{ transform: `translate(${mouse.x * 30}px, ${mouse.y * 30}px)`, transition: "transform 0.3s ease-out" }}
      />
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(271_81%_56%_/_0.25),transparent_70%)] blur-2xl"
        style={{ transform: `translate(${-mouse.x * 20}px, ${-mouse.y * 20}px)`, transition: "transform 0.3s ease-out" }}
      />

      {/* Floating orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[hsl(190,100%,50%,0.35)] rounded-full blur-2xl animate-float" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[hsl(271,81%,56%,0.28)] rounded-full blur-2xl animate-float" style={{ animationDelay: "-3s" }} />
    </div>
  );
}
