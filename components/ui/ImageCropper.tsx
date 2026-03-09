import React, { useRef } from 'react';
import { Cropper, CropperRef, CircleStencil, ImageRestriction } from 'react-advanced-cropper';
import 'react-advanced-cropper/dist/style.css';
import { X, Check } from 'lucide-react';
import { createPortal } from 'react-dom';

interface ImageCropperProps {
    src: string;
    onCrop: (croppedImage: string) => void;
    onCancel: () => void;
    aspectRatio?: number;
    circular?: boolean;
    isUploading?: boolean;
}

const ImageCropper = ({ src, onCrop, onCancel, aspectRatio, circular = false, isUploading = false }: ImageCropperProps) => {
    const cropperRef = useRef<CropperRef>(null);

    const handleCrop = () => {
        if (cropperRef.current) {
            const canvas = cropperRef.current.getCanvas();
            if (canvas) {
                onCrop(canvas.toDataURL());
            }
        }
    };

    if (typeof document === 'undefined') return null;

    return createPortal(
        <div className="fixed top-16 inset-x-0 bottom-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl h-[85vh] rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col">

                {/* Header */}
                <div className="p-4 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-widest text-[10px]">
                        Crop Profile Photo
                    </h3>
                    <button
                        onClick={onCancel}
                        className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
                    >
                        <X size={18} className="text-slate-500" />
                    </button>
                </div>

                {/* Cropper */}
                <div className="flex-1 bg-slate-100 dark:bg-slate-950 flex items-center justify-center overflow-hidden">
                    <Cropper
                        ref={cropperRef}
                        src={src}
                        className="h-full w-full"

                        stencilComponent={circular ? CircleStencil : undefined}

                        stencilProps={{
                            aspectRatio: aspectRatio || 1,
                            grid: true,
                            movable: true,
                            resizable: true,
                        }}

                        imageRestriction={ImageRestriction.fitArea}

                        defaultSize={({ imageSize }) => ({
                            width: imageSize.width * 0.6,
                            height: imageSize.height * 0.6,
                        })}

                        backgroundWrapperProps={{
                            style: {
                                backgroundColor: '#020617'
                            }
                        }}
                    />
                </div>

                {/* Footer */}
                <div className="p-4 flex gap-3 bg-slate-50 dark:bg-slate-800/50 border-t dark:border-slate-800">
                    <button
                        onClick={onCancel}
                        disabled={isUploading}
                        className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl uppercase text-[10px] tracking-widest disabled:opacity-50"
                    >
                        Cancel
                    </button>

                    <button
                        onClick={handleCrop}
                        disabled={isUploading}
                        className="flex-[2] py-3 bg-blue-600 text-white font-black hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-500/20 uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-70 disabled:grayscale-[0.5]"
                    >
                        {isUploading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Uploading...</span>
                            </>
                        ) : (
                            <>
                                <Check size={16} /> Apply Crop
                            </>
                        )}
                    </button>
                </div>

            </div>
        </div>,
        document.body
    );
};

export default ImageCropper;