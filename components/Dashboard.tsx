
import React, { useState, useEffect } from 'react';
import { Settings, Shield, Activity, Clock, Cpu, ShieldCheck, ShieldAlert, Volume2, Radio } from 'lucide-react';
import { SovereignCard } from './SovereignCard';
import { MechanicalSlider } from './MechanicalSlider';
import { AppState } from '../types';
import { audioService } from '../services/audioService';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  state: AppState;
  onToggleMonitoring: () => void;
  onSync: () => void;
  onSettingsClick: () => void;
}

export const Dashboard: React.FC<Props> = ({ state, onToggleMonitoring, onSync, onSettingsClick }) => {
  const [sensitivity, setSensitivity] = useState(85);
  const [signalLevel, setSignalLevel] = useState(0);

  useEffect(() => {
    let interval: number;
    if (state.isMonitoring) {
      interval = window.setInterval(() => {
        setSignalLevel(Math.floor(Math.random() * 40) + 60);
      }, 100);
    } else {
      setSignalLevel(0);
    }
    return () => clearInterval(interval);
  }, [state.isMonitoring]);

  const handleToggle = () => {
    audioService.triggerHaptic('heavy');
    audioService.playMechanicalSound();
    onToggleMonitoring();
  };

  return (
    <div className="min-h-screen pt-14 pb-40 px-6 space-y-8 overflow-y-auto no-scrollbar relative">
      <div className="absolute top-0 left-0 w-full h-80 bg-gradient-to-b from-[#D4AF37]/5 via-transparent to-transparent pointer-events-none -z-10" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-[#D4AF37] shadow-[0_0_12px_#D4AF37] animate-pulse" />
             <h1 className="text-3xl font-serif-luxury font-bold tracking-tight text-gray-900">
              静默卫士 
            </h1>
          </div>
          <p className="text-[10px] text-gray-400 font-bold tracking-[0.45em] uppercase ml-4">Sovereign Pro v2.1</p>
        </div>
        <motion.button 
          whileTap={{ scale: 0.9 }} 
          onClick={() => { audioService.triggerHaptic(); onSettingsClick(); }}
          className="w-12 h-12 rounded-2xl luxury-glass luxury-shadow flex items-center justify-center border border-[#D4AF37]/10"
        >
          <Settings className="w-5 h-5 text-gray-400" />
        </motion.button>
      </div>

      {/* v2.1 物理信道波形动态显示 (PCM-16 模拟) */}
      <SovereignCard className="p-0 overflow-hidden border border-[#D4AF37]/15 bg-gray-50/40">
        <div className="h-32 flex items-center justify-center gap-[3px] px-10 relative bg-[#1A1A1B]/5">
           <div className="absolute top-4 left-6 flex items-center gap-2">
              <Radio className={`w-3 h-3 ${state.isMonitoring ? 'text-green-500 animate-pulse' : 'text-gray-300'}`} />
              <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">HAL Input Stream (48kHz)</span>
           </div>
           {[...Array(36)].map((_, i) => (
             <motion.div 
               key={i}
               animate={{ 
                 height: state.isMonitoring ? [6, Math.random() * 50 + 8, 6] : 2,
                 opacity: state.isMonitoring ? [0.4, 0.9, 0.4] : 0.15
               }}
               transition={{ repeat: Infinity, duration: 0.45, delay: i * 0.015 }}
               className={`w-[3px] rounded-full ${state.isMonitoring ? 'bg-[#D4AF37]' : 'bg-gray-400'}`}
             />
           ))}
           <div className="absolute bottom-4 right-6 flex items-center gap-1.5">
              <div className={`w-1 h-1 rounded-full ${state.isMonitoring ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className="text-[8px] font-mono text-gray-400 uppercase tracking-tighter">Sovereign Injection Ready</span>
           </div>
        </div>
      </SovereignCard>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-5">
        <SovereignCard className="p-5 relative border-l-2 border-l-[#D4AF37] bg-white group hover:bg-[#D4AF37]/5 transition-colors duration-500">
          <div className="flex items-center gap-2 mb-4">
            <Cpu className="w-4 h-4 text-[#D4AF37]" />
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">神经引擎时延</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-light text-gray-900 tracking-tighter">32</span>
            <span className="text-[10px] text-gray-400 font-bold uppercase ml-1">ms</span>
          </div>
          <div className="absolute -right-2 -bottom-2 opacity-5">
            <ShieldCheck className="w-16 h-16 text-[#D4AF37]" />
          </div>
        </SovereignCard>
        
        <SovereignCard className="p-5 relative border-l-2 border-l-orange-400 bg-white group hover:bg-orange-50 transition-colors duration-500">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-orange-400" />
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">防御协议剩余</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-4xl font-light tracking-tighter ${state.license.sessionTimeLeft < 30 ? 'text-red-600 animate-pulse' : 'text-gray-900'}`}>
              {Math.floor(state.license.sessionTimeLeft / 60)}:
              {(state.license.sessionTimeLeft % 60).toString().padStart(2, '0')}
            </span>
          </div>
        </SovereignCard>
      </div>

      {/* Main Control Panel */}
      <SovereignCard className="p-1 border border-[#D4AF37]/20">
        <div className={`p-6 rounded-[calc(1.5rem-1px)] transition-all duration-1000 ${state.isMonitoring ? 'bg-[#D4AF37]/5' : 'bg-gray-50/50'}`}>
          <div className="flex items-center justify-between mb-10">
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Shield className={`w-4 h-4 transition-colors ${state.isMonitoring ? 'text-[#D4AF37]' : 'text-gray-300'}`} />
                主权防御协议 (v2.1)
              </h3>
              <p className="text-[10px] text-gray-400 font-medium tracking-wide">
                {state.isMonitoring ? 'Sovereign Core 已通过 HAL 劫持音频链路' : '等待战略部署 - 物理屏蔽已就绪'}
              </p>
            </div>
            <button onClick={handleToggle} className={`relative w-16 h-8 rounded-full transition-all duration-700 ${state.isMonitoring ? 'bg-[#D4AF37]' : 'bg-gray-200'} shadow-inner`}>
              <motion.div 
                animate={{ x: state.isMonitoring ? 34 : 4 }} 
                className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg" 
              />
            </button>
          </div>
          <MechanicalSlider label="神经感知相似度阈值 (Matching Threshold)" value={sensitivity} onChange={setSensitivity} />
        </div>
      </SovereignCard>

      {/* v2.1 转写审计流增强 */}
      <div className="space-y-5">
        <div className="flex justify-between items-center px-2">
          <div className="flex items-center gap-2">
            <Activity className={`w-4 h-4 ${state.isMonitoring ? 'text-green-500 animate-pulse' : 'text-gray-300'}`} />
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none">ASR 神经转写审计流</h3>
          </div>
          <div className="bg-[#D4AF37]/8 px-3 py-1.5 rounded-full border border-[#D4AF37]/25 flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse" />
             <span className="text-[8px] text-[#D4AF37] font-bold uppercase tracking-widest">End-to-End Encrypted</span>
          </div>
        </div>
        
        <SovereignCard className="p-5 bg-white/95 backdrop-blur-3xl min-h-[350px] border-[#D4AF37]/15 relative overflow-hidden shadow-2xl">
          <div className="space-y-4 relative z-10">
            {state.transcript.length === 0 && (
              <div className="py-24 text-center flex flex-col items-center gap-6">
                <div className="w-18 h-18 rounded-full border border-gray-100 luxury-shadow flex items-center justify-center animate-pulse">
                   <Volume2 className="w-9 h-9 text-gray-200" />
                </div>
                <p className="text-[10px] text-gray-300 font-bold tracking-[0.5em] uppercase italic">监听已激活 - 等待主权信道接入</p>
              </div>
            )}
            <AnimatePresence mode="popLayout">
              {state.transcript.map((line, idx) => (
                <motion.div 
                  initial={{ opacity: 0, y: 20, scale: 0.95 }} 
                  animate={{ 
                    opacity: 1, 
                    y: 0, 
                    scale: line.isRisk ? [1, 1.03, 1] : 1,
                    backgroundColor: line.isRisk ? 'rgba(239, 68, 68, 0.05)' : 'transparent'
                  }} 
                  key={line.timestamp || idx} 
                  className={`p-5 rounded-[2rem] text-xs leading-relaxed border transition-all duration-700 flex items-start gap-4 ${
                    line.isRisk ? 'border-red-200 text-red-700 shadow-xl shadow-red-500/10' : 'border-gray-50 text-gray-600'
                  }`}
                >
                  <div className={`mt-0.5 p-3 rounded-2xl transition-all duration-500 ${line.isRisk ? 'bg-red-100 text-red-600 scale-110 shadow-lg' : 'bg-gray-50 text-gray-300'}`}>
                    {line.isRisk ? <ShieldAlert className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex justify-between items-center mb-2.5">
                      <span className="font-mono text-[9px] text-gray-300 font-bold uppercase tracking-widest">FRAME SEQ {idx + 9216}</span>
                      {line.isRisk && (
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold text-red-600 bg-red-100 px-3 py-1 rounded-lg border border-red-200 uppercase">命中变体: {line.hitWord}</span>
                          <span className="text-[9px] font-bold bg-red-600 text-white px-3 py-1 rounded-full shadow-lg shadow-red-600/30 animate-pulse">物理切断</span>
                        </div>
                      )}
                    </div>
                    <p className={`text-[13px] font-medium tracking-tight leading-relaxed ${line.isRisk ? 'font-bold' : ''}`}>{line.text}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </SovereignCard>
      </div>

      <div className="flex flex-col items-center gap-4 pb-16">
        <div className="px-12 py-5 rounded-[2.5rem] luxury-glass border border-[#D4AF37]/25 text-[11px] font-bold text-gray-600 tracking-[0.35em] luxury-shadow uppercase">
          防御共识试用: <span className="text-[#D4AF37] font-serif-luxury text-base mx-2">{state.license.trialCount}</span> / 5
        </div>
      </div>
    </div>
  );
};
