
export enum RiskLevel {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export interface DictionaryItem {
  id?: string;
  keyword: string;
  riskLevel: RiskLevel;
  variants: string[];
  isLocalOnly?: boolean;
}

export interface LicenseStatus {
  trialCount: number;
  isActive: boolean;
  machineId: string;
  sessionTimeLeft: number;
}

export interface TranscriptEntry {
  text: string;
  isRisk: boolean;
  hitWord?: string;
  timestamp: number;
  confidence?: number;
}

export interface AppState {
  isMonitoring: boolean;
  dictionary: DictionaryItem[];
  license: LicenseStatus;
  lastSync: string;
  transcript: TranscriptEntry[];
  isLocalPriority: boolean;
  /** Phase 0: 变体相似度阈值 0~1，默认 0.85 */
  similarityThreshold?: number;
}

// ---------- Bridge 协议 (NEXT_IMPROVEMENTS §7) ----------

/** Web -> Native 配置下发的关键词项（拼音/阈值） */
export interface BridgeKeywordItem {
  pinyin: string[];
  threshold: number;
  beep_duration: number;
}

/** Web -> Native: UPDATE_CONFIG 的 payload */
export interface UpdateConfigPayload {
  keywords: BridgeKeywordItem[];
  global_sensitivity: number;
}

/** Native -> Web: RISK_INTERCEPTED 的 payload */
export interface RiskInterceptedPayload {
  word: string;
  timestamp: number;
  confidence: number;
  hook_type?: 'HAL_VIRTUAL_DEVICE' | 'AUDIOFLINGER_HOOK';
}

/** Web -> Native: 误报标记 (NEXT_IMPROVEMENTS §5.1)，用于模型/规则优化 */
export interface MarkFalsePositivePayload {
  word: string;
  timestamp: number;
}
