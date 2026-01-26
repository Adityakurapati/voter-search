// Dashboard.tsx
import React, { useState, useCallback, useEffect } from 'react';
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
  gender: string;
  age: number;
  reference: string;
}

interface IndexEntry {
  [voterId: string]: boolean;
}

interface SearchResult {
  id: string;
  data: VoterData;
}

interface VoterModalProps {
  voter: VoterData & { id: string };
  onClose: () => void;
}

interface SearchFormData {
  firstName: string;
  middleName: string;
  lastName: string;
  voterId: string;
}

// Check if search is likely a Voter ID (alphanumeric with pattern)
const isVoterIdSearch = (text: string): boolean => {
  const trimmed = text.trim();
  const voterIdPattern = /^[A-Z0-9]{6,12}$/i;
  return voterIdPattern.test(trimmed);
};

// Generate search keys in hierarchical order
const generateSearchKeys = (firstName: string, middleName: string, lastName: string): string[] => {
  const keys: string[] = [];

  // Clean and transliterate inputs
  const first = transliterateToMarathi(firstName.trim());
  const middle = transliterateToMarathi(middleName.trim());
  const last = transliterateToMarathi(lastName.trim());

  // Only generate keys for non-empty fields
  if (first && middle && last) {
    // Priority 1: Exact full name (last_first_middle)
    keys.push(`${last}_${first}_${middle}`);
  }

  if (first && last) {
    // Priority 2: Last_First combination
    keys.push(`${last}_${first}`);
  }

  if (first && middle) {
    // Priority 3: First_Middle combination
    keys.push(`${first}_${middle}`);
  }

  if (last) {
    // Priority 4: Last name only
    keys.push(last);
  }

  if (first) {
    // Priority 5: First name only
    keys.push(first);
  }

  if (middle) {
    // Priority 6: Middle name only
    keys.push(middle);
  }

  return keys;
};

// Search using hierarchical index approach
const searchByNameInIndex = async (
  firstName: string,
  middleName: string,
  lastName: string
): Promise<string[]> => {
  try {
    const searchKeys = generateSearchKeys(firstName, middleName, lastName);
    const voterIds = new Set<string>();

    // Define search hierarchy - search in order until we find results
    const indexes = ['name_index', 'name_index_last_first', 'name_index_last'];

    for (const indexName of indexes) {
      for (const key of searchKeys) {
        try {
          const indexRef = ref(db, `${indexName}/${key}`);
          const snapshot = await get(indexRef);

          if (snapshot.exists()) {
            const indexData: IndexEntry = snapshot.val();
            Object.keys(indexData).forEach(id => voterIds.add(id));

            // If we found results in a more specific index, stop searching
            // Example: if we found in name_index (exact match), don't search broader indexes
            if (indexName === 'name_index' && voterIds.size > 0) {
              return Array.from(voterIds);
            }
          }
        } catch (error) {
          console.error(`Error searching index ${indexName} for key ${key}:`, error);
        }
      }
    }

    return Array.from(voterIds);
  } catch (error) {
    console.error('Error searching name index:', error);
    return [];
  }
};

// Get voter details by IDs
const getVotersByIds = async (voterIds: string[]): Promise<SearchResult[]> => {
  const results: SearchResult[] = [];

  const batchSize = 10;
  for (let i = 0; i < voterIds.length; i += batchSize) {
    const batch = voterIds.slice(i, i + batchSize);

    const promises = batch.map(async (id) => {
      try {
        const voterRef = ref(db, `voters/${id}`);
        const snapshot = await get(voterRef);

        if (snapshot.exists()) {
          return {
            id,
            data: snapshot.val() as VoterData
          };
        }
      } catch (error) {
        console.error(`Error fetching voter ${id}:`, error);
      }
      return null;
    });

    const batchResults = await Promise.all(promises);
    batchResults.forEach(result => {
      if (result) results.push(result);
    });
  }

  return results;
};

// Voter ID search
const searchByVoterId = async (voterId: string): Promise<SearchResult[]> => {
  try {
    // First try exact match
    const exactVoterRef = ref(db, `voters/${voterId}`);
    const exactSnapshot = await get(exactVoterRef);

    if (exactSnapshot.exists()) {
      return [{
        id: voterId,
        data: exactSnapshot.val() as VoterData
      }];
    }

    // If no exact match, search for partial match
    const votersRef = ref(db, 'voters');
    const allVotersSnapshot = await get(votersRef);

    if (!allVotersSnapshot.exists()) {
      return [];
    }

    const voters = allVotersSnapshot.val();
    const results: SearchResult[] = [];
    const searchLower = voterId.toLowerCase();

    Object.entries(voters).forEach(([id, voterData]: [string, any]) => {
      if (id.toLowerCase().includes(searchLower)) {
        results.push({
          id,
          data: voterData as VoterData
        });
      }
    });

    return results.slice(0, 10);
  } catch (error) {
    console.error('Error searching by Voter ID:', error);
    return [];
  }
};

