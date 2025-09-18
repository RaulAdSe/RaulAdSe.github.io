'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

interface MosaicTile {
  x: number;
  y: number;
  filename: string;
  cifar_index: number;
}

interface MosaicMetadata {
  width: number;
  height: number;
  tile_size: number;
  tiles: MosaicTile[];
}

interface CachedTile {
  data: string; // base64 data URL
  timestamp: number;
}

// Cache management utilities
const CACHE_KEY_PREFIX = 'mosaic_tile_';
const CACHE_VERSION_KEY = 'mosaic_cache_version';
const MAX_CACHE_SIZE = 500; // Maximum tiles to cache

const getCacheKey = (filename: string) => `${CACHE_KEY_PREFIX}${filename}`;

const getCachedTile = (filename: string): string | null => {
  try {
    const cached = localStorage.getItem(getCacheKey(filename));
    if (cached) {
      const parsedCache: CachedTile = JSON.parse(cached);
      return parsedCache.data;
    }
  } catch (error) {
    console.warn('Error reading tile cache:', error);
  }
  return null;
};

const setCachedTile = (filename: string, dataUrl: string): void => {
  try {
    const cacheData: CachedTile = {
      data: dataUrl,
      timestamp: Date.now()
    };
    localStorage.setItem(getCacheKey(filename), JSON.stringify(cacheData));
  } catch (error) {
    // Storage quota exceeded, clear old entries
    if (error instanceof DOMException && error.code === 22) {
      clearOldCacheEntries();
      // Try again
      try {
        const cacheData: CachedTile = {
          data: dataUrl,
          timestamp: Date.now()
        };
        localStorage.setItem(getCacheKey(filename), JSON.stringify(cacheData));
      } catch (secondError) {
        console.warn('Failed to cache tile after cleanup:', secondError);
      }
    } else {
      console.warn('Error caching tile:', error);
    }
  }
};

const clearOldCacheEntries = (): void => {
  try {
    const cacheEntries: Array<{key: string, timestamp: number}> = [];
    
    // Find all cache entries
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_KEY_PREFIX)) {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const parsedCache: CachedTile = JSON.parse(cached);
            cacheEntries.push({ key, timestamp: parsedCache.timestamp });
          }
        } catch (error) {
          // Invalid cache entry, remove it
          localStorage.removeItem(key);
        }
      }
    }
    
    // Sort by timestamp (oldest first) and remove old entries
    cacheEntries.sort((a, b) => a.timestamp - b.timestamp);
    const entriesToRemove = Math.max(0, cacheEntries.length - MAX_CACHE_SIZE + 50); // Remove extra to prevent frequent cleanups
    
    for (let i = 0; i < entriesToRemove; i++) {
      localStorage.removeItem(cacheEntries[i].key);
    }
    
    console.log(`Cleared ${entriesToRemove} old cache entries`);
  } catch (error) {
    console.warn('Error clearing cache entries:', error);
  }
};

interface MosaicImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  pixelSize?: number;
  useCifarMosaic?: boolean;
  mosaicTilesPath?: string;
}

