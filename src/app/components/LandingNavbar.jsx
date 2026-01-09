"use client";

import Link from "next/link";

export default function LandingNavbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-transparent py-5">
      <div className="container mx-auto px-4 flex items-center justify-between">
        {/* Brand Only */}
        <Link
          href="/"
          className="text-2xl font-bold gradient-text hover:opacity-80 transition-opacity"
          aria-label="Home"
        >
          CareerHub
        </Link>
        
        {/* Empty space - no menu items */}
        <div />
      </div>
    </nav>
  );
}
