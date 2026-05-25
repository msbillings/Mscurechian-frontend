'use client';

import React, { useState } from 'react';
import { Plus, X, Edit2, Trash2, Check, ChevronDown, ChevronRight, FileText } from 'lucide-react';

interface ResultParameter {
    label: string;
    unit?: string;
    normalRange?: string;
    normalRanges?: {
        male?: { min?: string | number; max?: string | number; text?: string };
        female?: { min?: string | number; max?: string | number; text?: string };
    };
    remarks?: string;
    example?: string;
    fieldType?: 'text' | 'number';
    isRequired?: boolean;
    displayOrder?: number;
}

interface ResultParametersManagerProps {
    parameters: ResultParameter[];
    onChange: (parameters: ResultParameter[]) => void;
}

export default function ResultParametersManager({ parameters, onChange }: ResultParametersManagerProps) {
    const [isAdding, setIsAdding] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [showOptional, setShowOptional] = useState(false);

    const [fieldLabel, setFieldLabel] = useState('');
    const [fieldUnit, setFieldUnit] = useState('');
    const [fieldRange, setFieldRange] = useState('');
    const [fieldMaleMin, setFieldMaleMin] = useState('');
    const [fieldMaleMax, setFieldMaleMax] = useState('');
    const [fieldMaleText, setFieldMaleText] = useState('');
    const [fieldFemaleMin, setFieldFemaleMin] = useState('');
    const [fieldFemaleMax, setFieldFemaleMax] = useState('');
    const [fieldFemaleText, setFieldFemaleText] = useState('');
    const [fieldRemarks, setFieldRemarks] = useState('');
    const [fieldExample, setFieldExample] = useState('');
    const [fieldType, setFieldType] = useState<'text' | 'number'>('text');
    const [isRequired, setIsRequired] = useState(false);

    const resetForm = () => {
        setFieldLabel('');
        setFieldUnit('');
        setFieldRange('');
        setFieldMaleMin('');
        setFieldMaleMax('');
        setFieldMaleText('');
        setFieldFemaleMin('');
        setFieldFemaleMax('');
        setFieldFemaleText('');
        setFieldRemarks('');
        setFieldExample('');
        setFieldType('text');
        setIsRequired(false);
        setShowOptional(false);
    };

    const handleAdd = () => {
        if (!fieldLabel.trim()) {
            alert('Field name is required');
            return;
        }

        const newParam: ResultParameter = {
            label: fieldLabel.trim(),
            unit: fieldUnit.trim() || undefined,
            normalRange: fieldRange.trim() || undefined,
            normalRanges: {
                male: { min: fieldMaleMin || undefined, max: fieldMaleMax || undefined, text: fieldMaleText.trim() || undefined },
                female: { min: fieldFemaleMin || undefined, max: fieldFemaleMax || undefined, text: fieldFemaleText.trim() || undefined }
            },
            remarks: fieldRemarks.trim() || undefined,
            example: fieldExample.trim() || undefined,
            fieldType: fieldType,
            isRequired: isRequired,
            displayOrder: editingIndex !== null ? editingIndex : parameters.length
        };

        if (editingIndex !== null) {
            const updated = [...parameters];
            updated[editingIndex] = newParam;
            onChange(updated);
            setEditingIndex(null);
        } else {
            onChange([...parameters, newParam]);
        }

        resetForm();
        setIsAdding(false);
    };

    const handleEdit = (index: number) => {
        const param = parameters[index];
        setFieldLabel(param.label);
        setFieldUnit(param.unit || '');
        setFieldRange(param.normalRange || '');
        setFieldMaleMin(param.normalRanges?.male?.min?.toString() || '');
        setFieldMaleMax(param.normalRanges?.male?.max?.toString() || '');
        setFieldMaleText(param.normalRanges?.male?.text || '');
        setFieldFemaleMin(param.normalRanges?.female?.min?.toString() || '');
        setFieldFemaleMax(param.normalRanges?.female?.max?.toString() || '');
        setFieldFemaleText(param.normalRanges?.female?.text || '');
        setFieldRemarks(param.remarks || '');
        setFieldExample(param.example || '');
        setFieldType(param.fieldType || 'text');
        setIsRequired(param.isRequired || false);
        const hasSpecificRanges = !!(param.normalRanges?.male?.min || param.normalRanges?.male?.max || param.normalRanges?.male?.text || param.normalRanges?.female?.min || param.normalRanges?.female?.max || param.normalRanges?.female?.text);
        setShowOptional(!!(param.unit || param.normalRange || hasSpecificRanges || param.remarks || param.example));
        setEditingIndex(index);
        setIsAdding(true);
    };

    const handleDelete = (index: number) => {
        const updated = parameters.filter((_, i) => i !== index);
        updated.forEach((p, i) => p.displayOrder = i);
        onChange(updated);
    };

    const handleCancel = () => {
        resetForm();
        setIsAdding(false);
        setEditingIndex(null);
    };

    return (
        <div className="bg-gradient-to-br from-slate-50 to-gray-50 dark:from-gray-900 dark:to-gray-800 rounded-2xl border border-slate-200/60 dark:border-gray-700/50 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
            {/* Header */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-slate-200/60 dark:border-gray-700/50 px-6 py-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 dark:from-slate-600 dark:to-slate-800 flex items-center justify-center shadow-lg">
                            <FileText className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-gray-900 dark:text-white tracking-tight">
                                Result Fields
                            </h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                Configure dynamic result entry fields
                            </p>
                        </div>
                    </div>
                    {!isAdding && (
                        <button
                            type="button"
                            onClick={() => setIsAdding(true)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-slate-900/10 hover:shadow-xl hover:shadow-slate-900/20 hover:-translate-y-0.5"
                        >
                            <Plus size={16} strokeWidth={2.5} />
                            <span>Add Field</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="p-6">
                {/* List of Parameters */}
                {parameters.length > 0 && !isAdding && (
                    <div className="space-y-2.5 mb-4">
                        {parameters.map((param, index) => (
                            <div
                                key={index}
                                className="group relative flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-slate-200/60 dark:border-gray-700/50 hover:border-slate-300 dark:hover:border-gray-600 transition-all hover:shadow-md"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                            {param.label}
                                        </p>
                                        {param.isRequired && (
                                            <span className="px-1.5 py-0.5 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 text-[10px] font-bold uppercase tracking-wider rounded">
                                                Required
                                            </span>
                                        )}
                                        {param.unit && (
                                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                                ({param.unit})
                                            </span>
                                        )}
                                    </div>
                                    {param.normalRange && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            <span className="font-medium">Range:</span> {param.normalRange}
                                        </p>
                                    )}
                                </div>
                                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        type="button"
                                        onClick={() => handleEdit(index)}
                                        className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all"
                                        title="Edit field"
                                    >
                                        <Edit2 size={15} strokeWidth={2} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(index)}
                                        className="p-2 text-rose-600 hover:text-rose-700 dark:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all"
                                        title="Delete field"
                                    >
                                        <Trash2 size={15} strokeWidth={2} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Add/Edit Form */}
                {isAdding && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200/60 dark:border-gray-700/50 shadow-sm overflow-hidden">
                        {/* Form Header */}
                        <div className="flex items-center justify-between px-5 py-4 bg-slate-50 dark:bg-gray-900/50 border-b border-slate-200/60 dark:border-gray-700/50">
                            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                                {editingIndex !== null ? '✍️ Edit Field' : '➕ Add New Field'}
                            </h3>
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                <X size={18} strokeWidth={2} />
                            </button>
                        </div>

                        {/* Form Body */}
                        <div className="p-5 space-y-4">
                            {/* Field Name */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    Field Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400 dark:focus:border-slate-500 outline-none transition-all text-gray-900 dark:text-white placeholder:text-gray-400"
                                    placeholder="e.g., WBC Count, Hemoglobin"
                                    value={fieldLabel}
                                    onChange={e => setFieldLabel(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            {/* Field Type & Required */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        Field Type
                                    </label>
                                    <select
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-slate-400/20 outline-none transition-all text-gray-900 dark:text-white"
                                        value={fieldType}
                                        onChange={e => setFieldType(e.target.value as 'text' | 'number')}
                                    >
                                        <option value="text">Text</option>
                                        <option value="number">Number</option>
                                    </select>
                                </div>
                                <div className="flex items-end">
                                    <label className="flex items-center gap-2.5 cursor-pointer w-full px-4 py-2.5 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded border-slate-300 dark:border-gray-600 text-slate-800 focus:ring-slate-500 dark:focus:ring-slate-400"
                                            checked={isRequired}
                                            onChange={e => setIsRequired(e.target.checked)}
                                        />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Required</span>
                                    </label>
                                </div>
                            </div>

                            {/* Optional Fields Toggle */}
                            <button
                                type="button"
                                onClick={() => setShowOptional(!showOptional)}
                                className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium transition-colors"
                            >
                                {showOptional ? <ChevronDown size={14} strokeWidth={2.5} /> : <ChevronRight size={14} strokeWidth={2.5} />}
                                {showOptional ? 'Hide' : 'Show'} Optional Details
                            </button>

                            {/* Optional Fields */}
                            {showOptional && (
                                <div className="space-y-4 pt-3 border-t border-slate-200 dark:border-gray-700">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                                Unit <span className="text-gray-400 font-normal">(Optional)</span>
                                            </label>
                                            <input
                                                type="text"
                                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-slate-400/20 outline-none transition-all text-gray-900 dark:text-white placeholder:text-gray-400"
                                                placeholder="g/dL, cells/µL"
                                                value={fieldUnit}
                                                onChange={e => setFieldUnit(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                                Normal Range (Text) <span className="text-gray-400 font-normal">(Optional)</span>
                                            </label>
                                            <input
                                                type="text"
                                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-slate-400/20 outline-none transition-all text-gray-900 dark:text-white placeholder:text-gray-400"
                                                placeholder="12-16 g/dL"
                                                value={fieldRange}
                                                onChange={e => setFieldRange(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {/* Specific Reference Ranges */}
                                    <div className="bg-slate-50 dark:bg-gray-900/50 p-4 rounded-xl border border-slate-200 dark:border-gray-700">
                                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">
                                            Normal Reference Ranges <span className="text-gray-400 font-normal">(Optional)</span>
                                        </label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Male Range */}
                                            <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700 space-y-2">
                                                <h4 className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Male</h4>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        placeholder="Min"
                                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-md text-sm text-center focus:ring-1 focus:ring-indigo-500 outline-none"
                                                        value={fieldMaleMin}
                                                        onChange={e => setFieldMaleMin(e.target.value)}
                                                    />
                                                    <span className="text-gray-400">-</span>
                                                    <input
                                                        type="number"
                                                        placeholder="Max"
                                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-md text-sm text-center focus:ring-1 focus:ring-indigo-500 outline-none"
                                                        value={fieldMaleMax}
                                                        onChange={e => setFieldMaleMax(e.target.value)}
                                                    />
                                                </div>
                                                <input
                                                    type="text"
                                                    placeholder="Or Text (e.g., Negative, Absent)"
                                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-md text-sm text-center focus:ring-1 focus:ring-indigo-500 outline-none placeholder:text-[11px]"
                                                    value={fieldMaleText}
                                                    onChange={e => setFieldMaleText(e.target.value)}
                                                />
                                            </div>

                                            {/* Female Range */}
                                            <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700 space-y-2">
                                                <h4 className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Female</h4>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        placeholder="Min"
                                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-md text-sm text-center focus:ring-1 focus:ring-indigo-500 outline-none"
                                                        value={fieldFemaleMin}
                                                        onChange={e => setFieldFemaleMin(e.target.value)}
                                                    />
                                                    <span className="text-gray-400">-</span>
                                                    <input
                                                        type="number"
                                                        placeholder="Max"
                                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-md text-sm text-center focus:ring-1 focus:ring-indigo-500 outline-none"
                                                        value={fieldFemaleMax}
                                                        onChange={e => setFieldFemaleMax(e.target.value)}
                                                    />
                                                </div>
                                                <input
                                                    type="text"
                                                    placeholder="Or Text (e.g., Negative, Absent)"
                                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-md text-sm text-center focus:ring-1 focus:ring-indigo-500 outline-none placeholder:text-[11px]"
                                                    value={fieldFemaleText}
                                                    onChange={e => setFieldFemaleText(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                            Example Value <span className="text-gray-400 font-normal">(Optional)</span>
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-slate-400/20 outline-none transition-all text-gray-900 dark:text-white placeholder:text-gray-400"
                                            placeholder="14.5"
                                            value={fieldExample}
                                            onChange={e => setFieldExample(e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                            Remarks <span className="text-gray-400 font-normal">(Optional)</span>
                                        </label>
                                        <textarea
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-slate-400/20 outline-none transition-all text-gray-900 dark:text-white placeholder:text-gray-400 resize-none"
                                            rows={2}
                                            placeholder="Instructions for lab staff..."
                                            value={fieldRemarks}
                                            onChange={e => setFieldRemarks(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Form Actions */}
                            <div className="flex gap-2.5 pt-2">
                                <button
                                    type="button"
                                    onClick={handleAdd}
                                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-900/10 hover:shadow-xl hover:-translate-y-0.5"
                                >
                                    <Check size={16} strokeWidth={2.5} />
                                    {editingIndex !== null ? 'Update Field' : 'Add Field'}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    className="px-5 py-2.5 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium text-sm hover:bg-slate-50 dark:hover:bg-gray-800 transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {parameters.length === 0 && !isAdding && (
                    <div className="text-center py-10 px-6">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-slate-100 to-gray-100 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center">
                            <FileText className="w-8 h-8 text-slate-400 dark:text-gray-500" strokeWidth={1.5} />
                        </div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5">
                            No Fields Configured
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
                            Add custom result entry fields to define what data lab staff will enter
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
