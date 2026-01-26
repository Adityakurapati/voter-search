// Simple English to Marathi transliteration mapping
const transliterationMap: { [key: string]: string } = {
  // Vowels
  'a': 'अ', 'aa': 'आ', 'i': 'इ', 'ii': 'ई', 'u': 'उ', 'uu': 'ऊ',
  'e': 'ए', 'ai': 'ऐ', 'o': 'ओ', 'au': 'औ',
  
  // Consonants
  'k': 'क', 'kh': 'ख', 'g': 'ग', 'gh': 'घ', 'ng': 'ङ',
  'ch': 'च', 'chh': 'छ', 'j': 'ज', 'jh': 'झ', 'ny': 'ञ',
  't': 'त', 'th': 'थ', 'd': 'द', 'dh': 'ध', 'n': 'न',
  'p': 'प', 'ph': 'फ', 'b': 'ब', 'bh': 'भ', 'm': 'म',
  'y': 'य', 'r': 'र', 'l': 'ल', 'v': 'व', 'w': 'व',
  's': 'स', 'sh': 'श', 'shh': 'ष', 'h': 'ह',
  
  // Additional consonants
  'tt': 'ट', 'tth': 'ठ', 'dd': 'ड', 'ddh': 'ढ', 'nn': 'ण',
  'ksh': 'क्ष', 'gy': 'ज्ञ',
  
  // Vowel signs (matras)
  'ka': 'क', 'ki': 'कि', 'kii': 'की', 'ku': 'कु', 'kuu': 'कू',
  'ke': 'के', 'kai': 'कै', 'ko': 'को', 'kau': 'कौ',
};

// Enhanced mapping for common Marathi names and words
const commonWordMap: { [key: string]: string } = {
  // Common first names
  'ankush': 'अंकुश',
  'ananda': 'आनंद',
  'sargar': 'सरगर',
  'dashrath': 'दशरथ',
  'usha': 'उषा',
  'ranjana': 'रंजना',
  'badhale': 'बधाले',
  'mangesh': 'मंगेश',
  'ramdas': 'रामदास',
  
  // Common surnames
  'patil': 'पाटील',
  'pawar': 'पवार',
  'kulkarni': 'कुलकर्णी',
  'deshmukh': 'देशमुख',
  'jadhav': 'जाधव',
  'more': 'मोरे',
  'shinde': 'शिंदे',
  'gaikwad': 'गायकवाड',
  'rao': 'राव',
  'reddy': 'रेड्डी',
  'bai': 'बाई',
  'devi': 'देवी',
};

/**
 * Check if text contains Marathi characters
 */
export const containsMarathi = (text: string): boolean => {
  return /[\u0900-\u097F]/.test(text);
};

/**
 * Transliterate English text to Marathi
 */
export const transliterateToMarathi = (englishText: string): string => {
  if (!englishText || containsMarathi(englishText)) {
    return englishText;
  }

  const text = englishText.toLowerCase().trim();
  
  // Split by spaces to handle multiple words
  const words = text.split(/\s+/);
  
  return words.map(word => {
    // Check if word exists in common word map first
    if (commonWordMap[word]) {
      return commonWordMap[word];
    }
    
    // Otherwise, do character-by-character transliteration
    return transliterateWord(word);
  }).join(' ');
};

/**
 * Transliterate a single word character by character
 */
const transliterateWord = (word: string): string => {
  let result = '';
  let i = 0;
  
  while (i < word.length) {
    let matched = false;
    
    // Try to match longer sequences first (3 chars, then 2, then 1)
    for (let len = 3; len >= 1; len--) {
      const substr = word.substr(i, len);
      if (transliterationMap[substr]) {
        result += transliterationMap[substr];
        i += len;
        matched = true;
        break;
      }
    }
    
    // If no match found, keep the original character
    if (!matched) {
      result += word[i];
      i++;
    }
  }
  
  return result;
};

/**
 * Add more common Marathi name mappings
 */
export const addCommonWordMapping = (english: string, marathi: string) => {
  commonWordMap[english.toLowerCase()] = marathi;
};

/**
 * Get all possible transliteration variations
 */
export const getTransliterationVariations = (text: string): string[] => {
  const variations = new Set<string>();
  
  // Add original text
  variations.add(text);
  
  // If already Marathi, return as is
  if (containsMarathi(text)) {
    return [text];
  }
  
  // Add transliterated version
  const transliterated = transliterateToMarathi(text);
  variations.add(transliterated);
  
  // Add lowercase version
  variations.add(text.toLowerCase());
  
  return Array.from(variations);
};