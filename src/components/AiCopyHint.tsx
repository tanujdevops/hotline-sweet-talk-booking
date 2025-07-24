import React from 'react';

interface AiCopyHintProps {
  description?: string;
  keywords?: string;
  entityType?: string;
  entityProperties?: Record<string, any>;
  promptQuestions?: string[];
  faqs?: Array<{question: string, answer: string}>;
  children?: React.ReactNode;
}

const AiCopyHint = ({
  description,
  keywords,
  entityType,
  entityProperties,
  promptQuestions,
  faqs,
  children
}: AiCopyHintProps) => {
  return (
    <div className="ai-copy-hint">
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
      
      {promptQuestions && promptQuestions.length > 0 && (
        <div className="hidden" aria-hidden="true" data-ai-prompt-questions={JSON.stringify(promptQuestions)}></div>
      )}
      
      {faqs && faqs.length > 0 && (
        <div className="hidden" aria-hidden="true" data-ai-faqs={JSON.stringify(faqs)}></div>
      )}
      
      {children}
    </div>
  );
};

export default AiCopyHint;
