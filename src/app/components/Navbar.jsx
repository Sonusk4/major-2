"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

const Button = ({ children, className = "", ...props }) => (
  <button
    {...props}
    className={`px-5 py-2.5 rounded-md font-semibold text-sm bg-[hsl(190,100%,50%)] text-black hover:opacity-90 transition ${className}`}
  >
    {children}
  </button>
);

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "glass py-3" : "bg-transparent py-5"
      }`}
      data-testid="navbar"
    >
      <div className="container mx-auto px-4 flex items-center justify-between">
        {/* Brand */}
        <Link
          href="/"
          className="text-2xl font-bold gradient-text hover:opacity-80 transition-opacity"
          aria-label="Home"
        >
          CareerHub
        </Link>

        {/* Desktop CTA */}
        <Link href="/login" className="hidden md:block" data-testid="nav-cta">
          <Button className="shadow-lg">Get Started</Button>
        </Link>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-foreground hover:text-[hsl(190,100%,50%)] transition-colors"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden glass mt-4 mx-4 p-4 rounded-lg animate-fade-in">
          <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
            <Button className="w-full">Get Started</Button>
          </Link>
        </div>
      )}
    </nav>
  );
}
