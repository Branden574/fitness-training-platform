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
  heroSlide: (index: number) => createPlaceholderImage(1920, 1080, `Fitness Image ${index + 1}`),
  portrait: '/images/brent-martinez.jpg', // Brent Martinez trainer photo (REAL IMAGE)
  testimonial: (name: string) => createPlaceholderImage(120, 120, name.split(' ').map(n => n[0]).join('')),
  training: createPlaceholderImage(800, 600, 'Training Session'), // Placeholder until real image added
  studio: createPlaceholderImage(320, 240, 'Fitness Studio'),
  transformation: createPlaceholderImage(320, 240, 'Transformation'),
  equipment: createPlaceholderImage(800, 600, 'Gym Equipment'), // Placeholder until real image added
  workout: createPlaceholderImage(800, 600, 'Workout Video'), // Placeholder until real image added
  nutrition: createPlaceholderImage(800, 600, 'Nutrition Planning'), // Placeholder until real image added
  // Client photos for testimonials and success stories (ALL REAL IMAGES)
  clients: [
    '/images/client-1.jpg',
    '/images/client-2.jpg', 
    '/images/client-3.jpg',
    '/images/client-4.jpg',
    '/images/client-5.jpg'
  ]
};

export default imagePlaceholders;