import React, { useEffect, useRef } from 'react';
import { REGIONS } from '../data/categoriesAndEras';
import { RegionId } from '../types/game';

interface AmbientStageCanvasProps {
  regionId: RegionId;
  impulseCounter: number;
  impulseSeverity: 'light' | 'heavy';
}

interface PooledParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  life: number;
  maxLife: number;
}

const MAX_PARTICLES = 65;

export const AmbientStageCanvas: React.FC<AmbientStageCanvasProps> = ({
  regionId,
  impulseCounter,
  impulseSeverity,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const regionRef = useRef<RegionId>(regionId);
  const traumaRef = useRef<number>(0);
  const flashRef = useRef<number>(0);
  const burstRequestRef = useRef<boolean>(false);

  useEffect(() => {
    regionRef.current = regionId;
  }, [regionId]);

  useEffect(() => {
    if (impulseCounter > 0) {
      if (impulseSeverity === 'heavy') {
        traumaRef.current = Math.min(1, traumaRef.current + 0.55);
        flashRef.current = 0.22;
        burstRequestRef.current = true;
      } else {
        traumaRef.current = Math.min(1, traumaRef.current + 0.18);
        burstRequestRef.current = true;
      }
    }
  }, [impulseCounter, impulseSeverity]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const handleResize = () => {
      if (!canvas) return;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    window.addEventListener('resize', handleResize);

    // Pre-allocated zero-GC particle ring buffer
    const pool: PooledParticle[] = Array.from({ length: MAX_PARTICLES }, (_, i) => ({
      x: ((i * 97) % 100) * 0.01 * width,
      y: ((i * 53) % 100) * 0.01 * height,
      vx: ((i % 5) - 2) * 8,
      vy: -15 - (i % 20),
      size: 1.5 + (i % 3),
      alpha: 0.2 + (i % 5) * 0.1,
      color: '#d4af37',
      life: (i * 0.3) % 4,
      maxLife: 4 + (i % 3),
    }));

    let rafId = 0;
    let lastTime = performance.now();

    const renderLoop = (now: number) => {
      const rawDt = (now - lastTime) * 0.001;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.05);
      lastTime = now;

      const reg = REGIONS[regionRef.current] || REGIONS.kings_landing;

      // Decay trauma & flash
      traumaRef.current = Math.max(0, traumaRef.current - dt * 2.4);
      flashRef.current = Math.max(0, flashRef.current - dt * 1.8);

      const shakeAmt = traumaRef.current * traumaRef.current * 10;
      const shakeX = shakeAmt > 0.1 ? Math.sin(now * 0.08) * shakeAmt : 0;
      const shakeY = shakeAmt > 0.1 ? Math.cos(now * 0.09) * shakeAmt : 0;

      ctx.save();
      ctx.translate(shakeX, shakeY);

      // Regional radial background gradient
      const grad = ctx.createRadialGradient(
        width * 0.5,
        height * 0.38,
        40,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * 0.78
      );
      grad.addColorStop(0, reg.atmosphereColor);
      grad.addColorStop(0.65, '#0c0b10');
      grad.addColorStop(1, '#060508');
      ctx.fillStyle = grad;
      ctx.fillRect(-16, -16, width + 32, height + 32);

      // Subtle architectural gothic arches silhouette in background
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.045)';
      ctx.lineWidth = 1;
      const centerX = width * 0.5;
      ctx.beginPath();
      ctx.arc(centerX, height * 0.45, Math.min(width, height) * 0.36, 0, Math.PI * 2);
      ctx.stroke();

      // Trigger particle burst on decision
      if (burstRequestRef.current) {
        burstRequestRef.current = false;
        for (let i = 0; i < 16; i++) {
          const p = pool[i];
          const angle = (i / 16) * Math.PI * 2;
          const speed = 45 + (i % 4) * 20;
          p.x = width * 0.5;
          p.y = height * 0.48;
          p.vx = Math.cos(angle) * speed;
          p.vy = Math.sin(angle) * speed;
          p.life = 0;
          p.maxLife = 1.4;
          p.size = 2.8;
          p.alpha = 0.75;
        }
      }

      // Update & draw ambient particles
      for (let i = 0; i < MAX_PARTICLES; i++) {
        const p = pool[i];
        p.life += dt;

        if (p.life >= p.maxLife || p.y < -20 || p.y > height + 20 || p.x < -20 || p.x > width + 20) {
          p.life = 0;
          p.x = ((i * 137 + Math.floor(now * 0.03)) % 1000) * 0.001 * width;
          if (reg.particleType === 'snow' || reg.particleType === 'rain') {
            p.y = -10;
            p.vx = reg.particleType === 'snow' ? Math.sin(now * 0.001 + i) * 14 : -12;
            p.vy = reg.particleType === 'snow' ? 22 + (i % 18) : 140 + (i % 40);
            p.color = reg.particleType === 'snow' ? '#e2e8f0' : '#64748b';
          } else {
            p.y = height + 10;
            p.vx = Math.sin(now * 0.001 + i) * 12;
            p.vy = -(18 + (i % 24));
            p.color = reg.accentColor;
          }
          p.size = 1.4 + (i % 3) * 0.8;
          p.alpha = 0.18 + (i % 5) * 0.08;
        } else {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
        }

        const fade = Math.sin((p.life / p.maxLife) * Math.PI);
        ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha * fade));
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Hit flash overlay on heavy impacts
      if (flashRef.current > 0.01) {
        ctx.globalAlpha = flashRef.current;
        ctx.fillStyle = reg.accentColor;
        ctx.fillRect(0, 0, width, height);
      }

      ctx.restore();
      rafId = requestAnimationFrame(renderLoop);
    };

    rafId = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      data-testid="ambient-stage-canvas"
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
    />
  );
};
