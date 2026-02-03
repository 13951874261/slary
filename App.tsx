
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Home, Book, Zap, RotateCcw, AlertTriangle } from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { DictionaryManager } from './components/DictionaryManager';
import { FloatingOrb } from './components/FloatingOrb';
import { Paywall } from './components/Paywall';
import { SettingsModal } from './components/SettingsModal';
import { bmobService } from './services/bmobService';
import { audioService } from './services/audioService';
import { activationService } from './services/activationService';
import { AppState, DictionaryItem, RiskLevel, TranscriptEntry, RiskInterceptedPayload } from './types';
import { TRIAL_LIMIT, SESSION_LIMIT, DEFAULT_SIMILARITY_THRESHOLD } from './constants';
import { motion, AnimatePresence } from 'framer-motion';
import { fuzzyMatch, loadPinyin } from './services/matchService';
import { buildUpdateConfigPayload } from './services/bridgeConfig';

const App: React.FC = () => {
  const [view, setView] = useState<'home' | 'dict'>('home');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [state, setState] = useState<AppState>(() => ({
    isMonitoring: false,
    dictionary: [],
    license: {
      trialCount: Number(localStorage.getItem('sg_trial_count') ?? TRIAL_LIMIT),
      isActive: localStorage.getItem('sg_active') === 'true',
      machineId: bmobService.getMachineId(),
      sessionTimeLeft: SESSION_LIMIT
    },
    lastSync: localStorage.getItem('sg_last_sync') || '从未同步',
    transcript: [],
    isLocalPriority: localStorage.getItem('sg_local_priority') !== 'false',
    similarityThreshold: Number(localStorage.getItem('sg_similarity_threshold')) || DEFAULT_SIMILARITY_THRESHOLD
  }));
  
  const [isRiskHit, setIsRiskHit] = useState(false);
  const [currentHitWord, setCurrentHitWord] = useState("");
  const [showUndo, setShowUndo] = useState(false);
  
  // v2.1 核心指针系统：模拟 Native RingBuffer 审计位置
  const lastTriggerTime = useRef<number>(0);
  const auditPointer = useRef<number>(0); // 增量审计指针：记录已处理文本长度
  const sessionTimerRef = useRef<number | null>(null);
  const undoTimerRef = useRef<number | null>(null);
  const createdMockBridgeRef = useRef<boolean>(false);

  // 模拟 v2.1 Native Bridge (AntigravityBridge)
  // 负责 Web UI 与 虚拟 Native Core 的跨域通信
  useEffect(() => {
    const w = window as any;

    // 如果运行在纯 Web 环境，注入一个最小可用的 Mock。
    // 注意：在 Android WebView 内 `addJavascriptInterface` 会注入真实对象，
    // 这里必须避免覆盖真实的 AntigravityBridge。
    if (!w.AntigravityBridge || typeof w.AntigravityBridge.emit !== 'function') {
      createdMockBridgeRef.current = true;
      w.AntigravityBridge = {
        emit: (event: string, data: any) => {
          console.debug(`[Sovereign Bridge] UI -> Native: ${event}`, data);
          // 模拟 Native 接收拦截指令并回传确认 (协议 §7.2)
          if (event === 'INTERCEPT_REQUEST') {
            const payload: RiskInterceptedPayload = {
              word: data.word,
              timestamp: data.timestamp ?? Date.now(),
              confidence: data.confidence ?? 0.95,
              hook_type: 'HAL_VIRTUAL_DEVICE'
            };
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('native_INTERCEPT', { detail: payload }));
            }, 50);
          }
        }
      };
    }

    const onIntercept = (e: any) => {
      const payload = e?.detail as RiskInterceptedPayload | undefined;
      if (!payload) return;
      setIsRiskHit(true);
      setCurrentHitWord(payload.word);
      setShowUndo(true);
      audioService.triggerHaptic('heavy');
      
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      undoTimerRef.current = window.setTimeout(() => setShowUndo(false), 5000);
      
      // 警示动画冷却
      setTimeout(() => setIsRiskHit(false), 1200);
    };

    window.addEventListener('native_INTERCEPT', onIntercept);

    return () => {
      window.removeEventListener('native_INTERCEPT', onIntercept);
      if (createdMockBridgeRef.current) delete w.AntigravityBridge;
    };
  }, []);

  // 策略下发：词典或相似度阈值变更时推送到 Native (NEXT_IMPROVEMENTS §5.2 §7.1)
  useEffect(() => {
    const payload = buildUpdateConfigPayload(
      state.dictionary,
      state.similarityThreshold ?? DEFAULT_SIMILARITY_THRESHOLD
    );
    const bridge = (window as any).AntigravityBridge;
    if (bridge?.emit) bridge.emit('UPDATE_CONFIG', JSON.stringify(payload));
  }, [state.dictionary, state.similarityThreshold]);

  useEffect(() => {
    loadPinyin().then((ok) => {
      if (!ok) console.debug('[SilenceGuard] pinyin-pro not loaded, exact match only');
    });
  }, []);

  useEffect(() => {
    const initLicensing = async () => {
      if (!state.license.isActive) {
        const localTrials = Number(localStorage.getItem('sg_trial_count') ?? TRIAL_LIMIT);
        const arbitratedTrials = await bmobService.arbitrateTrials(localTrials, state.license.machineId);
        const hasLaunched = sessionStorage.getItem('sg_launched');
        let finalTrials = arbitratedTrials;
        if (!hasLaunched) {
          finalTrials = Math.max(0, arbitratedTrials - 1);
          sessionStorage.setItem('sg_launched', 'true');
          localStorage.setItem('sg_trial_count', finalTrials.toString());
          await bmobService.updateCloudTrials(state.license.machineId, finalTrials);
        }
        setState(prev => ({
          ...prev,
          license: { ...prev.license, trialCount: finalTrials }
        }));
      }
    };
    initLicensing();
    const localDict = JSON.parse(localStorage.getItem('sg_local_dict') || '[]');
    setState(prev => ({ ...prev, dictionary: localDict }));
  }, []);

  useEffect(() => {
    if (state.isMonitoring && !state.license.isActive) {
      sessionTimerRef.current = window.setInterval(() => {
        setState(prev => {
          if (prev.license.sessionTimeLeft <= 1) {
            audioService.stopListening();
            audioService.triggerHaptic('heavy');
            return {
              ...prev,
              isMonitoring: false,
              license: { ...prev.license, sessionTimeLeft: 0 }
            };
          }
          return {
            ...prev,
            license: { ...prev.license, sessionTimeLeft: prev.license.sessionTimeLeft - 1 }
          };
        });
      }, 1000);
    } else if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
    }
    return () => { if (sessionTimerRef.current) clearInterval(sessionTimerRef.current); };
  }, [state.isMonitoring, state.license.isActive]);

  const handleToggleMonitoring = useCallback(() => {
    if (!state.isMonitoring) {
      if (!state.license.isActive && (state.license.trialCount <= 0 || state.license.sessionTimeLeft <= 0)) {
        audioService.triggerHaptic('heavy');
        return;
      }
      setState(prev => ({ ...prev, isMonitoring: true }));
      auditPointer.current = 0; // 开启协议时重置指针

      audioService.startListening((text) => {
        if (!text.trim()) return;

        // v2.1 增量滑动窗口 + Phase 0 变体相似度 (拼音/编辑距离)
        const cleanText = text.toLowerCase().replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, "");
        if (cleanText.length < auditPointer.current) auditPointer.current = 0;

        const threshold = state.similarityThreshold ?? DEFAULT_SIMILARITY_THRESHOLD;
        const bestMatch = fuzzyMatch(cleanText, auditPointer.current, state.dictionary, {
          pinyinMatch: true,
          similarityThreshold: threshold,
          exactMatch: true
        });

        const now = Date.now();
        if (bestMatch) {
          auditPointer.current = cleanText.length;
          if (now - lastTriggerTime.current > 1500) {
            lastTriggerTime.current = now;
            audioService.triggerKillSwitch();
            (window as any).AntigravityBridge?.emit('INTERCEPT_REQUEST', {
              word: bestMatch.word,
              confidence: 0.95,
              timestamp: now
            });
          }
        }

        setState(prev => {
          const lastEntry = prev.transcript[0];
          if (lastEntry && lastEntry.text === text && !bestMatch) return prev;
          return {
            ...prev,
            transcript: [{
              text,
              isRisk: !!bestMatch,
              hitWord: bestMatch?.word,
              timestamp: now
            }, ...prev.transcript].slice(0, 15)
          };
        });
      });
    } else {
      setState(prev => ({ ...prev, isMonitoring: false }));
      audioService.stopListening();
    }
  }, [state.isMonitoring, state.license.trialCount, state.license.isActive, state.license.sessionTimeLeft, state.dictionary, state.similarityThreshold]);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      audioService.triggerHaptic('light');
      const cloudDict = await bmobService.fetchDictionary();
      const now = new Date().toLocaleString('zh-CN', { dateStyle: 'medium', timeStyle: 'short' });
      setState(prev => {
        const localKeywords = new Set(prev.dictionary.map(d => d.keyword));
        const newFromCloud = cloudDict.filter(item => !localKeywords.has(item.keyword));
        const finalDict = [...prev.dictionary, ...newFromCloud];
        localStorage.setItem('sg_local_dict', JSON.stringify(finalDict));
        localStorage.setItem('sg_last_sync', now);
        return { ...prev, dictionary: finalDict, lastSync: now };
      });
    } catch (e: any) {
      alert(`同步失败: ${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleTogglePriority = () => {
    const newVal = !state.isLocalPriority;
    setState(prev => ({ ...prev, isLocalPriority: newVal }));
    localStorage.setItem('sg_local_priority', String(newVal));
    audioService.triggerHaptic('light');
  };

  const handleUpdateSimilarityThreshold = (value: number) => {
    setState(prev => ({ ...prev, similarityThreshold: value }));
    localStorage.setItem('sg_similarity_threshold', String(value));
  };

  const handleUpdateDict = (newDict: DictionaryItem[]) => {
    setState(prev => ({ ...prev, dictionary: newDict }));
    localStorage.setItem('sg_local_dict', JSON.stringify(newDict));
  };

  const handleActivate = async (code: string) => {
    const isValid = await activationService.verifyCode(code, state.license.machineId);
    if (isValid) {
      setState(prev => ({ 
        ...prev, 
        license: { ...prev.license, isActive: true, trialCount: 999, sessionTimeLeft: 99999 } 
      }));
      localStorage.setItem('sg_active', 'true');
      audioService.triggerHaptic('heavy');
    } else {
      alert('激活失败');
    }
  };

  const showPaywall = (!state.license.isActive && (state.license.trialCount <= 0 || state.license.sessionTimeLeft <= 0));

  return (
    <div className={`h-screen w-screen overflow-hidden flex flex-col relative transition-all duration-1000 ${isRiskHit ? 'bg-red-900/10' : 'bg-[#FCFCFD]'}`}>
      <AnimatePresence>
        {showPaywall && (
          <Paywall 
            machineId={state.license.machineId} 
            type={state.license.trialCount <= 0 ? 'TRIAL_EXHAUSTED' : 'SESSION_TIMEOUT'} 
            onActivate={handleActivate} 
          />
        )}
      </AnimatePresence>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        state={state}
        onUpdateSimilarityThreshold={handleUpdateSimilarityThreshold}
      />

      <main className="flex-1 overflow-hidden h-full">
        <AnimatePresence mode="wait">
          {view === 'home' ? (
            <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
              <Dashboard 
                state={state} 
                onToggleMonitoring={handleToggleMonitoring} 
                onSync={handleSync} 
                onSettingsClick={() => setIsSettingsOpen(true)}
              />
            </motion.div>
          ) : (
            <motion.div key="dict" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
              <DictionaryManager 
                dictionary={state.dictionary} 
                isSyncing={isSyncing}
                isLocalPriority={state.isLocalPriority}
                onSync={handleSync}
                onTogglePriority={handleTogglePriority}
                onUpdate={handleUpdateDict}
                onUpload={async (item) => {
                  const ok = await bmobService.uploadItem(item);
                  if (ok) {
                    const newDict = state.dictionary.map(d => d.keyword === item.keyword ? { ...d, isLocalOnly: false } : d);
                    handleUpdateDict(newDict);
                  }
                }} 
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* v2.1 物理阻断战术告警 */}
      <AnimatePresence>
        {showUndo && (
          <motion.div 
            initial={{ opacity: 0, y: 100, x: '-50%' }} 
            animate={{ opacity: 1, y: 0, x: '-50%' }} 
            exit={{ opacity: 0, y: 100, x: '-50%' }}
            className="fixed bottom-32 left-1/2 z-[1000] w-[90%] max-w-sm flex flex-col gap-3"
          >
            <div className="bg-[#1A1A1B] text-white px-6 py-5 rounded-[2.5rem] flex items-center gap-4 luxury-shadow border border-white/10 ring-8 ring-[#1A1A1B]/5">
               <div className="bg-red-600 p-3 rounded-full shadow-[0_0_20px_rgba(220,38,38,0.4)] animate-pulse">
                  <AlertTriangle className="w-6 h-6 text-white" />
               </div>
               <div className="flex flex-col flex-1 overflow-hidden">
                  <span className="text-[9px] font-bold uppercase opacity-60 tracking-[0.25em] mb-1">物理信道已紧急切断 (HAL Hooked)</span>
                  <span className="text-base font-bold truncate">风险命中: <span className="text-red-400 underline underline-offset-4 decoration-2">{currentHitWord}</span></span>
               </div>
            </div>
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setShowUndo(false);
                audioService.triggerHaptic('light');
                const bridge = (window as any).AntigravityBridge;
                if (bridge?.emit) bridge.emit('MARK_FALSE_POSITIVE', JSON.stringify({ word: currentHitWord, timestamp: Date.now() }));
              }}
              className="bg-white text-gray-900 px-10 py-5 rounded-3xl flex items-center justify-center gap-3 text-[11px] font-bold uppercase tracking-[0.3em] luxury-shadow border border-gray-100 shadow-2xl"
            >
              <RotateCcw className="w-4 h-4" />
              重置信道并标记误报
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <FloatingOrb isMonitoring={state.isMonitoring} isRiskHit={isRiskHit} version={state.lastSync} />

      <nav className="h-24 luxury-glass border-t border-gray-100 flex items-center justify-around px-8 pb-6 shadow-[0_-4px_30px_rgba(0,0,0,0.03)] z-[50]">
        <button onClick={() => { audioService.triggerHaptic(); setView('home'); }} className={`flex flex-col items-center gap-2 transition-all ${view === 'home' ? 'text-gray-900 scale-105' : 'text-gray-300'}`}>
          <Home className={`w-6 h-6 ${view === 'home' ? 'stroke-[2.5px]' : 'stroke-[1.5px]'}`} />
          <span className="text-[9px] font-bold tracking-[0.2em] uppercase">战略中心</span>
        </button>
        <div className="relative -top-10">
          <motion.div 
            whileTap={{ scale: 0.9 }} 
            animate={{ scale: isRiskHit ? 1.3 : 1 }}
            className={`w-18 h-18 rounded-[2.2rem] luxury-shadow p-1.5 border transition-all duration-500 ${isRiskHit ? 'bg-red-600 border-red-400 shadow-[0_0_25px_rgba(220,38,38,0.3)]' : state.isMonitoring ? 'bg-[#D4AF37] border-[#D4AF37]/50 shadow-[0_0_15px_rgba(212,175,55,0.2)]' : 'bg-white border-gray-100'}`}
          >
            <div className="w-full h-full rounded-[1.8rem] flex items-center justify-center">
              <Zap className={`w-8 h-8 transition-colors duration-500 ${state.isMonitoring || isRiskHit ? 'text-white' : 'text-gray-200'}`} />
            </div>
          </motion.div>
        </div>
        <button onClick={() => { audioService.triggerHaptic(); setView('dict'); }} className={`flex flex-col items-center gap-2 transition-all ${view === 'dict' ? 'text-gray-900 scale-105' : 'text-gray-300'}`}>
          <Book className={`w-6 h-6 ${view === 'dict' ? 'stroke-[2.5px]' : 'stroke-[1.5px]'}`} />
          <span className="text-[9px] font-bold tracking-[0.2em] uppercase">策略中心</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
