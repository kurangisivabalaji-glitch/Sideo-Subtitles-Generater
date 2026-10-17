// Comprehensive AI Spell, Grammar, Punctuation & Transcription Normalizer

export const COMMON_GRAMMAR_AND_SPELL_RULES = [
  // Developer & Technical Vocabulary (Case and spelling accuracy)
  { regex: /\b(?:python|pythun|pythan|pithon|pyton)\b/gi, replacement: 'Python' },
  { regex: /\b(?:sql|esquel|esql|sq\s*l)\b/gi, replacement: 'SQL' },
  { regex: /\b(?:javascript|javascrip|jawascript|jscript)\b/gi, replacement: 'JavaScript' },
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
  { regex: /\b(?:reactjs|react\s*js)\b/gi, replacement: 'React' },
  { regex: /\b(?:nodejs|node\s*js)\b/gi, replacement: 'Node.js' },

  // English Grammar: Pronouns, Contractions & Common Slips
  { regex: /\bi\b/g, replacement: 'I' },
  { regex: /\b(?:im|i'm)\b/gi, replacement: "I'm" },
  { regex: /\b(?:dont|don't)\b/gi, replacement: "don't" },
  { regex: /\b(?:cant|can't)\b/gi, replacement: "can't" },
  { regex: /\b(?:wont|won't)\b/gi, replacement: "won't" },
  { regex: /\b(?:didnt|didn't)\b/gi, replacement: "didn't" },
  { regex: /\b(?:doesnt|doesn't)\b/gi, replacement: "doesn't" },
  { regex: /\b(?:isnt|isn't)\b/gi, replacement: "isn't" },
  { regex: /\b(?:arent|aren't)\b/gi, replacement: "aren't" },
  { regex: /\b(?:wasnt|wasn't)\b/gi, replacement: "wasn't" },
  { regex: /\b(?:werent|weren't)\b/gi, replacement: "weren't" },
  { regex: /\b(?:youre|you're)\b/gi, replacement: "you're" },
  { regex: /\b(?:theyre|they're)\b/gi, replacement: "they're" },
  { regex: /\b(?:weve|we've)\b/gi, replacement: "we've" },
  { regex: /\b(?:youve|you've)\b/gi, replacement: "you've" },
  { regex: /\b(?:theyve|they've)\b/gi, replacement: "they've" },
  { regex: /\bcould of\b/gi, replacement: 'could have' },
  { regex: /\bshould of\b/gi, replacement: 'should have' },
  { regex: /\bwould of\b/gi, replacement: 'would have' },
  { regex: /\btheir is\b/gi, replacement: 'there is' },
  { regex: /\btheir are\b/gi, replacement: 'there are' },

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
  { regex: /\bharita\b/gi, replacement: 'Haritha' },
  { regex: /\bnage\s*ko\s*ali\b/gi, replacement: 'nerchukovali' },
  { regex: /\bnagekoali\b/gi, replacement: 'nerchukovali' },
  { regex: /\bhai\b/gi, replacement: 'Hi' },
  { regex: /\bnamaskaram\b/gi, replacement: 'Namaskaram' },
  { regex: /\bdhanyavadalu\b/gi, replacement: 'Dhanyavadalu' },
  { regex: /\bbagunara\b/gi, replacement: 'bagunnara' },
  { regex: /\bchesko\b/gi, replacement: 'chesuko' },
  { regex: /\bmatladtharu\b/gi, replacement: 'matladatharu' },
  { regex: /\bkanipisthundi\b/gi, replacement: 'kanipistundi' },
  { regex: /\bchoodandi\b/gi, replacement: 'chudandi' },
  { regex: /\bavuthundi\b/gi, replacement: 'avutundi' },
  { regex: /\bendhuku\b/gi, replacement: 'enduku' },
  { regex: /\beppudu\b/gi, replacement: 'ippudu' }
];

/**
 * Clean, spell-check, correct grammar, and normalize capitalization and punctuation for a single subtitle string.
 */
export function cleanAndFixSubtitleText(text, lang = 'en') {
  if (!text || typeof text !== 'string') return text || '';

  let cleaned = text.trim();

  // 1. Remove accidental double words (e.g. "the the" -> "the")
  cleaned = cleaned.replace(/\b(\w+)\s+\1\b/gi, '$1');

  // 2. Apply grammar, spelling, and vocabulary normalization rules
  for (const rule of COMMON_GRAMMAR_AND_SPELL_RULES) {
    cleaned = cleaned.replace(rule.regex, rule.replacement);
  }

  // 3. Normalize punctuation spacing: remove space before punctuation, ensure space after
  cleaned = cleaned.replace(/\s+([,.:;?!])/g, '$1');
  cleaned = cleaned.replace(/([,.:;?!])([^\s\d"'’”\)\]])/g, '$1 $2');

  // 4. Collapse multiple spaces
  cleaned = cleaned.replace(/[ \t]+/g, ' ');

  // 5. Auto-capitalize first letter of sentences
  if (!/^[^\x00-\x7F]/.test(cleaned) && cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    // Capitalize letters following sentence terminators (. ? !)
    cleaned = cleaned.replace(/([.?!]\s+)([a-z])/g, (_, p1, p2) => p1 + p2.toUpperCase());
  }

  return cleaned.trim();
}

/**
 * Batch clean and fix spelling and grammar for all subtitle segments.
 */
export function fixAllSubtitleSegments(segments, lang = 'en') {
  if (!Array.isArray(segments)) return [];
  return segments.map(seg => ({
    ...seg,
    text: cleanAndFixSubtitleText(seg.text, lang)
  }));
}
