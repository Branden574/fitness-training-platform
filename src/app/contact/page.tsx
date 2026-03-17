import ContactAnimations from '@/components/ContactAnimations';

const faqs = [
  {
    q: "Do I need experience to start training?",
    a: "Not at all. I work with clients of all fitness levels, from complete beginners to advanced athletes. Every program is customized to your current abilities and goals."
  },
  {
    q: "What should I bring to my first session?",
    a: "Comfortable workout clothes, athletic shoes, a water bottle, and a positive attitude. All equipment is provided at the studio."
  },
  {
    q: "How quickly will I see results?",
    a: "Most clients start feeling stronger and more energetic within 2-3 weeks. Visible changes typically appear around 4-6 weeks with consistent training and nutrition."
  },
  {
    q: "Do you offer nutrition guidance?",
    a: "Yes. Nutrition is a crucial part of achieving your goals. I provide meal planning, macro guidance, and ongoing nutrition support with all programs."
  },
  {
    q: "Can I train if I have injuries?",
    a: "I'm certified in corrective exercise and can work around most injuries. We'll assess your limitations and create a safe, effective program that supports your recovery."
  },
  {
    q: "What makes your approach different?",
    a: "I focus on sustainable, science-based methods tailored to your lifestyle. It's not about quick fixes — it's about creating lasting habits and genuine transformation."
  },
];

export default function ContactPage() {
  return <ContactAnimations faqs={faqs} />;
}
