
export const BMOB_CONFIG = {
  APP_ID: "06a8f4b97148692421ca4d38c8214cba",
  REST_API_KEY: "5e455819e308e43b2c651773599ff0b2",
};

// Ed25519 公钥 (用于离线验证) - 模拟主权级密钥
export const ACTIVATION_PUBLIC_KEY = "3b6a27bcceb6a42d62a3a8d02a6f0d73653215771de243a63ac048a18b59da29";

export const TRIAL_LIMIT = 5;
export const SESSION_LIMIT = 180; // 3分钟秒数

/** Phase 0: 变体相似度阈值默认值 (同音/近音匹配) */
export const DEFAULT_SIMILARITY_THRESHOLD = 0.85;
/** Bridge 配置下发的默认哔声时长 ms */
export const DEFAULT_BEEP_DURATION = 200;

export const COLORS = {
  GOLD: "#D4AF37",
  PLATINUM: "#E5E4E2",
  OBSIDIAN: "#1A1A1B",
  WHITE: "#FCFCFD",
  ERROR: "#FF4D4D",
  SUCCESS: "#00E676"
};
