'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileSpreadsheet, AlertCircle } from 'lucide-react';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
          selectedFile.name.endsWith('.xlsx')) {
        setFile(selectedFile);
        setError(null);
      } else {
        setError('Please select a valid .xlsx file');
        setFile(null);
      }
    }
  };

  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')) {
        setCsvFile(selectedFile);
        setError(null);
      } else {
        setError('Please select a valid .csv file');
        setCsvFile(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      // Upload Excel file first
      const excelFormData = new FormData();
      excelFormData.append('file', file);

      const excelResponse = await fetch('/api/upload', {
        method: 'POST',
        body: excelFormData,
      });

      if (!excelResponse.ok) {
        throw new Error('Excel upload failed');
      }

      const excelResult = await excelResponse.json();

      // Upload CSV file if provided
      if (csvFile) {
        const csvFormData = new FormData();
        csvFormData.append('csvFile', csvFile);

        const csvResponse = await fetch('/api/upload-csv', {
          method: 'POST',
          body: csvFormData,
        });

        if (!csvResponse.ok) {
          console.warn('CSV upload failed, but Excel was uploaded successfully');
        } else {
          console.log('Both Excel and CSV files uploaded successfully');
        }
      }

      // Navigate to dashboard regardless of CSV upload status
      router.push(`/dashboard/${excelResult.id}`);
    } catch (err) {
      setError('Failed to upload files. Please try again.');
      console.error('Upload error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <FileSpreadsheet className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Upload Excel File</h1>
          <p className="text-gray-600">Select a .xlsx file to get started</p>
        </div>

        <div className="space-y-6">
          {/* Excel File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Choose Excel File (.xlsx)
            </label>
            <div className="relative">
              <input
                type="file"
                accept=".xlsx"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
            {file && (
              <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center">
                  <FileSpreadsheet className="w-5 h-5 text-green-600 mr-2" />
                  <span className="text-sm text-green-800">{file.name}</span>
                </div>
              </div>
            )}
          </div>

          {/* CSV File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Choose CSV File (.csv) - Optional
            </label>
            <p className="text-xs text-gray-500 mb-2">Upload your species classification CSV to enable automatic updates</p>
            <div className="relative">
              <input
                type="file"
                accept=".csv"
                onChange={handleCsvFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
              />
            </div>
            {csvFile && (
              <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center">
                  <FileSpreadsheet className="w-5 h-5 text-green-600 mr-2" />
                  <span className="text-sm text-green-800">{csvFile.name}</span>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
              <span className="text-sm text-red-800">{error}</span>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 mr-2" />
                Upload {csvFile ? 'Files' : 'File'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
