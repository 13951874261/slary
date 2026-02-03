/**
 * Phase 0: 变体相似度匹配 — 拼音 + 编辑距离
 * 使同音字（如「思域」）能触发对「私域」的报警
 * 无 pinyin-pro 时自动回退为仅精确匹配
 */

import type { DictionaryItem } from '../types';

let pinyinModule: { pinyin: (s: string, o?: { toneType?: string; type?: string }) => string | string[] } | null = null;

/** 异步加载 pinyin-pro，失败时仅使用精确匹配 */
export async function loadPinyin(): Promise<boolean> {
  if (pinyinModule != null) return true;
  try {
    pinyinModule = await import('pinyin-pro');
    return true;
  } catch {
    return false;
  }
}

/** 汉字转拼音（无空格、小写）；未加载 pinyin-pro 时返回原串小写 */
export function toPinyin(str: string): string {
  if (!str || !/\u4e00-\u9fa5/.test(str)) return str.toLowerCase();
  if (pinyinModule) {
    try {
      const py = pinyinModule.pinyin(str, { toneType: 'none', type: 'string' }) as string;
      return (py || '').replace(/\s+/g, '').toLowerCase();
    } catch {
      return str.toLowerCase();
    }
  }
  return str.toLowerCase();
}

/** 汉字转拼音音节数组（用于 Bridge UPDATE_CONFIG） */
export function toPinyinSyllables(str: string): string[] {
  if (!str || !/\u4e00-\u9fa5/.test(str)) return [str.toLowerCase()];
  if (pinyinModule) {
    try {
      const arr = pinyinModule.pinyin(str, { toneType: 'none', type: 'array' }) as string[];
      return (arr || []).map((s) => String(s).toLowerCase().trim()).filter(Boolean);
    } catch {
      return [str.toLowerCase()];
    }
  }
  return [str.toLowerCase()];
}

/** Levenshtein 编辑距离 */
export function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array(m + 1)
    .fill(0)
    .map(() => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

/** 相似度 0~1（1 为完全相同） */
export function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length, 1);
  return 1 - editDistance(a, b) / maxLen;
}

export interface MatchOptions {
  /** 拼音匹配：同音字算命中，默认 true */
  pinyinMatch?: boolean;
  /** 编辑距离相似度阈值 0~1，默认 0.85 */
  similarityThreshold?: number;
  /** 是否仍做精确子串匹配，默认 true */
  exactMatch?: boolean;
}

const defaultOptions: Required<MatchOptions> = {
  pinyinMatch: true,
  similarityThreshold: 0.85,
  exactMatch: true
};

export interface MatchResult {
  word: string;
  index: number;
  /** 命中方式: exact | pinyin | fuzzy */
  matchType: 'exact' | 'pinyin' | 'fuzzy';
}

/**
 * 在 cleanText 的 [auditPointer, end] 区间内做变体匹配
 * 优先精确 → 拼音相等 → 拼音相似度 ≥ 阈值
 */
export function fuzzyMatch(
  cleanText: string,
  auditPointer: number,
  dictionary: DictionaryItem[],
  options: MatchOptions = {}
): MatchResult | null {
  const opts = { ...defaultOptions, ...options };
  let best: MatchResult | null = null;

  const segment = cleanText.slice(auditPointer);
  if (!segment) return null;

  for (const item of dictionary) {
    const allVariants = [item.keyword, ...item.variants];
    for (const v of allVariants) {
      const cleanV = v.toLowerCase().replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '');
      if (cleanV.length < 1) continue;

      const targetPinyin = opts.pinyinMatch ? toPinyin(cleanV) : '';

      // 滑动窗口：窗口长度 = 词长 或 词长±1（容错一字）
      for (const len of [cleanV.length, cleanV.length - 1, cleanV.length + 1].filter(l => l >= 1)) {
        for (let i = 0; i <= segment.length - len; i++) {
          const start = auditPointer + i;
          const sub = segment.slice(i, i + len);
          const subClean = sub.toLowerCase().replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '');
          if (subClean.length < 1) continue;

          // 1) 精确子串匹配
          if (opts.exactMatch && subClean === cleanV) {
            if (!best || start >= best.index) {
              best = { word: v, index: start, matchType: 'exact' };
            }
            continue;
          }

          if (!opts.pinyinMatch) continue;

          const subPinyin = toPinyin(subClean);

          // 2) 拼音完全一致（同音字）
          if (subPinyin === targetPinyin) {
            if (!best || start >= best.index) {
              best = { word: v, index: start, matchType: 'pinyin' };
            }
            continue;
          }

          // 3) 拼音相似度 ≥ 阈值（ASR 错字、近音）
          if (similarity(subPinyin, targetPinyin) >= opts.similarityThreshold) {
            if (!best || start >= best.index) {
              best = { word: v, index: start, matchType: 'fuzzy' };
            }
          }
        }
      }
    }
  }

  return best;
}
