import React from 'react';

const OfflinePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-rose-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-pink-400 to-purple-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <div className="w-8 h-8 bg-white rounded-full"></div>
        </div>
        <h1 className="text-3xl lg:text-4xl font-serif font-semibold text-gray-800 mb-2">You are offline</h1>
        <p className="text-gray-600 text-lg mb-6">Please check your internet connection.</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-gradient-to-r from-pink-400 to-purple-400 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300"
        >
          Try Again
        </button>
      </div>
    </div>
  );
};

export default OfflinePage;
