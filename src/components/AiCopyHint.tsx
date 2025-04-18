
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
      
      {/* AI prompt questions for generative engines */}
      {promptQuestions && promptQuestions.length > 0 && (
        <div className="hidden" aria-hidden="true" data-ai-prompt-questions>
          <ul>
            {promptQuestions.map((question, index) => (
              <li key={index} data-ai-prompt-question={question}>{question}</li>
            ))}
          </ul>
        </div>
      )}
      
      {/* FAQs in a format optimized for AI crawlers */}
      {faqs && faqs.length > 0 && (
        <div className="hidden" aria-hidden="true" data-ai-faqs>
          <dl>
            {faqs.map((faq, index) => (
              <React.Fragment key={index}>
                <dt data-ai-faq-question>{faq.question}</dt>
                <dd data-ai-faq-answer>{faq.answer}</dd>
              </React.Fragment>
            ))}
          </dl>
        </div>
      )}
      
      {children}
    </>
  );
};

export default AiCopyHint;