export default function MosaicImage({ 
  src, 
  alt, 
  width, 
  height, 
  pixelSize = 8, 
  useCifarMosaic = false,
  mosaicTilesPath = '/mosaic_tiles'
}: MosaicImageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [mosaicMetadata, setMosaicMetadata] = useState<MosaicMetadata | null>(null);
  const [tileImages, setTileImages] = useState<Map<string, HTMLImageElement>>(new Map());
  const [hasMosaicTiles, setHasMosaicTiles] = useState(false);

  // Load CIFAR mosaic metadata and tiles
  useEffect(() => {
    if (!useCifarMosaic) return;

    const loadMosaicData = async () => {
      try {
        // Load metadata
        const metadataResponse = await fetch(`${mosaicTilesPath}/metadata.json`);
        const metadata: MosaicMetadata = await metadataResponse.json();
        setMosaicMetadata(metadata);

        // Sort tiles by distance from center for better loading order
        const centerX = metadata.width / 2;
        const centerY = metadata.height / 2;
        const sortedTiles = [...metadata.tiles].sort((a, b) => {
          const distA = Math.sqrt(Math.pow(a.x - centerX, 2) + Math.pow(a.y - centerY, 2));
          const distB = Math.sqrt(Math.pow(b.x - centerX, 2) + Math.pow(b.y - centerY, 2));
          return distA - distB;
        });

        const imageMap = new Map<string, HTMLImageElement>();

        // Load tiles in batches with caching (maximum speed optimization)
        const loadTileBatch = async (tiles: MosaicTile[], batchSize: number = 100) => { // Increased to 100 for maximum speed
          for (let i = 0; i < tiles.length; i += batchSize) {
            const batch = tiles.slice(i, i + batchSize);
            
            await Promise.all(batch.map(async (tile) => {
              return new Promise<void>((resolve) => {
                // Check cache first
                const cachedData = getCachedTile(tile.filename);
                
                if (cachedData) {
                  // Use cached image
                  const img = new globalThis.Image();
                  img.onload = () => {
                    imageMap.set(tile.filename, img);
                    setTileImages(new Map(imageMap)); // Trigger re-render
                    setHasMosaicTiles(true); // Mark that we have mosaic tiles
                    resolve();
                  };
                  img.src = cachedData;
                } else {
                  // Load from network and cache
                  const img = new globalThis.Image();
                  img.onload = () => {
                    // Convert to canvas and then to data URL for caching
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                      canvas.width = img.width;
                      canvas.height = img.height;
                      ctx.drawImage(img, 0, 0);
                      try {
                        const dataUrl = canvas.toDataURL('image/png', 0.9);
                        setCachedTile(tile.filename, dataUrl);
                      } catch (error) {
                        console.warn('Failed to cache tile:', tile.filename, error);
                      }
                    }
                    
                    imageMap.set(tile.filename, img);
                    setTileImages(new Map(imageMap)); // Trigger re-render
                    setHasMosaicTiles(true); // Mark that we have mosaic tiles
                    resolve();
                  };
                  img.onerror = () => {
                    resolve();
                  };
                  img.src = `${mosaicTilesPath}/${tile.filename}`;
                }
              });
            }));
            
            // Minimal delay between batches for maximum speed
            if (i + batchSize < tiles.length) {
              await new Promise(resolve => setTimeout(resolve, 1)); // Reduced to 1ms for maximum speed
            }
          }
        };

        // Preload critical center tiles immediately (expanded for maximum speed)
        const criticalTiles = sortedTiles.slice(0, 400); // Most central 400 tiles for instant face visibility
        const remainingTiles = sortedTiles.slice(400);

        // Load critical tiles first with higher priority  
        await Promise.all(
          criticalTiles.slice(0, 100).map(async (tile) => { // Load first 100 immediately for instant face
            return new Promise<void>((resolve) => {
              const cachedData = getCachedTile(tile.filename);
              
              if (cachedData) {
                const img = new globalThis.Image();
                img.onload = () => {
                  imageMap.set(tile.filename, img);
                  setTileImages(new Map(imageMap));
                  resolve();
                };
                img.src = cachedData;
              } else {
                const img = new globalThis.Image();
                img.onload = () => {
                  const canvas = document.createElement('canvas');
                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    try {
                      const dataUrl = canvas.toDataURL('image/png', 0.9);
                      setCachedTile(tile.filename, dataUrl);
                    } catch (error) {
                      console.warn('Failed to cache tile:', tile.filename, error);
                    }
                  }
                  imageMap.set(tile.filename, img);
                  setTileImages(new Map(imageMap));
                  resolve();
                };
                img.onerror = () => resolve();
                img.src = `${mosaicTilesPath}/${tile.filename}`;
              }
            });
          })
        );

        // Load remaining critical tiles (101-400)
        await loadTileBatch(criticalTiles.slice(100));

        // Load all remaining non-critical tiles
        await loadTileBatch(remainingTiles);
        
        setTileImages(imageMap);
      } catch (error) {
        console.error('Failed to load CIFAR mosaic data:', error);
      }
    };

    loadMosaicData();
  }, [useCifarMosaic, mosaicTilesPath]);

  // Create mosaic effect
  useEffect(() => {
    if (!canvasRef.current || !imageRef.current || !imageLoaded) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imageRef.current;
    
    // Set canvas internal resolution (keep internal pixels high even if display size shrinks)
    const BASE_INTERNAL_WIDTH = 4800; // target internal pixel width for crisp zoom
    const scale = useCifarMosaic ? Math.max(20, BASE_INTERNAL_WIDTH / width) : 1;
    const internalWidth = width * scale;
    const internalHeight = height * scale;
    
    canvas.width = internalWidth;
    canvas.height = internalHeight;

    // Disable smoothing so tiles stay crisp when drawn and when zoomed via CSS transform
    // This avoids interpolation blur on the canvas itself
    // Safari/WebKit honors this flag; Chrome/Firefox do as well
    (ctx as any).imageSmoothingEnabled = false;

    if (useCifarMosaic && mosaicMetadata) {
      // Render CIFAR mosaic
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, internalWidth, internalHeight);

      const tileDisplaySize = Math.min(
        internalWidth / mosaicMetadata.width,
        internalHeight / mosaicMetadata.height
      );

      // Draw tiles that are already loaded
      mosaicMetadata.tiles.forEach(tile => {
        const tileImg = tileImages.get(tile.filename);
        if (tileImg && tileImg.complete) {
          const x = tile.x * tileDisplaySize;
          const y = tile.y * tileDisplaySize;
          ctx.drawImage(tileImg, x, y, tileDisplaySize, tileDisplaySize);
        }
      });

    } else {
      // Original color-based mosaic
      // Draw original image to canvas, covering the entire area
      const imgAspectRatio = img.naturalWidth / img.naturalHeight;
      const canvasAspectRatio = internalWidth / internalHeight;
      
      let drawWidth, drawHeight, offsetX = 0, offsetY = 0;
      
      if (imgAspectRatio > canvasAspectRatio) {
        // Image is wider than canvas
        drawHeight = internalHeight;
        drawWidth = internalHeight * imgAspectRatio;
        offsetX = (internalWidth - drawWidth) / 2;
      } else {
        // Image is taller than canvas
        drawWidth = internalWidth;
        drawHeight = internalWidth / imgAspectRatio;
        offsetY = (internalHeight - drawHeight) / 2;
      }
      
      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

      // Get image data
      const imageData = ctx.getImageData(0, 0, internalWidth, internalHeight);
      const data = imageData.data;

      // Create mosaic effect
      for (let y = 0; y < internalHeight; y += pixelSize) {
        for (let x = 0; x < internalWidth; x += pixelSize) {
          // Get average color for this tile
          let r = 0, g = 0, b = 0, a = 0;
          let count = 0;

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

          // Calculate average
          r = Math.floor(r / count);
          g = Math.floor(g / count);
          b = Math.floor(b / count);
          a = Math.floor(a / count);

          // Fill the tile with average color
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a / 255})`;
          ctx.fillRect(x, y, pixelSize, pixelSize);
        }
      }
    }
  }, [imageLoaded, width, height, pixelSize, useCifarMosaic, mosaicMetadata, tileImages, mosaicTilesPath]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    setMousePos({ x, y });
  };

  const handleMouseEnter = () => setIsHovering(true);
  const handleMouseLeave = () => {
    setIsHovering(false);
    setMousePos({ x: 0.5, y: 0.5 });
  };

  return (
    <div 
      ref={containerRef}
      className="profile-img-container mx-auto mb-8 cursor-pointer"
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        overflow: 'hidden',
        position: 'relative',
        borderRadius: '8px'
      }}
    >
      {/* Hidden image for loading */}
      <Image
        ref={imageRef}
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority
        style={{ display: 'none' }}
        onLoad={() => setImageLoaded(true)}
      />
      
      
      {/* Canvas with mosaic effect */}
      <canvas
        ref={canvasRef}
        className="mosaic-canvas"
        style={{
          width: `${width}px`,
          height: `${height}px`,
          display: 'block',
          objectFit: 'cover',
          imageRendering: 'pixelated',
          transition: 'transform 0.3s ease-out',
          opacity: useCifarMosaic && !hasMosaicTiles ? 0 : 1,
          transform: isHovering 
            ? `scale(${useCifarMosaic ? 20 : 1.2}) translate(${(0.5 - mousePos.x) * (useCifarMosaic ? 100 : 20)}%, ${(0.5 - mousePos.y) * (useCifarMosaic ? 100 : 20)}%)`
            : 'scale(1) translate(0, 0)',
          transformOrigin: 'center center',
        }}
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