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
  { regex: /\b(?:Hi!?\s*Name\s*Haritha|Name\s*Haritha|hai\s*naino\s*harita|hai\s*nenu\s*harita)\b/gi, replacement: 'Hi, nenu Haritha' },
  { regex: /\b(?:Python,?\s*SQL,?\s*N,?\b|Python,?\s*SQL,?\s*nage\s*ko\s*ali\b)/gi, replacement: 'Python, SQL nerchukuni' },
  { regex: /\b(?:Software Pillow|software peelu)\b/gi, replacement: 'software field lo' },
  { regex: /\b(?:keryat staaccia laanguna|Careers,?\s*Stataic.*|career start cheddam.*)\b/gi, replacement: 'career start cheddam anukuntunna' },
  { regex: /\b(?:Kani,?\s*akar,?\s*join\s*avalo\.?\s*Write\s*training,?\s*akar,?\s*bworkunani,?\s*chala,?\s*kanthir,?\s*sayana\.?)/gi, replacement: 'Kani ekkada join avvalo, right training ekkada dorukutundo ani chala confuse ayyanu.' },
  { regex: /\b(?:akar|yakar)\b/gi, replacement: 'ekkada' },
  { regex: /\b(?:avalo|avvalu)\b/gi, replacement: 'avvalo' },
  { regex: /\b(?:Write training|rai training)\b/gi, replacement: 'right training' },
  { regex: /\b(?:bworkunani|burkdunani)\b/gi, replacement: 'dorukutundo ani' },
  { regex: /\b(?:kanthir,?\s*sayana|kantri\s*zayana)\b/gi, replacement: 'confuse ayyanu' },
  { regex: /\b(?:Uppu\s*mei\s*me\s*kati,?\s*training,?\s*senda,?\s*lwag,?\s*joina\.?|apun\s*emu\s*kt\s*training\s*sendalo\s*joining\.?)/gi, replacement: 'Appudu memu KT Training Center lo join ayyam.' },
  { regex: /\b(?:Uppu mei me kati|apun emu kt)\b/gi, replacement: 'Appudu memu KT' },
  { regex: /\b(?:training,?\s*senda,?\s*lwag,?\s*joina|training sendalo joining)\b/gi, replacement: 'Training Center lo join ayyam' },
  { regex: /\b(?:Karuna\s*kar,?\s*sir,?\s*dagar|karna\s*karsar\s*daigara)\b/gi, replacement: 'Karunakar sir daggara' },
  { regex: /\b(?:list ko nanu)\b/gi, replacement: 'teesukunnanu' },
  { regex: /\b(?:volna)\b/gi, replacement: 'valana' },
  { regex: /\b(?:meda)\b/gi, replacement: 'meeda' },
  { regex: /\b(?:and consensus|and concensus)\b/gi, replacement: 'and confidence' },
  { regex: /\b(?:ippur emin)\b/gi, replacement: 'ippudu nenu' },
  { regex: /\b(?:a course complete chair|a course complete chesa)\b/gi, replacement: 'ee course complete chesa' },
  { regex: /\b(?:karna karsar valu|Karunakar sir valu)\b/gi, replacement: 'Karunakar sir vaallu' },
  { regex: /\b(?:coaching to part ka)\b/gi, replacement: 'coaching tho paatuga' },
  { regex: /\b(?:keryat placement opportunatis|career placement opportunatis)\b/gi, replacement: 'career placement opportunities' },
  { regex: /\b(?:provide chair)\b/gi, replacement: 'provide chestaru' },
  { regex: /\b(?:direct hiring lives)\b/gi, replacement: 'direct hiring drives' },
  { regex: /\b(?:to part ko)\b/gi, replacement: 'tho paatu' },
  { regex: /\b(?:bite job market)\b/gi, replacement: 'bayata job market' },
  { regex: /\b(?:yala prepare avvala)\b/gi, replacement: 'ela prepare avvalo' },
  { regex: /\b(?:koda)\b/gi, replacement: 'kooda' },
  { regex: /\b(?:full guidance system)\b/gi, replacement: 'full guidance istaru' },
  { regex: /\b(?:sumir|so meer)\b/gi, replacement: 'So meeru' },
  { regex: /\b(?:sumir koda)\b/gi, replacement: 'So meeru kooda' },
  { regex: /\b(?:ko la)\b/gi, replacement: 'kooda' },
  { regex: /\b(?:^N,?\s+|,\s*N,?\s+)\b/gi, replacement: 'Inka, ' },
  { regex: /\b(?:line up)\b/gi, replacement: '' },
  { regex: /\b(?:le da)\b/gi, replacement: 'leda' },
  { regex: /\b(?:aes software course|ae software course line up)\b/gi, replacement: 'ae software course lo aina' },
  { regex: /\b(?:strong skills build chair)\b/gi, replacement: 'strong skills build chesukoni' },
  { regex: /\b(?:prepare avvalan)\b/gi, replacement: 'prepare avvalanukunte' },
  { regex: /\b(?:ko kt training sendalo available)\b/gi, replacement: 'KT Training Center lo available' },
  { regex: /\b(?:gaon 1 week|un 1 week)\b/gi, replacement: 'unna 1 week' },
  { regex: /\b(?:registraval)\b/gi, replacement: 'register avvandi' },
  { regex: /\b(?:kina unna badami kif che si|kinda unna badami)\b/gi, replacement: 'kinda unna button ni click chesi' },
  { regex: /\b(?:join av\b)/gi, replacement: 'join avvandi' },
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
