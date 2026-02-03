
import React, { useState } from 'react';
import { Copy, Key, ShieldX, Lock, ShieldCheck, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { audioService } from '../services/audioService';

interface Props {
  machineId: string;
  type: 'TRIAL_EXHAUSTED' | 'SESSION_TIMEOUT';
  onActivate: (code: string) => void;
}

export const Paywall: React.FC<Props> = ({ machineId, type, onActivate }) => {
  const [code, setCode] = useState('');

  const copyId = () => {
    audioService.triggerHaptic('light');
    navigator.clipboard.writeText(machineId);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[10000] bg-[#FCFCFD] flex flex-col p-8 overflow-y-auto no-scrollbar">
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-[#D4AF37]/10 via-transparent to-transparent pointer-events-none -z-10" />

      <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full space-y-12 py-12">
        
        <div className="relative">
          <motion.div 
            animate={{ rotate: [0, 5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="w-32 h-32 rounded-[2.5rem] bg-white luxury-shadow flex items-center justify-center border border-[#D4AF37]/20"
          >
            <Lock className="w-12 h-12 text-[#D4AF37]" />
          </motion.div>
          <div className="absolute -bottom-2 -right-2 w-12 h-12 rounded-2xl bg-gray-900 flex items-center justify-center luxury-shadow">
            <ShieldX className="w-6 h-6 text-[#D4AF37]" />
          </div>
        </div>

        <div className="text-center space-y-4">
          <h2 className="text-4xl font-serif-luxury font-bold text-gray-900 tracking-tight">授权协议已中断</h2>
          <p className="text-sm text-gray-400 font-medium px-8 leading-relaxed">
            您的 {type === 'TRIAL_EXHAUSTED' ? '试用机会' : '防御时长'} 已耗尽。静默卫士协议需要主权级密钥才能继续执行物理信道阻断。
          </p>
        </div>

        {/* 交付顾问素材 - 修复路径并增强 UI */}
        <div className="w-full relative px-2">
          <div className="bg-white p-3 rounded-[2.5rem] border border-gray-100 luxury-shadow relative overflow-hidden group">
            <div className="overflow-hidden rounded-[2rem] h-56 bg-gray-100 relative">
              <img 
                src="./lumina_advisor.png" 
                alt="Lumina Security Expert" 
                className="w-full h-full object-cover grayscale brightness-105 transition-all duration-1000 group-hover:scale-110"
                onError={(e) => {
                  e.currentTarget.src = "https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&q=80&w=800";
                  console.warn("Local image not found, using professional fallback.");
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            </div>
            <div className="absolute top-8 left-8 flex items-center gap-2">
               <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-lg shadow-green-500/50" />
               <span className="text-[10px] font-bold text-white bg-black/60 backdrop-blur-md px-4 py-2 rounded-full uppercase tracking-[0.2em]">Lumina 交付顾问</span>
            </div>
            <div className="absolute bottom-8 right-8">
              <motion.div whileTap={{ scale: 0.9 }} className="w-12 h-12 rounded-full bg-[#D4AF37] flex items-center justify-center luxury-shadow border border-white/40 backdrop-blur-sm">
                <Info className="w-5 h-5 text-white" />
              </motion.div>
            </div>
          </div>
        </div>

        <div className="w-full space-y-8">
          <div className="space-y-4">
            <div className="bg-gray-50/80 p-6 rounded-3xl border border-gray-100 flex items-center justify-between group active:bg-gray-100 transition-colors">
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em]">Sovereign Machine ID</span>
                <p className="font-mono text-sm font-bold text-gray-800 tracking-tight">{machineId}</p>
              </div>
              <button onClick={copyId} className="p-4 bg-white rounded-2xl luxury-shadow border border-gray-100 text-[#D4AF37] active:scale-90 transition-transform">
                <Copy className="w-5 h-5" />
              </button>
            </div>

            <div className="relative group">
              <Key className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-[#D4AF37] transition-colors" />
              <input 
                type="text" 
                placeholder="输入 Ed25519 激活密钥" 
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full pl-16 pr-6 py-6 bg-white border border-gray-100 rounded-[2rem] focus:ring-4 focus:ring-[#D4AF37]/5 outline-none text-sm luxury-shadow transition-all font-mono font-bold"
              />
            </div>
          </div>

          <button 
            onClick={() => { audioService.triggerHaptic('heavy'); onActivate(code); }}
            className="w-full py-6 bg-gray-900 text-white text-sm font-bold rounded-[2rem] shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all hover:bg-black"
          >
            激活静默卫士主权协议
            <ShieldCheck className="w-5 h-5 text-[#D4AF37]" />
          </button>
        </div>
      </div>
      
      <div className="py-8 text-center opacity-30">
        <p className="text-[9px] font-bold text-gray-400 tracking-[0.4em] uppercase">Sovereign Activation Protocol v2.0</p>
      </div>
    </motion.div>
  );
};
