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
            <form onSubmit={handleSubmit} className="space-y-4 md:space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-12">
                    {/* Left Column: Form Details */}
                    <div className="space-y-4 md:space-y-6">
                        <div className="grid grid-cols-1 gap-4 md:gap-6">
                            <div className="space-y-1.5 md:space-y-3">
                                <label className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest ml-1 italic">Category</label>
                                <select
                                    className="w-full p-2.5 md:p-4 bg-gray-50 dark:bg-gray-900 border-none rounded-xl md:rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-base md:text-lg font-bold dark:text-white appearance-none transition-all"
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                >
                                    <option value="feedback">Feedback</option>
                                    <option value="complaint">Complaint</option>
                                    <option value="bug">Bug Report</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>

                            <div className="space-y-1.5 md:space-y-3">
                                <label className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest ml-1 italic">Subject</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full p-2.5 md:p-4 bg-gray-50 dark:bg-gray-900 border-none rounded-xl md:rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-base md:text-lg font-bold dark:text-white placeholder:text-gray-300"
                                    placeholder="Brief summary of the issue"
                                    value={formData.subject}
                                    onChange={e => setFormData({ ...formData, subject: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5 md:space-y-3">
                            <label className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest ml-1 italic">Message</label>
                            <textarea
                                required
                                rows={5}
                                className="w-full p-2.5 md:p-4 bg-gray-50 dark:bg-gray-900 border-none rounded-xl md:rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-base md:text-lg font-medium dark:text-white resize-none placeholder:text-gray-300"
                                placeholder="Describe your issue in detail..."
                                value={formData.message}
                                onChange={e => setFormData({ ...formData, message: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Right Column: Attachments and Submit */}
                    <div className="flex flex-col justify-between space-y-8">
                        <div className="space-y-3 md:space-y-6">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest ml-1 italic">Attachments (Optional)</label>
                                <span className="text-[9px] md:text-[10px] font-bold text-gray-300 uppercase tracking-tighter">MAX 3</span>
                            </div>
                            <div className="flex flex-wrap gap-4 md:gap-6">
                                {files.map((file, i) => (
                                    <div key={i} className="relative group">
                                        <div className="w-20 h-20 md:w-32 md:h-32 bg-gray-50 dark:bg-gray-900 rounded-2xl md:rounded-3xl overflow-hidden flex items-center justify-center border border-gray-100 dark:border-gray-700 shadow-sm">
                                            {file.type.startsWith('image/') ? (
                                                <ImagePreview file={file} />
                                            ) : (
                                                <span className="text-xs text-gray-500 text-center p-3 break-all">{file.name}</span>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeFile(i)}
                                            className="absolute -top-2 -right-2 p-1.5 bg-rose-500 text-white rounded-xl shadow-lg hover:scale-110 active:scale-90 transition-transform"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}

                                {files.length < 3 && (
                                    <label className="w-20 h-20 md:w-32 md:h-32 bg-gray-50/50 dark:bg-gray-900/50 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-2xl md:rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 dark:hover:border-blue-500 dark:hover:bg-blue-500/10 transition-all group">
                                        <div className="p-1.5 md:p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm mb-1 group-hover:scale-110 transition-transform">
                                            <Upload size={16} className="text-blue-500" />
                                        </div>
                                        <span className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">Add Node</span>
                                        <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                                    </label>
                                )}
                            </div>
                            <p className="text-[9px] md:text-[10px] text-gray-400 italic">Formats: JPG, PNG. (MAX: 3)</p>
                        </div>

                        <div className="pt-2 md:pt-6">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 md:py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl md:rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] md:text-sm shadow-md shadow-blue-500/10 active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 transition-all"
                            >
                                {loading ? <Activity className="w-5 h-5 animate-spin" /> : <><Send size={16} /> Deploy Ticket Hierarchy</>}
                            </button>
                        </div>
                    </div>
                </div>
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
