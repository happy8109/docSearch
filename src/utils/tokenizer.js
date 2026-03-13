let jieba = null;
let useJieba = false;

// 尝试加载 @node-rs/jieba，在不支持的平台上（如 Windows 7）自动降级
try {
  const { Jieba } = require('@node-rs/jieba');
  jieba = new Jieba();
  useJieba = true;
} catch (err) {
  console.warn('[Tokenizer] @node-rs/jieba 加载失败，已切换为内置兼容分词模式。');
  console.warn(`[Tokenizer] 原因: ${err.message}`);
}

/**
 * 内置的兼容分词器（Bigram + 单字切分）。
 * 当 @node-rs/jieba 原生模块无法在当前操作系统上加载时，
 * 采用 CJK 字符逐字 + 连续双字组合的方式生成索引词元。
 * 虽然精度低于结巴分词，但仍能保证中文搜索可用。
 */
function fallbackTokenize(text) {
  if (!text) return '';
  const tokens = [];
  // 按非 CJK 字符分割，将英文/数字保留为完整 token
  const segments = text.split(/([a-zA-Z0-9]+)/);

  for (const seg of segments) {
    const trimmed = seg.trim();
    if (!trimmed) continue;

    if (/^[a-zA-Z0-9]+$/.test(trimmed)) {
      // 英文/数字直接作为整体 token
      tokens.push(trimmed.toLowerCase());
    } else {
      // CJK 字符：生成单字 + 双字组合（Bigram）
      const chars = [...trimmed].filter(c => c.trim());
      for (let i = 0; i < chars.length; i++) {
        tokens.push(chars[i]);
        if (i + 1 < chars.length) {
          tokens.push(chars[i] + chars[i + 1]);
        }
      }
    }
  }
  return tokens.join(' ');
}

/**
 * Tokenize string for SQLite FTS5 matching.
 * SQLite FTS5 uses a space to separate tokens.
 */
function tokenize(text) {
  if (!text) return '';
  if (useJieba) {
    const words = jieba.cutForSearch(text);
    return words.join(' ');
  }
  return fallbackTokenize(text);
}

module.exports = { tokenize };
