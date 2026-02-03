
import React, { useState, useCallback } from 'react';
import { audioService } from '../services/audioService';

interface Props {
  value: number;
  onChange: (val: number) => void;
  label: string;
}

export const MechanicalSlider: React.FC<Props> = ({ value, onChange, label }) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = parseInt(e.target.value);
    // Trigger haptic every 5 units for mechanical feel
    if (Math.floor(newVal / 5) !== Math.floor(value / 5)) {
      audioService.triggerHaptic('light');
    }
    onChange(newVal);
  }, [value, onChange]);

  return (
    <div className="space-y-4" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold uppercase tracking-widest">
        <span className="flex items-center gap-1.5">
          <div className={`w-1 h-1 rounded-full transition-colors duration-500 ${isHovered ? 'bg-[#D4AF37]' : 'bg-gray-300'}`} />
          {label}
        </span>
        <span className="text-[#D4AF37] font-mono">{value}%</span>
      </div>
      <div className="relative h-6 flex items-center">
        <input 
          type="range" 
          min="0" max="100" 
          step="1"
          value={value}
          onChange={handleInput}
          className="w-full h-[2px] bg-gray-100 rounded-lg appearance-none cursor-pointer accent-[#D4AF37] relative z-10" 
        />
        {/* Visual Tick Marks */}
        <div className="absolute inset-0 flex justify-between items-center px-1 pointer-events-none">
          {[...Array(11)].map((_, i) => (
            <div key={i} className={`h-1 w-[1px] ${i % 5 === 0 ? 'bg-gray-300 h-2' : 'bg-gray-100'}`} />
          ))}
        </div>
      </div>
    </div>
  );
};
