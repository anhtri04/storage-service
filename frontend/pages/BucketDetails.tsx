
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, File, Download, Trash2, Search, FileText, Image, FileCode, Music, Video, X, Loader2, Check, Square } from 'lucide-react';
import { useFileDrop } from '../hooks/useFileDrop';
import { useToast } from '../hooks/useToast';
import { UploadProgress } from '../components/UploadProgress';
import { ToastContainer } from '../components/ToastContainer';
import { api } from '../services/api';
import { ApiResponse, Bucket, FileEntry, FileUploadResponse, FileUploadProgress } from '../types';
import { validateFile, uploadFilesWithProgress, checkDuplicates } from '../utils/uploadUtils';
import emptyBucket from '../assets/empty-bucket.png';
import FilePreviewModal from '../components/FilePreviewModal';

const BucketDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const bucketId = id ? id : null;
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [headerCheckboxState, setHeaderCheckboxState] = useState<'unchecked' | 'checked' | 'indeterminate'>('unchecked');
  const [previewFile, setPreviewFile] = useState<FileEntry | null>(null);
  const navigate = useNavigate();
  const tableRef = useRef<HTMLDivElement>(null);
  const [uploads, setUploads] = useState<FileUploadProgress[]>([]);
  const { showToast } = useToast();

  const fetchFiles = async () => {
    if (!bucketId) return;
    try {
      const res = await api.getBucketById(bucketId);
      if (res.ok) {
        const apiResponse: ApiResponse<Bucket> = await res.json();
        setFiles(apiResponse.result?.files || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [bucketId]);

  // Navigation guard - prevent leaving page during uploads
  useEffect(() => {
    const hasPendingUploads = uploads.some((u) => u.status === 'uploading' || u.status === 'pending');

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasPendingUploads) {
        e.preventDefault();
        e.returnValue = 'Uploads in progress. Are you sure you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [uploads]);

  // Offline/online detection
  useEffect(() => {
    const handleOffline = () => {
      if (uploads.some((u) => u.status === 'uploading' || u.status === 'pending')) {
        showToast('error', 'You are offline. Uploads have been paused.');
      }
    };

    const handleOnline = () => {
      if (uploads.some((u) => u.status === 'pending')) {
        showToast('success', 'Back online. You can retry your uploads.');
      }
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [uploads, showToast]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !bucketId) return;

    setUploading(true);
    try {
      const res = await api.uploadFile(bucketId, file);
      if (res.ok) {
        const apiResponse: ApiResponse<FileUploadResponse> = await res.json();
        if (apiResponse.result) {
          alert(`File "${apiResponse.result.originalFileName}" uploaded successfully!`);
          fetchFiles();
        }
      } else {
        const errorData = await res.json();
        alert(`File upload failed: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('An error occurred during file upload. Please try again.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleFileDrop = async (droppedFiles: File[]) => {
    if (!bucketId) return;

    // Check for duplicates
    const duplicates = checkDuplicates(droppedFiles, files);
    if (duplicates.length > 0) {
      const duplicateNames = duplicates.map((f) => f.name).join(', ');
      showToast('error', `Files already exist: ${duplicateNames}`);
      return;
    }

    // Validate files
    const validationErrors: string[] = [];
    const validFiles = droppedFiles.filter((file) => {
      const error = validateFile(file);
      if (error) {
        validationErrors.push(error);
        return false;
      }
      return true;
    });

    // Show validation errors
    validationErrors.forEach((error) => {
      showToast('error', error);
    });

    if (validFiles.length === 0) {
      return;
    }

    // Create upload progress entries
    const newUploads: FileUploadProgress[] = validFiles.map((file) => ({
      id: crypto.randomUUID(),
      file,
      status: 'pending',
      progress: 0,
    }));

    setUploads((prev) => [...prev, ...newUploads]);

    // Map file to upload ID
    const fileToIdMap = new Map<File, string>();
    newUploads.forEach((upload) => {
      fileToIdMap.set(upload.file, upload.id);
    });

    // Upload files
    await uploadFilesWithProgress(
      validFiles,
      bucketId,
      (id, progress, status, error) => {
        setUploads((prev) =>
          prev.map((u) =>
            u.id === id ? { ...u, progress, status, error } : u
          )
        );
      },
      (file) => fileToIdMap.get(file) || ''
    );

    // Show success/error toasts
    const successful = newUploads.filter((u) => u.status === 'success');
    const failed = newUploads.filter((u) => u.status === 'error');

    if (successful.length > 0) {
      showToast('success', `Uploaded ${successful.length} file${successful.length > 1 ? 's' : ''}`);
    }

    if (failed.length > 0) {
      failed.forEach((u) => {
        if (u.error) {
          showToast('error', u.error);
        }
      });
    }

    // Refresh files
    fetchFiles();
  };

  // Page-level drag & drop
  const { isDragging, dragHandlers } = useFileDrop({
    onDrop: handleFileDrop,
  });

  const handleDeleteFile = async (fileId: string) => {
    if (window.confirm('Delete this file permanently?')) {
      try {
        await api.deleteFile(fileId);
        fetchFiles();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleDownloadFile = async (fileId: string, fileName: string) => {
    try {
      const res = await api.downloadFile(fileId);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Update header checkbox state when selection changes
  useEffect(() => {
    if (selectedFileIds.size === 0) {
      setHeaderCheckboxState('unchecked');
    } else if (selectedFileIds.size === files.length) {
      setHeaderCheckboxState('checked');
    } else {
      setHeaderCheckboxState('indeterminate');
    }
  }, [selectedFileIds, files.length]);

  // Handle row click - select on first click behavior
  const handleRowClick = useCallback((e: React.MouseEvent, fileId: string) => {
    // Don't select if clicking on checkbox, download button, or delete button
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input[type="checkbox"]')) {
      return;
    }

    if (e.ctrlKey || e.metaKey) {
      // Ctrl+click: Toggle selection
      setSelectedFileIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(fileId)) {
          newSet.delete(fileId);
        } else {
          newSet.add(fileId);
        }
        return newSet;
      });
    } else {
      // Normal click: Clear previous selection, select clicked file
      // If already selected, no change (must use checkbox to deselect)
      if (!selectedFileIds.has(fileId)) {
        setSelectedFileIds(new Set([fileId]));
      }
    }
  }, [selectedFileIds]);

  // Handle header checkbox click - select all / deselect all
  const handleHeaderCheckboxClick = useCallback(() => {
    if (headerCheckboxState === 'checked') {
      // Deselect all
      setSelectedFileIds(new Set());
    } else {
      // Select all files in bucket (ignores search filter)
      setSelectedFileIds(new Set(files.map(f => f.id)));
    }
  }, [headerCheckboxState, files]);

  // Handle row checkbox click - toggle individual file
  const handleRowCheckboxClick = useCallback((e: React.ChangeEvent<HTMLInputElement>, fileId: string) => {
    setSelectedFileIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  }, []);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ctrl+A: Select all files
    if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
      // Only handle if focus is within the table
      if (tableRef.current?.contains(document.activeElement)) {
        e.preventDefault();
        setSelectedFileIds(new Set(files.map(f => f.id)));
      }
    }
    // Escape: Clear selection
    if (e.key === 'Escape') {
      setSelectedFileIds(new Set());
    }
  }, [files]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const handleBulkDelete = async () => {
    if (selectedFileIds.size === 0) return;

    const count = selectedFileIds.size;
    if (!window.confirm(`Are you sure you want to delete ${count} file${count !== 1 ? 's' : ''}? This action cannot be undone.`)) {
      return;
    }

    setIsProcessing(true);
    try {
      const result = await api.deleteMultipleFiles(Array.from(selectedFileIds));

      if (result.failed.length > 0) {
        alert(`Deleted ${result.success.length} file(s). ${result.failed.length} file(s) failed to delete.`);
      } else {
        alert(`Successfully deleted ${result.success.length} file(s).`);
      }

      // Remove deleted files from selection (auto-cleanup)
      setSelectedFileIds(prev => {
        const newSet = new Set(prev);
        result.success.forEach(id => newSet.delete(id));
        return newSet;
      });

      fetchFiles();
    } catch (error) {
      console.error('Bulk delete error:', error);
      alert('An error occurred during bulk delete. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Unified download handler - single file downloads directly, multiple files as ZIP
  const handleBulkDownload = async () => {
    if (selectedFileIds.size === 0) return;

    setIsProcessing(true);
    try {
      if (selectedFileIds.size === 1) {
        // Single file: direct download using existing function
        const fileId = Array.from(selectedFileIds)[0];
        const file = files.find(f => f.id === fileId);
        if (file) {
          await handleDownloadFile(file.id, file.name);
        }
      } else {
        // Multiple files: ZIP download
        const selectedFiles = files.filter(f => selectedFileIds.has(f.id));
        const fileIds = selectedFiles.map(f => f.id);
        const fileNames = selectedFiles.map(f => f.name);

        await api.downloadFilesAsZip(fileIds, fileNames);
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('An error occurred during download. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getFileIcon = (mime: string) => {
    if (mime.startsWith('image/')) return <Image className="text-blue-500 w-5 h-5" />;
    if (mime.startsWith('video/')) return <Video className="text-purple-500 w-5 h-5" />;
    if (mime.startsWith('audio/')) return <Music className="text-pink-500 w-5 h-5" />;
    if (mime.includes('javascript') || mime.includes('json') || mime.includes('html')) return <FileCode className="text-yellow-500 w-5 h-5" />;
    if (mime.includes('pdf') || mime.includes('text')) return <FileText className="text-red-500 w-5 h-5" />;
    return <File className="text-gray-400 w-5 h-5" />;
  };

  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div {...dragHandlers} className="min-h-screen bg-gray-50 relative">
      {/* Drag overlay */}
      {isDragging && (
        <div className="fixed inset-0 border-4 border-dashed border-[#00ED64] bg-green-50/30 z-[60] flex items-center justify-center pointer-events-none">
          <div className="bg-white rounded-xl p-8 shadow-lg">
            <Upload className="w-16 h-16 text-[#00ED64] mx-auto mb-4" />
            <p className="text-lg font-semibold text-gray-900">Drop files to upload</p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/')}
          className="p-2 hover:bg-white border border-transparent hover:border-gray-200 rounded-full transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-black">Files</h1>
          <p className="text-gray-500 text-sm">Managing contents for your bucket</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-3 bg-gray-50/50">
          <div className="flex items-center gap-3 w-full">
            <div className="relative w-64 flex-shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#00ED64] focus:border-transparent outline-none"
                placeholder="Search files..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Selection info - appears next to searchbar when files are selected */}
            {selectedFileIds.size > 0 && (
              <span className="font-medium text-gray-700 text-sm whitespace-nowrap animate-in fade-in-0 slide-in-from-left-2 duration-200" aria-live="polite">
                {selectedFileIds.size} file{selectedFileIds.size > 1 ? 's' : ''} selected
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Action buttons - appear when files are selected */}
            {selectedFileIds.size > 0 && (
              <>
                <button
                  onClick={handleBulkDownload}
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap animate-in fade-in-0 slide-in-from-right-2 duration-200"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  Download
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap animate-in fade-in-0 slide-in-from-right-2 duration-200"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Delete
                </button>
              </>
            )}

            <div className="relative">
              <input
                type="file"
                id="fileUpload"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            <label
              htmlFor="fileUpload"
              className="flex items-center justify-center gap-2 bg-[#028546] text-white px-4 py-2 rounded-lg font-bold text-sm cursor-pointer hover:bg-[#00D65A] transition-colors disabled:opacity-50 min-w-[140px] whitespace-nowrap"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload File
                </>
              )}
            </label>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto" ref={tableRef}>
          <table className="w-full text-left text-sm">
            <thead className="group/thead bg-white border-b border-gray-200 text-gray-500 font-medium uppercase text-[11px] tracking-wider">
              <tr>
                <th className="px-6 py-4 w-12 relative">
                  <div className={`flex items-center justify-center ${headerCheckboxState === 'unchecked' ? 'opacity-0 group-hover/thead:opacity-100' : 'opacity-100'} transition-opacity duration-200`}>
                    <input
                      type="checkbox"
                      checked={headerCheckboxState === 'checked'}
                      ref={(el) => {
                        if (el) el.indeterminate = headerCheckboxState === 'indeterminate';
                      }}
                      onChange={handleHeaderCheckboxClick}
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
                      aria-label={headerCheckboxState === 'checked' ? 'Deselect all files' : 'Select all files'}
                    />
                  </div>
                </th>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Size</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Created At</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredFiles.map((file) => (
                <tr
                  key={file.id}
                  className={`transition-colors group cursor-pointer ${
                    selectedFileIds.has(file.id)
                      ? 'bg-green-50 hover:bg-green-100'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={(e) => handleRowClick(e, file.id)}
                  onDoubleClick={() => setPreviewFile(file)}
                >
                  <td className="px-6 py-4 w-12">
                    <div className={`flex items-center justify-center ${selectedFileIds.has(file.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity duration-200`}>
                      <input
                        type="checkbox"
                        checked={selectedFileIds.has(file.id)}
                        onChange={(e) => handleRowCheckboxClick(e, file.id)}
                        className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
                        aria-label={`Select ${file.name}`}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {getFileIcon(file.type)}
                      <span className="font-medium text-black truncate max-w-[200px]">{file.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{formatSize(file.size)}</td>
                  <td className="px-6 py-4 text-gray-500 capitalize">{file.type.split('/')[1] || 'Unknown'}</td>
                  <td className="px-6 py-4 text-gray-500">{new Date(file.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadFile(file.id, file.name);
                        }}
                        className="p-1.5 hover:bg-green-100 text-green-700 rounded-md transition-colors"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFile(file.id);
                        }}
                        className="p-1.5 hover:bg-red-100 text-red-600 rounded-md transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredFiles.length === 0 && !loading && (
            <div className="py-20 text-center text-gray-500">
              <img src={emptyBucket} alt="Empty Bucket" className="w-84 h-48 mx-auto mb-4" />
              <p>{searchTerm ? 'No files match your search.' : 'This bucket is empty.'}</p>
            </div>
          )}

          {loading && (
            <div className="py-20 flex flex-col items-center justify-center gap-4 text-gray-400">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-[#00ED64]" />
              <p>Loading files...</p>
            </div>
          )}
        </div>
      </div>

      {/* Processing overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 flex flex-col items-center gap-4 shadow-xl">
            <Loader2 className="w-8 h-8 text-[#00ED64] animate-spin" />
            <p className="text-gray-700 font-medium">Processing files...</p>
          </div>
        </div>
      )}

      {/* File preview modal */}
      <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />

      {/* Toast and upload progress */}
      <ToastContainer />
      <UploadProgress uploads={uploads} onClose={() => setUploads([])} />
    </div>
  );
};

export default BucketDetails;
