
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, ShieldCheck, Database, Server, Info, Terminal } from 'lucide-react';
import { audioService } from '../services/audioService';
import { AppState } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  state: AppState;
  onUpdateSimilarityThreshold?: (value: number) => void;
}

export const SettingsModal: React.FC<Props> = ({ isOpen, onClose, state, onUpdateSimilarityThreshold }) => {
  const copyId = () => {
    audioService.triggerHaptic('light');
    navigator.clipboard.writeText(state.license.machineId);
    alert('主权机器码已复制');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-xl"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-full max-w-sm bg-white rounded-[2.5rem] p-8 luxury-shadow border border-white/20 relative z-10 overflow-hidden"
          >
            {/* 背景修饰 */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/5 rounded-full -mr-16 -mt-16" />
            
            <header className="flex items-center justify-between mb-8">
              <div className="space-y-1">
                <h2 className="text-xl font-serif-luxury font-bold text-gray-900">主权矩阵设定</h2>
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Sovereign Identification</p>
              </div>
              <button onClick={() => { audioService.triggerHaptic(); onClose(); }} className="p-2 text-gray-300 hover:text-gray-900 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </header>

            <div className="space-y-6">
              {/* 机器码卡片 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <Terminal className="w-3 h-3 text-[#D4AF37]" />
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">主权机器码 (Machine ID)</span>
                </div>
                <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between group">
                  <p className="font-mono text-xs font-bold text-gray-800 tracking-tight">{state.license.machineId}</p>
                  <button onClick={copyId} className="p-2.5 bg-white rounded-xl luxury-shadow border border-gray-100 text-[#D4AF37] active:scale-90 transition-all">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 协议详情列表 */}
              <div className="space-y-3">
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#FCFCFD] border border-gray-100">
                  <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-[#D4AF37]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">协议状态</p>
                    <p className="text-xs font-bold text-gray-800">{state.license.isActive ? '主权正式授权 (Activated)' : '临时主权试用 (Trial)'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#FCFCFD] border border-gray-100">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                    <Server className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">通信节点</p>
                    <p className="text-xs font-bold text-gray-800">api.codenow.cn</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#FCFCFD] border border-gray-100">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                    <Database className="w-5 h-5 text-purple-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">本地缓存策略</p>
                    <p className="text-xs font-bold text-gray-800">{state.dictionary.length} 条防御共识</p>
                  </div>
                </div>

                {/* Phase 0: 变体相似度阈值 */}
                {onUpdateSimilarityThreshold != null && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 px-1">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">变体相似度 (同音/近音)</span>
                    </div>
                    <div className="p-4 rounded-2xl bg-[#FCFCFD] border border-gray-100 flex flex-col gap-2">
                      <div className="flex justify-between text-xs font-bold text-gray-800">
                        <span>{(state.similarityThreshold ?? 0.85).toFixed(2)}</span>
                        <span className="text-gray-400">越高越严 · 同音字可命中</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="1"
                        step="0.05"
                        value={state.similarityThreshold ?? 0.85}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          onUpdateSimilarityThreshold(v);
                          audioService.triggerHaptic('light');
                        }}
                        className="w-full h-2 rounded-full appearance-none bg-gray-200 accent-[#D4AF37]"
                      />
                    </div>
                  </div>
                )}

                {/* Native POC: 测试拦截 — 在 Android 内触发约 100ms 的 shouldIntercept() 便于验证 hook→injector */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Native POC</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      audioService.triggerHaptic('light');
                      (window as any).AntigravityBridge?.emit('TEST_INTERCEPT', 'true');
                    }}
                    className="w-full p-4 rounded-2xl bg-amber-50 border border-amber-100 text-left text-xs font-bold text-amber-900"
                  >
                    触发测试拦截 (约 100ms) — 验证 HAL→Injector 链路
                  </button>
                </div>
              </div>

              {/* 版本脚注 */}
              <div className="pt-4 border-t border-gray-50 flex justify-between items-center opacity-30">
                <div className="flex items-center gap-1.5">
                  <Info className="w-3 h-3" />
                  <span className="text-[8px] font-bold uppercase tracking-widest">Protocol v2.0.4a</span>
                </div>
                <span className="text-[8px] font-bold uppercase tracking-widest">Sovereign Obsidian</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
