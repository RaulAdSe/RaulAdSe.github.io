'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

interface SpriteSheet {
  index: number;
  filename_png: string;
  filename_webp: string;
  tiles_count: number;
  tile_positions: TilePosition[];
}

interface TilePosition {
  original_filename: string;
  x: number;
  y: number;
  dog_index: number;
  sheet_x: number;
  sheet_y: number;
  sprite_x: number;
  sprite_y: number;
}

interface SpriteMetadata {
  original_metadata: {
    width: number;
    height: number;
    tile_size: number;
  };
  sprite_config: {
    tiles_per_sheet: number;
    sheet_width: number;
    sheet_height: number;
    tile_size: number;
    num_sheets: number;
  };
  sheets: SpriteSheet[];
}

interface SpriteSheetMosaicImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  pixelSize?: number;
  useCifarMosaic?: boolean;
  mosaicTilesPath?: string;
}

export default function SpriteSheetMosaicImageFixed({ 
  src, 
  alt, 
  width, 
  height, 
  useCifarMosaic = false,
  mosaicTilesPath = '/sprite_sheets'
}: SpriteSheetMosaicImageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Minimal state - only 3 variables
  const [spriteMetadata, setSpriteMetadata] = useState<SpriteMetadata | null>(null);
  const [loadedSheets, setLoadedSheets] = useState<Map<string, HTMLImageElement>>(new Map());
  const [isHovering, setIsHovering] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });

  // Generate spiral loading order from center outward
  const generateSpiralOrder = (totalSheets: number): number[] => {
    if (totalSheets !== 25) {
      return Array.from({ length: totalSheets }, (_, i) => i);
    }
    
    // 5x5 grid: true spiral starting from center (12)
    const spiral: number[] = [];
    const visited = Array(5).fill(null).map(() => Array(5).fill(false));
    
    // Grid mapping: row * 5 + col = sheet_index
    const grid = [
      [ 0,  1,  2,  3,  4],
      [ 5,  6,  7,  8,  9],
      [10, 11, 12, 13, 14],  // Center is at (2,2) = 12
      [15, 16, 17, 18, 19],
      [20, 21, 22, 23, 24]
    ];
    
    // Start from center
    let row = 2, col = 2;
    spiral.push(grid[row][col]);
    visited[row][col] = true;
    
    // Spiral directions: right, up, left, down
    const directions = [[0, 1], [-1, 0], [0, -1], [1, 0]];
    let dirIndex = 0;
    let steps = 1;
    
    while (spiral.length < 25) {
      for (let i = 0; i < 2; i++) { // Each step count used twice
        for (let j = 0; j < steps; j++) {
          row += directions[dirIndex][0];
          col += directions[dirIndex][1];
          
          if (row >= 0 && row < 5 && col >= 0 && col < 5 && !visited[row][col]) {
            spiral.push(grid[row][col]);
            visited[row][col] = true;
            
            if (spiral.length >= 25) break;
          }
        }
        if (spiral.length >= 25) break;
        dirIndex = (dirIndex + 1) % 4;
      }
      steps++;
    }
    
    return spiral;
  };

  // Load metadata and sprite sheets in spiral order
  useEffect(() => {
    if (!useCifarMosaic) return;

    const loadEverything = async () => {
      try {
        // Load metadata
        const metadataResponse = await fetch(`${mosaicTilesPath}/sprite_metadata.json`);
        const metadata: SpriteMetadata = await metadataResponse.json();
        setSpriteMetadata(metadata);

        // Generate spiral loading order
        const spiralOrder = generateSpiralOrder(metadata.sheets.length);
        const sheetMap = new Map<string, HTMLImageElement>();

        // Load sprite sheets sequentially in spiral order
        for (let i = 0; i < spiralOrder.length; i++) {
          const sheetIndex = spiralOrder[i];
          const sheet = metadata.sheets[sheetIndex];
          
          if (sheet) {
            // Use PNG for universal compatibility
            const img = new globalThis.Image();
            
            await new Promise<void>((resolve) => {
              img.onload = () => {
                sheetMap.set(sheet.filename_png, img);
                setLoadedSheets(new Map(sheetMap)); // Trigger re-render
                resolve();
              };
              img.onerror = () => resolve(); // Continue even if one fails
              img.src = `${mosaicTilesPath}/${sheet.filename_png}`;
            });
            
            // Small delay for visible spiral progression
            if (i < spiralOrder.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }
        }
        
      } catch (error) {
        console.error('Failed to load mosaic:', error);
      }
    };

    loadEverything();
  }, [useCifarMosaic, mosaicTilesPath]);

  // Single effect: Render when everything is ready
  useEffect(() => {
    if (!canvasRef.current || !spriteMetadata || loadedSheets.size === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Ultra-high resolution canvas setup for crisp tiles
    const devicePixelRatio = window.devicePixelRatio || 1;
    const scale = Math.max(30, 8000 / width) * devicePixelRatio; // Much higher resolution
    const internalWidth = width * scale;
    const internalHeight = height * scale;
    
    canvas.width = internalWidth;
    canvas.height = internalHeight;

    // High-quality rendering settings
    ctx.imageSmoothingEnabled = true; // Always smooth for better quality
    if ('imageSmoothingQuality' in ctx) {
      (ctx as any).imageSmoothingQuality = 'high';
    }
    
    // Clear canvas
    ctx.clearRect(0, 0, internalWidth, internalHeight);

    // Calculate tile size
    const tileDisplaySize = Math.min(
      internalWidth / spriteMetadata.original_metadata.width,
      internalHeight / spriteMetadata.original_metadata.height
    );

    // Render all tiles
    spriteMetadata.sheets.forEach(sheet => {
      const spriteSheet = loadedSheets.get(sheet.filename_png);
      if (spriteSheet && spriteSheet.complete) {
        sheet.tile_positions.forEach(tilePos => {
          const canvasX = tilePos.x * tileDisplaySize;
          const canvasY = tilePos.y * tileDisplaySize;
          
          ctx.drawImage(
            spriteSheet,
            tilePos.sprite_x, tilePos.sprite_y,
            spriteMetadata.sprite_config.tile_size, spriteMetadata.sprite_config.tile_size,
            canvasX, canvasY,
            tileDisplaySize, tileDisplaySize
          );
        });
      }
    });

  }, [spriteMetadata, loadedSheets, width, height, isHovering]);

  // Simple pointer handling
  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    let clientX: number, clientY: number;
    
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else {
      return;
    }
    
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;
    setMousePos({ x, y });
  };

  return (
    <div 
      ref={containerRef}
      className="profile-img-container mx-auto mb-8 cursor-pointer"
      onMouseMove={handlePointerMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => {
        setIsHovering(false);
        setMousePos({ x: 0.5, y: 0.5 });
      }}
      onTouchStart={(e) => {
        setIsHovering(true);
        handlePointerMove(e);
      }}
      onTouchMove={handlePointerMove}
      onTouchEnd={() => {
        setTimeout(() => setIsHovering(false), 1000);
      }}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        overflow: 'hidden',
        position: 'relative',
        borderRadius: '8px'
      }}
    >
      {/* Universal canvas - simple and clean */}
      <canvas
        ref={canvasRef}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          display: 'block',
          position: 'absolute',
          top: 0,
          left: 0,
          imageRendering: 'auto', // High-quality rendering instead of pixelated
          transition: 'transform 0.2s ease-out',
          transform: isHovering 
            ? `scale(20) translate(${(0.5 - mousePos.x) * 100}%, ${(0.5 - mousePos.y) * 100}%)`
            : 'scale(1) translate(0, 0)',
          transformOrigin: 'center center',
          // Additional quality optimizations
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          WebkitFontSmoothing: 'antialiased',
          filter: 'contrast(1.02) saturate(1.05)' // Slight enhancement for better visual quality
        }}
      />

      {/* Hidden image for fallback */}
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority
        style={{ 
          position: 'absolute',
          top: '-9999px',
          visibility: 'hidden',
          opacity: 0
        }}
      />
      
      {/* Simple hover message for non-mosaic */}
      {isHovering && !useCifarMosaic && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black bg-opacity-50 text-white px-3 py-1 rounded text-sm">
            Hi there! 👋
          </div>
        </div>
      )}
    </div>
  );
}