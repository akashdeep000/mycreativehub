import React from 'react';

const OfflinePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-rose-50 flex items-center justify-center">
      <div className="text-center">
        <img src="/icons/icon-trans-192x192.png" alt="My Creative Hub Logo" className="w-16 h-16 mx-auto mb-4" />
        <h1 className="text-3xl lg:text-4xl font-serif font-semibold text-gray-800 mb-2">You are offline</h1>
        <p className="text-gray-600 text-lg mb-6">Please check your internet connection.</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-pink-500 text-white font-semibold rounded-lg shadow-md hover:bg-pink-600 hover:shadow-lg transform hover:-translate-y-px transition-all duration-300"
        >
          Try Again
        </button>
      </div>
    </div>
  );
};

export default OfflinePage;
