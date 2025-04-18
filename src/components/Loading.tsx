
import React from 'react';

const Loading = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="inline-block w-12 h-12 border-4 border-hotline-pink border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-lg text-hotline">Loading SweetyOnCall...</p>
      </div>
    </div>
  );
};

export default Loading;
