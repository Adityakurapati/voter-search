'use client'

// Enhanced English to Marathi (Devanagari) mapping
const englishToDevanagariMap = {
  // Vowels
  'a': 'अ', 'aa': 'आ', 'i': 'इ', 'ee': 'ई', 'u': 'उ', 'oo': 'ऊ',
  'e': 'ए', 'ai': 'ऐ', 'o': 'ओ', 'au': 'औ',
  
  // Consonants
  'k': 'क', 'kh': 'ख', 'g': 'ग', 'gh': 'घ', 'ng': 'ङ',
  'ch': 'च', 'chh': 'छ', 'j': 'ज', 'jh': 'झ', 'ny': 'ञ',
  't': 'ट', 'th': 'ठ', 'd': 'ड', 'dh': 'ढ', 'n': 'ण',
  't': 'त', 'th': 'थ', 'd': 'द', 'dh': 'ध', 'n': 'न',
  'p': 'प', 'ph': 'फ', 'b': 'ब', 'bh': 'भ', 'm': 'म',
  'y': 'य', 'r': 'र', 'l': 'ल', 'v': 'व', 'w': 'व',
  'sh': 'श', 'ss': 'ष', 's': 'स', 'h': 'ह',
  'l': 'ळ',
  
  // Combined consonants
  'ksh': 'क्ष', 'tr': 'त्र', 'gy': 'ज्ञ',
  
  // Vowel signs (for conjuncts)
  'aa': 'ा', 'i': 'ि', 'ee': 'ी', 'u': 'ु', 'oo': 'ू',
  'e': 'े', 'ai': 'ै', 'o': 'ो', 'au': 'ौ',
  
  // Special characters
  'm': 'ं', 'h': 'ः'
};

// Common names and surnames mapping
const commonNamesMap = {
  // Surnames
  'badale': 'बधाले', 'patil': 'पाटील',
  'deshmukh': 'देशमुख', 'jadhav': 'जाधव', 'more': 'मोरे',
  'shinde': 'शिंदे', 'pawar': 'पवार', 'gaikwad': 'गायकवाड',
  'thakur': 'ठाकूर', 'kamble': 'कांबळे', 'chavan': 'चव्हाण',
  'raut': 'राऊत', 'salunkhe': 'साळुंखे', 'kokate': 'कोकाटे',
  'bhosale': 'भोसले', 'ingle': 'इंगळे', 'amrutkar': 'अमृतकर',
  
  // First names
  'amol': 'अमोल', 'suresh': 'सुरेश', 'rakesh': 'राकेश',
  'mahesh': 'महेश', 'dinesh': 'दिनेश', 'gajanan': 'गजानन',
  'vitthal': 'विठ्ठल', 'ganesh': 'गणेश', 'shivaji': 'शिवाजी',
  'sanjay': 'संजय', 'vijay': 'विजय', 'ajay': 'अजय',
  'ram': 'राम', 'krishna': 'कृष्ण', 'shiva': 'शिव',
  
  // Middle names
  'dashrath': 'दशरथ', 'laxman': 'लक्ष्मण', 'ramdas': 'रामदास',
  'madhav': 'माधव', 'shankar': 'शंकर', 'vishnu': 'विष्णु',
  'bharat': 'भरत', 'shatrughan': 'शत्रुघ्न', 'hanuman': 'हनुमान',
  
  // Names from your data
  'mangesh': 'मंगेश', 'jijabai': 'जिजाबाई', 'vilas': 'विलास',
  'datta': 'दत्ता', 'sopan': 'सोपान', 'rohidas': 'रोहिदास',
  'ramchandra': 'रामचंद्र', 'madhukar': 'मधुकर',
  
  // Women names
  'savitri': 'सावित्री', 'laxmi': 'लक्ष्मी',
  'saraswati': 'सरस्वती', 'parvati': 'पार्वती', 'radha': 'राधा',
  'sita': 'सीता', 'ganga': 'गंगा', 'yamuna': 'यमुना'
};

export function transliterateToMarathi(englishText) {
  if (!englishText) return '';
  
  const text = englishText.toLowerCase().trim();
  
  // First check for common names and surnames
  const words = text.split(/\s+/);
  
  return words.map(word => {
    // Check if this is a common name
    if (commonNamesMap[word]) {
      return commonNamesMap[word];
    }
    
    // Simple transliteration for other words
    let marathiWord = '';
    let i = 0;
    
    while (i < word.length) {
      // Check for three-character combinations first
      if (i + 2 < word.length) {
        const threeChars = word.substring(i, i + 3);
        if (englishToDevanagariMap[threeChars]) {
          marathiWord += englishToDevanagariMap[threeChars];
          i += 3;
          continue;
        }
      }
      
      // Check for two-character combinations
      if (i + 1 < word.length) {
        const twoChars = word.substring(i, i + 2);
        if (englishToDevanagariMap[twoChars]) {
          marathiWord += englishToDevanagariMap[twoChars];
          i += 2;
          continue;
        }
      }
      
      // Check single character
      const singleChar = word[i];
      if (englishToDevanagariMap[singleChar]) {
        marathiWord += englishToDevanagariMap[singleChar];
      } else {
        // If no mapping, keep the English character
        marathiWord += singleChar;
      }
      i++;
    }
    
    return marathiWord;
  }).join(' ');
}

// Helper function to check if text contains Marathi characters
export function containsMarathi(text) {
  const marathiRange = /[\u0900-\u097F]/;
  return marathiRange.test(text);
}

// Helper to convert Firebase array object to regular array
export function firebaseArrayToArray(firebaseArray) {
  if (!firebaseArray || typeof firebaseArray !== 'object') return [];
  return Object.values(firebaseArray);
}