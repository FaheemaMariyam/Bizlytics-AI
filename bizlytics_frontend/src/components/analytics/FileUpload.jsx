import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, X, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import analyticsService from '../../services/analyticsService';
import Button from '../common/Button';

const ACCEPTED_TYPES = {
    'text/csv': '.csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'application/vnd.ms-excel': '.xls',
    'application/json': '.json',
};

const FileUpload = ({ onUploadSuccess, variant = 'default' }) => {
    const [dragActive, setDragActive] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const inputRef = useRef(null);

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
        else if (e.type === 'dragleave') setDragActive(false);
    };

    const validateFile = (file) => {
        const ext = file.name.split('.').pop().toLowerCase();
        const allowed = ['csv', 'xlsx', 'xls', 'json'];
        if (!allowed.includes(ext)) {
            toast.error(`Unsupported file type: .${ext}`);
            return false;
        }
        return true;
    };

    const handleDrop = (e) => {
        e.preventDefault(); e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            if (validateFile(file)) setSelectedFile(file);
        }
    };

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (validateFile(file)) setSelectedFile(file);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) return;
        setUploading(true);
        try {
            const result = await analyticsService.uploadFile(selectedFile);
            toast.success(result.message || 'Asset added!');
            setSelectedFile(null);
            if (onUploadSuccess) onUploadSuccess();
        } catch (error) {
            toast.error('Upload failed');
        } finally {
            setUploading(false);
        }
    };

    if (variant === 'compact') {
        return (
            <div className="flex items-center gap-2">
                <input ref={inputRef} type="file" className="hidden" onChange={handleFileSelect} accept=".csv,.xlsx,.xls,.json" />
                
                {selectedFile ? (
                    <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-lg animate-in fade-in slide-in-from-right-2">
                        <span className="text-[10px] font-bold text-indigo-700 truncate max-w-[120px]">{selectedFile.name}</span>
                        <Button onClick={handleUpload} isLoading={uploading} className="h-6 px-2 text-[9px] font-bold uppercase tracking-widest bg-indigo-600 hover:bg-indigo-700">
                            Push
                        </Button>
                        <button onClick={() => setSelectedFile(null)} className="text-indigo-400 hover:text-indigo-600"><X size={14} /></button>
                    </div>
                ) : (
                    <button 
                        onClick={() => inputRef.current?.click()}
                        className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-sm hover:shadow-indigo-500/20"
                    >
                        <Upload size={14} />
                        <span className="text-[11px] font-bold uppercase tracking-widest">New Asset</span>
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Upload className="h-5 w-5 text-indigo-600" />
                Upload Data File
            </h3>

            {/* Drop Zone */}
            <div
                className={`
          relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer
          ${dragActive
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
                    }
        `}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls,.json"
                    onChange={handleFileSelect}
                    className="hidden"
                />
                <FileSpreadsheet className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                <p className="text-sm font-medium text-gray-700">
                    {dragActive ? 'Drop your file here' : 'Drag & drop a file, or click to browse'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                    Supports CSV, XLSX, and JSON (max 50MB)
                </p>
            </div>

            {/* Selected File Preview */}
            {selectedFile && (
                <div className="mt-4 flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3 border border-gray-200">
                    <div className="flex items-center gap-3">
                        <FileSpreadsheet className="h-5 w-5 text-indigo-600" />
                        <div>
                            <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                            <p className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={handleUpload}
                            isLoading={uploading}
                            className="w-auto py-1.5 px-4 text-sm"
                        >
                            Upload
                        </Button>
                        <button
                            onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FileUpload;
