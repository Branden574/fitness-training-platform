import Link from "next/link";
import ContactForm from "@/components/ContactForm";
import HeroSection from "@/components/HeroSection";
import { Phone, Mail, MapPin, ArrowRight, CheckCircle2, Star, ChevronRight } from "lucide-react";
import Image from "next/image";
import HomeAnimations from "@/components/HomeAnimations";
import FloatingScene from "@/components/FloatingScene";

const services = [
  {
    title: "1-on-1 Personal Training",
    description: "In-person sessions with hands-on coaching, form correction, and personalized programming at our Fresno studio.",
    price: "From $75/session",
  },
  {
    title: "Semi-Private Training",
    description: "Train with 2-4 people in a small group environment. All the benefits of personal training at a reduced cost.",
    price: "From $45/session",
  },
  {
    title: "Online Coaching",
    description: "Custom workout plans, nutrition guidance, weekly check-ins, and full app access from anywhere.",
    price: "From $150/month",
  },
];

const results = [
  { name: "Real client transformation", image: "/images/client-1.jpg" },
  { name: "Client progress", image: "/images/client-2.jpg" },
  { name: "Training results", image: "/images/client-3.jpg" },
  { name: "Client success", image: "/images/client-5.jpg" },
];

const testimonials = [
  {
    quote: "Brent helped me lose 35 pounds in 5 months. His approach is no-nonsense but incredibly supportive. Best investment I've made in myself.",
    name: "Marcus R.",
    detail: "Lost 35 lbs in 5 months",
  },
  {
    quote: "After years of inconsistent training, Brent gave me the structure and accountability I needed. I'm stronger at 45 than I was at 25.",
    name: "David K.",
    detail: "Training for 2+ years",
  },
  {
    quote: "The nutrition coaching alone was worth it. Brent doesn't do cookie-cutter plans — everything is built around your life and your goals.",
    name: "Sarah M.",
    detail: "Online coaching client",
  },
];

export default function Home() {
  return (
    <main className="bg-[#0f1219]">
      <HeroSection />
      <FloatingScene />
      <HomeAnimations
        services={services}
        results={results}
        testimonials={testimonials}
      />
    </main>
  );
}
