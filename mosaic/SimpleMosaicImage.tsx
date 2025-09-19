'use client';

import { useRef, useState } from 'react';
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const [isLoading, setIsLoading] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Zoom constants based on davidheineman.com implementation
  const ZOOM = 20;

  // Handle mouse movement for zoom
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setMousePos({ x, y });
  };

  // Handle touch for mobile
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!containerRef.current || e.touches.length === 0) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const x = (touch.clientX - rect.left) / rect.width;
    const y = (touch.clientY - rect.top) / rect.height;
    setMousePos({ x, y });
  };

  // Handle image loading
  const handleImageLoad = () => {
    setImageLoaded(true);
    setIsLoading(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
  };

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-hidden cursor-pointer select-none ${className}`}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        borderRadius: '8px'
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => {
        setIsHovering(false);
        setMousePos({ x: 0.5, y: 0.5 });
      }}
      onTouchStart={(e) => {
        setIsHovering(true);
        handleTouchMove(e);
      }}
      onTouchMove={handleTouchMove}
      onTouchEnd={() => {
        setTimeout(() => setIsHovering(false), 1000);
      }}
    >
      {/* Loading Spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
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

      {/* Hidden original image for fallback */}
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority
        onLoad={handleImageLoad}
        onError={handleImageError}
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          opacity: mosaicSrc ? 0 : (imageLoaded ? 1 : 0),
          transition: 'opacity 0.3s ease-out'
        }}
      />

      {/* Dog mosaic image - always visible when available */}
      {mosaicSrc && (
        <Image
          src={mosaicSrc}
          alt={`${alt} - Dog mosaic`}
          width={width}
          height={height}
          onLoad={handleImageLoad}
          onError={handleImageError}
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            imageRendering: 'pixelated',
            transformOrigin: 'center center',
            opacity: imageLoaded ? 1 : 0,
            transition: 'opacity 0.3s ease-out, transform 0.35s ease-out',
            willChange: 'transform',
            transform: isHovering 
              ? `scale(${ZOOM}) translate(${(0.5 - mousePos.x) * 100}%, ${(0.5 - mousePos.y) * 100}%)`
              : 'scale(1) translate(0, 0)'
          }}
        />
      )}

      {/* Hover message for non-mosaic fallback */}
      {isHovering && !mosaicSrc && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black bg-opacity-50 text-white px-3 py-1 rounded text-sm">
            Hi there! 👋
          </div>
        </div>
      )}
    </div>
  );
}