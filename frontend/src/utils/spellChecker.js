// Comprehensive AI Spell, Grammar & Punctuation Normalizer

export const COMMON_SPELL_RULES = [
  // Developer & Technical Vocabulary
  { regex: /\b(?:pythun|pythan|pithon|pyton)\b/gi, replacement: 'Python' },
  { regex: /\b(?:esquel|esql|sq\s*l)\b/gi, replacement: 'SQL' },
  { regex: /\b(?:javascrip|jawascript|jscript)\b/gi, replacement: 'JavaScript' },
  { regex: /\b(?:sofware|softwere|soffware)\b/gi, replacement: 'software' },
  { regex: /\b(?:databse|data\s*base)\b/gi, replacement: 'database' },
  { regex: /\b(?:subtital|subtitel|subtitele|subtitels)\b/gi, replacement: 'subtitles' },
  { regex: /\b(?:vedio|vidio)\b/gi, replacement: 'video' },
  { regex: /\b(?:youtube|youtub)\b/gi, replacement: 'YouTube' },
  { regex: /\b(?:github|git\s*hub)\b/gi, replacement: 'GitHub' },
  { regex: /\b(?:frontend|front\s*end)\b/gi, replacement: 'frontend' },
  { regex: /\b(?:backend|back\s*end)\b/gi, replacement: 'backend' },
  { regex: /\b(?:api's|apis)\b/gi, replacement: 'APIs' },
  { regex: /\b(?:html|htmll)\b/gi, replacement: 'HTML' },
  { regex: /\b(?:css3|css)\b/gi, replacement: 'CSS' },

  // Frequent English Typos & Misspellings
  { regex: /\brecieve\b/gi, replacement: 'receive' },
  { regex: /\brecieved\b/gi, replacement: 'received' },
  { regex: /\brecieving\b/gi, replacement: 'receiving' },
  { regex: /\bseperate\b/gi, replacement: 'separate' },
  { regex: /\bseperately\b/gi, replacement: 'separately' },
  { regex: /\bdefinately\b/gi, replacement: 'definitely' },
  { regex: /\boccured\b/gi, replacement: 'occurred' },
  { regex: /\buntill\b/gi, replacement: 'until' },
  { regex: /\balot\b/gi, replacement: 'a lot' },
  { regex: /\btrancribe\b/gi, replacement: 'transcribe' },
  { regex: /\btrancription\b/gi, replacement: 'transcription' },
  { regex: /\bteh\b/gi, replacement: 'the' },
  { regex: /\bwhta\b/gi, replacement: 'what' },
  { regex: /\btomorow\b/gi, replacement: 'tomorrow' },
  { regex: /\btommorow\b/gi, replacement: 'tomorrow' },
  { regex: /\bneccessary\b/gi, replacement: 'necessary' },

  // Telugu Phonetic Latin Script & Transliteration Corrections
  { regex: /\bnaino\b/gi, replacement: 'nenu' },
  { regex: /\bnage\s*ko\s*ali\b/gi, replacement: 'nerchukovali' },
  { regex: /\bnagekoali\b/gi, replacement: 'nerchukovali' },
  { regex: /\bhai\b/gi, replacement: 'Hi' },
  { regex: /\bnamaskaram\b/gi, replacement: 'Namaskaram' },
  { regex: /\bdhanyavadalu\b/gi, replacement: 'Dhanyavadalu' },
  { regex: /\bbagunara\b/gi, replacement: 'bagunnara' }
];

/**
 * Clean, spell-check, and fix capitalization and punctuation for a single subtitle string.
 */
export function cleanAndFixSubtitleText(text, lang = 'en') {
  if (!text || typeof text !== 'string') return text || '';

  let cleaned = text;

  // Apply common spelling and vocabulary rules
  for (const rule of COMMON_SPELL_RULES) {
    cleaned = cleaned.replace(rule.regex, rule.replacement);
  }

  // Normalize punctuation spacing: remove space before punctuation, ensure space after
  cleaned = cleaned.replace(/\s+([,.:;?!])/g, '$1');
  cleaned = cleaned.replace(/([,.:;?!])([^\s\d"'’”\)\]])/g, '$1 $2');

  // Collapse multiple spaces
  cleaned = cleaned.replace(/[ \t]+/g, ' ');

  // Auto-capitalize first letter of sentence if English/Latin script
  if (!/^[^\x00-\x7F]/.test(cleaned) && cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  return cleaned.trim();
}

/**
 * Batch clean and fix spelling for all subtitle segments.
 */
export function fixAllSubtitleSegments(segments, lang = 'en') {
  if (!Array.isArray(segments)) return [];
  return segments.map(seg => ({
    ...seg,
    text: cleanAndFixSubtitleText(seg.text, lang)
  }));
}
