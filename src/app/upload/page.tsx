'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Upload, FileSpreadsheet, AlertCircle, Cloud, ArrowLeft } from 'lucide-react';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBucket, setSelectedBucket] = useState<string>('');
  const [buckets, setBuckets] = useState<Array<{name: string, location: string}>>([]);
  const [loadingBuckets, setLoadingBuckets] = useState(false);
  const [bucketLoadMessage, setBucketLoadMessage] = useState<string | null>(null);
  const router = useRouter();

  // Fetch GCP buckets on component mount (needs session cookie for protected API)
  useEffect(() => {
    const fetchBuckets = async () => {
      setLoadingBuckets(true);
      setBucketLoadMessage(null);
      try {
        const response = await fetch('/api/gcp-buckets', {
          credentials: 'include',
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          if (response.status === 401 || response.status === 404) {
            setError(
              'Could not load buckets (session). Refresh the page or sign in again.'
            );
          } else {
            setError(
              data.error ||
                'Failed to load GCP buckets. Check server logs and GCP credentials.'
            );
          }
          setBuckets([]);
          return;
        }

        if (data.success && Array.isArray(data.buckets)) {
          setBuckets(data.buckets);
          if (data.buckets.length === 0) {
            setBucketLoadMessage(
              'No buckets found in this GCP project. Create a bucket in Google Cloud Console or grant this service account Storage Admin / storage.buckets.list.'
            );
          }
        } else {
          setError('Failed to load GCP buckets. Please check your credentials.');
          setBuckets([]);
        }
      } catch {
        setError('Failed to connect to GCP. Please check your credentials.');
        setBuckets([]);
      } finally {
        setLoadingBuckets(false);
      }
    };

    fetchBuckets();
  }, []);

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
    if (!selectedBucket) {
      setError('Please select a GCP bucket for images');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const excelFormData = new FormData();
      excelFormData.append('file', file);
      excelFormData.append('bucketName', selectedBucket);

      const excelResponse = await fetch('/api/upload', {
        method: 'POST',
        body: excelFormData,
        credentials: 'include',
      });

      if (!excelResponse.ok) {
        throw new Error('Excel upload failed');
      }
      const excelResult = await excelResponse.json();

      if (csvFile && excelResult.uploadGroupId) {
        const csvFormData = new FormData();
        csvFormData.append('csvFile', csvFile);
        csvFormData.append('uploadGroupId', excelResult.uploadGroupId);
        const csvResponse = await fetch('/api/upload-csv', {
          method: 'POST',
          body: csvFormData,
          credentials: 'include',
        });
        if (!csvResponse.ok) {
          console.warn('CSV upload failed, but Excel was uploaded successfully');
        }
      }

      router.push(`/dashboard/${excelResult.id}?source=upload`);
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
        <Link
          href="/batches"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to batches
        </Link>
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

          {/* GCP Bucket Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select GCP Bucket for Images
            </label>
            <p className="text-xs text-gray-500 mb-2">Choose the GCP bucket containing your camera trap images</p>
            <div className="relative">
              <select
                value={selectedBucket}
                onChange={(e) => setSelectedBucket(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loadingBuckets}
              >
                <option value="">
                  {loadingBuckets ? 'Loading buckets...' : 'Select a GCP bucket'}
                </option>
                {buckets.map((bucket) => (
                  <option key={bucket.name} value={bucket.name}>
                    {bucket.name} ({bucket.location})
                  </option>
                ))}
              </select>
              <Cloud className="absolute right-3 top-2.5 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
            {bucketLoadMessage && !error && (
              <p className="mt-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">
                {bucketLoadMessage}
              </p>
            )}
            {selectedBucket && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center">
                  <Cloud className="w-5 h-5 text-blue-600 mr-2" />
                  <span className="text-sm text-blue-800">Selected: {selectedBucket}</span>
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
            disabled={!file || !selectedBucket || isUploading}
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
