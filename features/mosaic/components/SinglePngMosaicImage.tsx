'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

interface SinglePngMetadata {
  single_png: {
    filename_png: string;
    filename_webp: string;
    width: number;
    height: number;
    tile_size: number;
  };
  original_metadata: {
    width: number;
    height: number;
    tile_size: number;
  };
}

interface SinglePngMosaicImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  pixelSize?: number;
  useCifarMosaic?: boolean;
  mosaicTilesPath?: string;
}

export default function SinglePngMosaicImage({ 
  src, 
  alt, 
  width, 
  height, 
  pixelSize = 8, 
  useCifarMosaic = false,
  mosaicTilesPath = '/single_png'
}: SinglePngMosaicImageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  
  // Simplified state - just the essentials
  const [singlePngMetadata, setSinglePngMetadata] = useState<SinglePngMetadata | null>(null);
  const [singlePngImage, setSinglePngImage] = useState<HTMLImageElement | null>(null);
  const [supportsWebP, setSupportsWebP] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const [imageLoaded, setImageLoaded] = useState(false);

  // WebP detection
  useEffect(() => {
    const checkWebPSupport = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const dataURL = canvas.toDataURL('image/webp');
      const isSupported = dataURL.startsWith('data:image/webp');
      setSupportsWebP(isSupported);
      console.log(`🖼️ WebP support:`, isSupported);
    };
    checkWebPSupport();
  }, []);

  // Load single PNG metadata and image
  useEffect(() => {
    if (!useCifarMosaic) return;

    const loadSinglePng = async () => {
      try {
        console.log('🔄 Loading single PNG metadata...');
        // Load metadata
        const metadataResponse = await fetch(`${mosaicTilesPath}/single_png_metadata.json`);
        const metadata: SinglePngMetadata = await metadataResponse.json();
        console.log('✅ Metadata loaded:', metadata.single_png);
        setSinglePngMetadata(metadata);

        // Load the single PNG image
        const img = new globalThis.Image();
        
        // Choose format based on WebP support and availability
        const filename = (supportsWebP && metadata.single_png.has_webp) 
          ? metadata.single_png.filename_webp 
          : metadata.single_png.filename_png;
        
        img.onload = () => {
          console.log(`✅ Single PNG loaded: ${filename} (${img.width}×${img.height})`);
          setSinglePngImage(img);
        };
        
        img.onprogress = (e: any) => {
          if (e.lengthComputable) {
            const percent = (e.loaded / e.total * 100).toFixed(1);
            console.log(`📥 Loading PNG: ${percent}%`);
          }
        };
        
        img.onerror = () => {
          // Try fallback format (but check if it exists)
          const fallbackFilename = supportsWebP ? metadata.single_png.filename_png : metadata.single_png.filename_webp;
          
          if (!fallbackFilename || (supportsWebP && !metadata.single_png.has_webp)) {
            // No WebP available, use PNG directly
            console.warn(`WebP not available, loading PNG: ${metadata.single_png.filename_png}`);
            const fallbackImg = new globalThis.Image();
            fallbackImg.onload = () => {
              console.log(`✅ PNG loaded: ${metadata.single_png.filename_png}`);
              setSinglePngImage(fallbackImg);
            };
            fallbackImg.onerror = () => {
              console.error(`Failed to load PNG: ${metadata.single_png.filename_png}`);
            };
            fallbackImg.src = `${mosaicTilesPath}/${metadata.single_png.filename_png}`;
            return;
          }
          
          console.warn(`Failed to load ${filename}, trying ${fallbackFilename}`);
          const fallbackImg = new globalThis.Image();
          fallbackImg.onload = () => {
            console.log(`⚠️ Fallback loaded: ${fallbackFilename}`);
            setSinglePngImage(fallbackImg);
          };
          fallbackImg.onerror = () => {
            console.error(`Failed to load both ${filename} and ${fallbackFilename}`);
          };
          fallbackImg.src = `${mosaicTilesPath}/${fallbackFilename}`;
        };
        
        img.src = `${mosaicTilesPath}/${filename}`;
        
      } catch (error) {
        console.error('Failed to load single PNG:', error);
      }
    };

    loadSinglePng();
  }, [useCifarMosaic, mosaicTilesPath, supportsWebP]);

  // Main canvas rendering
  useEffect(() => {
    if (!canvasRef.current || !singlePngImage || !singlePngMetadata) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate high-resolution canvas dimensions for quality
    const devicePixelRatio = window.devicePixelRatio || 1;
    const scale = useCifarMosaic ? Math.max(20, 6000 / width) * devicePixelRatio : devicePixelRatio;
    
    const internalWidth = width * scale;
    const internalHeight = height * scale;
    
    // Set canvas dimensions
    canvas.width = internalWidth;
    canvas.height = internalHeight;
    
    console.log(`🎨 Canvas setup: ${internalWidth}×${internalHeight} (scale: ${scale})`);

    // Quality settings for crisp rendering
    ctx.imageSmoothingEnabled = false; // Keep pixelated look
    
    if (useCifarMosaic && singlePngImage.complete) {
      // Render single PNG mosaic with quality preservation
      
      // Calculate scale factors
      const mosaicWidth = singlePngMetadata.original_metadata.width;
      const mosaicHeight = singlePngMetadata.original_metadata.height;
      
      // Calculate how much of the single PNG to display to fit our canvas
      const scaleX = internalWidth / singlePngMetadata.single_png.width;
      const scaleY = internalHeight / singlePngMetadata.single_png.height;
      const scaleToUse = Math.min(scaleX, scaleY);
      
      const displayWidth = singlePngMetadata.single_png.width * scaleToUse;
      const displayHeight = singlePngMetadata.single_png.height * scaleToUse;
      
      // Center the image
      const offsetX = (internalWidth - displayWidth) / 2;
      const offsetY = (internalHeight - displayHeight) / 2;
      
      // Render the entire single PNG scaled to fit
      ctx.drawImage(
        singlePngImage,
        0, 0, singlePngImage.width, singlePngImage.height, // Source: entire image
        offsetX, offsetY, displayWidth, displayHeight       // Destination: scaled to fit
      );
      
    } else if (!useCifarMosaic && imageRef.current && imageLoaded) {
      // Original color-based mosaic fallback
      const img = imageRef.current;
      
      // Draw original image to canvas
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

      // Get image data for mosaic effect
      const imageData = ctx.getImageData(0, 0, internalWidth, internalHeight);
      const data = imageData.data;

      // Create mosaic effect
      for (let y = 0; y < internalHeight; y += pixelSize) {
        for (let x = 0; x < internalWidth; x += pixelSize) {
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

          r = Math.floor(r / count);
          g = Math.floor(g / count);
          b = Math.floor(b / count);
          a = Math.floor(a / count);

          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a / 255})`;
          ctx.fillRect(x, y, pixelSize, pixelSize);
        }
      }
    }
  }, [singlePngImage, singlePngMetadata, width, height, useCifarMosaic, imageLoaded, pixelSize]);

  // High-quality zoom rendering
  useEffect(() => {
    if (!canvasRef.current || !singlePngImage || !singlePngMetadata || !isHovering) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate zoom parameters
    const zoomFactor = 20;
    const zoomAreaSize = 0.05; // 5% of the image (1/20th since we're zooming 20x)
    
    // Mouse position in normalized coordinates (0-1)
    const centerX = mousePos.x;
    const centerY = mousePos.y;
    
    // Calculate source area in the single PNG
    const sourceLeft = Math.max(0, centerX - zoomAreaSize / 2);
    const sourceTop = Math.max(0, centerY - zoomAreaSize / 2);
    const sourceRight = Math.min(1, centerX + zoomAreaSize / 2);
    const sourceBottom = Math.min(1, centerY + zoomAreaSize / 2);
    
    // Convert to pixel coordinates in the single PNG
    const pngWidth = singlePngMetadata.single_png.width;
    const pngHeight = singlePngMetadata.single_png.height;
    
    const sourceLeftPx = Math.floor(sourceLeft * pngWidth);
    const sourceTopPx = Math.floor(sourceTop * pngHeight);
    const sourceWidthPx = Math.ceil((sourceRight - sourceLeft) * pngWidth);
    const sourceHeightPx = Math.ceil((sourceBottom - sourceTop) * pngHeight);
    
    // Clear canvas and render zoomed section
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // High-quality settings for zoom
    ctx.imageSmoothingEnabled = true;
    if ('imageSmoothingQuality' in ctx) {
      (ctx as any).imageSmoothingQuality = 'high';
    }
    
    // Render the zoomed section to fill the entire canvas
    ctx.drawImage(
      singlePngImage,
      sourceLeftPx, sourceTopPx, sourceWidthPx, sourceHeightPx, // Source: small region from single PNG
      0, 0, canvas.width, canvas.height                          // Destination: entire canvas
    );
    
    console.log(`🔍 Zoom: ${sourceLeftPx},${sourceTopPx} ${sourceWidthPx}×${sourceHeightPx} → ${canvas.width}×${canvas.height}`);

  }, [singlePngImage, singlePngMetadata, isHovering, mousePos, width, height]);

  // Mouse/touch handling
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
    
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
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
      {/* Hidden original image for fallback */}
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
      
      {/* Main canvas */}
      <canvas
        ref={canvasRef}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          display: 'block',
          objectFit: 'cover',
          imageRendering: useCifarMosaic ? 'auto' : 'pixelated',
          // Quality optimizations
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          WebkitFontSmoothing: 'antialiased',
          filter: 'contrast(1.02) saturate(1.05)'
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