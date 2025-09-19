'use client';

import { useState } from 'react';
import Image from 'next/image';

interface SimpleMosaicImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  mosaicSrc?: string; // The generated mosaic image
  className?: string;
}

export default function SimpleMosaicImage({ 
  src, 
  alt, 
  width, 
  height,
  mosaicSrc,
  className = ""
}: SimpleMosaicImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0.5, y: 0.5 });
  const [isHovered, setIsHovered] = useState(false);

  // Handle image loading
  const handleImageLoad = () => {
    setImageLoaded(true);
    setIsLoading(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
  };

  // Handle mouse movement for dynamic zoom
  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setMousePosition({ 
      x: Math.max(0, Math.min(1, x)), 
      y: Math.max(0, Math.min(1, y)) 
    });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  // Calculate dynamic transform based on mouse position
  const getTransform = () => {
    if (!isHovered) return 'scale(1)';
    
    const scale = 17.0;
    
    // Calculate maximum safe offset based on actual container dimensions
    // At scale 17x, the image is 17 times bigger, so it can move (16/17) of its size
    const maxOffsetX = (width * (scale - 1)) / (2 * scale);
    const maxOffsetY = (height * (scale - 1)) / (2 * scale);
    
    // Calculate raw offset based on cursor position
    const rawOffsetX = (0.5 - mousePosition.x) * maxOffsetX * 2;
    const rawOffsetY = (0.5 - mousePosition.y) * maxOffsetY * 2;
    
    // Clamp offsets within safe boundaries (much more generous now)
    const offsetX = Math.max(-maxOffsetX, Math.min(maxOffsetX, rawOffsetX));
    const offsetY = Math.max(-maxOffsetY, Math.min(maxOffsetY, rawOffsetY));
    
    return `scale(${scale}) translate(${offsetX}px, ${offsetY}px)`;
  };

  return (
    <div 
      className={`relative overflow-hidden group ${className}`}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        borderRadius: '8px'
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Loading Spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div 
            className="animate-spin"
            style={{
              width: '50px',
              height: '50px',
              border: '5px solid rgba(0, 0, 0, 0.1)',
              borderRadius: '50%',
              borderTopColor: '#2E2D29'
            }}
          />
        </div>
      )}

      {/* Display mosaic if available, otherwise show original image */}
      {mosaicSrc ? (
        <div className="absolute inset-0 w-full h-full">
          <Image
            src={mosaicSrc}
            alt={`${alt} - Dog mosaic`}
            width={width}
            height={height}
            priority
            onLoad={handleImageLoad}
            onError={handleImageError}
            className="w-full h-full object-cover transition-transform duration-[350ms] ease-out will-change-transform"
            style={{
              imageRendering: 'pixelated',
              opacity: imageLoaded ? 1 : 0,
              transition: 'transform 0.35s ease-out, opacity 0.3s ease-out',
              transform: getTransform()
            }}
          />
        </div>
      ) : (
        <div className="absolute inset-0 w-full h-full">
          <Image
            src={src}
            alt={alt}
            width={width}
            height={height}
            priority
            onLoad={handleImageLoad}
            onError={handleImageError}
            className="w-full h-full object-cover transition-transform duration-[350ms] ease-out will-change-transform"
            style={{
              opacity: imageLoaded ? 1 : 0,
              transition: 'transform 0.35s ease-out, opacity 0.3s ease-out',
              transform: getTransform()
            }}
          />
        </div>
      )}
    </div>
  );
}