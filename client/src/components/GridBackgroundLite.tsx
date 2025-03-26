import { useEffect, useRef, useState } from 'react';

/**
 * A lightweight version of the GridBackground for mobile/lower powered devices
 * This uses simpler animations and fewer elements for better performance
 */
export const GridBackgroundLite = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Function to update canvas dimensions
    const updateCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    // Grid settings
    const gridSize = 60; // Larger grid for better performance
    
    // Nodes for circuit points
    const nodeCount = Math.max(3, Math.floor((dimensions.width * dimensions.height) / 150000));
    const nodes = Array.from({ length: nodeCount }, () => ({
      x: Math.random() * dimensions.width,
      y: Math.random() * dimensions.height,
      size: Math.random() * 1.5 + 1,
      pulseSpeed: Math.random() * 0.02 + 0.01,
      pulseState: Math.random() * Math.PI * 2
    }));
    
    // Draw function
    function draw() {
      if (!ctx) return;
      
      // Clear canvas
      ctx.clearRect(0, 0, dimensions.width, dimensions.height);
      
      // Draw grid
      ctx.strokeStyle = 'rgba(42, 43, 49, 0.07)';
      ctx.lineWidth = 0.3;
      
      // Draw only a few grid lines for better performance
      for (let x = 0; x < dimensions.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, dimensions.height);
        ctx.stroke();
      }
      
      for (let y = 0; y < dimensions.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(dimensions.width, y);
        ctx.stroke();
      }
      
      // Draw nodes
      nodes.forEach(node => {
        // Update pulse state
        node.pulseState += node.pulseSpeed;
        if (node.pulseState > Math.PI * 2) node.pulseState -= Math.PI * 2;
        
        const pulse = Math.sin(node.pulseState) * 0.5 + 0.5;
        
        // Draw node
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(215, 255, 0, ${0.1 + pulse * 0.2})`;
        ctx.fill();
        
        // Simple glow
        if (pulse > 0.7) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.size * 2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(215, 255, 0, ${0.05 * pulse})`;
          ctx.fill();
        }
        
        // Connect some nodes with basic lines
        if (Math.random() > 0.95) {
          const nearestNode = nodes.reduce((nearest, other) => {
            if (other === node) return nearest;
            
            const distance = Math.sqrt(
              Math.pow(other.x - node.x, 2) + Math.pow(other.y - node.y, 2)
            );
            
            return distance < Math.sqrt(
              Math.pow(nearest.x - node.x, 2) + Math.pow(nearest.y - node.y, 2)
            ) ? other : nearest;
          }, nodes[0]);
          
          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(nearestNode.x, nearestNode.y);
          ctx.strokeStyle = `rgba(215, 255, 0, ${0.05 * pulse})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      });
    }
    
    // Animation with reduced frame rate
    let lastRender = 0;
    const targetFPS = 30; // Lower FPS for better performance
    const frameInterval = 1000 / targetFPS;
    let animationFrameId: number;
    
    function animate(timestamp: number) {
      const elapsed = timestamp - lastRender;
      
      if (elapsed > frameInterval) {
        lastRender = timestamp - (elapsed % frameInterval);
        draw();
      }
      
      if (isVisible) {
        animationFrameId = requestAnimationFrame(animate);
      }
    }
    
    animationFrameId = requestAnimationFrame(animate);
    
    return () => {
      window.removeEventListener('resize', updateCanvasSize);
      cancelAnimationFrame(animationFrameId);
      setIsVisible(false);
    };
  }, [isVisible, dimensions]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ background: 'transparent', opacity: 0.4, zIndex: -1 }}
    />
  );
};