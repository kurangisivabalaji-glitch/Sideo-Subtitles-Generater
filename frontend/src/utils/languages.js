export const SUPPORTED_LANGUAGES = [
  { code: 'auto', name: 'Auto Detect Language', native: '✨ Automatic AI Detection', rtl: false },
  { code: 'te', name: 'Telugu', native: 'తెలుగు', rtl: false, flag: '🇮🇳' },
  { code: 'en', name: 'English', native: 'English', rtl: false, flag: '🇺🇸' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', rtl: false, flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்', rtl: false, flag: '🇮🇳' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', rtl: false, flag: '🇮🇳' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം', rtl: false, flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা', rtl: false, flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi', native: 'मराठी', rtl: false, flag: '🇮🇳' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ', rtl: false, flag: '🇮🇳' },
  { code: 'ur', name: 'Urdu', native: 'اردو', rtl: true, flag: '🇵🇰' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી', rtl: false, flag: '🇮🇳' },
  { code: 'ar', name: 'Arabic', native: 'العربية', rtl: true, flag: '🇸🇦' },
  { code: 'es', name: 'Spanish', native: 'Español', rtl: false, flag: '🇪🇸' },
  { code: 'fr', name: 'French', native: 'Français', rtl: false, flag: '🇫🇷' },
  { code: 'de', name: 'German', native: 'Deutsch', rtl: false, flag: '🇩🇪' },
  { code: 'zh', name: 'Chinese', native: '中文', rtl: false, flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', native: '日本語', rtl: false, flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', native: '한국어', rtl: false, flag: '🇰🇷' },
  { code: 'pt', name: 'Portuguese', native: 'Português', rtl: false, flag: '🇧🇷' },
  { code: 'ru', name: 'Russian', native: 'Русский', rtl: false, flag: '🇷🇺' },
  { code: 'it', name: 'Italian', native: 'Italiano', rtl: false, flag: '🇮🇹' },
  { code: 'tr', name: 'Turkish', native: 'Türkçe', rtl: false, flag: '🇹🇷' },
  { code: 'nl', name: 'Dutch', native: 'Nederlands', rtl: false, flag: '🇳🇱' },
  { code: 'id', name: 'Indonesian', native: 'Bahasa Indonesia', rtl: false, flag: '🇮🇩' },
  { code: 'vi', name: 'Vietnamese', native: 'Tiếng Việt', rtl: false, flag: '🇻🇳' },
  { code: 'th', name: 'Thai', native: 'ไทย', rtl: false, flag: '🇹🇭' },
  { code: 'fa', name: 'Persian', native: 'فارسی', rtl: true, flag: '🇮🇷' },
  { code: 'he', name: 'Hebrew', native: 'עברית', rtl: true, flag: '🇮🇱' },
  { code: 'pl', name: 'Polish', native: 'Polski', rtl: false, flag: '🇵🇱' },
  { code: 'uk', name: 'Ukrainian', native: 'Українська', rtl: false, flag: '🇺🇦' },
  { code: 'el', name: 'Greek', native: 'Ελληνικά', rtl: false, flag: '🇬🇷' },
  { code: 'sv', name: 'Swedish', native: 'Svenska', rtl: false, flag: '🇸🇪' },
  { code: 'cs', name: 'Czech', native: 'Čeština', rtl: false, flag: '🇨🇿' },
  { code: 'ro', name: 'Romanian', native: 'Română', rtl: false, flag: '🇷🇴' },
  { code: 'hu', name: 'Hungarian', native: 'Magyar', rtl: false, flag: '🇭🇺' },
  { code: 'da', name: 'Danish', native: 'Dansk', rtl: false, flag: '🇩🇰' },
  { code: 'fi', name: 'Finnish', native: 'Suomi', rtl: false, flag: '🇫🇮' },
  { code: 'no', name: 'Norwegian', native: 'Norsk', rtl: false, flag: '🇳🇴' },
  { code: 'ms', name: 'Malay', native: 'Bahasa Melayu', rtl: false, flag: '🇲🇾' },
];

export function getLanguageName(code) {
  if (!code) return 'Unknown';
  const found = SUPPORTED_LANGUAGES.find(l => l.code.toLowerCase() === code.toLowerCase());
  return found ? found.name : code.toUpperCase();
}

export function isLanguageRtl(code) {
  if (!code) return false;
  const found = SUPPORTED_LANGUAGES.find(l => l.code.toLowerCase() === code.toLowerCase());
  return found ? found.rtl : false;
}