// Main search function
const performSearch = async (formData: SearchFormData): Promise<SearchResult[]> => {
  const { firstName, middleName, lastName, voterId } = formData;

  // Clear all fields
  if (!firstName && !middleName && !lastName && !voterId) {
    return [];
  }

  try {
    // Voter ID search takes priority
    if (voterId) {
      return await searchByVoterId(voterId.trim().toUpperCase());
    }

    // Name search
    if (firstName || middleName || lastName) {
      const voterIds = await searchByNameInIndex(firstName, middleName, lastName);
      if (voterIds.length === 0) {
        return [];
      }
      return await getVotersByIds(voterIds);
    }

    return [];
  } catch (error) {
    console.error('Error in performSearch:', error);
    return [];
  }
};

const VoterModal: React.FC<VoterModalProps> = ({ voter, onClose }) => {
  return (
    <div className="fixed inset-0 bg-semi-transparent bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{voter.full_name}</h2>
              <p className="text-gray-600 text-sm font-mono">Voter ID: {voter.id}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-3">
                <span className="font-medium text-gray-700 block mb-1">Full Name:</span>
                <span className="text-gray-900 text-lg">{voter.full_name}</span>
              </div>

              <div>
                <span className="font-medium text-gray-700 block mb-1">First Name:</span>
                <span className="text-gray-900">{voter.name_parts.first}</span>
              </div>

              <div>
                <span className="font-medium text-gray-700 block mb-1">Middle Name:</span>
                <span className="text-gray-900">{voter.name_parts.middle}</span>
              </div>

              <div>
                <span className="font-medium text-gray-700 block mb-1">Last Name:</span>
                <span className="text-gray-900">{voter.name_parts.last}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-medium text-gray-700 block mb-1">Gender:</span>
                <span className={`px-3 py-1 rounded-full text-sm ${voter.gender === 'पुरुष'
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
          </div>
        </div>

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
  const [formData, setFormData] = useState<SearchFormData>({
    firstName: '',
    middleName: '',
    lastName: '',
    voterId: ''
  });
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedVoter, setSelectedVoter] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [searchType, setSearchType] = useState<'voterId' | 'name' | null>(null);
  const [searchStats, setSearchStats] = useState({
    totalFound: 0,
    timeTaken: 0,
    searchMethod: ''
  });

  // Add this to your state declarations
  const [activeTab, setActiveTab] = useState<'name' | 'epic'>('name');

  const handleInputChange = useCallback((field: keyof SearchFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleSearch = useCallback(async () => {
    const { firstName, middleName, lastName, voterId } = formData;

    if (!firstName && !middleName && !lastName && !voterId) {
      setSearchResults([]);
      setSearchPerformed(false);
      return;
    }

    setIsLoading(true);
    setSearchPerformed(true);
    const startTime = performance.now();

    // Determine search type
    if (voterId) {
      setSearchType('voterId');
    } else {
      setSearchType('name');
    }

    try {
      const results = await performSearch(formData);
      setSearchResults(results);

      const endTime = performance.now();

      // Determine search method used
      let searchMethod = '';
      if (voterId) {
        searchMethod = 'Voter ID search';
      } else if (firstName && middleName && lastName) {
        searchMethod = 'Full name (last_first_middle)';
      } else if (firstName && lastName) {
        searchMethod = 'Last_First combination';
      } else if (firstName && middleName) {
        searchMethod = 'First_Middle combination';
      } else if (lastName) {
        searchMethod = 'Last name only';
      } else if (firstName) {
        searchMethod = 'First name only';
      } else if (middleName) {
        searchMethod = 'Middle name only';
      }

      setSearchStats({
        totalFound: results.length,
        timeTaken: Math.round(endTime - startTime),
        searchMethod
      });
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [formData]);

  // Pre-fill example data
  const loadExample = useCallback((example: 'full' | 'partial' | 'voterId') => {
    if (example === 'full') {
      setFormData({
        firstName: 'मंगेश',
        middleName: 'रामदास',
        lastName: 'बधाले',
        voterId: ''
      });
    } else if (example === 'partial') {
      setFormData({
        firstName: 'मंगेश',
        middleName: '',
        lastName: 'बधाले',
        voterId: ''
      });
    } else if (example === 'voterId') {
      setFormData({
        firstName: '',
        middleName: '',
        lastName: '',
        voterId: 'UXM8227381'
      });
    }
  }, []);

  // Correct the clearSearch function type
function clearSearch(event: React.MouseEvent<HTMLButtonElement>): void {
  // Clear all form fields and reset search results
  setFormData({
    firstName: '',
    middleName: '',
    lastName: '',
    voterId: ''
  });
  setSearchResults([]);
  setSearchPerformed(false);
  setSearchType(null);
  setSearchStats({
    totalFound: 0,
    timeTaken: 0,
    searchMethod: ''
  });
}

  return (
    <div className="h-fit bg-gradient-to-br from-blue-50 to-gray-50">
      <div className="max-w-2xl bg-white px-4 mx-auto py-6">
        <header className="text-center mb-8">
          <img
            src="/banner.jpeg"
            alt="मतदार शोध प्रणाली Logo"
            className="w-full rounded h-full mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            मतदार यादीत नाव शोधा
          </h1>
        </header>

        <div className="">
          {/* Tab Selection */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('name')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'name'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Search by Name
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('epic')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'epic'
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                    </svg>
                    Search by EPIC ID
                  </span>
                </button>
              </nav>
            </div>
          </div>

          {/* Search Forms */}
          {activeTab === 'name' ? (
            <div className="mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label htmlFor="first-name" className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    id="first-name"
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    placeholder="मंगेश"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    autoComplete="off"
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter in Marathi or English</p>
                </div>

                <div>
                  <label htmlFor="middle-name" className="block text-sm font-medium text-gray-700 mb-1">
                    Middle Name (Husband/Father)
                  </label>
                  <input
                    id="middle-name"
                    type="text"
                    value={formData.middleName}
                    onChange={(e) => handleInputChange('middleName', e.target.value)}
                    placeholder="रामदास"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    autoComplete="off"
                  />
                  <p className="text-xs text-gray-500 mt-1">Father's/Husband's name</p>
                </div>

                <div>
                  <label htmlFor="last-name" className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name (Surname)
                  </label>
                  <input
                    id="last-name"
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    placeholder="बधाले"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    autoComplete="off"
                  />
                  <p className="text-xs text-gray-500 mt-1">Family surname</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleSearch}
                  disabled={isLoading || (!formData.firstName && !formData.middleName && !formData.lastName)}
                  className={`flex-1 py-3 px-6 rounded-lg font-medium transition-colors ${isLoading || (!formData.firstName && !formData.middleName && !formData.lastName)
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Searching...
                    </span>
                  ) : (
                    'Search by Name'
                  )}
                </button>

                <button
                  onClick={clearSearch}
                  className="py-3 px-6 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Clear Fields
                </button>
              </div>

             
            </div>
          ) : (
            <div className="mb-6">
              <div className="mb-6">
                <label htmlFor="voter-id" className="block text-sm font-medium text-gray-700 mb-1">
                  EPIC (Voter ID) Number
                </label>
                <div className="relative">
                  <input
                    id="voter-id"
                    type="text"
                    value={formData.voterId}
                    onChange={(e) => handleInputChange('voterId', e.target.value.toUpperCase())}
                    placeholder="UXM8227381"
                    className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-mono"
                    autoComplete="off"
                  />
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                    </svg>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Enter exact or partial EPIC ID (e.g., UXM8227381, 8227381, or UXM82)
                </p>

              
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleSearch}
                  disabled={isLoading || !formData.voterId}
                  className={`flex-1 py-3 px-6 rounded-lg font-medium transition-colors ${isLoading || !formData.voterId
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-purple-600 text-white hover:bg-purple-700'
                    }`}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Searching...
                    </span>
                  ) : (
                    'Search by EPIC ID'
                  )}
                </button>

                <button
                  onClick={clearSearch}
                  className="py-3 px-6 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Clear EPIC ID
                </button>
              </div>

              {/* <div className="mt-4 text-sm text-gray-600">
                <p className="font-medium mb-1">EPIC ID Format:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><code className="bg-gray-100 px-1 rounded">ABC1234567</code> - Standard format</li>
                  <li><code className="bg-gray-100 px-1 rounded">UXM8227381</code> - Example from your data</li>
                  <li>Case insensitive (UXM8227381 or uxm8227381)</li>
                  <li>Partial matches work (e.g., 8227381 or UXM82)</li>
                </ul>
              </div> */}
            </div>
          )}

          {searchPerformed && !isLoading && (
            <div className="mt-6 border-t pt-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <div>
                  <h3 className="font-medium text-gray-700 text-lg">
                    Results ({searchResults.length})
                  </h3>
                
                </div>

                <div className="flex items-center gap-4">
                 
                  {searchResults.length > 0 && (
                    <button
                      onClick={clearSearch}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Clear Search
                    </button>
                  )}
                </div>
              </div>

              {searchResults.length === 0 ? (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                  <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-lg mb-2">No voters found</p>
                  <p className="text-sm text-gray-600">
                    {activeTab === 'name'
                      ? 'Try adjusting your name search parameters'
                      : 'Check the EPIC ID format or try a different ID'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {searchResults.map((result) => (
                    <div
                      key={result.id}
                      onClick={() => setSelectedVoter(result)}
                      className="p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="font-medium text-gray-800 text-lg">
                              {result.data.full_name}
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-xs ${result.data.gender === 'पुरुष'
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
                              {activeTab === 'epic' && formData.voterId &&
                                formData.voterId.toUpperCase() === result.id && (
                                  <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs">
                                    Exact ID Match
                                  </span>
                                )}
                            </div>
                            <div className="text-gray-500">
                              {result.data.reference}
                            </div>
                          </div>
                        </div>
                        <button className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm whitespace-nowrap">
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>


      </div>

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