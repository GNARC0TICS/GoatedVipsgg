import { useEffect, useRef, useState } from 'react';
import { useTheme } from '@/hooks/use-theme';

interface Point {
  x: number;
  y: number;
}

interface CircuitNode {
  position: Point;
  size: number;
  pulseSpeed: number;
  pulseIntensity: number;
  pulseState: number;
  isActive: boolean;
  currentPulse?: number; // Store the current pulse value for use in the glow effect
}

interface CircuitLine {
  from: Point;
  to: Point;
  width: number;
  opacity: number;
  glowIntensity: number;
  glowSpeed: number;
  glowState: number;
  isActive: boolean;
}

export const GridBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const theme = useTheme();
  
  // Extract colors from theme to use in our background
  const primaryColor = '#D7FF00'; // Neon yellow
  const backgroundColor = '#14151A'; // Dark background
  const accentColor = '#2A2B31'; // Subtle accent

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
      
      // Scale all drawing operations by the dpr, so you don't have to worry about the difference
      ctx.scale(dpr, dpr);
      
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    // Calculate grid properties based on screen size
    const gridSpacing = Math.max(30, Math.floor(Math.min(dimensions.width, dimensions.height) / 40));
    
    // Generate grid points
    const gridPoints: Point[] = [];
    for (let x = 0; x < dimensions.width; x += gridSpacing) {
      for (let y = 0; y < dimensions.height; y += gridSpacing) {
        // Add some variation to grid points
        const offsetX = (Math.random() - 0.5) * (gridSpacing * 0.2);
        const offsetY = (Math.random() - 0.5) * (gridSpacing * 0.2);
        
        gridPoints.push({
          x: x + offsetX,
          y: y + offsetY
        });
      }
    }
    
    // Generate circuit nodes
    const nodeCount = Math.max(5, Math.floor((dimensions.width * dimensions.height) / 90000));
    const nodes: CircuitNode[] = [];
    
    for (let i = 0; i < nodeCount; i++) {
      const randomPoint = gridPoints[Math.floor(Math.random() * gridPoints.length)];
      nodes.push({
        position: { ...randomPoint },
        size: Math.random() * 2 + 1.5,
        pulseSpeed: Math.random() * 0.02 + 0.01,
        pulseIntensity: Math.random() * 0.5 + 0.5,
        pulseState: Math.random() * Math.PI * 2, // Random starting phase
        isActive: Math.random() > 0.3 // 70% chance of being active
      });
    }
    
    // Generate circuit lines - connect some nodes to create a circuit pattern
    const lines: CircuitLine[] = [];
    
    // Helper function to find the closest node to a given node
    const findClosestNodes = (node: CircuitNode, maxConnections = 3) => {
      const otherNodes = nodes.filter(n => n !== node);
      const distances = otherNodes.map(n => ({
        node: n,
        distance: Math.sqrt(
          Math.pow(n.position.x - node.position.x, 2) + 
          Math.pow(n.position.y - node.position.y, 2)
        )
      }));
      
      // Sort by distance
      distances.sort((a, b) => a.distance - b.distance);
      
      // Return closest nodes up to maxConnections
      return distances.slice(0, maxConnections).map(d => d.node);
    };
    
    // Connect nodes with circuit lines
    nodes.forEach(node => {
      if (node.isActive) {
        const connectionsCount = Math.floor(Math.random() * 3) + 1; // 1-3 connections
        const closestNodes = findClosestNodes(node, connectionsCount);
        
        closestNodes.forEach(targetNode => {
          if (targetNode.isActive && Math.random() > 0.3) { // 70% chance to connect active nodes
            lines.push({
              from: { ...node.position },
              to: { ...targetNode.position },
              width: Math.random() * 0.8 + 0.4,
              opacity: Math.random() * 0.15 + 0.1,
              glowIntensity: Math.random() * 0.8 + 0.2,
              glowSpeed: Math.random() * 0.01 + 0.005,
              glowState: Math.random() * Math.PI * 2, // Random starting phase
              isActive: Math.random() > 0.3 // 70% chance of being active
            });
          }
        });
      }
    });
    
    // Draw grid function
    function drawGrid() {
      if (!ctx) return;
      
      // Clear canvas
      ctx.clearRect(0, 0, dimensions.width, dimensions.height);
      
      // Draw grid background
      ctx.strokeStyle = `rgba(42, 43, 49, 0.25)`; // More visible grid lines
      ctx.lineWidth = 0.5;
      
      // Draw grid lines
      const gridSize = 40;
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
      
      // Update and draw circuit lines
      lines.forEach(line => {
        try {
          // Validate point coordinates before drawing
          if (
            !isFinite(line.from.x) || !isFinite(line.from.y) ||
            !isFinite(line.to.x) || !isFinite(line.to.y)
          ) {
            return; // Skip this line if coordinates are invalid
          }
        
          // Update glow state
          line.glowState += line.glowSpeed;
          if (line.glowState > Math.PI * 2) line.glowState -= Math.PI * 2;
          
          const currentGlow = Math.pow(Math.sin(line.glowState), 2) * line.glowIntensity;
          
          // Draw line with glow effect
          ctx.beginPath();
          ctx.moveTo(line.from.x, line.from.y);
          ctx.lineTo(line.to.x, line.to.y);
          
          // Ensure valid opacity values
          const safeOpacity = Math.min(1, Math.max(0, line.opacity * currentGlow));
          
          // Line itself
          ctx.strokeStyle = `rgba(215, 255, 0, ${safeOpacity})`;
          ctx.lineWidth = Math.max(0.1, line.width); // Prevent zero or negative line width
          ctx.stroke();
          
          // Glow effect for active lines
          if (line.isActive && currentGlow > 0.5) {
            const glowOpacity1 = Math.min(1, Math.max(0, line.opacity * 0.4 * currentGlow));
            const glowOpacity2 = Math.min(1, Math.max(0, line.opacity * 0.2 * currentGlow));
            
            ctx.strokeStyle = `rgba(215, 255, 0, ${glowOpacity1})`;
            ctx.lineWidth = Math.max(0.1, line.width * 2);
            ctx.stroke();
            
            ctx.strokeStyle = `rgba(215, 255, 0, ${glowOpacity2})`;
            ctx.lineWidth = Math.max(0.1, line.width * 3.5);
            ctx.stroke();
          }
        } catch (e) {
          // Silently handle any drawing errors to prevent crashing
          console.debug('Error drawing circuit line:', e);
        }
      });
      
      // Update and draw circuit nodes
      nodes.forEach(node => {
        try {
          // Validate point coordinates before drawing
          if (
            !isFinite(node.position.x) || !isFinite(node.position.y) || 
            !isFinite(node.size) || node.size <= 0
          ) {
            return; // Skip this node if coordinates are invalid
          }
          
          // Update pulse state
          node.pulseState += node.pulseSpeed;
          if (node.pulseState > Math.PI * 2) node.pulseState -= Math.PI * 2;
          
          // Calculate pulse value to use consistently in this iteration
          const nodePulse = Math.pow(Math.sin(node.pulseState), 2) * node.pulseIntensity;
          
          // Ensure valid opacity values
          const baseOpacity = Math.min(1, Math.max(0, 0.2 + nodePulse * 0.3));
          
          // Draw node
          ctx.beginPath();
          ctx.arc(node.position.x, node.position.y, node.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(215, 255, 0, ${baseOpacity})`;
          ctx.fill();
          
          // Store the pulse value as a property so it can be used later for the glow
          node.currentPulse = nodePulse;
        } catch (e) {
          // Silently handle any drawing errors to prevent crashing
          console.debug('Error drawing circuit node:', e);
        }
        
        // Use the stored pulse value calculated earlier
        // Add glow for active nodes
        if (node.isActive && node.currentPulse && node.currentPulse > 0.7) {
          try {
            // Check for valid values to avoid non-finite errors
            if (isFinite(node.position.x) && isFinite(node.position.y) && isFinite(node.size) && node.size > 0) {
              // Add glow effect
              ctx.beginPath();
              ctx.arc(node.position.x, node.position.y, node.size * 2, 0, Math.PI * 2);
              
              // Safe radius values
              const innerRadius = Math.max(0.1, node.size);
              const outerRadius = Math.max(innerRadius + 0.1, node.size * 3);
              
              const gradient = ctx.createRadialGradient(
                node.position.x, node.position.y, innerRadius,
                node.position.x, node.position.y, outerRadius
              );
              
              gradient.addColorStop(0, `rgba(215, 255, 0, ${0.3 * (node.currentPulse || 0.7)})`);
              gradient.addColorStop(1, 'rgba(215, 255, 0, 0)');
              ctx.fillStyle = gradient;
              ctx.fill();
            } else {
              // Fallback if we have invalid values - use a simple circle
              ctx.beginPath();
              ctx.arc(node.position.x, node.position.y, node.size * 2, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(215, 255, 0, ${0.15 * (node.currentPulse || 0.7)})`;
              ctx.fill();
            }
          } catch (e) {
            // If there's any error with gradient, use a simple fallback
            ctx.beginPath();
            ctx.arc(node.position.x, node.position.y, node.size * 2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(215, 255, 0, ${0.15 * (node.currentPulse || 0.7)})`;
            ctx.fill();
          }
        }
      });
    }
    
    let animationFrameId: number;
    
    // Animation function
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
  }, [isVisible, dimensions, primaryColor, backgroundColor, accentColor]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ background: backgroundColor, opacity: 1, zIndex: 0 }}
    />
  );
};