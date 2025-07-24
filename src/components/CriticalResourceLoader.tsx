import { Helmet } from 'react-helmet-async';

const CriticalResourceLoader = () => {
  return (
    <Helmet>
      {/* DNS prefetch for external domains */}
      <link rel="dns-prefetch" href="//fonts.googleapis.com" />
      <link rel="dns-prefetch" href="//fonts.gstatic.com" />
      <link rel="dns-prefetch" href="//cdn.gpteng.co" />
      
      {/* Preconnect to external domains for faster requests */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      
      {/* Critical inline CSS for loading spinner only */}
      <style>{`
        .min-h-screen { min-height: 100vh; }
        .flex { display: flex; }
        .items-center { align-items: center; }
        .justify-center { justify-content: center; }
        .animate-spin { animation: spin 1s linear infinite; }
        .rounded-full { border-radius: 9999px; }
        .h-8 { height: 2rem; }
        .w-8 { width: 2rem; }
        .border-b-2 { border-bottom-width: 2px; }
        .border-hotline { border-color: hsl(267, 83%, 74%); }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
      
      {/* Prefetch non-critical resources */}
      <link rel="prefetch" href="https://cdn.gpteng.co/gptengineer.js" />
      <link rel="prefetch" href="https://images.unsplash.com/photo-1542736667-7c405c485dd6?w=1920&h=1080&q=75&fm=webp" />
    </Helmet>
  );
};

export default CriticalResourceLoader;