'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Save, Plus, X, Database, FlaskConical, Clock, AlertCircle } from 'lucide-react';
import { LabTestService } from '@/lib/integrations/services/labTest.service';
import { DepartmentService } from '@/lib/integrations/services/department.service';
import { Department } from '@/lib/integrations/types/department';
import { toast } from 'react-hot-toast';
import ResultParametersManager from '@/components/lab/ResultParametersManager';

function ManageTestPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const testId = searchParams.get('id');
    const isEditMode = !!testId;

    const [departments, setDepartments] = useState<Department[]>([]);
    const [metaOptions, setMetaOptions] = useState<any>({
        testNames: [],
        methods: [],
        sampleTypes: [],
        turnaroundTimes: [],
        units: []
    });
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(false);

    const [modalState, setModalState] = useState<{ type: string | null, title: string }>({ type: null, title: '' });
    const [newItemName, setNewItemName] = useState('');

    const [formData, setFormData] = useState({
        testName: '',
        departmentId: '',
        departmentIds: [] as string[],
        sampleType: '',
        price: '',
        unit: '',
        method: '',
        turnaroundTime: '',
        normalRanges: {
            male: { min: '', max: '' },
            female: { min: '', max: '' },
            child: { min: '', max: '' },
            newborn: { min: '', max: '' },
            infant: { min: '', max: '' },
            geriatric: { min: '', max: '' },
        },
        fastingRequired: false,
        sampleVolume: '',
        testCode: '',
        reportType: 'numeric' as 'numeric' | 'text' | 'both',
        reportFormat: '',
        resultParameters: [] as Array<{
            label: string;
            unit?: string;
            normalRange?: string;
            remarks?: string;
            example?: string;
            fieldType?: 'text' | 'number';
            isRequired?: boolean;
            displayOrder?: number;
        }>
    });

    useEffect(() => {
        fetchInitialData();
        if (isEditMode) {
            fetchTestDetails();
        }
    }, [testId]);

    const fetchInitialData = async () => {
        try {
            const [depts, meta] = await Promise.all([
                DepartmentService.getDepartments(),
                LabTestService.getMetaOptions()
            ]);
            setDepartments(depts);
            setMetaOptions(meta);

            if (!isEditMode && depts.length > 0) {
                setFormData(prev => ({ ...prev, departmentId: depts[0]._id, departmentIds: [depts[0]._id] }));
            }
        } catch (error) {
            console.error("Failed to fetch initial data", error);
            toast.error("Failed to load form data");
        }
    };

    const fetchTestDetails = async () => {
        if (!testId) return;
        setInitialLoading(true);
        try {
            const test = await LabTestService.getTestById(testId);
            setFormData({
                testName: test.testName || (test as any).name,
                departmentId: typeof test.departmentId === 'object' ? test.departmentId._id : test.departmentId || '',
                departmentIds: test.departmentIds?.map((d: any) => typeof d === 'object' ? d._id : d) ||
                    (test.departmentId ? [typeof test.departmentId === 'object' ? test.departmentId._id : test.departmentId] : []),
                sampleType: test.sampleType || '',
                price: test.price.toString(),
                unit: test.unit || '',
                method: test.method || test.methodology || '',
                turnaroundTime: test.turnaroundTime || test.temporalTATCycle || '',
                normalRanges: {
                    male: { min: test.normalRanges?.male?.min?.toString() || '', max: test.normalRanges?.male?.max?.toString() || '' },
                    female: { min: test.normalRanges?.female?.min?.toString() || '', max: test.normalRanges?.female?.max?.toString() || '' },
                    child: { min: test.normalRanges?.child?.min?.toString() || '', max: test.normalRanges?.child?.max?.toString() || '' },
                    newborn: { min: test.normalRanges?.newborn?.min?.toString() || '', max: test.normalRanges?.newborn?.max?.toString() || '' },
                    infant: { min: test.normalRanges?.infant?.min?.toString() || '', max: test.normalRanges?.infant?.max?.toString() || '' },
                    geriatric: { min: test.normalRanges?.geriatric?.min?.toString() || '', max: test.normalRanges?.geriatric?.max?.toString() || '' },
                },
                fastingRequired: test.fastingRequired || false,
                sampleVolume: test.sampleVolume || '',
                reportType: test.reportType || 'numeric',
                reportFormat: test.reportFormat || '',
                testCode: test.testCode || '',
                resultParameters: (test as any).resultParameters || []
            });
        } catch (error) {
            console.error("Failed to fetch test details", error);
            toast.error("Failed to load test details");
            router.push('/lab/tests');
        } finally {
            setInitialLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const priceVal = parseFloat(formData.price);
        if (isNaN(priceVal) || priceVal < 0) {
            toast.error("Price must be a valid positive number");
            return;
        }

        setLoading(true);
        const payload: any = {
            ...formData,
            price: priceVal,
            methodology: formData.method,
            temporalTATCycle: formData.turnaroundTime,
            normalRanges: {
                male: { min: parseFloat(formData.normalRanges.male.min) || 0, max: parseFloat(formData.normalRanges.male.max) || 0 },
                female: { min: parseFloat(formData.normalRanges.female.min) || 0, max: parseFloat(formData.normalRanges.female.max) || 0 },
                child: { min: parseFloat(formData.normalRanges.child.min) || 0, max: parseFloat(formData.normalRanges.child.max) || 0 },
                newborn: { min: parseFloat(formData.normalRanges.newborn.min) || 0, max: parseFloat(formData.normalRanges.newborn.max) || 0 },
                infant: { min: parseFloat(formData.normalRanges.infant.min) || 0, max: parseFloat(formData.normalRanges.infant.max) || 0 },
                geriatric: { min: parseFloat(formData.normalRanges.geriatric.min) || 0, max: parseFloat(formData.normalRanges.geriatric.max) || 0 },
            }
        };

        try {
            if (isEditMode && testId) {
                await LabTestService.updateTest(testId, payload);
                toast.success("Test updated successfully");
            } else {
                await LabTestService.addTest(payload);
                toast.success("Test added successfully");
            }
            router.push('/lab/tests');
        } catch (error: any) {
            toast.error(error.message || "Failed to save test");
        } finally {
            setLoading(false);
        }
    };

    const handleRangeChange = (category: string, field: 'min' | 'max', value: string) => {
        setFormData(prev => ({
            ...prev,
            normalRanges: { ...prev.normalRanges, [category]: { ...(prev.normalRanges as any)[category], [field]: value } }
        }));
    };

    const openModal = (type: string, title: string) => {
        setModalState({ type, title });
        setNewItemName('');
    };

    const handleAddCustomItem = async () => {
        if (!newItemName) return;

        if (modalState.type === 'dept') {
            try {
                const res = await DepartmentService.addDepartment({ name: newItemName });
                setDepartments(prev => [...prev, res.department]);
                setFormData(prev => ({
                    ...prev,
                    departmentId: res.department._id,
                    departmentIds: [res.department._id]
                }));
                toast.success("Department added");
            } catch (e) { toast.error("Failed to add department"); }
        } else if (modalState.type === 'test') {
            setFormData(prev => ({ ...prev, testName: newItemName }));
        } else if (modalState.type === 'sample') {
            setFormData(prev => ({ ...prev, sampleType: newItemName }));
        } else if (modalState.type === 'method') {
            setFormData(prev => ({ ...prev, method: newItemName }));
        } else if (modalState.type === 'tat') {
            setFormData(prev => ({ ...prev, turnaroundTime: newItemName }));
        }

        setModalState({ type: null, title: '' });
    };

    if (initialLoading) return (
        <div className="flex flex-col items-center justify-center p-20 gap-4">
            <div className="w-12 h-12 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="text-sm text-gray-500 animate-pulse">Loading test data...</p>
        </div>
    );

    return (
        <div className="max-w-[1400px] mx-auto space-y-6 pb-12 px-4 md:px-8 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button onClick={() => router.back()} className="p-2.5 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-slate-200 dark:border-gray-700">
                    <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {isEditMode ? 'Edit Test' : 'Add New Test'}
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        Configure test parameters and pricing
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Main Form */}
                <div className="lg:col-span-8 space-y-6">
                    {/* Basic Information */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-sm">
                        <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <FlaskConical className="w-4 h-4 text-indigo-600" />
                            Basic Information
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    Test Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    list="test-templates"
                                    required
                                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                    placeholder="e.g. Complete Blood Count"
                                    value={formData.testName}
                                    onChange={e => setFormData({ ...formData, testName: e.target.value })}
                                />
                                <datalist id="test-templates">
                                    {metaOptions.testNames.map((n: string) => <option key={n} value={n} />)}
                                </datalist>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    Test Code
                                </label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                    placeholder="e.g. CBC-001"
                                    value={formData.testCode}
                                    onChange={e => setFormData({ ...formData, testCode: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="mt-4">
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Department <span className="text-rose-500">*</span>
                                </label>
                                <button type="button" onClick={() => openModal('dept', 'New Department')} className="text-xs font-medium text-indigo-600 hover:underline">
                                    + Add Department
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {departments.map(dept => {
                                    const isSelected = formData.departmentId === dept._id;
                                    return (
                                        <button
                                            key={dept._id}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, departmentId: dept._id, departmentIds: [dept._id] })}
                                            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${isSelected ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-slate-200 dark:border-gray-700 hover:border-indigo-300'}`}
                                        >
                                            {dept.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Test Parameters */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-sm">
                        <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Database className="w-4 h-4 text-emerald-600" />
                            Test Parameters
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    Sample Type <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none cursor-pointer"
                                    value={formData.sampleType}
                                    onChange={e => setFormData({ ...formData, sampleType: e.target.value })}
                                    required
                                >
                                    <option value="">Select sample type...</option>
                                    {metaOptions.sampleTypes.map((s: string) => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    Method
                                </label>
                                <select
                                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none cursor-pointer"
                                    value={formData.method}
                                    onChange={e => setFormData({ ...formData, method: e.target.value })}
                                >
                                    <option value="">Select method...</option>
                                    {metaOptions.methods.map((m: string) => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    Unit
                                </label>
                                <select
                                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none cursor-pointer"
                                    value={formData.unit}
                                    onChange={e => setFormData({ ...formData, unit: e.target.value })}
                                >
                                    <option value="">Select unit...</option>
                                    {metaOptions.units?.map((u: string) => <option key={u} value={u}>{u}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    Turnaround Time
                                </label>
                                <select
                                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none cursor-pointer"
                                    value={formData.turnaroundTime}
                                    onChange={e => setFormData({ ...formData, turnaroundTime: e.target.value })}
                                >
                                    <option value="">Select turnaround time...</option>
                                    {metaOptions.turnaroundTimes.map((t: string) => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>

                            <div className="flex items-end">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, fastingRequired: !formData.fastingRequired })}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all ${formData.fastingRequired ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-slate-50 dark:bg-gray-900 border-slate-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}
                                >
                                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${formData.fastingRequired ? 'border-orange-600 bg-orange-600' : 'border-gray-300'}`}>
                                        {formData.fastingRequired && <AlertCircle size={10} className="text-white" />}
                                    </div>
                                    <span className="text-sm font-medium">Fasting Required</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Normal Ranges */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-sm">
                        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Normal Reference Ranges</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {(Object.keys(formData.normalRanges) as Array<keyof typeof formData.normalRanges>).map((category) => (
                                <div key={category} className="p-4 bg-slate-50 dark:bg-gray-900 rounded-xl border border-slate-100 dark:border-gray-800">
                                    <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-3 capitalize">{category}</h3>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            placeholder="Min"
                                            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg text-sm text-center focus:ring-1 focus:ring-indigo-500 outline-none"
                                            value={formData.normalRanges[category].min}
                                            onChange={e => handleRangeChange(category, 'min', e.target.value)}
                                        />
                                        <span className="text-gray-400">-</span>
                                        <input
                                            type="number"
                                            placeholder="Max"
                                            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg text-sm text-center focus:ring-1 focus:ring-indigo-500 outline-none"
                                            value={formData.normalRanges[category].max}
                                            onChange={e => handleRangeChange(category, 'max', e.target.value)}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="lg:col-span-4 space-y-6">
                    {/* Price */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-sm">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Price (₹) <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-gray-400">₹</span>
                            <input
                                type="number"
                                required
                                className="w-full pl-10 pr-4 py-4 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 text-2xl font-bold text-gray-900 dark:text-white"
                                placeholder="0"
                                value={formData.price}
                                onChange={e => setFormData({ ...formData, price: e.target.value })}
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Base price for this test</p>
                    </div>

                    {/* Dynamic Result Parameters - Now in Sidebar */}
                    <div className="max-h-[600px] overflow-y-auto">
                        <ResultParametersManager
                            parameters={formData.resultParameters}
                            onChange={(params) => setFormData({ ...formData, resultParameters: params })}
                        />
                    </div>

                    {/* Actions */}
                    <div className="space-y-3 sticky bottom-0 bg-gradient-to-t from-white dark:from-gray-900 pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium shadow-sm transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Save size={18} />
                                    {isEditMode ? 'Save Changes' : 'Create Test'}
                                </>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="w-full py-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 font-medium text-sm transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </form>

            {/* Modal */}
            {modalState.type && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-gray-700 p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{modalState.title}</h3>
                            <button onClick={() => setModalState({ type: null, title: '' })} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Name</label>
                                <input
                                    type="text"
                                    autoFocus
                                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                                    placeholder="Enter name..."
                                    value={newItemName}
                                    onChange={e => setNewItemName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddCustomItem()}
                                />
                            </div>

                            <button
                                onClick={handleAddCustomItem}
                                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-all"
                            >
                                Add
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default React.memo(ManageTestPage);
