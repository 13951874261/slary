
import React, { useEffect, useState } from 'react';
import { Shield, ShieldAlert, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  isMonitoring: boolean;
  isRiskHit: boolean;
  version: string;
}

export const FloatingOrb: React.FC<Props> = ({ isMonitoring, isRiskHit }) => {
  const [rotation, setRotation] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMotion = (e: DeviceOrientationEvent) => {
      if (e.beta && e.gamma) {
        setRotation({ x: e.beta / 10, y: e.gamma / 10 });
        document.documentElement.style.setProperty('--gyro-angle', `${e.gamma}deg`);
      }
    };
    window.addEventListener('deviceorientation', handleMotion);
    return () => window.removeEventListener('deviceorientation', handleMotion);
  }, []);

  const handleClick = () => {
    // 隐藏气泡后，仅保留震动反馈
    if ('vibrate' in navigator) navigator.vibrate(15);
  };

  return (
    <div className="fixed bottom-28 right-6 z-50 flex flex-col items-end gap-3 pointer-events-none">
      <motion.button
        onClick={handleClick}
        animate={{ 
          scale: isRiskHit ? [1, 1.3, 1] : 1,
          x: isRiskHit ? [0, -10, 10, -10, 10, 0] : 0, 
          rotateY: rotation.y * 5,
          rotateX: -rotation.x * 5
        }}
        transition={{ 
          duration: isRiskHit ? 0.4 : 0.2,
          repeat: isRiskHit ? 2 : 0
        }}
        className={`w-16 h-16 rounded-full flex items-center justify-center luxury-shadow pointer-events-auto gyro-border haptic-active bg-white transition-colors duration-300 ${
          isRiskHit ? 'bg-red-600 border-red-400 shadow-[0_0_30px_rgba(220,38,38,0.5)]' : isMonitoring ? 'border-[#D4AF37]' : 'border-gray-100'
        }`}
      >
        <div className={`absolute inset-0 rounded-full ${isMonitoring && !isRiskHit ? 'orb-pulse opacity-20 bg-[#D4AF37]' : ''}`} />
        {isRiskHit ? (
          <ShieldAlert className="w-8 h-8 text-white animate-pulse" />
        ) : isMonitoring ? (
          <ShieldCheck className="w-8 h-8 text-[#D4AF37]" />
        ) : (
          <Shield className="w-8 h-8 text-gray-300" />
        )}
      </motion.button>
    </div>
  );
};
