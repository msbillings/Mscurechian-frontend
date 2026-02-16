import React, { useRef, useState } from 'react';
import { Cropper, CropperRef } from 'react-advanced-cropper';
import 'react-advanced-cropper/dist/style.css';
import { X, Check } from 'lucide-react';
import { createPortal } from 'react-dom';

interface ImageCropperProps {
    src: string;
    onCrop: (croppedImage: string) => void;
    onCancel: () => void;
    aspectRatio?: number;
    circular?: boolean;
}

const ImageCropper = ({ src, onCrop, onCancel, aspectRatio, circular = false }: ImageCropperProps) => {
    const cropperRef = useRef<CropperRef>(null);

    const handleCrop = () => {
        console.log("ImageCropper: Apply Crop clicked");
        if (cropperRef.current) {
            const canvas = cropperRef.current.getCanvas();
            console.log("ImageCropper: Canvas generated?", !!canvas);
            if (canvas) {
                onCrop(canvas.toDataURL());
            }
        } else {
            console.error("ImageCropper: cropperRef is null");
        }
    };

    // Ensure we only render efficiently; createPortal needs document body which might not exist during SSR
    // But since this is a modal triggered by user action, it's fine in client components.
    if (typeof document === 'undefined') return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
                <div className="p-4 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-widest text-xs">Crop Image</h3>
                    <button onClick={onCancel} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                <div className="p-4 bg-slate-100 dark:bg-slate-950 min-h-[300px] flex items-center justify-center">
                    <Cropper
                        ref={cropperRef}
                        src={src}
                        className="max-h-[50vh] w-full"
                        stencilProps={{
                            aspectRatio: aspectRatio,
                            grid: true,
                            ...(circular && { aspectRatio: 1, previewClassName: 'rounded-full' }) // Basic circular support hint
                        }}
                    />
                </div>

                <div className="p-4 flex gap-3 bg-slate-50 dark:bg-slate-800/50 border-t dark:border-slate-800">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl uppercase text-[10px] tracking-widest"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleCrop}
                        className="flex-[2] py-3 bg-blue-600 text-white font-black hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-500/20 uppercase text-[10px] tracking-widest flex items-center justify-center gap-2"
                    >
                        <Check size={16} /> Apply Crop
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ImageCropper;
