'use client';
// components/Dashboard.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { ref, get } from 'firebase/database';
import { db } from '@/lib/firebase';
import html2canvas from 'html2canvas';
import { containsMarathi, transliterateToMarathi } from '@/lib/transliterate';

// Types
interface VoterData {
  name: string;
  gender: string;
  age: number;
  serial_number: number;
  booth_center: string;
  booth_number: string;
  village: string;
  prabhag_number: string;
  gan: string;
  gan_full: string;
  gat: string;
}

interface VoterWithParsedName extends VoterData {
  name_parts: {
    last: string;
    first: string;
    middle: string;
  };
  full_name: string;
  reference: string;
}

interface IndexEntry {
  [voterId: string]: boolean;
}

interface SearchResult {
  id: string;
  data: VoterWithParsedName;
}

interface VoterModalProps {
  voter: VoterWithParsedName & { id: string };
  onClose: () => void;
}

interface SearchFormData {
  firstName: string;
  middleName: string;
  lastName: string;
  voterId: string;
}

// Parse Marathi name into parts
const parseMarathiName = (fullName: string): { last: string; first: string; middle: string } => {
  const parts = fullName.split(' ');

  if (parts.length >= 3) {
    return {
      last: parts[parts.length - 1],
      first: parts[0],
      middle: parts.slice(1, parts.length - 1).join(' ')
    };
  } else if (parts.length === 2) {
    return {
      last: parts[1],
      first: parts[0],
      middle: ''
    };
  } else {
    return {
      last: parts[0] || '',
      first: parts[0] || '',
      middle: ''
    };
  }
};

// Check if search is likely a Voter ID
const isVoterIdSearch = (text: string): boolean => {
  const trimmed = text.trim();
  const voterIdPattern = /^[A-Z0-9]{6,12}$/i;
  return voterIdPattern.test(trimmed);
};

// Determine search strategy based on field values
const determineSearchStrategy = (firstName: string, middleName: string, lastName: string): {
  index: string;
  key: string;
  strategy: string;
} | null => {
  // Clean and transliterate inputs
  const first = transliterateToMarathi(firstName.trim());
  const middle = transliterateToMarathi(middleName.trim());
  const last = transliterateToMarathi(lastName.trim());

  // All three fields provided - use exact match (name_index)
  if (first && middle && last) {
    return {
      index: 'name_index',
      key: `${first}_${middle}_${last}`,
      strategy: 'Exact match (Last_First_Middle)'
    };
  }

  // First and Last name provided - use name_index_first_last
  if (first && last && !middle) {
    return {
      index: 'name_index_first_last',
      key: `${first}_${last}`,
      strategy: 'First + Last name'
    };
  }

  // First and Middle name provided - use name_index_first_middle
  if (first && middle && !last) {
    return {
      index: 'name_index_first_middle',
      key: `${first}_${middle}`,
      strategy: 'First + Middle name'
    };
  }

  // Only Last name provided - use name_index_last
  if (last && !first && !middle) {
    return {
      index: 'name_index_last',
      key: last,
      strategy: 'Last name only'
    };
  }

  // Only First name provided - use name_index_first
  if (first && !middle && !last) {
    return {
      index: 'name_index_first',
      key: first,
      strategy: 'First name only'
    };
  }

  // Only Middle name provided - use name_index_middle
  if (middle && !first && !last) {
    return {
      index: 'name_index_middle',
      key: middle,
      strategy: 'Middle name only'
    };
  }

  // If only first and middle provided but no last, still use first_middle
  if (first && middle) {
    return {
      index: 'name_index_first_middle',
      key: `${first}_${middle}`,
      strategy: 'First + Middle name'
    };
  }

  // No valid combination found
  return null;
};

