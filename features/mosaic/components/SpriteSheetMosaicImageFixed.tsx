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
  pixelSize = 8, 
  useCifarMosaic = false,
  mosaicTilesPath = '/sprite_sheets'
}: SpriteSheetMosaicImageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [spriteMetadata, setSpriteMetadata] = useState<SpriteMetadata | null>(null);
  const [loadedSpriteSheets, setLoadedSpriteSheets] = useState<Map<string, HTMLImageElement>>(new Map());
  const [hasMosaicTiles, setHasMosaicTiles] = useState(false);
  const [supportsWebP, setSupportsWebP] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [drawnTiles, setDrawnTiles] = useState<Set<string>>(new Set());
  const [devicePixelRatio, setDevicePixelRatio] = useState(1);
  const [isMobile, setIsMobile] = useState(false);

  // Detect device capabilities
  useEffect(() => {
    const ratio = window.devicePixelRatio || 1;
    setDevicePixelRatio(ratio);
    
    // Detect mobile device
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      || ('ontouchstart' in window)
      || (navigator.maxTouchPoints > 0);
    setIsMobile(isMobileDevice);
    
    console.log('🔍 Device detection:', { 
      devicePixelRatio: ratio, 
      isMobile: isMobileDevice,
      userAgent: navigator.userAgent.substring(0, 50) + '...'
    });
  }, []);

  // Check WebP support
  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const dataURL = canvas.toDataURL('image/webp');
    setSupportsWebP(dataURL.startsWith('data:image/webp'));
  }, []);

  // Initialize canvas with placeholder when component mounts
  useEffect(() => {
    if (!canvasRef.current || !useCifarMosaic) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas internal resolution with mobile optimization
    const BASE_INTERNAL_WIDTH = isMobile ? 1200 : 2400; // Reduce base resolution for mobile
    const maxCanvasSize = isMobile ? 4096 : 8192; // Mobile GPU memory limits
    
    let scale = Math.max(20, BASE_INTERNAL_WIDTH / width);
    let internalWidth = width * scale * devicePixelRatio;
    let internalHeight = height * scale * devicePixelRatio;
    
    // Enforce mobile canvas size limits to prevent GPU memory issues
    if (isMobile && (internalWidth > maxCanvasSize || internalHeight > maxCanvasSize)) {
      const downscale = Math.min(maxCanvasSize / internalWidth, maxCanvasSize / internalHeight);
      internalWidth *= downscale;
      internalHeight *= downscale;
      scale *= downscale;
      console.log('📱 Mobile canvas downscaled:', { downscale, finalWidth: internalWidth, finalHeight: internalHeight });
    }
    
    canvas.width = internalWidth;
    canvas.height = internalHeight;

    // Disable smoothing for crisp sprite rendering
    (ctx as any).imageSmoothingEnabled = false;

    // Initialize with subtle placeholder pattern
    const gradient = ctx.createLinearGradient(0, 0, internalWidth, internalHeight);
    gradient.addColorStop(0, '#f8f9fa');
    gradient.addColorStop(1, '#e9ecef');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, internalWidth, internalHeight);

    setIsInitialLoad(false);
  }, [width, height, useCifarMosaic, isMobile, devicePixelRatio]);

  // Load sprite sheet metadata and implement sequential loading
  useEffect(() => {
    if (!useCifarMosaic) return;

    const loadSpriteData = async () => {
      try {
        console.log('🎨 Loading sprite sheet metadata...', { width, height, mosaicTilesPath });
        
        // Load sprite metadata
        const metadataResponse = await fetch(`${mosaicTilesPath}/sprite_metadata.json`);
        if (!metadataResponse.ok) {
          throw new Error(`Failed to load metadata: ${metadataResponse.status}`);
        }
        
        const metadata: SpriteMetadata = await metadataResponse.json();
        setSpriteMetadata(metadata);

        console.log(`📊 Loaded sprite metadata: ${metadata.sheets.length} sheets`);

        // Generate spiral loading order for 5x5 grid from center outward (anticlockwise)
        const generateSpiralLoadingOrder = (totalSheets: number): Array<{sheet: number, priority: number}> => {
          if (totalSheets !== 25) {
            // Fallback for non-5x5 grids
            return Array.from({ length: totalSheets }, (_, i) => ({
              sheet: i,
              priority: i
            }));
          }
          
          // 5x5 grid positions (grid_y * 5 + grid_x = sheet_index)
          const grid = [
            [ 0,  1,  2,  3,  4],  // row 0
            [ 5,  6,  7,  8,  9],  // row 1  
            [10, 11, 12, 13, 14],  // row 2 (center row)
            [15, 16, 17, 18, 19],  // row 3
            [20, 21, 22, 23, 24]   // row 4
          ];
          
          const visited = Array(5).fill(null).map(() => Array(5).fill(false));
          const spiralOrder: Array<{sheet: number, priority: number}> = [];
          
          // Start from center (2,2) = sheet 12
          let x = 2, y = 2;
          let direction = 0; // 0=right, 1=up, 2=left, 3=down
          let steps = 1;
          let priority = 0;
          
          // Directions: right, up, left, down (anticlockwise from right)
          const dx = [0, -1, 0, 1];
          const dy = [1, 0, -1, 0];
          
          // Add center first
          spiralOrder.push({ sheet: grid[x][y], priority: priority++ });
          visited[x][y] = true;
          
          // Generate spiral pattern
          while (spiralOrder.length < 25) {
            for (let i = 0; i < 2; i++) { // Each step count is used twice
              for (let j = 0; j < steps; j++) {
                x += dx[direction];
                y += dy[direction];
                
                if (x >= 0 && x < 5 && y >= 0 && y < 5 && !visited[x][y]) {
                  spiralOrder.push({ sheet: grid[x][y], priority: priority++ });
                  visited[x][y] = true;
                  
                  if (spiralOrder.length >= 25) break;
                }
              }
              if (spiralOrder.length >= 25) break;
              direction = (direction + 1) % 4;
            }
            steps++;
          }
          
          console.log('🌀 Spiral loading order:', spiralOrder.map(s => s.sheet));
          return spiralOrder;
        };
        
        const loadingOrder = generateSpiralLoadingOrder(metadata.sheets.length);
        
        console.log(`🌀 Loading ${metadata.sheets.length} sprite sheets in 5x5 grid...`);

        // Load sprite sheets in parallel batches (4 concurrent)
        const spriteSheetMap = new Map<string, HTMLImageElement>();
        let loadedCount = 0;
        const BATCH_SIZE = 4;

        const loadSpriteSheet = async (sheetIndex: number): Promise<void> => {
          const sheet = metadata.sheets[sheetIndex];
          if (!sheet) return;
          
          const filename = supportsWebP ? sheet.filename_webp : sheet.filename_png;
          if (!filename) return;
          
          try {
            const img = new globalThis.Image();
            await new Promise<void>((resolve) => {
              img.onload = () => {
                spriteSheetMap.set(filename, img);
                loadedCount++;
                
                // Trigger incremental render
                setLoadedSpriteSheets(new Map(spriteSheetMap));
                
                if (loadedCount === 1) {
                  setHasMosaicTiles(true);
                }
                
                resolve();
              };
              img.onerror = () => {
                console.warn(`Failed to load sprite sheet: ${filename}`);
                resolve(); // Continue loading other sheets
              };
              img.src = `${mosaicTilesPath}/${filename}`;
            });
          } catch (error) {
            console.warn(`Error loading sprite sheet ${filename}:`, error);
          }
        };

        // Process loading order in batches
        for (let i = 0; i < loadingOrder.length; i += BATCH_SIZE) {
          const batch = loadingOrder.slice(i, i + BATCH_SIZE);
          await Promise.allSettled(
            batch.map(({ sheet: sheetIndex }) => loadSpriteSheet(sheetIndex))
          );
        }

        console.log('✅ All sprite sheets loaded!');

      } catch (error) {
        console.error('Failed to load sprite sheet data:', error);
      }
    };

    loadSpriteData();
  }, [useCifarMosaic, mosaicTilesPath, supportsWebP]);

  // Incremental sprite rendering - only render new tiles as sprite sheets load
  useEffect(() => {
    if (!canvasRef.current || !imageRef.current || !imageLoaded || !spriteMetadata || !useCifarMosaic) {
      console.log('🚫 Mosaic render skipped:', { 
        hasCanvas: !!canvasRef.current, 
        hasImage: !!imageRef.current, 
        imageLoaded, 
        hasMetadata: !!spriteMetadata, 
        useCifarMosaic 
      });
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    console.log('🎨 Starting mosaic render:', { width, height, loadedSheets: loadedSpriteSheets.size });

    // Calculate display parameters with mobile optimization
    const BASE_INTERNAL_WIDTH = isMobile ? 1200 : 2400; // Reduce base resolution for mobile
    const maxCanvasSize = isMobile ? 4096 : 8192; // Mobile GPU memory limits
    
    let scale = Math.max(20, BASE_INTERNAL_WIDTH / width);
    let internalWidth = width * scale * devicePixelRatio;
    let internalHeight = height * scale * devicePixelRatio;
    
    // Enforce mobile canvas size limits
    if (isMobile && (internalWidth > maxCanvasSize || internalHeight > maxCanvasSize)) {
      const downscale = Math.min(maxCanvasSize / internalWidth, maxCanvasSize / internalHeight);
      internalWidth *= downscale;
      internalHeight *= downscale;
      scale *= downscale;
    }

    const tileDisplaySize = Math.min(
      internalWidth / spriteMetadata.original_metadata.width,
      internalHeight / spriteMetadata.original_metadata.height
    );

    // Enable smoothing when hovering for better zoom quality, disable otherwise for crisp mosaic
    (ctx as any).imageSmoothingEnabled = isHovering;

    // Track newly available tiles
    const newlyDrawnTiles = new Set<string>();

    // Only render tiles from newly loaded sprite sheets
    spriteMetadata.sheets.forEach(sheet => {
      if (!sheet) return;
      
      const sheetFilename = supportsWebP ? sheet.filename_webp : sheet.filename_png;
      if (!sheetFilename) return;
      
      const spriteSheet = loadedSpriteSheets.get(sheetFilename);
      
      // Only proceed if this sprite sheet is loaded and complete
      if (spriteSheet && spriteSheet.complete) {
        sheet.tile_positions.forEach(tilePos => {
          if (!tilePos) return;
          
          const tileKey = `${tilePos.x}-${tilePos.y}`;
          
          // Only draw tiles that haven't been drawn yet
          if (!drawnTiles.has(tileKey)) {
            const canvasX = tilePos.x * tileDisplaySize;
            const canvasY = tilePos.y * tileDisplaySize;
            
            // Draw tile from sprite sheet
            ctx.drawImage(
              spriteSheet,
              tilePos.sprite_x, tilePos.sprite_y, // Source position in sprite
              spriteMetadata.sprite_config.tile_size, spriteMetadata.sprite_config.tile_size, // Source size
              canvasX, canvasY, // Destination position
              tileDisplaySize, tileDisplaySize // Destination size
            );
            
            newlyDrawnTiles.add(tileKey);
          }
        });
      }
    });

    // Update the set of drawn tiles if we drew new ones
    if (newlyDrawnTiles.size > 0) {
      setDrawnTiles(prev => new Set([...prev, ...newlyDrawnTiles]));
    }

  }, [imageLoaded, width, height, useCifarMosaic, spriteMetadata, loadedSpriteSheets, supportsWebP, drawnTiles, isMobile, devicePixelRatio]);

  // Fallback mosaic rendering for non-sprite mode
  useEffect(() => {
    if (!canvasRef.current || !imageRef.current || !imageLoaded || useCifarMosaic) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imageRef.current;
    
    // Set canvas internal resolution
    const internalWidth = width;
    const internalHeight = height;
    
    canvas.width = internalWidth;
    canvas.height = internalHeight;

    // Original color-based mosaic (fallback)
    const imgAspectRatio = img.naturalWidth / img.naturalHeight;
    const canvasAspectRatio = internalWidth / internalHeight;
    
    let drawWidth, drawHeight, offsetX = 0, offsetY = 0;
    
    if (imgAspectRatio > canvasAspectRatio) {
      drawHeight = internalHeight;
      drawWidth = internalHeight * imgAspectRatio;
      offsetX = (internalWidth - drawWidth) / 2;
    } else {
      drawWidth = internalWidth;
      drawHeight = internalWidth / imgAspectRatio;
      offsetY = (internalHeight - drawHeight) / 2;
    }
    
    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

    // Get image data and create mosaic effect
    const imageData = ctx.getImageData(0, 0, internalWidth, internalHeight);
    const data = imageData.data;

    for (let y = 0; y < internalHeight; y += pixelSize) {
      for (let x = 0; x < internalWidth; x += pixelSize) {
        let r = 0, g = 0, b = 0, a = 0, count = 0;

        for (let dy = 0; dy < pixelSize && y + dy < internalHeight; dy++) {
          for (let dx = 0; dx < pixelSize && x + dx < internalWidth; dx++) {
            const i = ((y + dy) * internalWidth + (x + dx)) * 4;
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
            a += data[i + 3];
            count++;
          }
        }

        r = Math.floor(r / count);
        g = Math.floor(g / count);
        b = Math.floor(b / count);
        a = Math.floor(a / count);

        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a / 255})`;
        ctx.fillRect(x, y, pixelSize, pixelSize);
      }
    }
  }, [imageLoaded, width, height, pixelSize, useCifarMosaic]);

  // Handle both mouse and touch events
  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    let clientX: number, clientY: number;
    
    if ('touches' in e && e.touches.length > 0) {
      // Touch event
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      // Mouse event
      clientX = e.clientX;
      clientY = e.clientY;
    } else {
      return;
    }
    
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;
    
    setMousePos({ x, y });
  };

  const handlePointerEnter = () => setIsHovering(true);
  const handlePointerLeave = () => {
    setIsHovering(false);
    setMousePos({ x: 0.5, y: 0.5 });
  };

  // Mobile-specific touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isMobile) {
      setIsHovering(true);
      handlePointerMove(e);
    }
  };

  const handleTouchEnd = () => {
    if (isMobile) {
      // Keep hovering briefly on mobile for better UX
      setTimeout(() => setIsHovering(false), 1000);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="profile-img-container mx-auto mb-8 cursor-pointer"
      onMouseMove={handlePointerMove}
      onMouseEnter={handlePointerEnter}
      onMouseLeave={handlePointerLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handlePointerMove}
      onTouchEnd={handleTouchEnd}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        overflow: 'hidden',
        position: 'relative',
        borderRadius: '8px'
      }}
    >
      {/* Canvas with sprite-based mosaic effect - always visible */}
      <canvas
        ref={canvasRef}
        className="mosaic-canvas"
        style={{
          width: `${width}px`,
          height: `${height}px`,
          display: 'block',
          objectFit: 'cover',
          imageRendering: isHovering ? 'auto' : 'pixelated',
          transition: isMobile ? 'transform 0.2s ease-out' : 'transform 0.3s ease-out',
          opacity: 1,
          transform: isHovering 
            ? `scale(${useCifarMosaic ? (isMobile ? 15 : 20) : 1.2}) translate(${(0.5 - mousePos.x) * (useCifarMosaic ? (isMobile ? 80 : 100) : 20)}%, ${(0.5 - mousePos.y) * (useCifarMosaic ? (isMobile ? 80 : 100) : 20)}%)`
            : 'scale(1) translate(0, 0)',
          transformOrigin: 'center center',
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 2,
          // Mobile-specific optimizations
          backfaceVisibility: isMobile ? 'hidden' : 'visible',
          WebkitBackfaceVisibility: isMobile ? 'hidden' : 'visible',
          willChange: isHovering ? 'transform' : 'auto',
        }}
      />

      {/* Hidden image for loading - completely invisible */}
      <Image
        ref={imageRef}
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority
        style={{ 
          position: 'absolute',
          top: '-9999px',
          left: '-9999px',
          visibility: 'hidden',
          opacity: 0,
          zIndex: -1
        }}
        onLoad={() => setImageLoaded(true)}
      />
      
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