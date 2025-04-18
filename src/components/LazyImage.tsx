
import React, { useState, useEffect } from 'react';
import { cn } from "@/lib/utils";

interface LazyImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  placeholderSrc?: string;
  loading?: 'lazy' | 'eager';
}

const LazyImage = ({
  src,
  alt,
  width,
  height,
  className,
  placeholderSrc = '/placeholder.svg',
  loading = 'lazy'
}: LazyImageProps) => {
  const [imageSrc, setImageSrc] = useState<string>(placeholderSrc);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  useEffect(() => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      setImageSrc(src);
      setIsLoaded(true);
    };
  }, [src]);

  return (
    <img
      src={imageSrc}
      alt={alt}
      width={width}
      height={height}
      loading={loading}
      className={cn(
        'transition-opacity duration-300', 
        isLoaded ? 'opacity-100' : 'opacity-60',
        className
      )}
      onError={() => {
        setImageSrc(placeholderSrc);
      }}
    />
  );
};

export default LazyImage;