const searchByNameInIndex = async (
  firstName: string,
  middleName: string,
  lastName: string
): Promise<string[]> => {
  try {
    console.log('🔍 Starting optimized name search with parameters:');
    console.log('  First Name:', firstName);
    console.log('  Middle Name:', middleName);
    console.log('  Last Name:', lastName);

    // Determine the optimal search strategy
    const strategy = determineSearchStrategy(firstName, middleName, lastName);
    
    if (!strategy) {
      console.log('❌ No valid search strategy determined');
      return [];
    }

    console.log(`🎯 Using strategy: ${strategy.strategy}`);
    console.log(`   Index: ${strategy.index}, Key: ${strategy.key}`);

    // Perform single index search based on strategy
    const indexRef = ref(db, `${strategy.index}/${strategy.key}`);
    const snapshot = await get(indexRef);

    if (snapshot.exists()) {
      const indexData: IndexEntry = snapshot.val();
      const voterIds = Object.keys(indexData);
      
      console.log(`✅ Found ${voterIds.length} records`);
      console.log('--- Search Summary ---');
      console.log(`Strategy: ${strategy.strategy}`);
      console.log(`Index: ${strategy.index}`);
      console.log(`Key: ${strategy.key}`);
      console.log(`Total records found: ${voterIds.length}`);
      
      return voterIds;
    } else {
      console.log('❌ No records found for the selected strategy');
      console.log('--- Search Summary ---');
      console.log(`Strategy: ${strategy.strategy}`);
      console.log(`Index: ${strategy.index}`);
      console.log(`Key: ${strategy.key}`);
      console.log(`Total records found: 0`);
      return [];
    }
  } catch (error) {
    console.error('🔥 Error searching name index:', error);
    return [];
  }
};

