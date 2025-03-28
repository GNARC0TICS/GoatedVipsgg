import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '@/hooks/use-theme';

interface Point {
  x: number;
  y: number;
}

interface CircuitNode {
  position: Point;
  size: number;
  pulseSpeed: number;
  pulseState: number;
}

/**
 * GridBackgroundLite component
 * 
 * A simplified version of the GridBackground component for mobile devices
 * or lower-powered devices. It features:
 * 
 * - Simpler grid with fewer nodes and no circuit lines
 * - Reduced animations and effects
 * - Optimized for battery life and performance
 */
export const GridBackgroundLite = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const theme = useTheme();
  
  // Extract colors from theme to use in our background
  const primaryColor = '#D7FF00'; // Neon yellow
  const backgroundColor = '#14151A'; // Dark background
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Function to update canvas dimensions
    const updateCanvasSize = () => {
      // For high-DPI displays
      const dpr = window.devicePixelRatio || 1;
      
      // Set display size (css pixels)
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      
      // Set actual size in memory (scaled for higher resolution)
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      
      // Scale all drawing operations by the dpr
      ctx.scale(dpr, dpr);
      
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    
    // Calculate grid properties based on screen size
    // Use a larger spacing for the lite version
    const gridSpacing = Math.max(50, Math.floor(Math.min(dimensions.width, dimensions.height) / 20));
    
    // Generate fewer nodes for better performance
    const nodeCount = Math.max(3, Math.floor((dimensions.width * dimensions.height) / 150000));
    const nodes: CircuitNode[] = [];
    
    // Create some random nodes
    for (let i = 0; i < nodeCount; i++) {
      const x = Math.random() * dimensions.width;
      const y = Math.random() * dimensions.height;
      
      nodes.push({
        position: { x, y },
        size: Math.random() * 2 + 1,
        pulseSpeed: Math.random() * 0.01 + 0.005, // Slower pulse for better performance
        pulseState: Math.random() * Math.PI * 2 // Random starting phase
      });
    }
    
    // Draw grid function
    function drawGrid() {
      if (!ctx) return;
      
      // Clear canvas
      ctx.clearRect(0, 0, dimensions.width, dimensions.height);
      
      // Draw grid background - larger spacing for better performance
      ctx.strokeStyle = `rgba(42, 43, 49, 0.15)`; // Subtle grid lines
      ctx.lineWidth = 0.3;
      
      // Draw grid lines with larger spacing
      const gridSize = 60;
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
      
      // Update and draw nodes
      nodes.forEach(node => {
        try {
          // Validate coordinates
          if (
            !isFinite(node.position.x) || !isFinite(node.position.y) || 
            !isFinite(node.size) || node.size <= 0
          ) {
            return; // Skip this node if coordinates are invalid
          }
          
          // Update pulse state
          node.pulseState += node.pulseSpeed;
          if (node.pulseState > Math.PI * 2) node.pulseState -= Math.PI * 2;
          
          // Calculate pulse value
          const pulse = Math.pow(Math.sin(node.pulseState), 2);
          
          // Ensure valid opacity values
          const baseOpacity = Math.min(1, Math.max(0, 0.1 + pulse * 0.2));
          
          // Draw node
          ctx.beginPath();
          ctx.arc(node.position.x, node.position.y, node.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(215, 255, 0, ${baseOpacity})`;
          ctx.fill();
        } catch (e) {
          // Silently handle errors
        }
      });
    }
    
    let animationFrameId: number;
    
    // Use a lower frame rate for better performance
    function animate() {
      drawGrid();
      
      if (isVisible) {
        animationFrameId = requestAnimationFrame(animate);
      }
    }
    
    // Start animation
    animate();
    
    // Cleanup function
    return () => {
      window.removeEventListener('resize', updateCanvasSize);
      cancelAnimationFrame(animationFrameId);
      setIsVisible(false);
    };
  }, [isVisible, dimensions, primaryColor, backgroundColor]);
  
  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ background: backgroundColor, opacity: 1, zIndex: 0 }}
    />
  );
};