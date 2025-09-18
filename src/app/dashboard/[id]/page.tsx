'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { ImageIcon, TagIcon, DownloadIcon } from 'lucide-react';

interface ExcelData {
  _id: string;
  filename: string;
  sheetName: string;
  data: Array<{
    human: string;
    ai: string;
    filenames?: string;
    imagePaths?: string[];
    tags?: string[];
    isSelected?: boolean;
    imageTags?: { [imagePath: string]: string[] }; // Individual image tags
  }>;
  globalImageTags?: { [imagePath: string]: string[] }; // Global tags across all sheets
  globalImageSpecies?: { [imagePath: string]: string }; // Global species classifications across all sheets
}

interface Sheet {
  id: string;
  sheetName: string;
}

const TAGS = [
  'Blurry',
  'Low-light',
  'Body part',
  'Blends in',
  'Unidentifiable to taxonomix level by human ground-truth'
];

const SPECIES_LIST = [
  'Black-tailed jackrabbit - Lepus californicus',
  'Bobcat - Lynx rufus',
  '(Desert cottontail) - Sylvilagus audubonii',
  'Coyote - Canis latrans',
  'Domestic horse - Equus ferus caballus',
  'Domestic cattle - Bos taurus',
  'Gray fox - Urocyon cinereoargenteus',
  'Mule deer - Odocoileus hemionus',
  'Northern raccoon - Procyon lotor',
  'Puma - Puma concolor',
  'Striped skunk - Mephitis mephitis',
  'Virginia opossum - Didelphis virginiana',
  'Black bear - Ursus americanus',
  'Wild boar - Sus scrofa',
  'Western spotted skunk - Spilogale gracilis',
  'Western gray squirrel - Sciurus griseus',
  'Eastern gray squirrel - Sciurus carolinensis',
  '(Dusky-footed woodrat) - Neotoma fuscipes',
  'Unknown - (no scientific name)'
];

// Helper function to get image paths from row data
const getImagePaths = (row: ExcelData['data'][0]): string[] => {
  if (row.imagePaths && row.imagePaths.length > 0) {
    return row.imagePaths;
  }
  if (row.filenames) {
    return row.filenames.split(',').map(f => f.trim()).filter(Boolean);
  }
  return [];
};