// Process voter data to match expected format
const processVoterData = (id: string, voterData: VoterData): VoterWithParsedName => {
  const nameParts = parseMarathiName(voterData.name);

  return {
    ...voterData,
    name_parts: nameParts,
    full_name: voterData.name,
    reference: `मतदार क्र. ${voterData.serial_number}, मतदार केंद्र: ${voterData.booth_center}, बूथ: ${voterData.booth_number}, गाव: ${voterData.village}, प्रभाग: ${voterData.prabhag_number}, गण: ${voterData.gan}, गट: ${voterData.gat}`
  };
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
          const voterData = snapshot.val() as VoterData;
          return {
            id,
            data: processVoterData(id, voterData)
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
      const voterData = exactSnapshot.val() as VoterData;
      return [{
        id: voterId,
        data: processVoterData(voterId, voterData)
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
          data: processVoterData(id, voterData as VoterData)
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

    // Name search - any combination is allowed
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

// Copy to clipboard function
const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text)
    .then(() => {
      alert('माहिती क्लिपबोर्डवर कॉपी केली! आता आपण ती कोणत्याही ऍपमध्ये पेस्ट करू शकता.');
    })
    .catch(err => {
      console.error('क्लिपबोर्ड कॉपी त्रुटी:', err);
      alert('क्लिपबोर्डवर कॉपी करण्यात त्रुटी आली. कृपया मॅन्युअली कॉपी करा.');
    });
};

// Generate share text in the required format
const generateShareText = (voter: VoterWithParsedName & { id: string }): string => {
  return `नाव: ${voter.full_name}
गण: ${voter.gan}
गण: ${voter.gan_full}
गट: ${voter.gat}
वय: ${voter.age}
EPIC ID: ${voter.id}
प्रभाग-भाग क्र.: ${voter.prabhag_number}
अनु. क्र.: ${voter.serial_number}
मतदान केंद्र: ${voter.booth_center}
बूथ क्रमांक: ${voter.booth_number}
गाव: ${voter.village}
मतदानाची तारीख व वेळ : ७ फेब्रुवारी २०२६ रोजी सकाळी ७.३० ते सायंकाळी ५.३०

आपली नम्र: *सौ.मेघाताई प्रशांतदादा भागवत*


मतदार यादीत नाव शोधण्याकरिता : https://meghaprashantbhagwat.com/?share=7`;
};

// Share voter details function
const shareVoterDetails = (voter: VoterWithParsedName & { id: string }) => {
  const shareText = generateShareText(voter);

  if (navigator.share) {
    navigator.share({
      title: `मतदार माहिती: ${voter.full_name}`,
      text: shareText,
    })
      .then(() => console.log('शेयर यशस्वी!'))
      .catch((error) => {
        console.error('शेयर त्रुटी:', error);
        copyToClipboard(shareText);
      });
  } else {
    copyToClipboard(shareText);
  }
};

// Download voter slip as image
const downloadVoterSlip = async (voter: VoterWithParsedName & { id: string }) => {
  try {
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-10000px';
    container.style.top = '-10000px';
    container.style.width = '800px';
    container.style.backgroundColor = 'white';
    container.style.padding = '20px';
    container.style.boxSizing = 'border-box';
    container.style.fontFamily = "'Noto Sans Devanagari', 'Arial Unicode MS', Arial, sans-serif";
    container.style.color = '#333';

    const bannerUrl = `/banner.jpeg`;

    container.innerHTML = `
      <div style="text-align: center; margin-bottom: 25px;">
        <img src="${bannerUrl}" alt="मतदार यादीत नाव शोधा - इंदोरी वराळे जिल्हा परिषद पंचायत गट" 
             style="width: 100%; height: 270px; object-fit: cover; border-radius: 8px; margin-bottom: 15px;"
             crossOrigin="anonymous">
        <h1 style="color: #1e3a8a; margin: 0; font-size: 28px; font-weight: bold;">
          मतदार माहिती स्लिप
        </h1>
        <p style="color: #4b5563; margin: 5px 0 0 0; font-size: 16px;">
          इंदोरी वराळे जिल्हा परिषद पंचायत गट
        </p>
      </div>
      
      <div style="border: 2px solid #1e3a8a; border-radius: 12px; padding: 25px; margin-bottom: 25px; background: linear-gradient(to bottom right, #f8fafc, #e0f2fe);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <div>
            <h2 style="color: #1e40af; margin: 0 0 5px 0; font-size: 24px; font-weight: bold;">मतदार तपशील</h2>
            <p style="color: #6b7280; margin: 0; font-size: 18px;">Voter Information Details</p>
          </div>
          <div style="background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; padding: 8px 20px; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); line-height: 1.5;">
            EPIC ID: ${voter.id}
          </div>
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 20px; margin-bottom: 20px;">
          <div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
            <h3 style="color: #374151; margin: 0 0 15px 0; font-size: 22px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">नावाचे तपशील</h3>
            <p style="margin: 10px 0;"><strong style="color: #4b5563; font-size: 20px;">पूर्ण नाव:</strong> <span style="color: #111827; font-weight: bold; font-size: 20px;">${voter.full_name}</span></p>
            <p style="margin: 10px 0;"><strong style="color: #4b5563; font-size: 20px;">लिंग:</strong> 
              <span style="color: ${voter.gender === 'पुरूष' ? '#1e40af' : '#be185d'}; font-size: 20px;">
                ${voter.gender}
              </span>
            </p>
            <p style="margin: 10px 0;"><strong style="color: #4b5563; font-size: 20px;">वय:</strong> 
              <span style="color: #065f46; font-size: 20px;">
                ${voter.age} वर्ष
              </span>
            </p>
            <p style="margin: 10px 0;"><strong style="color: #4b5563; font-size: 20px;">गण:</strong> <span style="font-size: 20px;">${voter.gan}</span></p>
            <p style="margin: 10px 0;"><strong style="color: #4b5563; font-size: 20px;">गण:</strong> <span style="font-size: 20px;">${voter.gan_full}</span></p>
            <p style="margin: 10px 0;"><strong style="color: #4b5563; font-size: 20px;">गट:</strong> <span style="font-size: 20px;">${voter.gat}</span></p>
            <p style="margin: 10px 0;"><strong style="color: #4b5563; font-size: 20px;">अनु. क्र.:</strong> 
              <span style="color: #92400e; font-size: 20px; font-weight: bold;">
                ${voter.serial_number}
              </span>
            </p>
            <p style="margin: 10px 0;"><strong style="color: #4b5563; font-size: 20px;">प्रभाग-भाग क्र.:</strong> 
              <span style="color: #1e40af; font-size: 20px; font-weight: bold;">
                ${voter.prabhag_number}
              </span>
            </p>
          </div>
        </div>
        
        <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
          <h3 style="color: #374151; margin: 0 0 15px 0; font-size: 22px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">मतदान केंद्र माहिती</h3>
          <p style="margin: 10px 0;"><strong style="color: #4b5563; font-size: 20px;">मतदान केंद्र:</strong> <span style="font-size: 18px;">${voter.booth_center}</span></p>
          <p style="margin: 10px 0;"><strong style="color: #4b5563; font-size: 20px;">बूथ क्रमांक:</strong> <span style="font-size: 20px;">${voter.booth_number}</span></p>
          <p style="margin: 10px 0;"><strong style="color: #4b5563; font-size: 20px;">गाव:</strong> <span style="font-size: 20px;">${voter.village}</span></p>
          <p style="margin: 10px 0;"><strong style="color: #4b5563; font-size: 20px;">मतदानाची तारीख व वेळ:</strong> <span style="font-size: 18px;">७ फेब्रुवारी २०२६ रोजी सकाळी ७.३० ते सायंकाळी ५.३०</span></p>
        </div>
      </div>
      
      <div style="text-align: center; padding: 20px; background: linear-gradient(to right, #f8fafc, #e0f2fe); border-radius: 10px; margin-bottom: 20px;">
        <p style="color: #1e40af; font-size: 22px; margin: 0 0 10px 0; font-weight: bold;">
          आपली नम्र
        </p>
        <p style="color: #374151; font-size: 24px; margin: 0; font-weight: bolder;">
          सौ.मेघाताई प्रशांतदादा भागवत
        </p>
      </div>
    `;

    document.body.appendChild(container);

    await new Promise(resolve => setTimeout(resolve, 500));

    const canvas = await html2canvas(container, {
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
    });

    const imageUrl = canvas.toDataURL('image/png', 1.0);

    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `voter_slip_${voter.id}_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    document.body.removeChild(container);

    alert('मतदार स्लिप डाऊनलोड होत आहे...');

  } catch (error) {
    console.error('Error generating voter slip:', error);
    alert('मतदार स्लिप डाऊनलोड करताना त्रुटी आली. कृपया पुन्हा प्रयत्न करा.');
  }
};

// Share via specific app
const shareViaApp = (voter: VoterWithParsedName & { id: string }, app: 'whatsapp' | 'telegram' | 'sms' | 'email') => {
  const voterInfo = generateShareText(voter);
  const encodedText = encodeURIComponent(voterInfo);

  switch (app) {
    case 'whatsapp':
      window.open(`https://wa.me/?text=${encodedText}`, '_blank');
      break;
    case 'telegram':
      window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodedText}`, '_blank');
      break;
    case 'sms':
      window.open(`sms:?body=${encodedText}`, '_blank');
      break;
    case 'email':
      window.open(`mailto:?subject=मतदार माहिती: ${voter.full_name}&body=${encodedText}`, '_blank');
      break;
  }
};

const VoterModal: React.FC<VoterModalProps> = ({ voter, onClose }) => {
  const [showShareOptions, setShowShareOptions] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await downloadVoterSlip(voter);
    } catch (error) {
      console.error('Download error:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-semi-transparent bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{voter.full_name}</h2>
              <p className="text-gray-600 text-sm font-mono">EPIC: {voter.id}</p>
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
                <span className="font-medium text-gray-700 block mb-1">पूर्ण नाव:</span>
                <span className="text-gray-900 text-lg">{voter.full_name}</span>
              </div>

              <div>
                <span className="font-medium text-gray-700 block mb-1">पहिले नाव:</span>
                <span className="text-gray-900">{voter.name_parts.first}</span>
              </div>

              <div>
                <span className="font-medium text-gray-700 block mb-1">मधले/इतर नाव:</span>
                <span className="text-gray-900">{voter.name_parts.middle}</span>
              </div>

              <div>
                <span className="font-medium text-gray-700 block mb-1">आडनाव:</span>
                <span className="text-gray-900">{voter.name_parts.last}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-medium text-gray-700 block mb-1">लिंग:</span>
                <span className={`px-3 py-1 rounded-full text-sm ${voter.gender === 'पुरूष'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-pink-100 text-pink-800'
                  }`}>
                  {voter.gender}
                </span>
              </div>

              <div>
                <span className="font-medium text-gray-700 block mb-1">वय:</span>
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                  {voter.age} वर्ष
                </span>
              </div>

              <div>
                <span className="font-medium text-gray-700 block mb-1">अनु. क्र.:</span>
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-bold">
                  {voter.serial_number}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700 block mb-1">गण:</span>
                <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-bold">
                  {voter.gan}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700 block mb-1">गण:</span>
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-bold">
                  {voter.gan_full}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700 block mb-1">गट:</span>
                <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-bold">
                  {voter.gat}
                </span>
              </div>


              <div>
                <span className="font-medium text-gray-700 block mb-1">प्रभाग-भाग क्र.:</span>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  {voter.prabhag_number}
                </span>
              </div>
            </div>

            <div>
              <span className="font-medium text-gray-700 block mb-1">मतदानाची तारीख व वेळ:</span>
              <span className="col-span-2 py-1 text-green-800 rounded-full text-[16px]">
                ७ फेब्रुवारी २०२६ रोजी स. ७.३० ते सा. ५.३०
              </span>
            </div>

            <div>
              <span className="font-medium text-gray-700 block mb-1">मतदान केंद्र:</span>
              <span className="text-gray-900">{voter.booth_center}</span>
            </div>

            <div>
              <span className="font-medium text-gray-700 block mb-1">बूथ क्रमांक:</span>
              <span className="text-gray-900">{voter.booth_number}</span>
            </div>

            <div>
              <span className="font-medium text-gray-700 block mb-1">गाव:</span>
              <span className="text-gray-900">{voter.village}</span>
            </div>

            <div>
              <span className="font-medium text-gray-700 block mb-1">संदर्भ:</span>
              <span className="text-gray-900 bg-gray-50 p-3 rounded-lg block text-sm">
                {voter.reference}
              </span>
            </div>
          </div>

          {/* Share Section */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-700">माहिती शेअर करा</h3>
              <button
                onClick={() => setShowShareOptions(!showShareOptions)}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                {showShareOptions ? 'शेअर ऑप्शन्स लपवा' : 'शेअर ऑप्शन्स दाखवा'}
              </button>
            </div>

            {/* Download Voter Slip Button */}
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className={`w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 mb-3 ${isDownloading ? 'opacity-75 cursor-not-allowed' : ''
                }`}
            >
              {isDownloading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  डाऊनलोड होत आहे...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  मतदार स्लिप डाऊनलोड करा
                </>
              )}
            </button>

            {/* Main Share Button */}
            <button
              onClick={() => shareVoterDetails(voter)}
              className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 mb-3"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M15 8a3 3 0 10-2.477-2.477 5 5 0 10-4.026 4.026 3 3 0 102.477 2.477 5 5 0 104.026-4.026A3 3 0 0015 8zm-6 6a3 3 0 110-6 3 3 0 010 6zm-1-3a1 1 0 112 0 1 1 0 01-2 0z" clipRule="evenodd" />
              </svg>
              माहिती शेअर करा
            </button>

            {/* App-specific Share Options */}
            {showShareOptions && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  onClick={() => shareViaApp(voter, 'whatsapp')}
                  className="py-2 px-3 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zm-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.76.982.998-3.675-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.897 6.994c-.004 5.45-4.438 9.88-9.888 9.88zm8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.333.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.333 11.893-11.893 0-3.18-1.24-6.162-3.495-8.411z" />
                  </svg>
                  WhatsApp
                </button>

                <button
                  onClick={() => shareViaApp(voter, 'telegram')}
                  className="py-2 px-3 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.139c-.203-.196-.528-.206-.76-.047l-2.5 1.855-1.5 3.5-2.5 4.5c-.07.131-.082.292-.034.436.048.143.157.254.305.308l.5.17c.154.052.324.034.462-.048l2-1.5 1.5-2.5 4-3 2.5-1.5c.131-.079.223-.212.25-.366.026-.154-.015-.314-.112-.438l-.5-.5zm-5.125 6.99l1.25-2.875 4.375-3.25-4.375 3.25-1.25 2.875z" />
                  </svg>
                  Telegram
                </button>

                <button
                  onClick={() => shareViaApp(voter, 'sms')}
                  className="py-2 px-3 bg-purple-100 text-purple-800 rounded-lg hover:bg-purple-200 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" />
                  </svg>
                  SMS
                </button>

                <button
                  onClick={() => shareViaApp(voter, 'email')}
                  className="py-2 px-3 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                  Email
                </button>
              </div>
            )}

            {/* Copy to Clipboard Option */}
            <button
              onClick={() => {
                const voterInfo = generateShareText(voter);
                copyToClipboard(voterInfo);
              }}
              className="w-full py-2 px-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              क्लिपबोर्डवर कॉपी करा
            </button>
          </div>
        </div>

        <div className="bg-gray-50 px-6 py-4 sticky bottom-0">
          <div className="flex justify-between gap-3">
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className={`flex-1 py-2 px-4 border border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2 ${isDownloading ? 'opacity-75 cursor-not-allowed' : ''
                }`}
            >
              {isDownloading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  स्लिप
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            >
              बंद करा
            </button>

            <button
              onClick={() => shareVoterDetails(voter)}
              className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              शेअर
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

  const [activeTab, setActiveTab] = useState<'name' | 'epic'>('epic');
  const [transliterationHints, setTransliterationHints] = useState({
    firstName: '',
    middleName: '',
    lastName: ''
  });

  const handleInputChange = useCallback((field: keyof SearchFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Show transliteration hint for English text
    if (value && !containsMarathi(value)) {
      const transliterated = transliterateToMarathi(value);
      if (transliterated !== value) {
        setTransliterationHints(prev => ({
          ...prev,
          [field]: `${transliterated}`
        }));
      } else {
        setTransliterationHints(prev => ({
          ...prev,
          [field]: ''
        }));
      }
    } else {
      setTransliterationHints(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  }, []);

  const handleSearch = useCallback(async () => {
    const { firstName, middleName, lastName, voterId } = formData;

    // For name search: require at least one name field
    if (activeTab === 'name') {
      if (!firstName && !middleName && !lastName) {
        alert('कृपया किमान एक नावाचे फील्ड भरा');
        return;
      }
    }

    // For EPIC ID search: require voterId field
    if (activeTab === 'epic' && !voterId) {
      alert('कृपया EPIC ID प्रविष्ट करा');
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
        searchMethod = 'EPIC ID शोध';
      } else {
        const usedFields = [];
        if (firstName) usedFields.push('पहिले नाव');
        if (middleName) usedFields.push('मधले नाव');
        if (lastName) usedFields.push('आडनाव');
        
        searchMethod = `${usedFields.join(' + ')} ने शोध`;
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
  }, [formData, activeTab]);

  const clearSearch = useCallback(() => {
    setFormData({
      firstName: '',
      middleName: '',
      lastName: '',
      voterId: ''
    });
    setTransliterationHints({
      firstName: '',
      middleName: '',
      lastName: ''
    });
    setSearchResults([]);
    setSearchPerformed(false);
    setSearchType(null);
    setSearchStats({
      totalFound: 0,
      timeTaken: 0,
      searchMethod: ''
    });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-50">
      <div className="max-w-2xl bg-white px-4 mx-auto py-6">
        <header className="text-center mb-8">
          <img
            src="/banner.jpeg"
            alt="प्रणाली Logo"
            className="w-full rounded-lg h-full mx-auto mb-4"
            crossOrigin="anonymous"
          />
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            मतदार यादीत नाव शोधा
          </h1>
          <p className="text-gray-600">इंदोरी वराळे जिल्हा परिषद पंचायत गट</p>
        </header>

        <div className="">
          {/* Tab Selection */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
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
                    EPIC ID ने शोधा
                  </span>
                </button>
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
                    नावाने शोधा
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
                    पहिले नाव
                  </label>
                  <input
                    id="first-name"
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    placeholder=""
                    className="w-full text-black p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                    autoComplete="off"
                  />
                  {/* {transliterationHints.firstName && (
                    <p className="text-xs text-green-600 mt-1">{transliterationHints.firstName}</p>
                  )} */}
                  <p className="text-sm font-bold text-gray-500 mt-1">(मराठी मध्ये प्रविष्ट करा)</p>
                </div>

                <div>
                  <label htmlFor="middle-name" className="block text-sm font-medium text-gray-700 mb-1">
                    मधले नाव (वडिलांचे/पतीचे/इतर नाव)
                  </label>
                  <input
                    id="middle-name"
                    type="text"
                    value={formData.middleName}
                    onChange={(e) => handleInputChange('middleName', e.target.value)}
                    placeholder=""
                    className="w-full test-black p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                    autoComplete="off"
                  />
                  {/* {transliterationHints.middleName && (
                    <p className="text-xs text-green-600 mt-1">{transliterationHints.middleName}</p>
                  )} */}
                  <p className="text-xs text-gray-500 mt-1">(वडिलांचे/पतीचे नाव/ - वैकल्पिक)</p>
                </div>

                <div>
                  <label htmlFor="last-name" className="block text-sm font-medium text-gray-700 mb-1">
                    आडनाव
                  </label>
                  <input
                    id="last-name"
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    placeholder=""
                    className="w-full text-black p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                    autoComplete="off"
                  />
                  {/* {transliterationHints.lastName && (
                    <p className="text-xs text-green-600 mt-1">{transliterationHints.lastName}</p>
                  )} */}
                  <p className="text-xs text-gray-500 mt-1">(कुळनाव)</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleSearch}
                  disabled={isLoading}
                  className={`flex-1 py-3 px-6 rounded-lg font-medium transition-colors ${isLoading
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      शोधत आहे...
                    </span>
                  ) : (
                    'नावाने शोधा'
                  )}
                </button>

                <button
                  onClick={clearSearch}
                  className="py-3 px-6 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  साफ करा
                </button>
              </div>
            </div>
          ) : (
            <div className="mb-6">
              <div className="mb-6">
                <label htmlFor="voter-id" className="block text-sm font-medium text-gray-700 mb-1">
                  EPIC (मतदार ओळखपत्र) क्रमांक
                </label>
                <div className="relative">
                  <input
                    id="voter-id"
                    type="text"
                    value={formData.voterId}
                    onChange={(e) => handleInputChange('voterId', e.target.value.toUpperCase())}
                    placeholder="ABC1234567 किंवा 1234567"
                    className="w-full text-black p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-mono text-lg"
                    autoComplete="off"
                  />
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                    </svg>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  संपूर्ण किंवा अंशतः EPIC ID प्रविष्ट करा (उदा: UXM1234567, 1234567)
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
                      शोधत आहे...
                    </span>
                  ) : (
                    'EPIC ID ने शोधा'
                  )}
                </button>

                <button
                  onClick={clearSearch}
                  className="py-3 px-6 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  साफ करा
                </button>
              </div>
            </div>
          )}

          {searchPerformed && !isLoading && (
            <div className="mt-6 border-t pt-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <div>
                  <h3 className="font-medium text-gray-700 text-lg">
                    निकाल ({searchResults.length})
                  </h3>
                  {searchStats.searchMethod && (
                    <p className="text-sm text-gray-500 mt-1">
                      शोध पद्धत: {searchStats.searchMethod} | वेळ: {searchStats.timeTaken}ms
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  {searchResults.length > 0 && (
                    <button
                      onClick={clearSearch}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      शोध साफ करा
                    </button>
                  )}
                </div>
              </div>

              {searchResults.length === 0 ? (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                  <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-lg mb-2">मतदार सापडले नाहीत</p>
                  <p className="text-sm text-gray-600">
                    {activeTab === 'name'
                      ? 'कृपया नावाचे पॅरामीटर्स बदलून पुन्हा प्रयत्न करा'
                      : 'EPIC ID फॉर्मेट तपासा किंवा वेगळा ID वापरा'}
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
                            <span className={`px-2 py-0.5 rounded-full text-xs ${result.data.gender === 'पुरूष'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-pink-100 text-pink-800'
                              }`}>
                              {result.data.gender}
                            </span>
                            <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs">
                              {result.data.age} वर्ष
                            </span>
                            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs font-bold">
                              अनु. क्र.: {result.data.serial_number}
                            </span>
                          </div>
                          <div className="text-gray-600 text-sm space-y-1">
                            <div className="flex items-center gap-4">
                              <span className="font-mono text-gray-800 bg-gray-100 px-2 py-0.5 rounded">
                                EPIC: {result.id}
                              </span>
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs">
                                प्रभाग: {result.data.prabhag_number}
                              </span>
                            </div>
                            <div className="text-gray-500">
                              {result.data.booth_center}, बूथ: {result.data.booth_number}, {result.data.village}
                            </div>
                          </div>
                        </div>
                        <button className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm whitespace-nowrap">
                          तपशील पहा
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