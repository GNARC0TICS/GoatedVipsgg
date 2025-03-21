
import { useEffect, useRef, useState } from 'react';

export const ParticleBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    const updateCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    updateCanvasSize();

    // Particle configuration
    const particleConfig = {
      count: 25, // Reduced number of particles
      sizeMin: 0.1,
      sizeMax: 1.2, // Smaller max size
      speedMin: 0.03, // Slower movement
      speedMax: 0.08,
      colorPrimary: 'rgba(215, 255, 0, 0.15)', // More subtle color
      colorSecondary: 'rgba(215, 255, 0, 0)', 
      fadeSpeed: 0.02 // Controls how quickly the trail fades
    };

    // Particle interface
    interface Particle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      pulseDirection: boolean; // For pulsing effect
      pulseSpeed: number;
      originalSize: number;
    }

    const particles: Particle[] = [];

    // Create a particle with improved properties
    const createParticle = (): Particle => {
      const size = Math.random() * 
        (particleConfig.sizeMax - particleConfig.sizeMin) + 
        particleConfig.sizeMin;
      
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: size,
        originalSize: size,
        speedX: (Math.random() * 
          (particleConfig.speedMax - particleConfig.speedMin) + 
          particleConfig.speedMin) * (Math.random() > 0.5 ? 1 : -1),
        speedY: (Math.random() * 
          (particleConfig.speedMax - particleConfig.speedMin) + 
          particleConfig.speedMin) * (Math.random() > 0.5 ? 1 : -1),
        pulseDirection: Math.random() > 0.5,
        pulseSpeed: Math.random() * 0.01 + 0.005
      };
    };

    // Create initial particles
    for (let i = 0; i < particleConfig.count; i++) {
      particles.push(createParticle());
    }

    // Animation variables for performance
    let animationFrameId: number;
    let lastTime = 0;
    const fpsInterval = 1000 / 30; // Limit to 30 FPS for better performance

    // Main animation function with throttling
    const animate = (currentTime: number) => {
      animationFrameId = requestAnimationFrame(animate);
      
      // Throttle the frame rate
      const elapsed = currentTime - lastTime;
      if (elapsed < fpsInterval) return;
      lastTime = currentTime - (elapsed % fpsInterval);
      
      // Skip animation if component is not visible
      if (!isVisible) return;
      
      // Clear with a subtle fade effect instead of complete redraw
      ctx.fillStyle = 'rgba(20, 21, 26, 0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw and update particles
      particles.forEach(particle => {
        // Pulse effect
        if (particle.pulseDirection) {
          particle.size += particle.pulseSpeed;
          if (particle.size > particle.originalSize * 1.3) {
            particle.pulseDirection = false;
          }
        } else {
          particle.size -= particle.pulseSpeed;
          if (particle.size < particle.originalSize * 0.7) {
            particle.pulseDirection = true;
          }
        }

        // Draw particle with improved gradient
        ctx.beginPath();
        const gradient = ctx.createRadialGradient(
          particle.x,
          particle.y,
          0,
          particle.x,
          particle.y,
          particle.size
        );
        gradient.addColorStop(0, particleConfig.colorPrimary);
        gradient.addColorStop(1, particleConfig.colorSecondary);
        ctx.fillStyle = gradient;
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();

        // Update position
        particle.x += particle.speedX;
        particle.y += particle.speedY;

        // Boundary check with smoother transition
        if (particle.x < 0) {
          particle.x = 0;
          particle.speedX *= -1;
        } else if (particle.x > canvas.width) {
          particle.x = canvas.width;
          particle.speedX *= -1;
        }
        
        if (particle.y < 0) {
          particle.y = 0;
          particle.speedY *= -1;
        } else if (particle.y > canvas.height) {
          particle.y = canvas.height;
          particle.speedY *= -1;
        }
      });
    };

    // Start animation
    animationFrameId = requestAnimationFrame(animate);

    // Visibility observer to pause animation when not visible
    const observer = new IntersectionObserver(
      (entries) => {
        setIsVisible(entries[0].isIntersecting);
      },
      { threshold: 0.1 }
    );
    
    observer.observe(canvas);

    // Handle window resize
    const handleResize = () => {
      updateCanvasSize();
    };

    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      observer.disconnect();
    };
  }, [isVisible]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: -10, // Negative z-index to ensure it stays behind content
        opacity: 0.8, // Slightly reduced opacity
      }}
      aria-hidden="true" // Accessibility improvement
    />
  );
};
