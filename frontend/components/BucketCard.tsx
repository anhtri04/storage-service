import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreVertical, Share2, Edit2, Trash2, Upload } from 'lucide-react';
import { useFileDrop } from '../hooks/useFileDrop';
import { Bucket } from '../types';
import { formatFileSize } from '../utils/uploadUtils';
import bucketIcon from '../assets/bucket-icon.png';

interface BucketCardProps {
  bucket: Bucket;
  uploadingBucketId: string | null;
  activeMenu: string | null;
  onShare: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (bucket: Bucket) => void;
  onFileDrop: (bucketId: string, files: File[]) => void;
  onMenuToggle: (bucketId: string | null) => void;
}

/**
 * Individual bucket card component with drag & drop functionality
 *
 * Features:
 * - Click to navigate to bucket details
 * - Drag files to upload
 * - Context menu for edit/share/delete
 * - Upload progress indicator
 */
const BucketCard: React.FC<BucketCardProps> = ({
  bucket,
  uploadingBucketId,
  activeMenu,
  onShare,
  onDelete,
  onEdit,
  onFileDrop,
  onMenuToggle,
}) => {
  const navigate = useNavigate();
  const isMenuOpen = activeMenu === bucket.bucketId;

  // Hook is called at top level of component (not in a loop)
  const { isDragging, dragHandlers } = useFileDrop({
    onDrop: (files) => onFileDrop(bucket.bucketId, files),
    disabled: uploadingBucketId !== null,
  });

  return (
    <div
      {...dragHandlers}
      className={`
        bg-white rounded-xl p-6 hover:shadow-md transition-all relative group cursor-pointer
        ${isDragging
          ? 'border-2 border-dashed border-[#028546] bg-green-50'
          : 'border border-gray-200'}
        ${uploadingBucketId === bucket.bucketId ? 'ring-2 ring-[#028546] ring-opacity-50' : ''}
      `}
      onClick={() => navigate(`/bucket/${bucket.bucketId}`)}
      role="button"
      tabIndex={0}
      aria-label={`Bucket ${bucket.name}, click to view or drag files to upload`}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-[#028546] bg-opacity-10 rounded-xl flex items-center justify-center z-10">
          <div className="bg-white rounded-lg p-4 shadow-lg flex flex-col items-center">
            <Upload className="w-8 h-8 text-[#028546] mb-2" />
            <span className="font-semibold text-[#028546]">Drop files to upload</span>
          </div>
        </div>
      )}

      {/* Upload indicator */}
      {uploadingBucketId === bucket.bucketId && (
        <div className="absolute top-2 right-2">
          <div className="flex items-center gap-1 bg-[#028546] text-white text-xs px-2 py-1 rounded-full">
            <div className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
            <span>Uploading...</span>
          </div>
        </div>
      )}

      <div className="flex justify-between items-start mb-4">
        <div>
          <img src={bucketIcon} alt="Bucket Icon" className="w-10 h-10" />
        </div>
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMenuToggle(isMenuOpen ? null : bucket.bucketId);
            }}
            className="p-1 hover:bg-gray-100 rounded-md transition-colors"
            aria-label="Open bucket menu"
          >
            <MoreVertical className="w-5 h-5 text-gray-400" />
          </button>
          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(bucket);
                  onMenuToggle(null);
                }}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Edit2 className="w-4 h-4" /> Edit Metadata
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onShare(bucket.bucketId);
                  onMenuToggle(null);
                }}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Share2 className="w-4 h-4" /> Share Link
              </button>
              <div className="border-t border-gray-100 my-1"></div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(bucket.bucketId);
                  onMenuToggle(null);
                }}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" /> Delete Bucket
              </button>
            </div>
          )}
        </div>
      </div>
      <h3 className="font-bold text-lg text-black mb-1 truncate">{bucket.name}</h3>
      <p className="text-gray-500 text-sm mb-4 line-clamp-2 min-h-[40px]">
        {bucket.description || 'No description provided.'}
      </p>
      <div className="flex justify-between items-center text-xs text-gray-400">
        <span>{bucket.fileCount} files</span>
        <span>{formatFileSize(bucket.totalSize)}</span>
      </div>
    </div>
  );
};

export default BucketCard;
