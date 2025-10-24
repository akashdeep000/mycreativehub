import React from 'react';

const OfflinePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-rose-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-pink-400 to-purple-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <div className="w-8 h-8 bg-white rounded-full"></div>
        </div>
        <h1 className="text-3xl lg:text-4xl font-serif font-semibold text-gray-800 mb-2">You are offline</h1>
        <p className="text-gray-600 text-lg">Please check your internet connection.</p>
      </div>
    </div>
  );
};

export default OfflinePage;