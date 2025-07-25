import React from 'react';

interface OptimizedHeroImageProps {
  className?: string;
}

const OptimizedHeroImage: React.FC<OptimizedHeroImageProps> = ({ className }) => {
  // Use responsive image URL based on screen size
  const desktopImageUrl = 'https://images.unsplash.com/photo-1542736667-7c405c485dd6?w=1920&h=1080&q=75&fm=webp';
  const mobileImageUrl = 'https://images.unsplash.com/photo-1542736667-7c405c485dd6?w=800&h=600&q=75&fm=webp';

  return (
    <div 
      className={`hero-bg opacity-30 ${className}`}
      style={{
        backgroundImage: `url('${window.innerWidth >= 768 ? desktopImageUrl : mobileImageUrl}')`
      }}
    />
  );
};

export default OptimizedHeroImage;