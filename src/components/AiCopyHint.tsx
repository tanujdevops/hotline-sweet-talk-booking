
import React from 'react';

interface AiCopyHintProps {
  description?: string;
  keywords?: string;
  entityType?: string;
  entityProperties?: Record<string, any>;
  children?: React.ReactNode;
}

const AiCopyHint = ({
  description,
  keywords,
  entityType,
  entityProperties,
  children
}: AiCopyHintProps) => {
  // This component doesn't render anything visible but includes hidden metadata
  // for AI crawlers to better understand content
  return (
    <>
      {description && (
        <div className="hidden" aria-hidden="true" data-ai-description={description}>
          {description}
        </div>
      )}
      
      {keywords && (
        <div className="hidden" aria-hidden="true" data-ai-keywords={keywords}>
          {keywords}
        </div>
      )}
      
      {entityType && (
        <div className="hidden" aria-hidden="true" data-ai-entity-type={entityType} data-ai-entity-properties={JSON.stringify(entityProperties || {})}>
          {entityType}
        </div>
      )}
      
      {children}
    </>
  );
};

export default AiCopyHint;
