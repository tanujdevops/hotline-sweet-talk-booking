// Font loading optimization utilities

export const preloadFonts = () => {
  if (typeof window === 'undefined') return;

  // Create font loading promises for better control
  const fontPromises = [
    new FontFace('Cormorant Garamond', 'url(https://fonts.gstatic.com/s/cormorantgaramond/v16/co3bmX5slCNuHLi8bLeY9MK7whWMhyjQr16o.woff2)', {
      weight: '600 700',
      display: 'swap'
    }),
    new FontFace('Montserrat', 'url(https://fonts.gstatic.com/s/montserrat/v25/JTUSjIg1_i6t8kCHKm459WlhyyTh89Y.woff2)', {
      weight: '400 500',
      display: 'swap'
    })
  ];

  // Load fonts and add to document
  fontPromises.forEach(async (font) => {
    try {
      const loadedFont = await font.load();
      document.fonts.add(loadedFont);
    } catch (error) {
      console.warn('Font loading failed:', error);
    }
  });
};

export const optimizeFontLoading = () => {
  if (typeof window === 'undefined') return;

  // Preload critical fonts immediately
  preloadFonts();

  // Add font-display: swap via CSS if not already present
  const style = document.createElement('style');
  style.textContent = `
    @font-face {
      font-family: 'Cormorant Garamond';
      font-display: swap;
    }
    @font-face {
      font-family: 'Montserrat';
      font-display: swap;
    }
  `;
  document.head.appendChild(style);

  // Monitor font loading performance
  if ('fonts' in document) {
    document.fonts.ready.then(() => {
      console.log('All fonts loaded');
      // Trigger a repaint to ensure LCP element is properly rendered
      document.body.style.opacity = '0.9999';
      setTimeout(() => {
        document.body.style.opacity = '';
      }, 0);
    });
  }
};