'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // This line automatically sends the user to the login page
    router.push('/login');
  }, [router]);

  // Show a simple message while redirecting
  return <p>Redirecting to login...</p>;
}