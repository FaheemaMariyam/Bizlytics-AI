import React, { useEffect, useState } from 'react';
import { FileText, RefreshCw, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import analyticsService from '../../services/analyticsService';

const statusConfig = {
    pending: { icon: Clock, color: 'text-yellow-500' },
    processing: { icon: Loader2, color: 'text-blue-500' },
    completed: { icon: CheckCircle, color: 'text-green-500' },
    failed: { icon: AlertCircle, color: 'text-red-500' },
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

    if (loading) {
        return (
            <div className="p-4 flex items-center justify-center opacity-50">
                <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#f8fafc]">
            <div className="px-4 h-10 border-b border-gray-200 flex items-center justify-between shrink-0 bg-white">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Explorer</span>
                <button
                    onClick={fetchFiles}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                    title="Refresh Explorer"
                >
                    <RefreshCw className="h-3 w-3 text-gray-500" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto py-2 px-2 scrollbar-thin">
                {files.length === 0 ? (
                    <div className="py-8 text-center px-4">
                        <FileText className="h-8 w-8 mx-auto text-gray-200 mb-2" />
                        <p className="text-[10px] text-gray-400 uppercase font-semibold">No Assets</p>
                    </div>
                ) : (
                    <div className="space-y-0.5">
                        {files.map((file) => {
                            const status = statusConfig[file.status] || statusConfig.pending;
                            const StatusIcon = status.icon;
                            const isNew = (new Date() - new Date(file.created_at)) < (5 * 60 * 1000); // 5 mins

                            return (
                                <div key={file.id} className="group flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white hover:shadow-sm hover:border-gray-200 border border-transparent cursor-pointer transition-all">
                                    <div className="relative">
                                        <FileText className="h-4 w-4 text-gray-400 group-hover:text-indigo-500" />
                                        <div className={`absolute -top-1 -right-1 w-2 h-2 rounded-full border-2 border-[#f8fafc] group-hover:border-white ${status.color.replace('text', 'bg')}`} />
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-gray-700 truncate group-hover:text-indigo-700">
                                            {file.filename}
                                        </p>
                                        <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                            <span className="text-[9px] font-bold text-gray-400 group-hover:text-indigo-400 uppercase tracking-tighter">
                                                {file.filename.split('.').pop()}
                                            </span>
                                            {isNew && <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-tighter">New</span>}
                                        </div>
                                    </div>

                                    {file.status === 'processing' && (
                                        <Loader2 className="h-3 w-3 animate-spin text-blue-500 shrink-0" />
                                    )}
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
