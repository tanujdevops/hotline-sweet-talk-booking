import React, { useMemo } from 'react';

interface OptimizedHeroImageProps {
  className?: string;  
}

const OptimizedHeroImage: React.FC<OptimizedHeroImageProps> = ({ className }) => {
  // Apply desktop's successful pattern: immediate, optimized loading
  const imageUrl = useMemo(() => {
    const isMobile = window.innerWidth < 768;
    return isMobile 
      ? 'https://images.unsplash.com/photo-1542736667-7c405c485dd6?w=800&h=600&q=75&fm=webp'
      : 'https://images.unsplash.com/photo-1542736667-7c405c485dd6?w=1920&h=1080&q=75&fm=webp';
  }, []);

  return (
    <div 
      className={`hero-bg opacity-30 ${className}`}
      style={{
        backgroundImage: `url('${imageUrl}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    />
  );
};

export default OptimizedHeroImage;