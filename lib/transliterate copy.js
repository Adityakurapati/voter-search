'use client'

// Simple English to Marathi (Devanagari) mapping
const englishToDevanagariMap = {
  'a': 'अ', 'aa': 'आ', 'i': 'इ', 'ee': 'ई', 'u': 'उ', 'oo': 'ऊ', 'ru': 'ऋ',
  'e': 'ए', 'ai': 'ऐ', 'o': 'ओ', 'au': 'औ', 'am': 'अं', 'aha': 'अः',
  'k': 'क', 'kh': 'ख', 'g': 'ग', 'gh': 'घ', 'ng': 'ङ',
  'ch': 'च', 'chh': 'छ', 'j': 'ज', 'jh': 'झ', 'ny': 'ञ',
  't': 'ट', 'th': 'ठ', 'd': 'ड', 'dh': 'ढ', 'n': 'ण',
  't': 'त', 'th': 'थ', 'd': 'द', 'dh': 'ध', 'n': 'न',
  'p': 'प', 'ph': 'फ', 'b': 'ब', 'bh': 'भ', 'm': 'म',
  'y': 'य', 'r': 'र', 'l': 'ल', 'v': 'व', 'w': 'व',
  'sh': 'श', 'sh': 'ष', 's': 'स', 'h': 'ह', 'ksh': 'क्ष', 'tr': 'त्र', 'gy': 'ज्ञ',
  'l': 'ळ'
};

// Vowel signs
const vowelSigns = {
  'a': '', 'aa': 'ा', 'i': 'ि', 'ee': 'ी', 'u': 'ु', 'oo': 'ू', 'ru': 'ृ',
  'e': 'े', 'ai': 'ै', 'o': 'ो', 'au': 'ौ', 'am': 'ं', 'aha': 'ः'
};

// Common names mapping for better accuracy
const commonNamesMap = {
  'badale': 'बधाले',
  'mangesh': 'मंगेश',
  'ramdas': 'रामदास',
  'patil': 'पाटील',
  'deshmukh': 'देशमुख',
  'jadhav': 'जाधव',
  'more': 'मोरे',
  'shinde': 'शिंदे',
  'pawar': 'पवार',
  'gaikwad': 'गायकवाड',
  'thakur': 'ठाकूर',
  'kamble': 'कांबळे',
  'chavan': 'चव्हाण',
  'raut': 'राऊत',
  'salunkhe': 'साळुंखे',
  'kokate': 'कोकाटे',
  'bhosale': 'भोसले',
  'ingle': 'इंगळे',
  'amrutkar': 'अमृतकर',
  'amol': 'अमोल',
  'suresh': 'सुरेश',
  'rakesh': 'राकेश',
  'mahesh': 'महेश',
  'dinesh': 'दिनेश',
  'gajanan': 'गजानन',
  'vitthal': 'विठ्ठल',
  'ganesh': 'गणेश',
  'shivaji': 'शिवाजी',
  'sanjay': 'संजय',
  'vijay': 'विजय',
  'ajay': 'अजय'
};

