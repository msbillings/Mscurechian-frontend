import React, { useState } from 'react';
import { supportService } from '@/lib/integrations/services/support.service';
import { toast } from 'react-hot-toast';
import { Upload, X, Send, Activity } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ImageCropper from '../ui/ImageCropper';

interface CreateTicketFormProps {
    onSuccess?: () => void;
    basePath: string; // e.g. '/hospital-admin/support'
}

function CreateTicketForm({ onSuccess, basePath }: CreateTicketFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        subject: '',
        category: 'feedback',
        message: '',
    });
    const [files, setFiles] = useState<File[]>([]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];

            if (files.length >= 3) {
                toast.error("Maximum 3 images allowed");
                return;
            }

            setFiles(prev => [...prev, file]);
            e.target.value = '';
        }
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const data = new FormData();
        data.append('subject', formData.subject);
        data.append('category', formData.category);
        data.append('message', formData.message);
        data.append('priority', 'medium'); // Default priority

        files.forEach(file => {
            data.append('attachments', file);
        });

        try {
            const newTicket = await supportService.createTicket(data);
            toast.success("Ticket submitted successfully!");

            // Reset form
            setFormData({ subject: '', category: 'feedback', message: '' });
            setFiles([]);

            if (onSuccess) {
                // Called from modal — parent will reload the list
                onSuccess();
            } else {
                // Navigate to list, then force a refresh so the list re-fetches
                router.push(basePath);
                router.refresh();
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to create ticket. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-8">
                    <div className="space-y-1.5 sm:space-y-3">
                        <label className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Category</label>
                        <select
                            className="w-full p-2 sm:p-4 bg-gray-50 dark:bg-gray-900 border-none rounded-xl sm:rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm font-bold dark:text-white appearance-none"
                            value={formData.category}
                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                        >
                            <option value="feedback">Feedback</option>
                            <option value="complaint">Complaint</option>
                            <option value="bug">Bug Report</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    <div className="space-y-1.5 sm:space-y-3">
                        <label className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Subject</label>
                        <input
                            type="text"
                            required
                            className="w-full p-2 sm:p-4 bg-gray-50 dark:bg-gray-900 border-none rounded-xl sm:rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm font-bold dark:text-white"
                            placeholder="Brief summary of the issue"
                            value={formData.subject}
                            onChange={e => setFormData({ ...formData, subject: e.target.value })}
                        />
                    </div>
                </div>

                <div className="space-y-1.5 sm:space-y-3">
                    <label className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Message</label>
                    <textarea
                        required
                        rows={4}
                        className="w-full p-2 sm:p-4 bg-gray-50 dark:bg-gray-900 border-none rounded-xl sm:rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm font-medium dark:text-white resize-none"
                        placeholder="Describe your issue in detail..."
                        value={formData.message}
                        onChange={e => setFormData({ ...formData, message: e.target.value })}
                    />
                </div>

                <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Attachments (Optional)</label>
                    <div className="flex flex-wrap gap-4">
                        {files.map((file, i) => (
                            <div key={i} className="relative group">
                                <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden flex items-center justify-center border border-gray-200 dark:border-gray-700">
                                    {file.type.startsWith('image/') ? (
                                        <ImagePreview file={file} />
                                    ) : (
                                        <span className="text-xs text-gray-500 text-center p-2 break-all">{file.name}</span>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeFile(i)}
                                    className="absolute -top-2 -right-2 p-1 bg-rose-500 text-white rounded-full shadow-lg hover:scale-110"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        ))}

                        {files.length < 3 && (
                            <label className="w-24 h-24 bg-gray-50 dark:bg-gray-900 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 dark:hover:border-blue-500 dark:hover:bg-blue-500/10">
                                <Upload size={20} className="text-gray-400 mb-1" />
                                <span className="text-[9px] font-bold text-gray-400 uppercase">Add Image</span>
                                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                            </label>
                        )}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2">Max 3 images. Supported formats: JPG, PNG.</p>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl sm:rounded-2xl font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-[10px] sm:text-xs shadow-xl shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-2 sm:gap-3 disabled:opacity-50"
                >
                    {loading ? <Activity className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> : <><Send size={14} /> Submit Ticket</>}
                </button>
            </form>
        </>
    );
}

function ImagePreview({ file }: { file: File }) {
    const [preview, setPreview] = React.useState<string | null>(null);

    React.useEffect(() => {
        const objectUrl = URL.createObjectURL(file);
        setPreview(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [file]);

    if (!preview) return null;
    return <img src={preview} alt="preview" className="w-full h-full object-cover" />;
}

export default React.memo(CreateTicketForm);