// Navbar component to avoid duplication
const Navbar = ({ selectedSheet, sheets, onSheetChange, onExport, isExporting }: {
  selectedSheet: string;
  sheets: Sheet[];
  onSheetChange: (sheetId: string) => void;
  onExport: () => void;
  isExporting: boolean;
}) => (
  <nav className="bg-white shadow-sm border-b">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between h-16">
        <div className="flex items-center">
          <h1 className="text-xl font-semibold text-gray-900">Excel Data Dashboard</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={onExport}
            disabled={isExporting}
            className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isExporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <DownloadIcon className="w-4 h-4" />
                <span>Export Tagged Data</span>
              </>
            )}
          </button>
          
          <select 
            value={sheets.find(sheet => sheet.sheetName === selectedSheet)?.id || ''} 
            onChange={(e) => onSheetChange(e.target.value)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors border-none outline-none cursor-pointer"
          >
            <option value="" disabled>Select Taxonomic Level</option>
            {sheets.map((sheet) => (
              <option key={sheet.id} value={sheet.id} className="bg-white text-black">
                {sheet.sheetName}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  </nav>
);

// Image display component
const ImageDisplay = ({ 
  imagePaths, 
  currentIndex, 
  onIndexChange, 
  rowData 
}: {
  imagePaths: string[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  rowData: { human: string; ai: string };
}) => {
  const [imageLoading, setImageLoading] = useState(false);

  if (imagePaths.length === 0) {
    return (
      <div className="bg-gray-100 rounded-lg p-8 h-96 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <ImageIcon className="w-16 h-16 mx-auto mb-2" />
          <p className="text-sm">No images available</p>
        </div>
      </div>
    );
  }

  const currentImagePath = imagePaths[currentIndex];
  const imageUrl = `/api/images/${currentImagePath}`;

  return (
    <div>
      {/* Navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => onIndexChange(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
          className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
        >
          ← Previous
        </button>
        <span className="text-sm text-gray-600 font-medium">
          {currentIndex + 1} of {imagePaths.length}
        </span>
        <button
          onClick={() => onIndexChange(Math.min(imagePaths.length - 1, currentIndex + 1))}
          disabled={currentIndex === imagePaths.length - 1}
          className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
        >
          Next →
        </button>
      </div>
      
      {/* Image */}
      <div className="bg-gray-100 rounded-lg p-4 h-96 flex items-center justify-center mb-4 relative">
        {imageLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg z-10">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}
        <img 
          src={imageUrl} 
          alt={`Image ${currentIndex + 1}`}
          className="max-w-full max-h-full object-contain rounded shadow-lg"
          onLoad={() => setImageLoading(false)}
          onLoadStart={() => setImageLoading(true)}
          onError={(e) => {
            setImageLoading(false);
            e.currentTarget.style.display = 'none';
            e.currentTarget.nextElementSibling?.classList.remove('hidden');
          }}
        />
        <div className="text-center text-gray-500 hidden">
          <ImageIcon className="w-16 h-16 mx-auto mb-2" />
          <p className="text-sm">Image not found: {currentImagePath}</p>
        </div>
      </div>
      
      {/* Image Info */}
      <div className="text-center text-sm text-gray-600 mb-4">
        <p className="font-medium">Human: {rowData.human}</p>
        <p className="font-medium">AI: {rowData.ai}</p>
        <p className="text-xs text-gray-500 mt-1">{currentImagePath}</p>
      </div>
    </div>
  );
};

export default function DashboardPage() {
  const params = useParams();
  const [excelData, setExcelData] = useState<ExcelData | null>(null);
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showImageSidebar, setShowImageSidebar] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [isExporting, setIsExporting] = useState(false);
  const [globalImageTags, setGlobalImageTags] = useState<{ [imagePath: string]: string[] }>({});
  const [globalImageSpecies, setGlobalImageSpecies] = useState<{ [imagePath: string]: string }>({});
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);
  const [downloadOptions, setDownloadOptions] = useState({
    taggedExcel: true,
    updatedCsv: true,
    originalData: false
  });

  // Fetch global image tags
  const fetchGlobalTags = useCallback(async (filename: string) => {
    try {
      const response = await fetch(`/api/global-tags?filename=${encodeURIComponent(filename)}`);
      if (response.ok) {
        const data = await response.json();
        setGlobalImageTags(data.globalImageTags || {});
      } else {
        console.error('Failed to fetch global tags:', response.status);
      }
    } catch (error) {
      console.error('Error fetching global tags:', error);
    }
  }, []);

  // Fetch global image species
  const fetchGlobalSpecies = useCallback(async (filename: string) => {
    try {
      const response = await fetch(`/api/global-species?filename=${encodeURIComponent(filename)}`);
      if (response.ok) {
        const data = await response.json();
        setGlobalImageSpecies(data.globalImageSpecies || {});
      }
    } catch (error) {
      console.error('Error fetching global species:', error);
    }
  }, []);

  // Fetch initial data and sheets
  const fetchData = useCallback(async () => {
    try {
      const response = await fetch(`/api/data/${params.id}`);
      const data = await response.json();
      
      // Fetch global tags and species
      await fetchGlobalTags(data.filename);
      await fetchGlobalSpecies(data.filename);
      
      const encodedFilename = encodeURIComponent(data.filename);
      const sheetsResponse = await fetch(`/api/sheets/${encodedFilename}`);
      const sheetsData = await sheetsResponse.json();
      
      // Remove duplicate sheet names
      const uniqueSheets = sheetsData.filter((sheet: Sheet, index: number, self: Sheet[]) => 
        index === self.findIndex(s => s.sheetName === sheet.sheetName)
      );
      
      setSheets(uniqueSheets);
      setExcelData(null);
      setSelectedSheet('');
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [params.id, fetchGlobalTags, fetchGlobalSpecies]);

  // Handle sheet change
  const handleSheetChange = useCallback(async (sheetId: string) => {
    try {
      // Find the sheet name from the sheets array
      const selectedSheetData = sheets.find(sheet => sheet.id === sheetId);
      if (!selectedSheetData) {
        console.error('Sheet not found:', sheetId);
        return;
      }
      
      // Update selected sheet immediately
      setSelectedSheet(selectedSheetData.sheetName);
      
      const response = await fetch(`/api/data/${sheetId}`);
      const data = await response.json();
      
      setExcelData(data);
      
      // Refresh global tags and species when switching sheets
      await fetchGlobalTags(data.filename);
      await fetchGlobalSpecies(data.filename);
      
      setSelectedRow(null);
      setShowImageSidebar(false);
    } catch (error) {
      console.error('Error fetching sheet data:', error);
    }
  }, [sheets, fetchGlobalTags, fetchGlobalSpecies]);

  // Handle row selection
  const handleRowSelect = useCallback((index: number) => {
    if (selectedRow === index) {
      setSelectedRow(null);
      setShowImageSidebar(false);
    } else {
      setSelectedRow(index);
      setShowImageSidebar(true);
      setCurrentImageIndex(0);
    }
  }, [selectedRow]);

  // Handle tag selection for individual images using global tags
  const handleTagSelect = useCallback(async (rowIndex: number, tag: string, imagePath: string) => {
    if (!excelData) return;

    // Update global tags
    const updatedGlobalTags = { ...globalImageTags };
    
    // Initialize tags for this specific image if they don't exist
    if (!updatedGlobalTags[imagePath]) {
      updatedGlobalTags[imagePath] = [];
    }
    
    // Toggle the tag for this specific image
    if (updatedGlobalTags[imagePath].includes(tag)) {
      updatedGlobalTags[imagePath] = updatedGlobalTags[imagePath].filter(t => t !== tag);
    } else {
      updatedGlobalTags[imagePath].push(tag);
    }

    setGlobalImageTags(updatedGlobalTags);

    try {
      // Update global tags on the server
      const response = await fetch('/api/global-tags', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          filename: excelData.filename,
          imagePath,
          tags: updatedGlobalTags[imagePath]
        })
      });
      
      const result = await response.json();
      if (!result.success) {
        console.error('Failed to update global tags:', result);
      }
    } catch (error) {
      console.error('Error updating global tags:', error);
    }
  }, [excelData, globalImageTags]);

  // Handle species classification
  const handleSpeciesClassification = useCallback(async (rowIndex: number, species: string, imagePath: string) => {
    if (!excelData) return;

    // Handle clear selection
    if (species === 'CLEAR_SELECTION') {
      const updatedSpecies = { ...globalImageSpecies };
      delete updatedSpecies[imagePath];
      setGlobalImageSpecies(updatedSpecies);
      
      // Clear from database as well
      try {
        await fetch('/api/global-species', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            filename: excelData.filename,
            imagePath,
            species: '' // Empty string to clear
          })
        });
      } catch (error) {
        console.error('Error clearing species classification:', error);
      }
      return;
    }

    // Update local state immediately
    const updatedSpecies = { ...globalImageSpecies };
    updatedSpecies[imagePath] = species;
    setGlobalImageSpecies(updatedSpecies);

    try {
      // Update species classification on the server (CSV)
      const csvResponse = await fetch('/api/update-species', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          filename: excelData.filename,
          sheetName: excelData.sheetName,
          imagePath,
          species
        })
      });
      
      // Update global species in database
      const globalResponse = await fetch('/api/global-species', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          filename: excelData.filename,
          imagePath,
          species
        })
      });
      
      const csvResult = await csvResponse.json();
      const globalResult = await globalResponse.json();
      
      if (!csvResult.success || !globalResult.success) {
        // Revert local state if server update failed
        const revertedSpecies = { ...globalImageSpecies };
        delete revertedSpecies[imagePath];
        setGlobalImageSpecies(revertedSpecies);
        alert('Failed to update species classification. Please try again.');
      }
    } catch (error) {
      console.error('Error updating species classification:', error);
      // Revert local state on error
      const revertedSpecies = { ...globalImageSpecies };
      delete revertedSpecies[imagePath];
      setGlobalImageSpecies(revertedSpecies);
      alert('Error updating species classification. Please try again.');
    }
  }, [excelData, globalImageSpecies]);

  // Handle export tagged data (show download options)
  const handleExportTaggedData = useCallback(async () => {
    if (!excelData) return;
    
    setShowDownloadOptions(true);
  }, [excelData]);

  // Handle download with selected options
  const handleDownloadWithOptions = useCallback(async () => {
    if (!excelData) return;
    
    setIsExporting(true);
    setShowDownloadOptions(false);
    
    try {
      const downloads = [];
      
      // Download tagged Excel if selected
      if (downloadOptions.taggedExcel) {
        const response = await fetch('/api/export-tags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: excelData.filename }),
        });
        
        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `tagged_data_${excelData.filename.replace('.xlsx', '')}.xlsx`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
          downloads.push('Tagged Excel');
        }
      }
      
      // Download updated CSV if selected
      if (downloadOptions.updatedCsv) {
        const response = await fetch('/api/download-csv');
        
        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'updated_species_data.csv';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
          downloads.push('Updated CSV');
        }
      }
      
      // Download original data if selected
      if (downloadOptions.originalData) {
        const response = await fetch(`/api/download-original/${excelData._id}`);
        
        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `original_${excelData.filename}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
          downloads.push('Original Data');
        }
      }
      
      if (downloads.length > 0) {
        alert(`Downloaded: ${downloads.join(', ')}`);
      } else {
        alert('No files selected for download');
      }
      
    } catch (error) {
      console.error('Download failed:', error);
      alert('Download failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [excelData, downloadOptions]);

  // Get current row data and image paths
  const currentRowData = useMemo(() => {
    if (!excelData || selectedRow === null) return null;
    const row = excelData.data[selectedRow];
    const imagePaths = getImagePaths(row);
    
    
    return {
      row,
      imagePaths
    };
  }, [excelData, selectedRow, selectedSheet]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!excelData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar 
          selectedSheet={selectedSheet} 
          sheets={sheets} 
          onSheetChange={handleSheetChange}
          onExport={handleExportTaggedData}
          isExporting={isExporting}
        />
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Select a Taxonomic Level</h1>
            <p className="text-gray-600">Choose a taxonomic level from the dropdown above to view the data and images.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar 
        selectedSheet={selectedSheet} 
        sheets={sheets} 
        onSheetChange={handleSheetChange}
        onExport={handleExportTaggedData}
        isExporting={isExporting}
      />

      <div className="flex">
        {/* Main Content */}
        <div className={`flex-1 transition-all duration-300 ${showImageSidebar ? 'mr-[800px]' : ''}`}>
          <div className="p-6">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Data Table</h2>
                <p className="text-sm text-gray-600">Select rows to view images and add tags</p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Select
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Human
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        AI
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {excelData.data.map((row, index) => (
                      <tr 
                        key={index} 
                        className={`${selectedRow === index ? 'bg-blue-50' : 'hover:bg-gray-50'} cursor-pointer`} 
                        onClick={() => handleRowSelect(index)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="radio"
                            checked={selectedRow === index}
                            onChange={() => handleRowSelect(index)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {row.human}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {row.ai}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Image Sidebar */}
        {showImageSidebar && currentRowData && (
          <div className="fixed right-0 top-16 bottom-0 w-[800px] bg-white shadow-lg border-l border-gray-200 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <ImageIcon className="w-5 h-5 mr-2" />
                  Images & Tags
                </h3>
                <button
                  onClick={() => setShowImageSidebar(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              {/* Image List */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Row {selectedRow! + 1}</h4>
                <div className="border border-gray-200 rounded-lg">
                  <div className="flex items-center p-3 bg-blue-50 rounded-t-lg">
                    <ImageIcon className="w-5 h-5 mr-2 text-blue-600" />
                    <span className="text-sm text-gray-700 font-medium">
                      {currentRowData.imagePaths.length > 0 
                        ? `${currentRowData.imagePaths.length} images` 
                        : 'No images'
                      }
                    </span>
                    <span className="text-xs text-gray-500 ml-auto">
                      {Object.keys(globalImageTags).filter(imagePath => 
                        currentRowData.imagePaths.includes(imagePath) && 
                        globalImageTags[imagePath].length > 0
                      ).length} images tagged
                    </span>
                  </div>
                  
                  {currentRowData.imagePaths.length > 0 ? (
                    <div className="p-3">
                      <div className="grid grid-cols-1 gap-1 max-h-32 overflow-y-auto">
                        {currentRowData.imagePaths.map((filename, idx) => {
                          const hasImageTags = (globalImageTags[filename]?.length || 0) > 0;
                          const hasSpeciesClassification = globalImageSpecies[filename];
                          return (
                            <div 
                              key={idx} 
                              className={`flex items-center p-2 rounded text-xs transition-colors cursor-pointer ${
                                idx === currentImageIndex ? 'bg-blue-100 text-blue-700' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                              }`}
                              onClick={() => setCurrentImageIndex(idx)}
                            >
                              <ImageIcon className="w-3 h-3 mr-2 text-gray-400" />
                              <span className="truncate flex-1">{filename}</span>
                              <div className="flex items-center ml-1 space-x-1">
                                {hasImageTags && (
                                  <div className="flex items-center">
                                    <TagIcon className="w-3 h-3 text-green-500" />
                                    <span className="text-green-600 font-medium ml-1">
                                      {globalImageTags[filename]?.length || 0}
                                    </span>
                                  </div>
                                )}
                                {hasSpeciesClassification && (
                                  <div className="flex items-center">
                                    <span className="text-blue-500 font-medium">🐾</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3">
                      <div className="text-xs text-gray-500">No images found for this row</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Image Display */}
              <div className="mb-6">
                <ImageDisplay
                  imagePaths={currentRowData.imagePaths}
                  currentIndex={currentImageIndex}
                  onIndexChange={setCurrentImageIndex}
                  rowData={{ human: currentRowData.row.human, ai: currentRowData.row.ai }}
                />
              </div>

              {/* Tags Section */}
              <div>
                <h5 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                  <TagIcon className="w-4 h-4 mr-1" />
                  Tags for Current Image
                </h5>
                <div className="mb-3 p-2 bg-blue-50 rounded text-xs text-blue-700">
                  Tagging: {currentRowData.imagePaths[currentImageIndex]}
                </div>
                <div className="space-y-2">
                  {TAGS.map((tag) => {
                    const currentImagePath = currentRowData.imagePaths[currentImageIndex];
                    const isChecked = globalImageTags[currentImagePath]?.includes(tag) || false;
                    
                    return (
                      <label key={tag} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleTagSelect(selectedRow!, tag, currentImagePath)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
                        />
                        <span className="text-sm text-gray-700">{tag}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Species Classification Section */}
              <div className="mt-6">
                <h5 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                  🐾 Species Classification
                </h5>
                <div className="mb-3 p-2 bg-green-50 rounded text-xs text-green-700">
                  Update species for: {currentRowData.imagePaths[currentImageIndex]}
                </div>
                <select 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={globalImageSpecies[currentRowData.imagePaths[currentImageIndex]] || ""}
                  onChange={(e) => handleSpeciesClassification(selectedRow!, e.target.value, currentRowData.imagePaths[currentImageIndex])}
                >
                  <option value="" disabled>Select Species Classification</option>
                  <option value="CLEAR_SELECTION" className="text-red-600 font-medium">
                    ✕ Clear Selection
                  </option>
                  {SPECIES_LIST.map((species) => (
                    <option key={species} value={species}>
                      {species}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Download Options Modal */}
      {showDownloadOptions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Select Files to Download</h3>
            
            <div className="space-y-3 mb-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={downloadOptions.taggedExcel}
                  onChange={(e) => setDownloadOptions(prev => ({ ...prev, taggedExcel: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                />
                <span className="text-sm text-gray-700">Tagged Excel Analysis</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={downloadOptions.updatedCsv}
                  onChange={(e) => setDownloadOptions(prev => ({ ...prev, updatedCsv: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                />
                <span className="text-sm text-gray-700">Updated Species CSV</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={downloadOptions.originalData}
                  onChange={(e) => setDownloadOptions(prev => ({ ...prev, originalData: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                />
                <span className="text-sm text-gray-700">Original Excel Data</span>
              </label>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDownloadOptions(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDownloadWithOptions}
                disabled={!downloadOptions.taggedExcel && !downloadOptions.updatedCsv && !downloadOptions.originalData}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Download Selected
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}