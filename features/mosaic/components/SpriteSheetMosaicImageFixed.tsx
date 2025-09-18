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
  
  // Minimal state - WebP detection + loading
  const [spriteMetadata, setSpriteMetadata] = useState<SpriteMetadata | null>(null);
  const [loadedSheets, setLoadedSheets] = useState<Map<string, HTMLImageElement>>(new Map());
  const [renderedSheets, setRenderedSheets] = useState<Set<string>>(new Set());
  const [supportsWebP, setSupportsWebP] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const [zoomCanvas, setZoomCanvas] = useState<HTMLCanvasElement | null>(null);

  // Universal WebP detection for all browsers
  useEffect(() => {
    const checkWebPSupport = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const dataURL = canvas.toDataURL('image/webp');
      const isSupported = dataURL.startsWith('data:image/webp');
      const browserInfo = /^((?!chrome|android).)*safari/i.test(navigator.userAgent) ? 'Safari' : 
                         navigator.userAgent.includes('Firefox') ? 'Firefox' : 'Chrome';
      setSupportsWebP(isSupported);
      console.log(`🖼️ ${browserInfo} WebP support:`, isSupported, isSupported ? '(will load .webp files)' : '(will load .png files)');
    };
    checkWebPSupport();
  }, []);

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
            // Universal WebP loading with PNG fallback
            const preferredFilename = supportsWebP ? sheet.filename_webp : sheet.filename_png;
            const fallbackFilename = supportsWebP ? sheet.filename_png : sheet.filename_webp;
            const img = new globalThis.Image();
            
            await new Promise<void>((resolve) => {
              img.onload = () => {
                console.log(`✅ Loaded ${preferredFilename} (${supportsWebP ? 'WebP' : 'PNG'} preferred)`);
                sheetMap.set(preferredFilename, img);
                setLoadedSheets(new Map(sheetMap)); // Trigger re-render
                resolve();
              };
              
              img.onerror = () => {
                // Try fallback format if preferred format fails
                console.warn(`Failed to load ${preferredFilename}, trying fallback ${fallbackFilename}`);
                const fallbackImg = new globalThis.Image();
                fallbackImg.onload = () => {
                  console.log(`⚠️ Fallback loaded ${fallbackFilename} (${!supportsWebP ? 'WebP' : 'PNG'} fallback)`);
                  sheetMap.set(fallbackFilename, fallbackImg);
                  setLoadedSheets(new Map(sheetMap));
                  resolve();
                };
                fallbackImg.onerror = () => {
                  console.error(`Failed to load both ${preferredFilename} and ${fallbackFilename}`);
                  resolve(); // Continue even if both fail
                };
                fallbackImg.src = `${mosaicTilesPath}/${fallbackFilename}`;
              };
              
              img.src = `${mosaicTilesPath}/${preferredFilename}`;
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
  }, [useCifarMosaic, mosaicTilesPath, supportsWebP]);

  // Initialize canvases once when metadata loads
  useEffect(() => {
    if (!canvasRef.current || !spriteMetadata) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Create zoom canvas for high-quality zoom rendering
    const zoomCanvasElement = document.createElement('canvas');
    setZoomCanvas(zoomCanvasElement);

    // Browser-optimized canvas setup with high quality
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const devicePixelRatio = window.devicePixelRatio || 1;
    
    // High-quality base resolution with browser-specific limits
    let baseScale, maxCanvasSize, effectivePixelRatio;
    
    // Use identical scaling for all browsers - Safari can handle the same quality
    baseScale = Math.max(25, 6000 / width);
    effectivePixelRatio = devicePixelRatio;
    
    // Only limit canvas size for Safari, but use same base quality
    if (isSafari) {
      maxCanvasSize = 4096; // Safari's memory limit
      console.log('🍎 Safari: Using universal quality with 4096px limit');
    } else {
      maxCanvasSize = 8192; // Higher limit for modern browsers
    }
    
    let scale = baseScale * effectivePixelRatio;
    let internalWidth = width * scale;
    let internalHeight = height * scale;
    
    // Apply browser-specific canvas size limits
    if (internalWidth > maxCanvasSize || internalHeight > maxCanvasSize) {
      const downscale = Math.min(maxCanvasSize / internalWidth, maxCanvasSize / internalHeight);
      internalWidth = Math.floor(internalWidth * downscale);
      internalHeight = Math.floor(internalHeight * downscale);
      console.log(`📱 ${isSafari ? 'Safari' : 'Modern browser'} canvas resize:`, { 
        original: { width: width * scale, height: height * scale },
        final: { width: internalWidth, height: internalHeight },
        downscale 
      });
    }
    
    // Log final canvas dimensions and quality settings
    console.log(`📐 Canvas setup (${isSafari ? 'Safari' : 'Modern browser'}):`, {
      displaySize: { width, height },
      canvasSize: { width: internalWidth, height: internalHeight },
      baseScale,
      effectivePixelRatio,
      finalScale: scale
    });
    
    // Validate canvas dimensions before setting
    try {
      canvas.width = internalWidth;
      canvas.height = internalHeight;
      console.log('✅ Canvas created successfully:', { width: internalWidth, height: internalHeight });
    } catch (error) {
      console.error('❌ Canvas creation failed, using fallback size:', error);
      // Fallback to much smaller size for Safari
      canvas.width = width * 10;
      canvas.height = height * 10;
    }

    // High-quality rendering settings - especially important for Safari
    ctx.imageSmoothingEnabled = true; // Always smooth for better quality
    if ('imageSmoothingQuality' in ctx) {
      (ctx as any).imageSmoothingQuality = 'high';
    }
    
    // Safari-specific context optimizations
    if (isSafari) {
      console.log('🍎 Safari: Enhanced canvas quality settings applied');
      ctx.globalCompositeOperation = 'source-over';
      if ('textRenderingOptimization' in ctx) {
        (ctx as any).textRenderingOptimization = 'optimizeQuality';
      }
    }
    
    // Clear canvas once - no more clearing during loading!
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Reset rendered sheets when canvas is reinitialized
    setRenderedSheets(new Set());

  }, [spriteMetadata, width, height]);

  // Incremental render: Only draw newly loaded tiles
  useEffect(() => {
    if (!canvasRef.current || !spriteMetadata || loadedSheets.size === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate tile size based on current canvas dimensions
    const tileDisplaySize = Math.min(
      canvas.width / spriteMetadata.original_metadata.width,
      canvas.height / spriteMetadata.original_metadata.height
    );

    // Only render newly loaded sheets (incremental rendering)
    const newlyRendered = new Set<string>();
    spriteMetadata.sheets.forEach(sheet => {
      // Try to get the sprite sheet with either format
      const webpFilename = sheet.filename_webp;
      const pngFilename = sheet.filename_png;
      const spriteSheet = loadedSheets.get(webpFilename) || loadedSheets.get(pngFilename);
      const sheetKey = webpFilename || pngFilename;
      
      // Only draw if this sheet is loaded and hasn't been rendered yet
      if (spriteSheet && spriteSheet.complete && !renderedSheets.has(sheetKey)) {
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
        newlyRendered.add(sheetKey);
      }
    });

    // Update the rendered sheets set
    if (newlyRendered.size > 0) {
      setRenderedSheets(prev => new Set([...prev, ...newlyRendered]));
    }

  }, [spriteMetadata, loadedSheets, renderedSheets]);

  // Canvas-native zoom rendering for high quality
  useEffect(() => {
    if (!zoomCanvas || !canvasRef.current || !spriteMetadata || !isHovering || loadedSheets.size === 0) return;

    const zoomCtx = zoomCanvas.getContext('2d');
    if (!zoomCtx) return;

    // Set zoom canvas to display size for crisp rendering
    const zoomFactor = 20;
    const displayWidth = width;
    const displayHeight = height;
    
    zoomCanvas.width = displayWidth;
    zoomCanvas.height = displayHeight;

    // Calculate zoom area in the original mosaic coordinates
    const zoomAreaSize = 0.05; // 5% of the image (1/20th since we're zooming 20x)
    const centerX = mousePos.x;
    const centerY = mousePos.y;
    
    const sourceLeft = Math.max(0, centerX - zoomAreaSize / 2);
    const sourceTop = Math.max(0, centerY - zoomAreaSize / 2);
    const sourceRight = Math.min(1, centerX + zoomAreaSize / 2);
    const sourceBottom = Math.min(1, centerY + zoomAreaSize / 2);
    
    // Convert to actual mosaic coordinates
    const mosaicWidth = spriteMetadata.original_metadata.width;
    const mosaicHeight = spriteMetadata.original_metadata.height;
    
    const sourceLeftPx = Math.floor(sourceLeft * mosaicWidth);
    const sourceTopPx = Math.floor(sourceTop * mosaicHeight);
    const sourceRightPx = Math.ceil(sourceRight * mosaicWidth);
    const sourceBottomPx = Math.ceil(sourceBottom * mosaicHeight);
    
    // High-quality rendering settings for zoom
    zoomCtx.imageSmoothingEnabled = false; // Pixelated for mosaic effect when zoomed
    if ('imageSmoothingQuality' in zoomCtx) {
      (zoomCtx as any).imageSmoothingQuality = 'high';
    }

    // Clear zoom canvas
    zoomCtx.clearRect(0, 0, displayWidth, displayHeight);

    // Calculate tile size for zoom rendering - much higher resolution
    const zoomTileSize = Math.max(8, Math.min(50, (displayWidth * zoomFactor) / mosaicWidth));
    
    console.log(`🔍 Canvas zoom rendering:`, {
      zoomArea: { sourceLeftPx, sourceTopPx, sourceRightPx, sourceBottomPx },
      zoomTileSize,
      mousePos,
      canvasSize: { width: displayWidth, height: displayHeight }
    });

    // Render only tiles in the zoom area at high resolution
    spriteMetadata.sheets.forEach(sheet => {
      const webpFilename = sheet.filename_webp;
      const pngFilename = sheet.filename_png;
      const spriteSheet = loadedSheets.get(webpFilename) || loadedSheets.get(pngFilename);
      
      if (spriteSheet && spriteSheet.complete) {
        sheet.tile_positions.forEach(tilePos => {
          // Check if this tile is in the zoom area
          if (tilePos.x >= sourceLeftPx && tilePos.x <= sourceRightPx &&
              tilePos.y >= sourceTopPx && tilePos.y <= sourceBottomPx) {
            
            // Calculate position in zoom canvas
            const relativeX = (tilePos.x - sourceLeftPx) / (sourceRightPx - sourceLeftPx);
            const relativeY = (tilePos.y - sourceTopPx) / (sourceBottomPx - sourceTopPx);
            
            const zoomCanvasX = relativeX * displayWidth;
            const zoomCanvasY = relativeY * displayHeight;
            
            zoomCtx.drawImage(
              spriteSheet,
              tilePos.sprite_x, tilePos.sprite_y,
              spriteMetadata.sprite_config.tile_size, spriteMetadata.sprite_config.tile_size,
              zoomCanvasX, zoomCanvasY,
              zoomTileSize, zoomTileSize
            );
          }
        });
      }
    });

  }, [zoomCanvas, spriteMetadata, loadedSheets, isHovering, mousePos, width, height]);

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
      {/* Main mosaic canvas */}
      <canvas
        ref={canvasRef}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          display: 'block',
          position: 'absolute',
          top: 0,
          left: 0,
          imageRendering: 'auto',
          opacity: isHovering ? 0 : 1,
          transition: 'opacity 0.2s ease-out',
          // Additional quality optimizations
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          WebkitFontSmoothing: 'antialiased',
          filter: 'contrast(1.02) saturate(1.05)'
        }}
      />

      {/* High-quality zoom canvas overlay */}
      {isHovering && zoomCanvas && (
        <canvas
          ref={(el) => {
            if (el && zoomCanvas) {
              // Copy zoom canvas content to displayed canvas
              const ctx = el.getContext('2d');
              if (ctx) {
                el.width = width;
                el.height = height;
                ctx.drawImage(zoomCanvas, 0, 0);
              }
            }
          }}
          style={{
            width: `${width}px`,
            height: `${height}px`,
            display: 'block',
            position: 'absolute',
            top: 0,
            left: 0,
            imageRendering: 'pixelated', // Sharp pixel edges for zoom effect
            opacity: 1,
            transition: 'opacity 0.2s ease-out',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            filter: 'contrast(1.02) saturate(1.05)'
          }}
        />
      )}

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