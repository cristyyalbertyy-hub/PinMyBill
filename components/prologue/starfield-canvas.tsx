"use client";

import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  orange: boolean;
};

export function StarfieldCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;
    let particles: Particle[] = [];
    let width = 0;
    let height = 0;

    function resize() {
      if (!canvas) return;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      const count = Math.min(140, Math.floor((width * height) / 12000));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        size: Math.random() * 1.8 + 0.4,
        orange: Math.random() < 0.12,
      }));
    }

    function onMove(e: MouseEvent) {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    }

    function onTouchMove(e: TouchEvent) {
      const touch = e.touches[0];
      if (!touch) return;
      mouseRef.current = { x: touch.clientX, y: touch.clientY };
    }

    function onLeave() {
      mouseRef.current = { x: -9999, y: -9999 };
    }

    function draw() {
      if (!ctx) return;
      ctx.fillStyle = "rgba(6, 6, 12, 0.22)";
      ctx.fillRect(0, 0, width, height);

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      for (const p of particles) {
        const dx = p.x - mx;
        const dy = p.y - my;
        const dist = Math.hypot(dx, dy);
        if (dist < 120) {
          const force = (120 - dist) / 120;
          p.vx += (dx / (dist || 1)) * force * 0.08;
          p.vy += (dy / (dist || 1)) * force * 0.08;
        }

        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.98;
        p.vy *= 0.98;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        if (p.orange) {
          ctx.fillStyle = "rgba(249, 115, 22, 0.85)";
          ctx.shadowBlur = 12;
          ctx.shadowColor = "rgba(249, 115, 22, 0.9)";
        } else {
          ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
          ctx.shadowBlur = 0;
        }
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      if (mx > 0) {
        const grad = ctx.createRadialGradient(mx, my, 0, mx, my, 180);
        grad.addColorStop(0, "rgba(249, 115, 22, 0.14)");
        grad.addColorStop(1, "rgba(249, 115, 22, 0)");
        ctx.fillStyle = grad;
        ctx.fillRect(mx - 180, my - 180, 360, 360);
      }

      frame = requestAnimationFrame(draw);
    }

    resize();
    draw();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("mouseleave", onLeave);
    window.addEventListener("touchend", onLeave);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("touchend", onLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0 h-full w-full"
      aria-hidden
    />
  );
}
