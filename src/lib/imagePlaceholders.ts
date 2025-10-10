const createPlaceholderImage = (width: number, height: number, text: string) => {
  return `data:image/svg+xml;base64,${btoa(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#3B82F6;stop-opacity:0.1" />
          <stop offset="100%" style="stop-color:#8B5CF6;stop-opacity:0.1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad)"/>
      <rect width="100%" height="100%" fill="#F3F4F6" opacity="0.8"/>
      <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${Math.min(width, height) / 10}" 
            fill="#6B7280" text-anchor="middle" dy=".3em">${text}</text>
    </svg>
  `)}`;
};

export const imagePlaceholders = {
  // Hero slideshow images (REAL IMAGES)
  heroSlides: [
    '/images/Home screen Slide show.jpeg',
    '/images/Home screen slide show 2.jpeg',
    '/images/Home screen slide show 3.jpeg'
  ],
  // Keep legacy heroSlide function for backward compatibility
  heroSlide: (index: number) => {
    const slides = [
      '/images/Home screen Slide show.jpeg',
      '/images/Home screen slide show 2.jpeg', 
      '/images/Home screen slide show 3.jpeg'
    ];
    return slides[index] || slides[0];
  },
  portrait: '/images/brent-martinez.jpg',
  testimonial: (name: string) => createPlaceholderImage(120, 120, name.split(' ').map(n => n[0]).join('')),
  training: '/images/Home screen Slide show.jpeg',
  studio: '/images/Home screen slide show 2.jpeg', 
  transformation: '/images/The Beginning .png',
  equipment: '/images/Home screen slide show 3.jpeg',
  workout: '/images/Professional development.jpeg',
  nutrition: '/images/real people real results 2.JPG',
  // About page story images (REAL IMAGES)
  theBeginning: '/images/The Beginning .png',
  professionalDevelopment: '/images/Professional development.jpeg',
  // Success gallery images (REAL IMAGES) 
  successStories: [
    '/images/Real people real results 1.JPG',
    '/images/real people real results 2.JPG',
    '/images/real people real results 3.JPEG',
    '/images/real people real results 4.JPEG'
  ],
  // Client photos for testimonials (REAL IMAGES)
  clients: [
    '/images/client-1.jpg',
    '/images/client-2.jpg', 
    '/images/client-3.jpg',
    '/images/client-4.jpg',
    '/images/client-5.jpg'
  ]
};

export default imagePlaceholders;