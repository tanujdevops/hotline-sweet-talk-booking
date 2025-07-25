// Critical CSS component for above-the-fold content
// This inlines essential styles to prevent render blocking

const CriticalCSS = () => {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
          /* Critical styles for LCP element - inlined to prevent FOUC */
          .hero-heading {
            font-family: 'Cormorant Garamond', Georgia, 'Times New Roman', serif;
            font-display: swap;
            font-weight: 700;
            line-height: 1.1;
            letter-spacing: -0.025em;
            color: white;
            margin-bottom: 1.5rem;
          }
          
          /* Responsive text sizes - prevent layout shift */
          @media (max-width: 768px) {
            .hero-heading {
              font-size: 1.875rem; /* 30px */
              min-height: 120px;
            }
          }
          
          @media (min-width: 769px) and (max-width: 1023px) {
            .hero-heading {
              font-size: 3rem; /* 48px */
              min-height: 160px;
            }
          }
          
          @media (min-width: 1024px) {
            .hero-heading {
              font-size: 3.75rem; /* 60px */
              min-height: 200px;
            }
          }
          
          /* Gradient text optimization */
          .gradient-text {
            background: linear-gradient(to right, #9b87f5, #D946EF);
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
            color: transparent;
          }
          
          /* Hero container optimization */
          .hero-container {
            position: relative;
            min-height: 90vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(to bottom, rgba(0,0,0,0.9), rgba(0,0,0,0.8), transparent);
            overflow: hidden;
          }
          
          /* Body font preload */
          body {
            font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
          }
        `
      }}
    />
  );
};

export default CriticalCSS;