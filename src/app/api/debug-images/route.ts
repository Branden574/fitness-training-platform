import { NextResponse } from 'next/server';

export async function GET() {
  // Debug route to check image paths
  const imagePaths = [
    '/images/hero-slide-1.jpeg',
    '/images/hero-slide-2.jpeg', 
    '/images/hero-slide-3.jpeg',
    '/images/success-1.jpg',
    '/images/success-2.jpg',
    '/images/success-3.jpeg',
    '/images/success-4.jpeg'
  ];

  return NextResponse.json({ 
    message: 'Image debug info',
    paths: imagePaths,
    timestamp: new Date().toISOString()
  });
}