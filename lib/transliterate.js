import { transliterate as tr } from 'indic-transliteration';

export function transliterateToMarathi(englishText) {
  if (!englishText) return '';
  
  return tr(englishText, 'devanagari');
}

export function searchVoter(data, searchQuery) {
  // Convert search query to Marathi for searching
  const marathiQuery = transliterateToMarathi(searchQuery.toLowerCase());
  
  const results = [];
  
  // Recursive search through the data structure
  function searchNode(node, path = []) {
    if (typeof node === 'object' && node !== null) {
      // Check if this is a voter object
      if (node.नाव || node.मतदार_ओळखपत्र_क्रमांक) {
        const voterName = node.नाव || '';
        const voterId = node.मतदार_ओळखपत्र_क्रमांक || '';
        
        // Search in name or voter ID
        if (voterName.toLowerCase().includes(marathiQuery) || 
            voterId.toLowerCase().includes(searchQuery.toLowerCase())) {
          results.push({
            ...node,
            path: path.join(' > ')
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
  return results;
}