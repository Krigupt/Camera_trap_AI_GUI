'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { ChevronDownIcon, ImageIcon, TagIcon } from 'lucide-react';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';

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
  }>;
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
const Navbar = ({ selectedSheet, sheets, onSheetChange }: {
  selectedSheet: string;
  sheets: Sheet[];
  onSheetChange: (sheetId: string) => void;
}) => (
  <nav className="bg-white shadow-sm border-b">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between h-16">
        <div className="flex items-center">
          <h1 className="text-xl font-semibold text-gray-900">Excel Data Dashboard</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <Menu as="div" className="relative">
            <Menu.Button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              <span>{selectedSheet || 'Select Taxonomic Level'}</span>
              <ChevronDownIcon className="w-4 h-4" />
            </Menu.Button>
            
            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                <div className="py-1">
                  {sheets.map((sheet) => (
                    <Menu.Item key={sheet.id}>
                      {({ active }) => (
                        <button
                          onClick={() => onSheetChange(sheet.id)}
                          className={`${
                            active ? 'bg-gray-100' : ''
                          } block w-full text-left px-4 py-2 text-sm text-gray-700`}
                        >
                          {sheet.sheetName}
                        </button>
                      )}
                    </Menu.Item>
                  ))}
                </div>
              </Menu.Items>
            </Transition>
          </Menu>
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

  // Fetch initial data and sheets
  const fetchData = useCallback(async () => {
    try {
      const response = await fetch(`/api/data/${params.id}`);
      const data = await response.json();
      
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
  }, [params.id]);

  // Handle sheet change
  const handleSheetChange = useCallback(async (sheetId: string) => {
    try {
      const response = await fetch(`/api/data/${sheetId}`);
      const data = await response.json();
      
      
      setExcelData(data);
      setSelectedSheet(data.sheetName);
      setSelectedRow(null);
      setShowImageSidebar(false);
    } catch (error) {
      console.error('Error fetching sheet data:', error);
    }
  }, []);

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

  // Handle tag selection
  const handleTagSelect = useCallback(async (rowIndex: number, tag: string) => {
    if (!excelData) return;

    const updatedData = { ...excelData };
    const row = updatedData.data[rowIndex];
    
    if (!row.tags) {
      row.tags = [];
    }
    
    if (row.tags.includes(tag)) {
      row.tags = row.tags.filter(t => t !== tag);
    } else {
      row.tags.push(tag);
    }

    setExcelData(updatedData);

    try {
      await fetch(`/api/data/${excelData._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: updatedData.data })
      });
    } catch (error) {
      console.error('Error updating tags:', error);
    }
  }, [excelData]);

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
                      {currentRowData.row.tags?.length || 0} tags
                    </span>
                  </div>
                  
                  {currentRowData.imagePaths.length > 0 ? (
                    <div className="p-3">
                      <div className="grid grid-cols-1 gap-1 max-h-32 overflow-y-auto">
                        {currentRowData.imagePaths.map((filename, idx) => (
                          <div 
                            key={idx} 
                            className={`flex items-center p-2 rounded text-xs transition-colors cursor-pointer ${
                              idx === currentImageIndex ? 'bg-blue-100 text-blue-700' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                            }`}
                            onClick={() => setCurrentImageIndex(idx)}
                          >
                            <ImageIcon className="w-3 h-3 mr-2 text-gray-400" />
                            <span className="truncate">{filename}</span>
                          </div>
                        ))}
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
                  Tags
                </h5>
                <div className="space-y-2">
                  {TAGS.map((tag) => (
                    <label key={tag} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={currentRowData.row.tags?.includes(tag) || false}
                        onChange={() => handleTagSelect(selectedRow!, tag)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
                      />
                      <span className="text-sm text-gray-700">{tag}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}