export function transliterateToMarathi(englishText) {
  if (!englishText) return '';
  
  const text = englishText.toLowerCase().trim();
  
  // First check common names for better accuracy
  const words = text.split(' ');
  
  return words.map(word => {
    // Check if this is a common name
    if (commonNamesMap[word]) {
      return commonNamesMap[word];
    }
    
    // Simple transliteration for other words
    let marathiWord = '';
    let i = 0;
    
    while (i < word.length) {
      // Check for two-character combinations first
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

// Main search function
export function searchVoter(data, searchText) {
  const results = [];
  
  if (!searchText || !data) return results;
  
  const searchQuery = searchText.trim().toLowerCase();
  
  function searchNode(node, path = []) {
    if (typeof node === 'object' && node !== null) {
      // Check if this is a voter object
      if (node.नाव || node.मतदार_ओळखपत्र_क्रमांक) {
        const voterName = node.नाव || '';
        const voterId = node.मतदार_ओळखपत्र_क्रमांक || '';
        const nameLower = voterName.toLowerCase();
        
        // Check for voter ID match
        if (voterId.toLowerCase().includes(searchQuery)) {
          results.push({
            ...node,
            path: path.join(' > '),
            matchType: 'voterId',
            matchScore: 100
          });
          return;
        }
        
        // Split search query into words
        const searchWords = searchQuery.split(' ').filter(w => w.length > 0);
        
        // Strategy 1: Exact phrase match
        if (nameLower.includes(searchQuery)) {
          results.push({
            ...node,
            path: path.join(' > '),
            matchType: 'exactPhrase',
            matchScore: 100
          });
          return;
        }
        
        // Strategy 2: All words match (any order)
        const allWordsMatch = searchWords.every(word => 
          nameLower.includes(word)
        );
        
        if (allWordsMatch && searchWords.length > 0) {
          results.push({
            ...node,
            path: path.join(' > '),
            matchType: 'allWords',
            matchScore: 90 - (searchWords.length * 5) // Slight penalty for more words
          });
          return;
        }
        
        // Strategy 3: Try transliterated search
        const transliteratedSearch = transliterateToMarathi(searchQuery);
        if (voterName.includes(transliteratedSearch)) {
          results.push({
            ...node,
            path: path.join(' > '),
            matchType: 'transliterated',
            matchScore: 95
          });
          return;
        }
        
        // Strategy 4: Partial word matches
        let matchedWords = 0;
        searchWords.forEach(word => {
          if (nameLower.includes(word)) {
            matchedWords++;
          }
          
          // Also check transliterated version
          const transliteratedWord = transliterateToMarathi(word);
          if (voterName.includes(transliteratedWord)) {
            matchedWords++;
          }
        });
        
        if (matchedWords > 0) {
          const score = Math.min(80, matchedWords * 25);
          results.push({
            ...node,
            path: path.join(' > '),
            matchType: 'partial',
            matchScore: score
          });
        }
        
      } else {
        // Recursively search child properties
        Object.entries(node).forEach(([key, value]) => {
          searchNode(value, [...path, key]);
        });
      }
    }
  }
  
  searchNode(data);
  
  // Remove duplicates (same voter might match multiple times)
  const uniqueResults = results.reduce((acc, current) => {
    const x = acc.find(item => item.मतदार_ओळखपत्र_क्रमांक === current.मतदार_ओळखपत्र_क्रमांक);
    if (!x) {
      return acc.concat([current]);
    } else {
      // Keep the highest score
      if (current.matchScore > x.matchScore) {
        acc = acc.filter(item => item.मतदार_ओळखपत्र_क्रमांक !== current.मतदार_ओळखपत्र_क्रमांक);
        return acc.concat([current]);
      }
    }
    return acc;
  }, []);
  
  // Sort by match score (highest first)
  return uniqueResults.sort((a, b) => b.matchScore - a.matchScore);
}

// Function to highlight matched text in results
export function highlightMatches(text, searchTerms) {
  if (!text || !searchTerms) return text;
  
  let highlighted = text;
  
  // Create array of search terms (both English and possible Marathi)
  const allSearchTerms = [...searchTerms];
  
  // Add transliterated versions
  searchTerms.forEach(term => {
    const transliterated = transliterateToMarathi(term);
    if (transliterated && transliterated !== term) {
      allSearchTerms.push(transliterated);
    }
  });
  
  // Remove duplicates
  const uniqueTerms = [...new Set(allSearchTerms)];
  
  // Highlight each term
  uniqueTerms.forEach(term => {
    if (term && term.length > 1) {
      const regex = new RegExp(`(${term})`, 'gi');
      highlighted = highlighted.replace(regex, '<mark>$1</mark>');
    }
  });
  
  return highlighted;
}