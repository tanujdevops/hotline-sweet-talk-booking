
import React from 'react';
import { Helmet } from 'react-helmet-async';

interface JsonLdProps {
  data: Record<string, any> | Record<string, any>[];
  removeEmpty?: boolean;
}

const JsonLd = ({ data, removeEmpty = true }: JsonLdProps) => {
  // Process the data to remove empty values if needed
  const processedData = removeEmpty ? removeEmptyValues(data) : data;
  
  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(processedData)}
      </script>
    </Helmet>
  );
};

// Helper function to remove empty values from an object or array of objects
const removeEmptyValues = (data: any): any => {
  if (Array.isArray(data)) {
    return data.map(item => removeEmptyValues(item)).filter(Boolean);
  }
  
  if (typeof data !== 'object' || data === null) {
    return data;
  }
  
  const result: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined || value === '') {
      continue;
    }
    
    if (Array.isArray(value) && value.length === 0) {
      continue;
    }
    
    if (typeof value === 'object' && !Array.isArray(value)) {
      const processed = removeEmptyValues(value);
      if (Object.keys(processed).length) {
        result[key] = processed;
      }
    } else if (Array.isArray(value)) {
      const processed = removeEmptyValues(value);
      if (processed.length) {
        result[key] = processed;
      }
    } else {
      result[key] = value;
    }
  }
  
  return result;
};

export default JsonLd;
