'use client';

import { useState, useEffect } from 'react';
import { Menu, X, TrendingUp, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const getDashboardHref = () => {
    const role = session?.user?.role;
    if (role === 'ADMIN') return '/admin';
    if (role === 'TRAINER') return '/trainer/dashboard';
    return '/client/dashboard';
  };

  const baseLinks = [
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About' },
    { href: '/programs', label: 'Programs' },
    { href: '/shop', label: 'Shop', icon: ShoppingBag },
  ];

  const navLinks = session
    ? [
        ...baseLinks,
        { href: getDashboardHref(), label: 'Dashboard', icon: TrendingUp },
        { href: '/contact', label: 'Contact' },
      ]
    : [...baseLinks, { href: '/contact', label: 'Contact' }];

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-[#1a1f2e]/95 backdrop-blur-md shadow-lg border-b border-[#2d3548]'
            : 'bg-[#1a1f2e] border-b border-[#2d3548]'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-[72px]">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3">
              <div className="relative w-14 h-14 group/logo">
                <Image
                  src="/images/bm-logo.png"
                  alt="Brent Martinez Fitness"
                  width={56}
                  height={56}
                  className="w-14 h-14 object-contain transition-transform duration-300 group-hover/logo:scale-110"
                  style={{
                    filter: 'brightness(0) invert(1) sepia(1) saturate(5) hue-rotate(225deg) brightness(1.1)',
                  }}
                />
                <div className="absolute inset-0 overflow-hidden rounded pointer-events-none">
                  <div className="absolute inset-0 -translate-x-full animate-[shimmer_3s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                </div>
              </div>
              <span className="text-lg font-semibold text-white">
                Brent Martinez Fitness
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-1.5 text-sm font-medium text-[#9ca3af] hover:text-white transition-colors duration-200"
                >
                  {'icon' in link && link.icon && <link.icon className="w-4 h-4 text-[#6366f1]" />}
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Right side */}
            <div className="hidden md:flex items-center gap-5">
              {session ? (
                <span className="text-sm text-[#9ca3af]">
                  Welcome, {session.user?.name || 'User'}
                </span>
              ) : (
                <Link
                  href="/auth/signin"
                  className="text-sm font-medium text-[#9ca3af] hover:text-white transition-colors"
                >
                  Sign In
                </Link>
              )}
              <Link
                href={session ? getDashboardHref() : '/contact'}
                className="px-5 py-2.5 bg-[#6366f1] text-white text-sm font-medium rounded-lg hover:bg-[#5558e3] transition-all duration-200"
              >
                {session ? 'Dashboard' : 'Get Started'}
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-2 text-[#9ca3af] hover:text-white transition-colors"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40 md:hidden"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed top-0 right-0 h-full w-72 bg-[#1a1f2e] border-l border-[#2d3548] z-50 md:hidden">
            <div className="p-6 pt-20 flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2 px-3 py-3 text-[#9ca3af] hover:text-white hover:bg-[#252d3d] rounded-lg transition-colors text-sm font-medium"
                >
                  {'icon' in link && link.icon && <link.icon className="w-4 h-4 text-[#6366f1]" />}
                  {link.label}
                </Link>
              ))}
              <div className="border-t border-[#2d3548] mt-4 pt-4">
                {session ? (
                  <div className="px-3 py-2 text-sm text-[#9ca3af]">
                    Welcome, {session.user?.name || 'User'}
                  </div>
                ) : (
                  <Link
                    href="/auth/signin"
                    onClick={() => setIsOpen(false)}
                    className="block px-3 py-3 text-sm text-[#9ca3af] hover:text-white transition-colors"
                  >
                    Sign In
                  </Link>
                )}
                <Link
                  href={session ? getDashboardHref() : '/contact'}
                  onClick={() => setIsOpen(false)}
                  className="block mt-2 px-4 py-3 bg-[#6366f1] text-white text-sm font-medium rounded-lg text-center hover:bg-[#5558e3] transition-colors"
                >
                  {session ? 'Dashboard' : 'Get Started'}
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default Navigation;
