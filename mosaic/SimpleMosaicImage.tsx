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
      className={`relative overflow-hidden ${className}`}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        borderRadius: '8px'
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

      {/* Display mosaic if available, otherwise show original image */}
      {mosaicSrc ? (
        <Image
          src={mosaicSrc}
          alt={`${alt} - Dog mosaic`}
          width={width}
          height={height}
          priority
          onLoad={handleImageLoad}
          onError={handleImageError}
          className="w-full h-full object-cover"
          style={{
            imageRendering: 'pixelated',
            opacity: imageLoaded ? 1 : 0,
            transition: 'opacity 0.3s ease-out'
          }}
        />
      ) : (
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          priority
          onLoad={handleImageLoad}
          onError={handleImageError}
          className="w-full h-full object-cover"
          style={{
            opacity: imageLoaded ? 1 : 0,
            transition: 'opacity 0.3s ease-out'
          }}
        />
      )}
    </div>
  );
}