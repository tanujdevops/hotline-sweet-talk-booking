import React, { useState, useEffect } from 'react';

interface OptimizedHeroImageProps {
  className?: string;
}

const OptimizedHeroImage: React.FC<OptimizedHeroImageProps> = ({ className }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  
  const imageUrl = 'https://images.unsplash.com/photo-1542736667-7c405c485dd6?w=1920&h=1080&q=75&fm=webp';
  
  useEffect(() => {
    // Since image is preloaded in HTML, show it immediately for better LCP
    setImageLoaded(true);
  }, []);

  return (
    <div 
      className={`hero-bg transition-opacity duration-200 ${imageLoaded ? 'opacity-30' : 'opacity-10'} ${className}`}
      style={{
        backgroundImage: `url('${imageUrl}')`
      }}
    />
  );
};

export default OptimizedHeroImage;