'use client';

import { imagePlaceholders } from '@/lib/imagePlaceholders';

export default function ImageTestPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Image Loading Test</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div>
          <h2 className="text-lg font-semibold mb-3">Hero Slides</h2>
          {imagePlaceholders.heroSlides.map((src, index) => (
            <div key={index} className="mb-4">
              <p className="text-sm text-gray-600 mb-1">Path: {src}</p>
              <img 
                src={src} 
                alt={`Hero ${index + 1}`} 
                className="w-full h-32 object-cover border border-gray-300 rounded"
                onLoad={() => console.log(`✅ Loaded: ${src}`)}
                onError={(e) => {
                  console.error(`❌ Failed to load: ${src}`);
                  console.error('Error details:', e);
                }}
              />
            </div>
          ))}
        </div>
        
        <div>
          <h2 className="text-lg font-semibold mb-3">Success Stories</h2>
          {imagePlaceholders.successStories.map((src, index) => (
            <div key={index} className="mb-4">
              <p className="text-sm text-gray-600 mb-1">Path: {src}</p>
              <img 
                src={src} 
                alt={`Success ${index + 1}`} 
                className="w-full h-32 object-cover border border-gray-300 rounded"
                onLoad={() => console.log(`✅ Loaded: ${src}`)}
                onError={(e) => {
                  console.error(`❌ Failed to load: ${src}`);
                  console.error('Error details:', e);
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}