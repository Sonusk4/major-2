'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from './components/Navbar';
import dynamic from 'next/dynamic';
import HeroFallback from './components/HeroFallback';
import { useIsMobile, usePrefersReducedMotion } from '../hooks/useMediaQuery';
import { useEffect, useState } from 'react';

const Hero3D = dynamic(() => import('./components/Hero3D'), { ssr: false, loading: () => null });

export default function HomePage() {
  const isMobile = useIsMobile();
  const reduced = usePrefersReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => setMounted(true), []);

  const handleGetStarted = () => {
    setIsLoading(true);
    router.push('/login');
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-28 pb-24 min-h-[80vh]">
        {/* Base CSS fallback layer (always present) */}
        <HeroFallback />
        {/* Overlay 3D after mount. If 3D unloads, fallback remains visible. */}
        {mounted && <Hero3D />}

        <div className="relative z-10 container mx-auto px-4 flex flex-col items-center text-center gap-6">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-3d-strong">
            Transform Your Career <span className="gradient-text">Into Pure Magic</span>
          </h1>
          <p className="max-w-2xl text-base md:text-lg text-white text-3d">
            CareerHub connects talent with opportunity — discover real projects, build your portfolio, and collaborate with teams.
          </p>
          <div className="flex items-center gap-4">
            <button onClick={handleGetStarted} disabled={isLoading} data-testid="hero-cta" className="inline-block">
              <div className="px-6 py-3 rounded-md font-semibold bg-[hsl(190,100%,50%)] text-black hover:opacity-90 transition shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2">
                {isLoading ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                    Loading...
                  </>
                ) : (
                  'Get Started'
                )}
              </div>
            </button>
            <a href="#about" className="text-sm md:text-base text-white/80 hover:text-white transition underline-offset-4 hover:underline">
              Learn more
            </a>
          </div>
        </div>
      </section>

      {/* Motive & Objectives */}
      <section id="about" className="relative py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Why We Exist</h2>
          <p className="text-center text-white/80 max-w-3xl mx-auto mb-12">
            We believe careers grow fastest through real-world collaboration. CareerHub helps you find projects, join teams, and ship meaningful work.
          </p>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="glass p-6 rounded-xl">
              <h3 className="font-semibold text-xl mb-2">Discover Projects</h3>
              <p className="text-white/80">Find opportunities tailored to your skills and interests across domains.</p>
            </div>
            <div className="glass p-6 rounded-xl">
              <h3 className="font-semibold text-xl mb-2">Showcase Portfolio</h3>
              <p className="text-white/80">Build a visible track record with contributions and shipped outcomes.</p>
            </div>
            <div className="glass p-6 rounded-xl">
              <h3 className="font-semibold text-xl mb-2">Collaborate Seamlessly</h3>
              <p className="text-white/80">Join teams, apply quickly, and coordinate work with minimal friction.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}