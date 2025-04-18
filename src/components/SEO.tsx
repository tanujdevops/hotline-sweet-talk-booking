
import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title: string;
  description: string;
  canonical?: string;
  keywords?: string;
  ogType?: string;
  ogImage?: string;
  twitterCard?: string;
  children?: React.ReactNode;
}

const SEO = ({
  title,
  description,
  canonical,
  keywords,
  ogType = 'website',
  ogImage = 'https://sweetyoncall.com/opengraph-image.png',
  twitterCard = 'summary_large_image',
  children,
}: SEOProps) => {
  // Generate the full canonical URL if only a path is provided
  const fullCanonical = canonical 
    ? (canonical.startsWith('http') ? canonical : `https://sweetyoncall.com${canonical.startsWith('/') ? canonical : `/${canonical}`}`)
    : 'https://sweetyoncall.com';

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <link rel="canonical" href={fullCanonical} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={fullCanonical} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content="SweetyOnCall" />

      {/* Twitter */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:site" content="@sweetyoncall" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* Any additional children elements */}
      {children}
    </Helmet>
  );
};

export default SEO;
