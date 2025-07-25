import React from 'react';

interface OptimizedHeroImageProps {
  className?: string;
}

const OptimizedHeroImage: React.FC<OptimizedHeroImageProps> = ({ className }) => {
  // Simplified version - no state management to avoid render blocking
  const imageUrl = 'https://images.unsplash.com/photo-1542736667-7c405c485dd6?w=1920&h=1080&q=75&fm=webp';
  
  return (
    <div 
      className={`hero-bg opacity-30 ${className}`}
      style={{
        backgroundImage: `url('${imageUrl}')`,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        zIndex: 1
      }}
    />
  );
};

export default OptimizedHeroImage;