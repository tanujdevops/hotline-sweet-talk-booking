
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
  noIndex?: boolean;
  noFollow?: boolean;
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  language?: string;
  alternateLanguages?: Array<{lang: string, url: string}>;
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
  noIndex = false,
  noFollow = false,
  publishedTime,
  modifiedTime,
  author = 'SweetyOnCall',
  language = 'en',
  alternateLanguages = [],
  children,
}: SEOProps) => {
  // Generate the full canonical URL if only a path is provided
  const fullCanonical = canonical 
    ? (canonical.startsWith('http') ? canonical : `https://sweetyoncall.com${canonical.startsWith('/') ? canonical : `/${canonical}`}`)
    : 'https://sweetyoncall.com';

  // Create robots meta tag value
  const robotsContent = `${noIndex ? 'noindex' : 'index'}, ${noFollow ? 'nofollow' : 'follow'}`;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <html lang={language} />
      <title>{title}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <link rel="canonical" href={fullCanonical} />
      <meta name="robots" content={robotsContent} />
      <meta name="author" content={author} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={fullCanonical} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content="SweetyOnCall" />
      <meta property="og:locale" content={language === 'en' ? 'en_US' : language} />
      
      {/* Add article specific meta tags if ogType is article */}
      {ogType === 'article' && publishedTime && (
        <meta property="article:published_time" content={publishedTime} />
      )}
      {ogType === 'article' && modifiedTime && (
        <meta property="article:modified_time" content={modifiedTime} />
      )}
      {ogType === 'article' && author && (
        <meta property="article:author" content={author} />
      )}

      {/* Twitter */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:site" content="@sweetyoncall" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:creator" content="@sweetyoncall" />

      {/* Alternate language versions */}
      {alternateLanguages.map((altLang) => (
        <link 
          key={altLang.lang}
          rel="alternate" 
          hrefLang={altLang.lang} 
          href={altLang.url} 
        />
      ))}

      {/* Any additional children elements */}
      {children}
    </Helmet>
  );
};

export default SEO;
