export interface ProfileQuickFact {
  label: string;
  value: string;
}

export interface ProfilePillar {
  title: string;
  description: string;
  icon: string;
}

export interface ProfileService {
  title: string;
  description: string;
  price: string;
  per: string;
  cta: string;
  featured?: boolean;
}

export interface ProfileTestimonial {
  id: string;
  quote: string;
  attribution: string;
  initials: string;
}

export interface ProfileTransformation {
  id: string;
  beforePhotoUrl: string;
  afterPhotoUrl: string;
  caption: string | null;
  durationWeeks: number | null;
}

export interface ProfileData {
  id: string;
  name: string;
  initials: string;
  slug: string;
  accepting: boolean;
  clientStatus: 'ACCEPTING' | 'WAITLIST' | 'NOT_ACCEPTING';
  headline: string | null;
  bio: string | null;
  location: string | null;
  experience: number;
  clientsTrained: number | null;
  specialties: string[];
  photoUrl: string | null;
  coverImageUrl: string | null;
  instagramHandle: string | null;
  tiktokHandle: string | null;
  youtubeHandle: string | null;
  quickFacts: ProfileQuickFact[];
  pillars: ProfilePillar[];
  gallery: string[];
  services: ProfileService[];
  certifications: string[];
  testimonials: ProfileTestimonial[];
  transformations: ProfileTransformation[];
  entryPrice: string | null;
  activeClients: number;
}
