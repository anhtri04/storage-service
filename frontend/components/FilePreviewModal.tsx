import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Download, File, Image, FileText, Music, Video, FileCode, Loader2, Plus, Minus } from 'lucide-react';
import { FileEntry } from '../types';
import { api } from '../services/api';

interface FilePreviewModalProps {
  file: FileEntry | null;
  onClose: () => void;
}

const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ file, onClose }) => {
  const [textContent, setTextContent] = useState<string>('');
  const [blobUrl, setBlobUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const modalRef = useRef<HTMLDivElement>(null);
  const blobUrlRef = useRef<string>('');

  // Fetch file content for preview (images, pdf, video, audio)
  useEffect(() => {
    if (!file) return;

    // Cleanup previous blob URL
    if (blobUrlRef.current) {
      window.URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = '';
      setBlobUrl('');
    }

    const isTextFile = file.type.startsWith('text/') ||
                       file.type.includes('json') ||
                       file.type.includes('javascript') ||
                       file.type.includes('html') ||
                       file.type.includes('css') ||
                       file.type.includes('xml');

    const isPreviewable = file.type.startsWith('image/') ||
                          file.type === 'application/pdf' ||
                          file.type.startsWith('video/') ||
                          file.type.startsWith('audio/');

    // Fetch blob for previewable files
    if (isPreviewable) {
      setLoading(true);
      setError(null);
      api.downloadFile(file.id)
        .then(res => {
          if (res.ok) {
            return res.blob();
          }
          throw new Error('Failed to load file');
        })
        .then(blob => {
          const url = window.URL.createObjectURL(blob);
          blobUrlRef.current = url;
          setBlobUrl(url);
          setLoading(false);
        })
        .catch(err => {
          console.error('Error loading file:', err);
          setError('Failed to load file');
          setLoading(false);
        });
    } else if (isTextFile) {
      // Fetch text content
      setLoading(true);
      setError(null);
      api.downloadFile(file.id)
        .then(res => {
          if (res.ok) {
            return res.text();
          }
          throw new Error('Failed to load file');
        })
        .then(text => {
          setTextContent(text);
          setLoading(false);
        })
        .catch(err => {
          console.error('Error loading text file:', err);
          setError('Failed to load file content');
          setLoading(false);
        });
    } else {
      setLoading(false);
    }

    return () => {
      if (blobUrlRef.current) {
        window.URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = '';
        setBlobUrl('');
      }
      setTextContent('');
    };
  }, [file]);

  // Reset zoom when file changes
  useEffect(() => {
    setZoom(100);
  }, [file]);

  // Handle escape key and click outside
  useEffect(() => {
    if (!file) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [file, onClose]);

  // Handle download
  const handleDownload = useCallback(async () => {
    if (!file) return;
    try {
      const res = await api.downloadFile(file.id);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (e) {
      console.error(e);
    }
  }, [file]);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 25, 300));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 25, 25));
  }, []);

  // Render preview content based on file type
  const renderPreview = () => {
    if (!file) return null;

    if (loading) {
      return (
        <div className="flex items-center justify-center h-full min-h-[300px]">
          <div className="flex flex-col items-center gap-4 text-gray-400">
            <Loader2 className="w-12 h-12 animate-spin text-[#00ED64]" />
            <p>Loading preview...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-full min-h-[300px]">
          <div className="flex flex-col items-center gap-4 text-center">
            <File className="w-16 h-16 text-gray-300" />
            <p className="text-gray-600">{error}</p>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-[#028546] text-white rounded-lg hover:bg-[#00D65A] transition-colors"
            >
              <Download className="w-4 h-4" />
              Download File
            </button>
          </div>
        </div>
      );
    }

    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';
    const isVideo = file.type.startsWith('video/');
    const isAudio = file.type.startsWith('audio/');
    const isTextFile = file.type.startsWith('text/') ||
                       file.type.includes('json') ||
                       file.type.includes('javascript') ||
                       file.type.includes('html') ||
                       file.type.includes('css') ||
                       file.type.includes('xml');

    // Image preview with zoom
    if (isImage && blobUrl) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>1/1</span>
          </div>
          <div className="overflow-auto w-full h-[60vh] flex items-center justify-center bg-gray-50">
            <img
              src={blobUrl}
              alt={file.name}
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center' }}
              className="max-w-full max-h-full object-contain"
              onError={() => setError('Failed to load image')}
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleZoomOut}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Zoom out"
            >
              <Minus className="w-5 h-5 text-gray-600" />
            </button>
            <span className="text-sm text-gray-600 min-w-[3rem] text-center">{zoom}%</span>
            <button
              onClick={handleZoomIn}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Zoom in"
            >
              <Plus className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      );
    }

    // PDF preview - use iframe with blob URL
    if (isPdf && blobUrl) {
      return (
        <iframe
          src={blobUrl}
          className="w-full h-[70vh] rounded-lg border-0"
          title={file.name}
          onError={() => setError('Failed to load PDF')}
        />
      );
    }

    // Text file preview
    if (isTextFile) {
      return (
        <div className="w-full h-[70vh] overflow-auto">
          <pre className="p-4 text-sm bg-gray-900 text-gray-100 rounded-lg overflow-auto">
            <code>{textContent}</code>
          </pre>
        </div>
      );
    }

    // Video preview
    if (isVideo && blobUrl) {
      return (
        <div className="flex items-center justify-center h-full">
          <video
            src={blobUrl}
            controls
            className="max-w-full max-h-[70vh]"
            onError={() => setError('Failed to load video')}
          >
            Your browser does not support video playback.
          </video>
        </div>
      );
    }

    // Audio preview
    if (isAudio && blobUrl) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-8">
          <div className="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center">
            <Music className="w-16 h-16 text-gray-400" />
          </div>
          <audio
            src={blobUrl}
            controls
            className="w-full max-w-md"
            onError={() => setError('Failed to load audio')}
          >
            Your browser does not support audio playback.
          </audio>
        </div>
      );
    }

    // Unsupported file type
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
        {getFileIcon(file.type, 64)}
        <p className="text-gray-600 mt-4">Preview not available for this file type</p>
        <p className="text-gray-400 text-sm mt-2">{file.type}</p>
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-4 py-2 bg-[#028546] text-white rounded-lg hover:bg-[#00D65A] transition-colors mt-4"
        >
          <Download className="w-4 h-4" />
          Download File
        </button>
      </div>
    );
  };

  if (!file) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center animate-in fade-in-0 duration-200">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" />

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative bg-white rounded-xl shadow-2xl w-[1200px] h-[650px] flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {getFileIcon(file.type)}
            <h2 className="text-lg font-semibold text-gray-900 truncate" title={file.name}>
              {file.name}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-3 py-2 bg-[#028546] text-white text-sm font-medium rounded-lg hover:bg-[#00D65A] transition-colors"
              title="Download file"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              title="Close"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {renderPreview()}
        </div>
      </div>
    </div>
  );
};

// Helper function to get file icon
const getFileIcon = (mime: string, size: number = 20) => {
  const sizeClass = size === 64 ? 'w-16 h-16' : 'w-5 h-5';
  if (mime.startsWith('image/')) return <Image className={`text-blue-500 ${sizeClass}`} />;
  if (mime.startsWith('video/')) return <Video className={`text-purple-500 ${sizeClass}`} />;
  if (mime.startsWith('audio/')) return <Music className={`text-pink-500 ${sizeClass}`} />;
  if (mime.includes('javascript') || mime.includes('json') || mime.includes('html')) return <FileCode className={`text-yellow-500 ${sizeClass}`} />;
  if (mime.includes('pdf') || mime.includes('text')) return <FileText className={`text-red-500 ${sizeClass}`} />;
  return <File className={`text-gray-400 ${sizeClass}`} />;
};

export default FilePreviewModal;
