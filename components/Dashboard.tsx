import React, { useState, useEffect } from 'react';
import { ref, get } from 'firebase/database';
import { db } from '../lib/firebase';
import { transliterateToMarathi, containsMarathi } from '../lib/transliterate';

// Types
interface VoterData {
  full_name: string;
  name_parts: {
    last: string;
    first: string;
    middle: string;
  };
  search_tokens: { [key: string]: string }; // Firebase array format
  gender: string;
  age: number;
  reference: string;
}

interface VoterModalProps {
  voter: VoterData & { id: string };
  onClose: () => void;
}

// Helper to convert Firebase array object to regular array
const firebaseArrayToArray = (firebaseArray: { [key: string]: string }): string[] => {
  if (!firebaseArray) return [];
  return Object.values(firebaseArray);
};

// Firebase search function
const searchVotersInFirebase = async (searchText: string): Promise<Array<{id: string, data: VoterData}>> => {
  try {
    if (!searchText.trim()) {
      return [];
    }

    const searchQuery = searchText.trim();
    const searchLower = searchQuery.toLowerCase();
    const isMarathi = containsMarathi(searchQuery);
    const transliteratedQuery = isMarathi ? searchQuery : transliterateToMarathi(searchLower);
    
    // Get all voters once and filter locally
    const votersRef = ref(db, 'voters');
    const snapshot = await get(votersRef);
    
    if (!snapshot.exists()) {
      return [];
    }
    
    const voters = snapshot.val();
    const results: Array<{id: string, data: VoterData}> = [];
    
    Object.entries(voters).forEach(([id, voterData]: [string, any]) => {
      const voter = voterData as VoterData;
      
      // Check voter ID
      if (id.toLowerCase().includes(searchLower)) {
        results.push({ id, data: voter });
        return;
      }
      
      // Check full name
      const fullName = voter.full_name?.toLowerCase() || '';
      if (fullName.includes(searchLower) || 
          (!isMarathi && fullName.includes(transliteratedQuery))) {
        results.push({ id, data: voter });
        return;
      }
      
      // Check search tokens (convert Firebase array object to array)
      const searchTokens = firebaseArrayToArray(voter.search_tokens || {});
      const hasTokenMatch = searchTokens.some((token: string) => {
        const tokenLower = token.toLowerCase();
        return tokenLower.includes(searchLower) || 
               (!isMarathi && tokenLower.includes(transliteratedQuery));
      });
      
      if (hasTokenMatch) {
        results.push({ id, data: voter });
        return;
      }
      
      // Check name parts
      const nameParts = voter.name_parts || {};
      const firstName = (nameParts.first || '').toLowerCase();
      const middleName = (nameParts.middle || '').toLowerCase();
      const lastName = (nameParts.last || '').toLowerCase();
      
      // Search in individual name parts
      if (firstName.includes(searchLower) || 
          (!isMarathi && firstName.includes(transliteratedQuery)) ||
          middleName.includes(searchLower) ||
          (!isMarathi && middleName.includes(transliteratedQuery)) ||
          lastName.includes(searchLower) ||
          (!isMarathi && lastName.includes(transliteratedQuery))) {
        results.push({ id, data: voter });
        return;
      }
      
      // Search combined name parts
      const combinedNames = [
        firstName,
        middleName,
        lastName,
        `${firstName} ${middleName}`,
        `${firstName} ${lastName}`,
        `${middleName} ${lastName}`,
        `${firstName} ${middleName} ${lastName}`
      ];
      
      const hasCombinedMatch = combinedNames.some(name => 
        name.includes(searchLower) || 
        (!isMarathi && name.includes(transliteratedQuery))
      );
      
      if (hasCombinedMatch) {
        results.push({ id, data: voter });
      }
    });
    
    // Remove duplicates (same voter might match multiple times)
    const uniqueResults = results.filter((result, index, self) =>
      index === self.findIndex(r => r.id === result.id)
    );
    
    // Limit results to prevent overwhelming the user
    return uniqueResults.slice(0, 50);
    
  } catch (error) {
    console.error('Error searching in Firebase:', error);
    return [];
  }
};

