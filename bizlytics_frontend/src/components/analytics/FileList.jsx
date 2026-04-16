import React, { useEffect, useState } from 'react';
import { FileText, RefreshCw, Clock, CheckCircle, AlertCircle, Loader2, Database, ChevronRight, FileJson, FileSpreadsheet } from 'lucide-react';
import toast from 'react-hot-toast';
import analyticsService from '../../services/analyticsService';

const statusConfig = {
    pending: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    processing: { icon: Loader2, color: 'text-violet-500', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
    completed: { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    failed: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20' },
};

const FileList = ({ refreshTrigger }) => {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchFiles = async () => {
        setLoading(true);
        try {
            const data = await analyticsService.getFiles();
            setFiles(data);
        } catch (error) {
            toast.error('Failed to load explorer files');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFiles();
    }, [refreshTrigger]);

    const getFileIcon = (filename) => {
        const ext = filename.split('.').pop().toLowerCase();
        if (ext === 'csv') return <FileText size={16} />;
        if (ext === 'json') return <FileJson size={16} />;
        if (ext === 'xlsx' || ext === 'xls') return <FileSpreadsheet size={16} />;
        return <FileText size={16} />;
    };

    if (loading) {
        return (
            <div className="p-8 flex flex-col items-center justify-center opacity-40">
                <Loader2 className="h-6 w-6 animate-spin text-violet-500 mb-2" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Indexing...</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-transparent">
            <div className="px-6 py-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <Database size={14} className="text-violet-500" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Data Assets</span>
                </div>
                <button
                    onClick={fetchFiles}
                    className="p-1.5 hover:bg-white/5 rounded-lg transition-colors group"
                    title="Refresh Explorer"
                >
                    <RefreshCw className="h-3 w-3 text-gray-600 group-hover:text-violet-400 group-active:rotate-180 transition-all duration-500" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4 scrollbar-thin">
                {files.length === 0 ? (
                    <div className="py-12 text-center px-6 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
                        <div className="w-12 h-12 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center mx-auto mb-4">
                            <FileText className="h-6 w-6 text-gray-700" />
                        </div>
                        <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">No Datasets Found</p>
                        <p className="text-[10px] text-gray-600 mt-2 font-medium">Upload a file to begin</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {files.map((file) => {
                            const status = statusConfig[file.status] || statusConfig.pending;
                            const StatusIcon = status.icon;
                            const isNew = (new Date() - new Date(file.created_at)) < (10 * 60 * 1000); 

                            return (
                                <div 
                                    key={file.id} 
                                    className="group relative bg-white/[0.02] border border-white/[0.05] rounded-xl p-3 hover:bg-white/[0.04] hover:border-white/10 cursor-pointer transition-all duration-300"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors bg-white/[0.03] text-gray-500 group-hover:text-violet-400 group-hover:bg-violet-500/10`}>
                                            {getFileIcon(file.filename)}
                                        </div>
                                        
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-[11px] font-bold text-gray-400 group-hover:text-white truncate transition-colors">
                                                    {file.filename}
                                                </p>
                                                {isNew && (
                                                    <span className="shrink-0 px-1.5 py-0.5 rounded-md bg-violet-500/10 border border-violet-500/20 text-[8px] font-black text-violet-400 uppercase tracking-tighter">New</span>
                                                )}
                                            </div>
                                            <div className="flex items-center justify-between mt-1">
                                                <div className="flex items-center gap-1.5">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${status.color.replace('text', 'bg')} animate-pulse`} />
                                                    <span className="text-[9px] font-bold text-gray-600 uppercase tracking-tighter group-hover:text-gray-500">
                                                        {file.status}
                                                    </span>
                                                </div>
                                                <span className="text-[8px] font-medium text-gray-700 uppercase">{file.filename.split('.').pop()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Interaction Indicator */}
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                                        <ChevronRight size={14} className="text-violet-500/50" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FileList;
