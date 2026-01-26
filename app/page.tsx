'use client';

import { useState } from 'react';
import SplashScreen from '@/components/SplashScreen';
import Dashboard from '@/components/Dashboard';

export default function Home() {
  const [showDashboard, setShowDashboard] = useState(false);

  if (!showDashboard) {
    return <SplashScreen onComplete={() => setShowDashboard(true)} />;
  }

  return <Dashboard />;
}