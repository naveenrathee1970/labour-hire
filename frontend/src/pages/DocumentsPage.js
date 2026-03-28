import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Upload, FileText, CheckCircle, XCircle, Trash2,
  Image, File, Shield, Eye
} from 'lucide-react';

export default function DocumentsPage() {
  const { user, api } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState('aadhaar');
  const fileInputRef = useRef(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const res = await api('get', '/documents');
      setDocuments(res.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      alert('Only JPEG, PNG, WebP, or PDF files allowed');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('File too large (max 5MB)');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api('post', `/documents/upload?doc_type=${selectedType}`, formData);
      loadData();
    } catch (err) {
      console.error(err);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleVerify = async (docId, verified) => {
    try {
      await api('post', `/documents/${docId}/verify`, { verified });
      loadData();
    } catch (err) { console.error(err); }
  };

  const docTypeLabels = { aadhaar: 'Aadhaar Card', licence: 'Licence', other: 'Other Document' };
  const docTypeColors = {
    aadhaar: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    licence: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    other: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  };

  const fileIcon = (contentType) => {
    if (contentType?.startsWith('image/')) return Image;
    return FileText;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="documents-loading">
        <div className="w-8 h-8 border-2 border-[#00A8E8] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div data-testid="documents-page" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white tracking-tight">Documents</h1>
          <p className="text-sm text-[#9BA3B5] mt-1">Upload Aadhaar, Licence, and verification proofs</p>
        </div>
      </div>

      {/* Upload Section */}
      <div className="p-6 rounded-lg bg-[#141E3A] border border-[#28385E]">
        <h3 className="font-heading text-lg font-semibold text-white mb-4">Upload Document</h3>
        <div className="flex items-end gap-4 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-[#9BA3B5] font-semibold mb-2">Document Type</p>
            <div className="flex gap-2">
              {['aadhaar', 'licence', 'other'].map(type => (
                <button
                  key={type}
                  data-testid={`doc-type-${type}`}
                  onClick={() => setSelectedType(type)}
                  className={`px-3 py-2 rounded-md text-sm transition-colors ${
                    selectedType === type
                      ? 'bg-[#00A8E8]/10 text-[#00A8E8] border border-[#00A8E8]/20'
                      : 'text-[#9BA3B5] bg-[#0B132B] border border-[#28385E] hover:text-white'
                  }`}
                >
                  {docTypeLabels[type]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={handleUpload}
              className="hidden"
              data-testid="file-input"
            />
            <Button
              data-testid="upload-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="bg-[#00A8E8] hover:bg-[#38BDF8] text-white rounded-md"
            >
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? 'Uploading...' : 'Choose File & Upload'}
            </Button>
          </div>
        </div>
        <p className="text-xs text-[#9BA3B5] mt-3">Accepted: JPEG, PNG, WebP, PDF (max 5MB)</p>
      </div>

      {/* Documents List */}
      {documents.length === 0 ? (
        <div className="text-center py-16 rounded-lg bg-[#141E3A] border border-[#28385E]">
          <File className="w-12 h-12 text-[#28385E] mx-auto mb-4" />
          <p className="text-[#9BA3B5]">No documents uploaded yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map(doc => {
            const Icon = fileIcon(doc.content_type);
            return (
              <div key={doc._id} data-testid={`doc-${doc._id}`} className="p-4 rounded-lg bg-[#141E3A] border border-[#28385E] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#1D2A4D] flex items-center justify-center">
                    <Icon className="w-5 h-5 text-[#00A8E8]" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{doc.original_filename}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge className={`${docTypeColors[doc.doc_type] || docTypeColors.other} border text-[10px]`}>
                        {docTypeLabels[doc.doc_type] || doc.doc_type}
                      </Badge>
                      {doc.verified ? (
                        <span className="flex items-center gap-0.5 text-emerald-400 text-xs">
                          <CheckCircle className="w-3 h-3" /> Verified
                        </span>
                      ) : (
                        <span className="flex items-center gap-0.5 text-yellow-400 text-xs">
                          <Shield className="w-3 h-3" /> Pending Verification
                        </span>
                      )}
                      <span className="text-xs text-[#9BA3B5]">
                        {doc.size ? `${(doc.size / 1024).toFixed(1)} KB` : ''}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {user?.role === 'admin' && !doc.verified && (
                    <Button
                      data-testid={`verify-doc-${doc._id}`}
                      size="sm"
                      onClick={() => handleVerify(doc._id, true)}
                      className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 text-xs"
                    >
                      <CheckCircle className="w-3 h-3 mr-1" /> Verify
                    </Button>
                  )}
                  {user?.role === 'admin' && doc.verified && (
                    <Button
                      data-testid={`reject-doc-${doc._id}`}
                      size="sm"
                      variant="outline"
                      onClick={() => handleVerify(doc._id, false)}
                      className="border-[#28385E] text-[#9BA3B5] hover:text-[#EF4444] hover:border-[#EF4444] bg-transparent text-xs"
                    >
                      <XCircle className="w-3 h-3 mr-1" /> Reject
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
