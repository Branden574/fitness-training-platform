const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputDir = './public/images';
const outputDir = './public/images/optimized';

// Create optimized directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function optimizeImages() {
  const files = fs.readdirSync(inputDir);
  
  for (const file of files) {
    if (file.match(/\.(jpg|jpeg|png)$/i)) {
      const inputPath = path.join(inputDir, file);
      const outputPath = path.join(outputDir, file);
      
      try {
        const stats = fs.statSync(inputPath);
        console.log(`Processing ${file} (${(stats.size / 1024 / 1024).toFixed(2)}MB)...`);
        
        await sharp(inputPath)
          .resize(1920, 1080, { 
            fit: 'inside',
            withoutEnlargement: true 
          })
          .jpeg({ 
            quality: 80,
            progressive: true 
          })
          .toFile(outputPath.replace(/\.(png|jpeg)$/i, '.jpg'));
        
        const newStats = fs.statSync(outputPath.replace(/\.(png|jpeg)$/i, '.jpg'));
        console.log(`✅ Optimized ${file}: ${(stats.size / 1024 / 1024).toFixed(2)}MB → ${(newStats.size / 1024 / 1024).toFixed(2)}MB`);
      } catch (error) {
        console.error(`❌ Error processing ${file}:`, error);
      }
    }
  }
}

optimizeImages().then(() => {
  console.log('✅ Image optimization complete!');
}).catch(console.error);