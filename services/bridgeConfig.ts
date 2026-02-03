/**
 * Bridge 协议：将 Web 词典与设置编译为 Native 可用的配置 (NEXT_IMPROVEMENTS §7.1)
 */

import { toPinyinSyllables } from './matchService';
import type { DictionaryItem } from '../types';
import type { UpdateConfigPayload } from '../types';
import { DEFAULT_SIMILARITY_THRESHOLD, DEFAULT_BEEP_DURATION } from '../constants';

export function buildUpdateConfigPayload(
  dictionary: DictionaryItem[],
  globalSensitivity: number = DEFAULT_SIMILARITY_THRESHOLD
): UpdateConfigPayload {
  const keywords = dictionary.map((item) => {
    const syllables = toPinyinSyllables(item.keyword);
    return {
      pinyin: syllables.length ? syllables : [item.keyword.toLowerCase()],
      threshold: globalSensitivity,
      beep_duration: DEFAULT_BEEP_DURATION
    };
  });
  return {
    keywords,
    global_sensitivity: globalSensitivity
  };
}
