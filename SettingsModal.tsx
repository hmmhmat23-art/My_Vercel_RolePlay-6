import React, { useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, RotateCcw, RefreshCcw, Move } from 'lucide-react';
import { useVisualViewport } from '../hooks/useVisualViewport';

interface FloatingImageViewerProps {
  src: string;
  alt?: string;
  onClose: () => void;
}

export const FloatingImageViewer: React.FC<FloatingImageViewerProps> = ({ src, alt, onClose }) => {
  const viewportHeight = useVisualViewport();
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  
  // Transform State (kept in refs for performance to avoid React render cycle lag)
  const state = useRef({ x: 0, y: 0, scale: 1, rotate: 0 });
  
  // Interaction State
  const activePointers = useRef<Map<number, { x: number, y: number }>>(new Map());
  const initialPinchDist = useRef<number>(0);
  const initialScale = useRef<number>(1);
  const initialAngle = useRef<number>(0);
  const initialRotate = useRef<number>(0);
  const lastDragPos = useRef<{ x: number, y: number } | null>(null);

  useEffect(() => {
    // Initial centering or setup if needed
    updateStyles();
  }, [src]);

  const updateStyles = () => {
    if (containerRef.current) {
      const { x, y, scale, rotate } = state.current;
      // Using translate3d for hardware acceleration
      containerRef.current.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${rotate}deg) scale(${scale})`;
      
      // Counter-scale AND Counter-rotate controls so they stay constant size and upright
      if (controlsRef.current) {
        // We invert the scale so buttons don't become tiny or huge
        // We invert rotation so buttons stay horizontal/upright relative to screen
        controlsRef.current.style.transform = `translate(-50%, 0) rotate(${-rotate}deg) scale(${1 / scale})`;
      }
    }
  };

  const getAngle = (p1: { x: number, y: number }, p2: { x: number, y: number }) => {
      return Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    // If user clicks a button inside the container, ignore drag logic
    if ((e.target as HTMLElement).closest('button')) return;

    e.preventDefault();
    e.stopPropagation();

    // Capture pointer to track movement outside the element
    try {
        (e.target as Element).setPointerCapture(e.pointerId);
    } catch (err) {
        // Ignore potential errors if element is unmounted
    }
    
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // If starting a new drag with 1 finger
    if (activePointers.current.size === 1) {
        lastDragPos.current = { x: e.clientX, y: e.clientY };
    }

    // Initialize Pinch/Rotate if 2 fingers present
    if (activePointers.current.size === 2) {
        const points = Array.from(activePointers.current.values()) as { x: number; y: number }[];
        
        // Distance for Zoom
        const dist = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
        initialPinchDist.current = dist;
        initialScale.current = state.current.scale;
        
        // Angle for Rotation
        initialAngle.current = getAngle(points[0], points[1]);
        initialRotate.current = state.current.rotate;
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activePointers.current.has(e.pointerId)) return;
    
    e.preventDefault();
    e.stopPropagation();

    // Update this pointer's position
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointers.current.size === 2) {
        // Handle Pinch Zoom & Rotate
        const points = Array.from(activePointers.current.values()) as { x: number; y: number }[];
        
        // 1. Zoom
        const dist = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
        if (initialPinchDist.current > 0) {
            const zoomFactor = dist / initialPinchDist.current;
            const newScale = initialScale.current * zoomFactor;
            state.current.scale = Math.min(Math.max(0.2, newScale), 5);
        }

        // 2. Rotate
        const angle = getAngle(points[0], points[1]);
        const deltaAngle = angle - initialAngle.current;
        state.current.rotate = initialRotate.current + deltaAngle;

        requestAnimationFrame(updateStyles);

    } else if (activePointers.current.size === 1 && lastDragPos.current) {
        // Handle Pan/Drag
        const currentPointer = { x: e.clientX, y: e.clientY };
        const dx = currentPointer.x - lastDragPos.current.x;
        const dy = currentPointer.y - lastDragPos.current.y;
        
        state.current.x += dx;
        state.current.y += dy;
        
        lastDragPos.current = currentPointer;
        requestAnimationFrame(updateStyles);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    // Release capture
    try {
        if (activePointers.current.has(e.pointerId)) {
            (e.target as Element).releasePointerCapture(e.pointerId);
        }
    } catch (err) {}

    activePointers.current.delete(e.pointerId);

    // Reset pinch distance if we drop below 2 fingers
    if (activePointers.current.size < 2) {
        initialPinchDist.current = 0;
    }

    // If one finger remains, reset drag anchor to prevent jumping
    if (activePointers.current.size === 1) {
        const point = Array.from(activePointers.current.values())[0] as { x: number; y: number };
        lastDragPos.current = { x: point.x, y: point.y };
    } else {
        lastDragPos.current = null;
    }
  };

  // Button Handlers
  const handleScale = (delta: number) => {
      const newScale = state.current.scale + delta;
      state.current.scale = Math.min(Math.max(0.2, newScale), 5);
      updateStyles();
  };

  const handleRotate = (delta: number) => {
      state.current.rotate += delta;
      updateStyles();
  };

  const handleReset = () => {
      state.current = { x: 0, y: 0, scale: 1, rotate: 0 };
      updateStyles();
  };

  return (
    <div className="fixed top-0 left-0 w-full z-[100] flex items-center justify-center overflow-hidden touch-none select-none" style={{ height: viewportHeight }}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Draggable Window Container */}
      <div
        ref={containerRef}
        // IMPORTANT: touch-action: none is required for dragging to work on mobile without scrolling the page
        style={{ touchAction: 'none' }}
        className="relative z-[110] flex flex-col items-center justify-center will-change-transform origin-center cursor-move"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp} // Safety net
        onWheel={(e) => {
            e.stopPropagation();
            // Standardize wheel delta
            const delta = -e.deltaY * 0.001;
            handleScale(delta * 5); // Multiplier for faster scroll zoom
        }}
      >
        <div className="relative group rounded-lg shadow-[0_0_50px_rgba(0,0,0,0.5)] bg-zinc-900 border border-zinc-700 p-1">
            
            {/* Close Button - Outside the overflow hidden area */}
            <button 
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                onPointerDown={(e) => e.stopPropagation()} // Stop drag start
                className="absolute -top-3 -right-3 z-50 p-2 bg-zinc-800 text-zinc-400 hover:text-white hover:bg-red-900/80 border border-zinc-600 rounded-full shadow-lg transition-colors"
            >
                <X size={16} />
            </button>

            {/* Image Wrapper */}
            <div className="relative overflow-hidden rounded bg-black/20">
                 {/* Drag Hint Overlay */}
                 <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-10">
                    <Move className="text-white/20 drop-shadow-md" size={64} />
                 </div>

                 {/* The Image - pointer-events-none so drags register on the container div */}
                 <img 
                    ref={imageRef}
                    src={src || undefined} 
                    alt={alt} 
                    className="max-w-[85vw] max-h-[75vh] object-contain block select-none pointer-events-none" 
                    draggable={false}
                />
            </div>

            {/* Floating Controls Toolbar */}
            <div 
                ref={controlsRef}
                className="absolute left-1/2 -bottom-14 flex items-center gap-1 p-1.5 px-3 bg-zinc-900/95 border border-zinc-700 backdrop-blur-md rounded-full shadow-2xl origin-top transition-transform duration-75"
                style={{ transform: 'translate(-50%, 0)' }}
                // STOP PROPAGATION HERE: Prevents dragging when trying to click buttons
                onPointerDown={(e) => e.stopPropagation()} 
                onTouchStart={(e) => e.stopPropagation()} // Double safety for mobile
            >
                <button onClick={() => handleScale(-0.25)} className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full active:bg-white/20 transition-colors" title="Zoom Out">
                    <ZoomOut size={16} />
                </button>
                <button onClick={() => handleScale(0.25)} className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full active:bg-white/20 transition-colors" title="Zoom In">
                    <ZoomIn size={16} />
                </button>
                <div className="w-px h-4 bg-zinc-700 mx-1"></div>
                <button onClick={() => handleRotate(-90)} className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full active:bg-white/20 transition-colors" title="Rotate Left">
                    <RotateCcw size={16} />
                </button>
                <button onClick={() => handleRotate(90)} className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full active:bg-white/20 transition-colors" title="Rotate Right">
                    <RotateCw size={16} />
                </button>
                <div className="w-px h-4 bg-zinc-700 mx-1"></div>
                <button onClick={handleReset} className="p-1.5 text-zinc-400 hover:text-orange-500 hover:bg-orange-500/10 rounded-full active:bg-orange-500/20 transition-colors" title="Reset">
                    <RefreshCcw size={16} />
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};