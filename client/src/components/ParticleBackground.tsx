import { useEffect, useRef, useState } from 'react';

export const ParticleBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const updateCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    updateCanvasSize();

    const particleConfig = {
      count: 50,
      sizeMin: 0.5,
      sizeMax: 2,
      speedMin: 0.2,
      speedMax: 0.4,
      colorPrimary: 'rgba(215, 255, 0, 0.6)',
      colorSecondary: 'rgba(215, 255, 0, 0)',
      fadeSpeed: 0.02
    };

    interface Particle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      opacity: number;
      fadeDirection: boolean;
    }

    const particles: Particle[] = [];

    const createParticle = (): Particle => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * (particleConfig.sizeMax - particleConfig.sizeMin) + particleConfig.sizeMin,
      speedX: (Math.random() - 0.5) * particleConfig.speedMax,
      speedY: (Math.random() - 0.5) * particleConfig.speedMax,
      opacity: Math.random(),
      fadeDirection: Math.random() > 0.5
    });

    for (let i = 0; i < particleConfig.count; i++) {
      particles.push(createParticle());
    }

    let animationFrameId: number;
    let lastTime = 0;
    const fpsInterval = 1000 / 60;

    const animate = (currentTime: number) => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsed = currentTime - lastTime;
      if (elapsed < fpsInterval) return;
      lastTime = currentTime - (elapsed % fpsInterval);

      if (!isVisible) return;

      ctx.fillStyle = 'rgba(20, 21, 26, 0.3)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach(particle => {
        if (particle.fadeDirection) {
          particle.opacity += particleConfig.fadeSpeed;
          if (particle.opacity >= 1) {
            particle.fadeDirection = false;
          }
        } else {
          particle.opacity -= particleConfig.fadeSpeed;
          if (particle.opacity <= 0.2) {
            particle.fadeDirection = true;
          }
        }

        ctx.beginPath();
        const gradient = ctx.createRadialGradient(
          particle.x,
          particle.y,
          0,
          particle.x,
          particle.y,
          particle.size * 2
        );

        gradient.addColorStop(0, `rgba(215, 255, 0, ${particle.opacity})`);
        gradient.addColorStop(1, 'rgba(215, 255, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();

        particle.x += particle.speedX;
        particle.y += particle.speedY;

        if (particle.x < 0) {
          particle.x = canvas.width;
        } else if (particle.x > canvas.width) {
          particle.x = 0;
        }

        if (particle.y < 0) {
          particle.y = canvas.height;
        } else if (particle.y > canvas.height) {
          particle.y = 0;
        }
      });
    };

    animationFrameId = requestAnimationFrame(animate);
    window.addEventListener('resize', updateCanvasSize);

    const observer = new IntersectionObserver(
      (entries) => {
        setIsVisible(entries[0].isIntersecting);
      },
      { threshold: 0.1 }
    );

    observer.observe(canvas);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', updateCanvasSize);
      observer.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10 w-full h-full pointer-events-none"
      style={{ background: 'transparent' }}
    />
  );
};