'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
      setTimeout(() => onComplete(), 500);
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-600 via-orange-500 to-orange-400 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-32 h-32 border-4 border-white border-t-transparent rounded-full mx-auto mb-8"
        />
        
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-4xl font-bold text-white mb-4 drop-shadow-lg"
        >
          मतदार शोध
        </motion.h1>
        
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-xl text-orange-50"
        >
          इंदोरी वराळे जिल्हा परिषद गटाच्या अधिकृत उमेदवार
        </motion.p>

        {loading && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 2 }}
            className="mt-8 h-1 bg-white rounded-full max-w-md mx-auto"
          />
        )}
      </motion.div>
    </div>
  );
}