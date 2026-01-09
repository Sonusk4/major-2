"use client";
 
 import { useState, useEffect } from "react";
 import Link from "next/link";
 import { MoreVertical, X } from "lucide-react";
 
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
           <div className="flex items-center">
             CareerHub
           </div>
         </Link>
         {/* Mobile Menu Button */}
         <button
           className="md:hidden text-foreground hover:text-[hsl(190,100%,50%)] transition-colors"
           onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
           aria-label="Toggle menu"
         >
           {isMobileMenuOpen ? <X size={24} /> : <MoreVertical size={24} />}
         </button>
       </div>
 
       {/* Mobile Menu */}
       {isMobileMenuOpen && (
         <div className="md:hidden glass mt-4 mx-4 p-2 rounded-lg animate-fade-in">
           <div className="flex flex-col gap-2">
             <Link href="/projects" onClick={() => setIsMobileMenuOpen(false)} className="block w-full">
               <div className="w-full px-4 py-3 rounded-md text-sm font-medium hover:text-[hsl(190,100%,50%)] transition-colors duration-200">
                 Projects
               </div>
             </Link>
             <Link href="/profile" onClick={() => setIsMobileMenuOpen(false)} className="block w-full">
               <div className="w-full px-4 py-3 rounded-md text-sm font-medium hover:text-[hsl(190,100%,50%)] transition-colors duration-200">
                 My Profile
               </div>
             </Link>
           </div>
         </div>
       )}
     </nav>
   );
 }
