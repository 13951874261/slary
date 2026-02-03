
import React from 'react';

interface Props {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
}

export const SovereignCard: React.FC<Props> = ({ children, title, subtitle, className = "" }) => {
  return (
    <div className={`luxury-shadow bg-white rounded-2xl overflow-hidden border border-gray-100 p-6 ${className}`}>
      {title && (
        <div className="mb-4">
          <h3 className="text-gray-800 font-semibold text-lg flex items-center gap-2">
            <span className="w-1 h-4 gold-gradient rounded-full"></span>
            {title}
          </h3>
          {subtitle && <p className="text-gray-400 text-xs mt-0.5">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
};
