
import React, { useEffect, useRef, useState } from 'react';

interface ConfettiProps {
  active: boolean;
  duration?: number;
  particleCount?: number;
  onComplete?: () => void;
}

export function Confetti({
  active,
  duration = 3000,
  particleCount = 200,
  onComplete,
}: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [particles, setParticles] = useState<any[]>([]);
  const [animationId, setAnimationId] = useState<number | null>(null);
  
  useEffect(() => {
    if (!active || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas to full window size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Create particles
    const colors = ['#D7FF00', '#FFD700', '#FF6B6B', '#59D2FE', '#8C52FF'];
    const newParticles = [];
    
    for (let i = 0; i < particleCount; i++) {
      newParticles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        size: Math.random() * 10 + 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        speed: Math.random() * 3 + 2,
        rotationSpeed: Math.random() * 5 - 2.5,
      });
    }
    
    setParticles(newParticles);
    
    // Animation function
    let startTime = Date.now();
    
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Check if animation duration has passed
      if (Date.now() - startTime > duration) {
        if (onComplete) onComplete();
        return;
      }
      
      // Update and draw particles
      for (const particle of newParticles) {
        particle.y += particle.speed;
        particle.rotation += particle.rotationSpeed;
        
        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate((particle.rotation * Math.PI) / 180);
        ctx.fillStyle = particle.color;
        
        // Draw a rectangle for confetti piece
        ctx.fillRect(-particle.size / 2, -particle.size / 4, particle.size, particle.size / 2);
        
        ctx.restore();
        
        // Reset position if particle goes off screen
        if (particle.y > canvas.height) {
          particle.y = -particle.size;
          particle.x = Math.random() * canvas.width;
        }
      }
      
      const id = requestAnimationFrame(animate);
      setAnimationId(id);
    };
    
    const id = requestAnimationFrame(animate);
    setAnimationId(id);
    
    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [active]);
  
  if (!active) return null;
  
  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
    />
  );
}
