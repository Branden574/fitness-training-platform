import Link from 'next/link';
import { ArrowLeft, Mail, Phone } from 'lucide-react';

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-[#0f1219] flex items-center justify-center p-4">
      <div className="max-w-sm w-full">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-[#6b7280] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>
        </div>

        <div className="bg-[#1e2433] border border-[#2d3548] rounded-xl p-8">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-white">Invitation Only</h1>
            <p className="text-sm text-[#9ca3af] mt-1">
              Brent Martinez Fitness is a private training platform. You need a personal invitation to create an account.
            </p>
          </div>

          <div className="bg-[#0f1219] border border-[#2d3548] rounded-lg p-5 mb-6">
            <p className="text-sm font-medium text-white mb-2">Want to get started?</p>
            <p className="text-sm text-[#9ca3af] mb-4">
              Fill out the contact form so Brent can learn about your goals and send you an invitation if you&apos;re a good fit.
            </p>
            <div className="space-y-2 text-sm text-[#9ca3af]">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#6b7280]" />
                martinezfitness559@gmail.com
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#6b7280]" />
                (559) 365-2946
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Link
              href="/contact"
              className="block w-full text-center bg-[#6366f1] text-white font-semibold py-2.5 rounded-lg hover:bg-[#5558e3] transition-colors text-sm"
            >
              Fill Out Contact Form
            </Link>
            <Link
              href="/register-with-code"
              className="block w-full text-center border border-[#2d3548] text-[#9ca3af] font-medium py-2.5 rounded-lg hover:bg-white/5 transition-colors text-sm"
            >
              I Have an Invitation Code
            </Link>
          </div>

          <p className="text-sm text-[#6b7280] text-center mt-5">
            Already have an account?{' '}
            <Link href="/auth/signin" className="text-[#818cf8] hover:text-[#6366f1] font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