const VoterModal: React.FC<VoterModalProps> = ({ voter, onClose }) => {
  const searchTokens = firebaseArrayToArray(voter.search_tokens);
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Modal Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{voter.full_name}</h2>
              <p className="text-gray-600 text-sm">Voter ID: {voter.id}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>

          {/* Voter Details */}
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-3">
                <span className="font-medium text-gray-700 block mb-1">Full Name:</span>
                <span className="text-gray-900 text-lg">{voter.full_name}</span>
              </div>
              
              <div>
                <span className="font-medium text-gray-700 block mb-1">First:</span>
                <span className="text-gray-900">{voter.name_parts.first}</span>
              </div>
              
              <div>
                <span className="font-medium text-gray-700 block mb-1">Middle:</span>
                <span className="text-gray-900">{voter.name_parts.middle}</span>
              </div>
              
              <div>
                <span className="font-medium text-gray-700 block mb-1">Last:</span>
                <span className="text-gray-900">{voter.name_parts.last}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-medium text-gray-700 block mb-1">Gender:</span>
                <span className={`px-3 py-1 rounded-full text-sm ${
                  voter.gender === 'पुरुष'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-pink-100 text-pink-800'
                }`}>
                  {voter.gender}
                </span>
              </div>
              
              <div>
                <span className="font-medium text-gray-700 block mb-1">Age:</span>
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                  {voter.age} years
                </span>
              </div>
            </div>
            
            <div>
              <span className="font-medium text-gray-700 block mb-1">Reference:</span>
              <span className="text-gray-900 bg-gray-50 p-3 rounded-lg block">
                {voter.reference}
              </span>
            </div>
            
            <div>
              <span className="font-medium text-gray-700 block mb-1">Search Tokens ({searchTokens.length}):</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {searchTokens.map((token, index) => (
                  <span 
                    key={index}
                    className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm"
                  >
                    {token}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-gray-50 px-6 py-4 sticky bottom-0">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Dashboard: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{id: string, data: VoterData}>>([]);
  const [selectedVoter, setSelectedVoter] = useState<{id: string, data: VoterData} | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [transliterationInfo, setTransliterationInfo] = useState<{isMarathi: boolean, transliterated: string} | null>(null);

  // Debounced search effect
  useEffect(() => {
    const searchVoters = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        setSearchPerformed(false);
        setTransliterationInfo(null);
        return;
      }

      setIsLoading(true);
      try {
        const results = await searchVotersInFirebase(searchQuery);
        setSearchResults(results);
        setSearchPerformed(true);
        
        // Set transliteration info for display
        const isMarathi = containsMarathi(searchQuery);
        const transliterated = isMarathi ? searchQuery : transliterateToMarathi(searchQuery.toLowerCase());
        setTransliterationInfo({
          isMarathi,
          transliterated
        });
      } catch (error) {
        console.error('Error fetching voter data:', error);
        setSearchResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce the search to avoid too many API calls
    const timeoutId = setTimeout(searchVoters, 500);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [searchQuery]);

  const handleVoterSelect = (voter: {id: string, data: VoterData}) => {
    setSelectedVoter(voter);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Voter Search System
          </h1>
          <p className="text-gray-600">
            Search for voters by name or voter ID
          </p>
        </header>

        {/* Search Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="mb-4">
            <label htmlFor="voter-search" className="block text-gray-700 font-medium mb-2">
              Search Voters
            </label>
            <div className="relative">
              <input
                id="voter-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="बधाले दशरथ लक्ष्मण or Badale Dashrath Laxman or UXM7902273"
                className="w-full p-4 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                autoComplete="off"
                autoFocus
              />
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              {isLoading && (
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              )}
            </div>
            
            {/* Show transliteration info */}
            {transliterationInfo && (
              <div className="mt-2 text-sm">
                <p className="text-gray-600">
                  <span className="font-medium">Search type:</span> {transliterationInfo.isMarathi ? 'Marathi' : 'English'}
                  {!transliterationInfo.isMarathi && (
                    <span className="ml-4">
                      <span className="font-medium">Transliterated to:</span> {transliterationInfo.transliterated}
                    </span>
                  )}
                </p>
              </div>
            )}
            
            <div className="mt-3 text-sm text-gray-600">
              <p className="font-medium mb-1">Search in any format:</p>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  <span>Marathi: <span className="font-normal">बधाले दशरथ</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span>English: <span className="font-normal">Badale Dashrath</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                  <span>Voter ID: <span className="font-normal">UXM7902273</span></span>
                </div>
              </div>
            </div>
          </div>

          {/* Search Results */}
          {searchPerformed && !isLoading && (
            <div className="mt-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium text-gray-700">
                  Results ({searchResults.length})
                </h3>
                {searchResults.length > 0 && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                      setSearchPerformed(false);
                      setTransliterationInfo(null);
                    }}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Clear Search
                  </button>
                )}
              </div>
              
              {searchResults.length === 0 ? (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                  <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-lg">No voters found for "{searchQuery}"</p>
                  <p className="text-sm mt-1">Try a different name or voter ID</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {searchResults.map((result) => (
                    <div
                      key={result.id}
                      onClick={() => handleVoterSelect(result)}
                      className="p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="font-medium text-gray-800 text-lg">
                              {result.data.full_name}
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-xs ${
                              result.data.gender === 'पुरुष'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-pink-100 text-pink-800'
                            }`}>
                              {result.data.gender}
                            </span>
                            <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs">
                              {result.data.age} yrs
                            </span>
                          </div>
                          <div className="text-gray-600 text-sm space-y-1">
                            <div className="flex items-center gap-4">
                              <span className="font-mono text-gray-800 bg-gray-100 px-2 py-0.5 rounded">
                                {result.id}
                              </span>
                            </div>
                            <div className="text-gray-500">
                              {result.data.reference}
                            </div>
                          </div>
                        </div>
                        <button className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm whitespace-nowrap">
                          View
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Search Examples */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <button
            onClick={() => setSearchQuery('बधाले दशरथ लक्ष्मण')}
            className="p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all text-left"
          >
            <div className="font-medium text-gray-800 mb-1">मराठी नाव</div>
            <div className="text-sm text-gray-600">बधाले दशरथ लक्ष्मण</div>
          </button>
          
          <button
            onClick={() => setSearchQuery('Badale Dashrath Laxman')}
            className="p-4 bg-white border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-all text-left"
          >
            <div className="font-medium text-gray-800 mb-1">English Name</div>
            <div className="text-sm text-gray-600">Badale Dashrath Laxman</div>
          </button>
          
          <button
            onClick={() => setSearchQuery('UXM7902273')}
            className="p-4 bg-white border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all text-left"
          >
            <div className="font-medium text-gray-800 mb-1">Voter ID</div>
            <div className="text-sm text-gray-600 font-mono">UXM7902273</div>
          </button>
        </div>

        {/* Search Tips */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-medium text-blue-800 mb-3 text-lg">How Search Works:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-blue-700 mb-2">What gets searched:</h4>
              <ul className="text-blue-600 space-y-1 text-sm">
                <li>• Full name (बधाले मंगेश रामदास)</li>
                <li>• First name (मंगेश)</li>
                <li>• Middle name (रामदास)</li>
                <li>• Last name (बधाले)</li>
                <li>• Search tokens (pre-defined variations)</li>
                <li>• Voter ID (UXM8227381)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-blue-700 mb-2">Features:</h4>
              <ul className="text-blue-600 space-y-1 text-sm">
                <li>• Automatic English to Marathi conversion</li>
                <li>• Partial name matching</li>
                <li>• No need for exact spelling</li>
                <li>• Search in any language</li>
                <li>• Case-insensitive search</li>
                <li>• Fast real-time results</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Voter Details Modal */}
      {selectedVoter && (
        <VoterModal
          voter={{
            id: selectedVoter.id,
            ...selectedVoter.data
          }}
          onClose={() => setSelectedVoter(null)}
        />
      )}
    </div>
  );
};

export default Dashboard;