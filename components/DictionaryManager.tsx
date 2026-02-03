
import React, { useState } from 'react';
import { Plus, Trash2, CloudUpload, Search, ShieldCheck, ShieldAlert, Layers, RefreshCw, Edit3, X, Check, CheckSquare, Square, Save, Archive, Download } from 'lucide-react';
import { SovereignCard } from './SovereignCard';
import { DictionaryItem, RiskLevel } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { audioService } from '../services/audioService';

interface Props {
  dictionary: DictionaryItem[];
  isSyncing: boolean;
  isLocalPriority: boolean;
  onSync: () => void;
  onTogglePriority: () => void;
  onUpdate: (newDict: DictionaryItem[]) => void;
  onUpload: (item: DictionaryItem) => void;
}

export const DictionaryManager: React.FC<Props> = ({ dictionary, isSyncing, isLocalPriority, onSync, onTogglePriority, onUpdate, onUpload }) => {
  const [newWord, setNewWord] = useState('');
  const [variants, setVariants] = useState('');
  const [risk, setRisk] = useState<RiskLevel>(RiskLevel.HIGH);
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [editingItem, setEditingItem] = useState<DictionaryItem | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord.trim()) return;
    audioService.triggerHaptic('heavy');
    
    const newItem: DictionaryItem = {
      keyword: newWord.trim(),
      riskLevel: risk,
      variants: variants.split(',').map(v => v.trim()).filter(Boolean),
      isLocalOnly: true
    };
    
    onUpdate([newItem, ...dictionary]);
    setNewWord('');
    setVariants('');
  };

  const handleSingleDelete = (keyword: string) => {
    audioService.triggerHaptic('heavy');
    onUpdate(dictionary.filter(d => d.keyword !== keyword));
  };

  const handleBatchDelete = () => {
    audioService.triggerHaptic('heavy');
    onUpdate(dictionary.filter(d => !selectedItems.has(d.keyword)));
    setSelectedItems(new Set());
    setIsEditMode(false);
  };

  const handleBatchArchive = () => {
    audioService.triggerHaptic('heavy');
    onUpdate(dictionary.map(d => selectedItems.has(d.keyword) ? { ...d, isLocalOnly: true } : d));
    setSelectedItems(new Set());
    setIsEditMode(false);
  };

  const toggleSelection = (keyword: string) => {
    audioService.triggerHaptic('light');
    const newSelection = new Set(selectedItems);
    if (newSelection.has(keyword)) newSelection.delete(keyword);
    else newSelection.add(keyword);
    setSelectedItems(newSelection);
  };

  const selectAll = () => {
    audioService.triggerHaptic('light');
    if (selectedItems.size === dictionary.length) setSelectedItems(new Set());
    else setSelectedItems(new Set(dictionary.map(d => d.keyword)));
  };

  const handleEditSave = () => {
    if (!editingItem) return;
    audioService.triggerHaptic('heavy');
    onUpdate(dictionary.map(d => d.keyword === editingItem.keyword ? editingItem : d));
    setEditingItem(null);
  };

  const archiveSingle = (keyword: string) => {
    audioService.triggerHaptic('light');
    onUpdate(dictionary.map(d => d.keyword === keyword ? { ...d, isLocalOnly: true } : d));
  };

  return (
    <div className="pt-16 pb-32 px-6 space-y-8 h-full overflow-y-auto no-scrollbar relative">
      <header className="space-y-4">
        <div className="flex items-end justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-serif-luxury font-bold tracking-tight text-gray-900">配置中心</h1>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.3em]">Sovereign Control Node</p>
          </div>
          <div className="flex gap-2">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => { setIsEditMode(!isEditMode); setSelectedItems(new Set()); audioService.triggerHaptic('light'); }}
              className={`w-12 h-12 rounded-2xl luxury-glass luxury-shadow flex items-center justify-center border transition-all ${isEditMode ? 'border-red-500 bg-red-50 text-red-500' : 'border-gray-100 text-gray-400'}`}
            >
              {isEditMode ? <X className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => { onSync(); audioService.triggerHaptic('light'); }}
              disabled={isSyncing}
              className="w-12 h-12 rounded-2xl luxury-glass luxury-shadow flex items-center justify-center border border-[#D4AF37]/20 active:border-[#D4AF37]/50 relative group"
            >
              <RefreshCw className={`w-5 h-5 text-[#D4AF37] ${isSyncing ? 'animate-spin' : ''}`} />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white animate-pulse" />
            </motion.button>
          </div>
        </div>

        <div className="flex items-center justify-between px-4 py-3 bg-gray-50/50 rounded-2xl border border-gray-100">
          <div className="flex items-center gap-3">
            <Layers className={`w-4 h-4 ${isLocalPriority ? 'text-[#D4AF37]' : 'text-gray-300'}`} />
            <div className="space-y-0.5">
              <p className="text-[11px] font-bold text-gray-800">本地优先模式</p>
              <p className="text-[9px] text-gray-400 uppercase tracking-tighter">仅监测已入库词条</p>
            </div>
          </div>
          <button 
            onClick={onTogglePriority}
            className={`w-12 h-6 rounded-full transition-all duration-500 relative ${isLocalPriority ? 'bg-[#D4AF37]' : 'bg-gray-200'}`}
          >
            <motion.div 
              animate={{ x: isLocalPriority ? 26 : 4 }}
              className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
            />
          </button>
        </div>
      </header>

      {!isEditMode && (
        <SovereignCard className="p-1 border border-[#D4AF37]/10">
          <div className="p-5 bg-gray-50/30 rounded-[calc(1rem-1px)]">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">风险关键词</label>
                <input 
                  type="text" 
                  placeholder="词条内容..." 
                  value={newWord}
                  onChange={(e) => setNewWord(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl outline-none text-sm luxury-shadow"
                />
              </div>
              <div className="flex gap-2">
                {(Object.values(RiskLevel)).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => { audioService.triggerHaptic(); setRisk(level); }}
                    className={`flex-1 py-3 text-[10px] font-bold rounded-xl transition-all border uppercase tracking-widest ${
                      risk === level ? 'border-[#D4AF37] bg-[#D4AF37]/5 text-[#D4AF37]' : 'border-gray-100 bg-white text-gray-300'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
              <button type="submit" className="w-full py-4 bg-gray-900 text-white text-[10px] font-bold uppercase tracking-[0.3em] rounded-xl shadow-xl shadow-gray-200">
                部署到本地矩阵
              </button>
            </form>
          </div>
        </SovereignCard>
      )}

      <AnimatePresence>
        {isEditMode && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-32 left-6 right-6 z-[150] luxury-glass p-4 rounded-3xl border border-gray-100 shadow-2xl flex flex-col gap-3"
          >
            <div className="flex justify-between items-center px-2">
              <button onClick={selectAll} className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest">
                {selectedItems.size === dictionary.length ? '取消全选' : '全选矩阵'}
              </button>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">已选择 {selectedItems.size} 个协议</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={handleBatchArchive}
                disabled={selectedItems.size === 0}
                className="flex-1 bg-gray-900 text-white py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest disabled:opacity-30 flex items-center justify-center gap-2"
              >
                <Download className="w-3.5 h-3.5" /> 批量入库
              </button>
              <button 
                onClick={handleBatchDelete}
                disabled={selectedItems.size === 0}
                className="flex-1 bg-red-600 text-white py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest disabled:opacity-30"
              >
                物理清除
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-2">布控协议列表 ({dictionary.length})</h3>
        
        <div className="space-y-3">
          {dictionary.length === 0 && (
            <div className="py-20 text-center border-2 border-dashed border-gray-100 rounded-3xl">
              <p className="text-xs text-gray-300 font-bold uppercase tracking-widest">暂无活跃协议</p>
              <button onClick={onSync} className="mt-4 text-[10px] text-[#D4AF37] font-bold underline">立即从云端同步</button>
            </div>
          )}
          {dictionary.map((item) => (
            <motion.div 
              layout
              key={item.keyword} 
              onClick={() => isEditMode && toggleSelection(item.keyword)}
              className={`bg-white p-5 rounded-2xl border transition-all duration-300 flex items-center justify-between luxury-shadow relative overflow-hidden group ${isEditMode && selectedItems.has(item.keyword) ? 'border-red-500 ring-2 ring-red-500/10' : 'border-gray-100'}`}
            >
              <div className="flex items-center gap-4">
                {isEditMode ? (
                  <div className={`w-6 h-6 flex items-center justify-center rounded-lg transition-colors ${selectedItems.has(item.keyword) ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-300'}`}>
                    {selectedItems.has(item.keyword) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  </div>
                ) : (
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${item.riskLevel === 'high' ? 'bg-red-50' : 'bg-orange-50'}`}>
                    {item.riskLevel === 'high' ? <ShieldAlert className="w-5 h-5 text-red-500" /> : <ShieldCheck className="w-5 h-5 text-orange-400" />}
                  </div>
                )}
                <div>
                  <p className="text-sm font-bold text-gray-800 tracking-tight">{item.keyword}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{item.riskLevel} Risk</span>
                    {item.isLocalOnly ? (
                      <span className="text-[8px] bg-[#D4AF37]/10 px-1.5 py-0.5 rounded text-[#D4AF37] font-bold">本地已入库</span>
                    ) : (
                      <span className="text-[8px] bg-blue-50 px-1.5 py-0.5 rounded text-blue-500 font-bold">云端建议中</span>
                    )}
                  </div>
                </div>
              </div>
              
              {!isEditMode && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!item.isLocalOnly && (
                    <button onClick={(e) => { e.stopPropagation(); archiveSingle(item.keyword); }} className="p-2.5 text-[#D4AF37] hover:scale-110 active:scale-90" title="存入本地">
                      <Download className="w-5 h-5" />
                    </button>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); audioService.triggerHaptic('light'); setEditingItem(item); }} className="p-2.5 text-gray-300 hover:text-gray-900"><Edit3 className="w-4 h-4" /></button>
                  <button onClick={(e) => { e.stopPropagation(); handleSingleDelete(item.keyword); }} className="p-2.5 text-gray-200 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {editingItem && (
          <div className="fixed inset-0 z-[300] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 luxury-shadow border border-white/20">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-serif-luxury font-bold">协议修订</h3>
                <button onClick={() => setEditingItem(null)} className="p-2 text-gray-300"><X className="w-6 h-6" /></button>
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">防御核心词 (锁定)</label>
                  <div className="w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-500">{editingItem.keyword}</div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">语义变体矩阵</label>
                  <input 
                    type="text" 
                    value={editingItem.variants.join(', ')} 
                    onChange={(e) => setEditingItem({...editingItem, variants: e.target.value.split(',').map(v=>v.trim()).filter(Boolean)})}
                    className="w-full px-4 py-4 bg-white border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
                  />
                </div>
                <button 
                  onClick={handleEditSave}
                  className="w-full py-5 bg-gray-900 text-white rounded-2xl text-sm font-bold flex items-center justify-center gap-3 shadow-2xl active:scale-95"
                >
                  确认保存修订协议 <Check className="w-4 h-4 text-[#D4AF37]" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
