import Link from 'next/link';
import { ArrowLeft, Mail, Phone } from 'lucide-react';

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center p-4">
      <div className="max-w-sm w-full">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>
        </div>

        <div className="bg-white border border-surface-200 rounded-card shadow-card p-8">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-surface-900">Invitation Only</h1>
            <p className="text-sm text-surface-500 mt-1">
              Brent Martinez Fitness is a private training platform. You need a personal invitation to create an account.
            </p>
          </div>

          <div className="bg-surface-50 border border-surface-200 rounded-input p-5 mb-6">
            <p className="text-sm font-medium text-surface-900 mb-2">Want to get started?</p>
            <p className="text-sm text-surface-500 mb-4">
              Fill out the contact form so Brent can learn about your goals and send you an invitation if you&apos;re a good fit.
            </p>
            <div className="space-y-2 text-sm text-surface-600">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-surface-400" />
                martinezfitness559@gmail.com
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-surface-400" />
                (559) 365-2946
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Link
              href="/contact"
              className="block w-full text-center bg-brand-600 text-white font-semibold py-2.5 rounded-btn hover:bg-brand-700 transition-colors text-sm"
            >
              Fill Out Contact Form
            </Link>
            <Link
              href="/register-with-code"
              className="block w-full text-center border border-surface-300 text-surface-700 font-medium py-2.5 rounded-btn hover:bg-surface-50 transition-colors text-sm"
            >
              I Have an Invitation Code
            </Link>
          </div>

          <p className="text-sm text-surface-500 text-center mt-5">
            Already have an account?{' '}
            <Link href="/auth/signin" className="text-brand-600 hover:text-brand-700 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
