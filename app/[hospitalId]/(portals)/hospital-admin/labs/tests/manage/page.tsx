'use client';

import React, {  useState, useEffect , useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Plus, X, Database, FlaskConical, Network, Calculator, Activity, ChevronLeft } from 'lucide-react';
import { LabTestService } from '@/lib/integrations/services/labTest.service';
import { DepartmentService } from '@/lib/integrations/services/department.service';
import { Department } from '@/lib/integrations/types/department';
import { toast } from 'react-hot-toast';

function HospitalAdminManageTestPage() {
    const queryClient = useQueryClient();
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

    const [showTestModal, setShowTestModal] = useState(false);
    const [showDeptModal, setShowDeptModal] = useState(false);
    const [showMethodModal, setShowMethodModal] = useState(false);
    const [showSampleModal, setShowSampleModal] = useState(false);
    const [showTatModal, setShowTatModal] = useState(false);
    const [newItemName, setNewItemName] = useState('');

    const [formData, setFormData] = useState({
        testName: '',
        departmentId: '',
        departmentIds: [] as string[],
        sampleType: '',
        price: '',
        unit: '',
        method: '', // Used for Methodology
        turnaroundTime: '', // Used for Temporal TAT Cycle
        temporalTATCycle: '', // Explicit field if needed, but turnaroundTime seems to be it
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
        reportFormat: '' // Explicit field
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
            toast.error("Resource synchronization failed");
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
                temporalTATCycle: test.temporalTATCycle || test.turnaroundTime || '',
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
            });
        } catch (error) {
            console.error("Failed to fetch test details", error);
            toast.error("Protocol retrieval failed");
            router.push('/hospital-admin/labs/tests');
        } finally {
            setInitialLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Character limits
        if (formData.testName.length > 255) return toast.error('Protocol Nomenclature cannot exceed 255 characters');
        if (formData.sampleType.length > 255) return toast.error('Biological material type cannot exceed 255 characters');
        if (formData.unit.length > 255) return toast.error('Unit cannot exceed 255 characters');
        if (formData.method.length > 255) return toast.error('Methodology cannot exceed 255 characters');
        if (formData.sampleVolume.length > 255) return toast.error('Sample Volume cannot exceed 255 characters');
        if (formData.testCode.length > 255) return toast.error('Internal Code cannot exceed 255 characters');
        if (formData.reportFormat.length > 500) return toast.error('Report Format cannot exceed 500 characters');

        const priceVal = parseFloat(formData.price);
        if (isNaN(priceVal) || priceVal < 0) {
            toast.error("Economic value must be non-negative");
            return;
        }

        if (!formData.testName.trim()) return toast.error("Test name is required");
        if (!formData.departmentIds.length) return toast.error("Assign at least one department node");
        if (!formData.sampleType) return toast.error("Biological material type is required");

        // Reference range validations
        const ranges = formData.normalRanges;
        const categories = Object.keys(ranges) as (keyof typeof ranges)[];
        for (const cat of categories) {
            const min = parseFloat(ranges[cat].min);
            const max = parseFloat(ranges[cat].max);
            if (!isNaN(min) && !isNaN(max) && max < min) {
                toast.error(`Invalid range for ${cat}: Max cannot be less than Min`);
                return;
            }
        }

        setLoading(true);
        const payload: any = {
            ...formData,
            price: priceVal,
            methodology: formData.method, // Sync
            temporalTATCycle: formData.turnaroundTime, // Sync
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
                toast.success("Protocol hierarchy updated");
            } else {
                await LabTestService.addTest(payload);
                toast.success("New protocol node initialized");
            }
            
            // Invalidate queries to ensure lists are updated immediately
            queryClient.invalidateQueries({ queryKey: ['hospital-admin-lab-tests'] });
            queryClient.invalidateQueries({ queryKey: ['hospital-admin-lab-departments'] });
            
            router.push('/hospital-admin/labs/tests');
        } catch (error: any) {
            toast.error(error.message || "Protocol save failed");
        } finally {
            setLoading(false);
        }
    };

    const handleRangeChange = (category: 'male' | 'female' | 'child' | 'newborn' | 'infant' | 'geriatric', field: 'min' | 'max', value: string) => {
        setFormData(prev => ({
            ...prev,
            normalRanges: { ...prev.normalRanges, [category]: { ...prev.normalRanges[category], [field]: value } }
        }));
    };

    const handleAddNewDept = async () => {
        if (!newItemName) return;
        try {
            const res = await DepartmentService.addDepartment({ name: newItemName });
            setDepartments(prev => [...prev, res.department]);
            setFormData(prev => ({
                ...prev,
                departmentId: res.department._id,
                departmentIds: Array.from(new Set([...prev.departmentIds, res.department._id]))
            }));
            setShowDeptModal(false);
            setNewItemName('');
            toast.success("Department node active");
        } catch (error) {
            toast.error("Node initialization failed");
        }
    };





    if (initialLoading) return (
        <div className="flex flex-col items-center justify-center p-20 gap-4">
            <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest opacity-50">Syncing Protocol Metadata...</p>
        </div>
    );

    return (
        <div className="space-y-10 ">
            {/* Header Tier */}
            <div className="flex items-center gap-6">
                <button onClick={() => router.back()} className="p-4 bg-white dark:bg-gray-800 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-700 shadow-sm active:scale-95 group">
                    <ChevronLeft className="w-6 h-6 text-gray-600 dark:text-gray-300 group-hover:-translate-x-1" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white  uppercase">{isEditMode ? 'Modify Protocol' : 'Initialize Protocol'}</h1>
                    <p className="text-gray-500 dark:text-gray-400 font-bold mt-1 uppercase tracking-[0.2em] text-[10px] ml-1 flex items-center gap-2">
                        <Database className="w-3 h-3 text-blue-500" />
                        Strategic Lab Catalog Node Management
                    </p>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-[3rem] shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
              
                <form onSubmit={handleSubmit} className="p-10 lg:p-16 space-y-16">

                    {/* Primary Identifier Section */}
                    <div className="space-y-10">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl">
                                <FlaskConical size={24} />
                            </div>
                            <h3 className="text-xl font-thin text-gray-900 dark:text-white uppercase">Primary Identifiers</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Protocol Nomenclature *</label>
                                <div className="flex gap-3">
                                    <select
                                        required
                                        className="w-full p-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-black dark:text-white appearance-none"
                                        value={formData.testName}
                                        onChange={e => setFormData({ ...formData, testName: e.target.value })}
                                    >
                                        <option value="">-- Select Hub Template --</option>
                                        {metaOptions.testNames.map((name: string) => <option key={name} value={name}>{name}</option>)}
                                        {formData.testName && !metaOptions.testNames.includes(formData.testName) && <option value={formData.testName}>{formData.testName}</option>}
                                    </select>
                                    <button type="button" onClick={() => setShowTestModal(true)} className="p-4 bg-blue-600 text-white rounded-2xl hover:scale-105 shadow-lg active:scale-95"><Plus size={24} /></button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Economic Valuation (₹) *</label>
                                <div className="relative">
                                    <Calculator className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="number"
                                        required
                                        className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-lg font-black italic tracking-tighter text-blue-600"
                                        placeholder="0.00"
                                        value={formData.price}
                                        onChange={e => setFormData({ ...formData, price: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Internal Code</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        className="w-full pl-5 pr-4 py-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-black dark:text-white"
                                        placeholder="CODE-001"
                                        value={formData.testCode}
                                        onChange={e => setFormData({ ...formData, testCode: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-6 md:col-span-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Node Distribution *</label>
                                    <button type="button" onClick={() => setShowDeptModal(true)} className="px-5 py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl text-[9px] font-black uppercase tracking-widest border border-indigo-100 hover:bg-indigo-600 hover:text-white">Initialize Node</button>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                                    {departments.map(dept => {
                                        const isSelected = formData.departmentIds.includes(dept._id);
                                        return (
                                            <div
                                                key={dept._id}
                                                onClick={() => {
                                                    const newIds = isSelected ? formData.departmentIds.filter(id => id !== dept._id) : [...formData.departmentIds, dept._id];
                                                    setFormData({ ...formData, departmentIds: newIds, departmentId: newIds[0] || '' });
                                                }}
                                                className={`cursor-pointer p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 ${isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-600' : 'border-gray-50 dark:border-gray-700/50 bg-gray-50/50 text-gray-400 hover:border-blue-200'}`}
                                            >
                                                <Network size={20} className={isSelected ? 'text-blue-600' : 'text-gray-300'} />
                                                <span className="text-[9px] font-black uppercase tracking-tighter text-center">{dept.name}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Operational Metadata Section */}
                    <div className="space-y-10">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-2xl">
                                <Activity size={24} />
                            </div>
                            <h3 className="text-xl font-thin text-gray-900 dark:text-white uppercase">Operational Metadata</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Bio-material Type *</label>
                                <div className="flex gap-2">
                                    <select
                                        required
                                        className="w-full p-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 text-xs font-black dark:text-white"
                                        value={formData.sampleType}
                                        onChange={e => setFormData({ ...formData, sampleType: e.target.value })}
                                    >
                                        <option value="">-- Select Material --</option>
                                        {metaOptions.sampleTypes.map((type: string) => <option key={type} value={type}>{type}</option>)}
                                    </select>
                                    <button type="button" onClick={() => setShowSampleModal(true)} className="p-4 bg-primary-theme text-white rounded-2xl active:scale-95"><Plus size={20} /></button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Processing Methodology</label>
                                <div className="flex gap-2">
                                    <select
                                        className="w-full p-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 text-xs font-black dark:text-white"
                                        value={formData.method}
                                        onChange={e => setFormData({ ...formData, method: e.target.value })}
                                    >
                                        <option value="">-- Select Method --</option>
                                        {metaOptions.methods.map((m: string) => <option key={m} value={m}>{m}</option>)}
                                        {formData.method && !metaOptions.methods.includes(formData.method) && <option value={formData.method}>{formData.method}</option>}
                                    </select>
                                    <button type="button" onClick={() => setShowMethodModal(true)} className="p-4 bg-gray-100 dark:bg-gray-700 text-gray-400 rounded-2xl active:scale-95"><Plus size={20} /></button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Temporal TAT cycle</label>
                                <div className="flex gap-2">
                                    <select
                                        className="w-full p-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 text-xs font-black dark:text-white"
                                        value={formData.turnaroundTime}
                                        onChange={e => setFormData({ ...formData, turnaroundTime: e.target.value })}
                                    >
                                        <option value="">-- Select Interval --</option>
                                        {metaOptions.turnaroundTimes.map((tat: string) => <option key={tat} value={tat}>{tat}</option>)}
                                        {formData.turnaroundTime && !metaOptions.turnaroundTimes.includes(formData.turnaroundTime) && <option value={formData.turnaroundTime}>{formData.turnaroundTime}</option>}
                                    </select>
                                    <button type="button" onClick={() => setShowTatModal(true)} className="p-4 bg-gray-100 dark:bg-gray-700 text-gray-400 rounded-2xl active:scale-95"><Plus size={20} /></button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Clinical Parameters Section */}
                    <div className="space-y-10">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-2xl">
                                <Activity size={24} />
                            </div>
                            <h3 className="text-xl font-thin text-gray-900 dark:text-white uppercase">Clinical Parameters</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Unit of Measure</label>
                                <select
                                    className="w-full p-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 text-xs font-black dark:text-white"
                                    value={formData.unit}
                                    onChange={e => setFormData({ ...formData, unit: e.target.value })}
                                >
                                    <option value="">-- Select Unit --</option>
                                    {metaOptions.units?.map((u: string) => <option key={u} value={u}>{u}</option>)}
                                </select>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Report Type</label>
                                <select
                                    className="w-full p-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 text-xs font-black dark:text-white"
                                    value={formData.reportType}
                                    onChange={e => setFormData({ ...formData, reportType: e.target.value as any })}
                                >
                                    <option value="numeric">NUMERIC ONLY</option>
                                    <option value="text">TEXTUAL / REMARKS</option>
                                    <option value="both">HYBRID (BOTH)</option>
                                </select>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Report Format</label>
                                <input
                                    type="text"
                                    className="w-full p-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 text-xs font-black dark:text-white"
                                    placeholder="e.g. Table, List, Paragraph"
                                    value={formData.reportFormat}
                                    onChange={e => setFormData({ ...formData, reportFormat: e.target.value })}
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Sample Volume</label>
                                <input
                                    type="text"
                                    className="w-full p-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 text-xs font-black dark:text-white"
                                    placeholder="e.g. 2ml Serum"
                                    value={formData.sampleVolume}
                                    onChange={e => setFormData({ ...formData, sampleVolume: e.target.value })}
                                />
                            </div>

                            <div className="flex items-center h-full pt-4">
                                <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-900 p-4 rounded-2xl w-full cursor-pointer" onClick={() => setFormData({ ...formData, fastingRequired: !formData.fastingRequired })}>
                                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center ${formData.fastingRequired ? 'border-teal-500 bg-teal-500' : 'border-gray-300 dark:border-gray-700'}`}>
                                        {formData.fastingRequired && <Activity size={14} className="text-white" />}
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-300 select-none">Fasting Required</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Biological Reference Thresholds */}
                    <div className="space-y-10">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-2xl">
                                <Activity size={24} />
                            </div>
                            <h3 className="text-xl font-thin text-gray-900 dark:text-white uppercase">Biological Reference Thresholds</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {/* Male */}
                            <div className="p-6 bg-blue-50/50 dark:bg-blue-900/10 rounded-3xl border border-blue-100 dark:border-blue-900/30 hover:border-blue-300">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-3 h-3 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50"></div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-800 dark:text-blue-300">Male Spectrum</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <input
                                        type="number"
                                        placeholder="MIN"
                                        className="w-full p-3 bg-white dark:bg-gray-900 border-none rounded-xl text-xs font-black text-center dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50"
                                        value={formData.normalRanges.male.min}
                                        onChange={e => handleRangeChange('male', 'min', e.target.value)}
                                    />
                                    <input
                                        type="number"
                                        placeholder="MAX"
                                        className="w-full p-3 bg-white dark:bg-gray-900 border-none rounded-xl text-xs font-black text-center dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50"
                                        value={formData.normalRanges.male.max}
                                        onChange={e => handleRangeChange('male', 'max', e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Female */}
                            <div className="p-6 bg-pink-50/50 dark:bg-pink-900/10 rounded-3xl border border-pink-100 dark:border-pink-900/30 hover:border-pink-300">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-3 h-3 rounded-full bg-pink-500 shadow-lg shadow-pink-500/50"></div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-pink-800 dark:text-pink-300">Female Spectrum</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <input
                                        type="number"
                                        placeholder="MIN"
                                        className="w-full p-3 bg-white dark:bg-gray-900 border-none rounded-xl text-xs font-black text-center dark:text-white outline-none focus:ring-2 focus:ring-pink-500/50"
                                        value={formData.normalRanges.female.min}
                                        onChange={e => handleRangeChange('female', 'min', e.target.value)}
                                    />
                                    <input
                                        type="number"
                                        placeholder="MAX"
                                        className="w-full p-3 bg-white dark:bg-gray-900 border-none rounded-xl text-xs font-black text-center dark:text-white outline-none focus:ring-2 focus:ring-pink-500/50"
                                        value={formData.normalRanges.female.max}
                                        onChange={e => handleRangeChange('female', 'max', e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Child */}
                            <div className="p-6 bg-green-50/50 dark:bg-green-900/10 rounded-3xl border border-green-100 dark:border-green-900/30 hover:border-green-300">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-3 h-3 rounded-full bg-green-500 shadow-lg shadow-green-500/50"></div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-green-800 dark:text-green-300">Child Spectrum</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <input
                                        type="number"
                                        placeholder="MIN"
                                        className="w-full p-3 bg-white dark:bg-gray-900 border-none rounded-xl text-xs font-black text-center dark:text-white outline-none focus:ring-2 focus:ring-green-500/50"
                                        value={formData.normalRanges.child.min}
                                        onChange={e => handleRangeChange('child', 'min', e.target.value)}
                                    />
                                    <input
                                        type="number"
                                        placeholder="MAX"
                                        className="w-full p-3 bg-white dark:bg-gray-900 border-none rounded-xl text-xs font-black text-center dark:text-white outline-none focus:ring-2 focus:ring-green-500/50"
                                        value={formData.normalRanges.child.max}
                                        onChange={e => handleRangeChange('child', 'max', e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Newborn */}
                            <div className="p-6 bg-yellow-50/50 dark:bg-yellow-900/10 rounded-3xl border border-yellow-100 dark:border-yellow-900/30 hover:border-yellow-300">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-lg shadow-yellow-500/50"></div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-800 dark:text-yellow-300">Newborn Spectrum</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <input
                                        type="number"
                                        placeholder="MIN"
                                        className="w-full p-3 bg-white dark:bg-gray-900 border-none rounded-xl text-xs font-black text-center dark:text-white outline-none focus:ring-2 focus:ring-yellow-500/50"
                                        value={formData.normalRanges.newborn.min}
                                        onChange={e => handleRangeChange('newborn', 'min', e.target.value)}
                                    />
                                    <input
                                        type="number"
                                        placeholder="MAX"
                                        className="w-full p-3 bg-white dark:bg-gray-900 border-none rounded-xl text-xs font-black text-center dark:text-white outline-none focus:ring-2 focus:ring-yellow-500/50"
                                        value={formData.normalRanges.newborn.max}
                                        onChange={e => handleRangeChange('newborn', 'max', e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Infant */}
                            <div className="p-6 bg-cyan-50/50 dark:bg-cyan-900/10 rounded-3xl border border-cyan-100 dark:border-cyan-900/30 hover:border-cyan-300">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-3 h-3 rounded-full bg-cyan-500 shadow-lg shadow-cyan-500/50"></div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-800 dark:text-cyan-300">Infant Spectrum</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <input
                                        type="number"
                                        placeholder="MIN"
                                        className="w-full p-3 bg-white dark:bg-gray-900 border-none rounded-xl text-xs font-black text-center dark:text-white outline-none focus:ring-2 focus:ring-cyan-500/50"
                                        value={formData.normalRanges.infant.min}
                                        onChange={e => handleRangeChange('infant', 'min', e.target.value)}
                                    />
                                    <input
                                        type="number"
                                        placeholder="MAX"
                                        className="w-full p-3 bg-white dark:bg-gray-900 border-none rounded-xl text-xs font-black text-center dark:text-white outline-none focus:ring-2 focus:ring-cyan-500/50"
                                        value={formData.normalRanges.infant.max}
                                        onChange={e => handleRangeChange('infant', 'max', e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Geriatric */}
                            <div className="p-6 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-3xl border border-indigo-100 dark:border-indigo-900/30 hover:border-indigo-300">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-3 h-3 rounded-full bg-indigo-500 shadow-lg shadow-indigo-500/50"></div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-800 dark:text-indigo-300">Geriatric Spectrum</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <input
                                        type="number"
                                        placeholder="MIN"
                                        className="w-full p-3 bg-white dark:bg-gray-900 border-none rounded-xl text-xs font-black text-center dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/50"
                                        value={formData.normalRanges.geriatric.min}
                                        onChange={e => handleRangeChange('geriatric', 'min', e.target.value)}
                                    />
                                    <input
                                        type="number"
                                        placeholder="MAX"
                                        className="w-full p-3 bg-white dark:bg-gray-900 border-none rounded-xl text-xs font-black text-center dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/50"
                                        value={formData.normalRanges.geriatric.max}
                                        onChange={e => handleRangeChange('geriatric', 'max', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Submit Terminal */}
                    <div className="flex justify-end items-center gap-6 pt-10 border-t border-gray-100 dark:border-gray-700">
                        <button type="button" onClick={() => router.back()} className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] hover:text-rose-500">Abort sequence</button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-12 py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-3xl font-black uppercase tracking-[0.3em] text-[10px] shadow-xl shadow-blue-500/20 active:scale-95 flex items-center gap-3 disabled:opacity-50"
                        >
                            {loading ? <Activity className="w-5 h-5 animate-spin" /> : <><Save size={18} /> Synchronize protocol</>}
                        </button>
                    </div>
                </form>
            </div>

            {/* MODALS */}
            {(showTestModal || showDeptModal || showMethodModal || showSampleModal || showTatModal) && (
                <div className="fixed inset-0 z-100 flex items-center justify-center p-6 bg-gray-900/80 backdrop-blur-md">
                    <div className="bg-white dark:bg-gray-800 rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 dark:border-gray-700">
                        <div className="p-8 border-b border-gray-50 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
                            <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-[0.2em] italic">
                                Initialize {showTestModal ? 'Protocol' : showDeptModal ? 'Node' : showSampleModal ? 'Material' : showTatModal ? 'Cycle' : 'Method'}
                            </h3>
                            <button onClick={() => { setShowTestModal(false); setShowDeptModal(false); setShowMethodModal(false); setShowSampleModal(false); setShowTatModal(false); setNewItemName(''); }} className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-gray-400 hover:text-rose-500 rounded-xl"><X size={20} /></button>
                        </div>
                        <div className="p-10 space-y-8">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 italic">Nomenclature Hub</label>
                                {showDeptModal && metaOptions.departmentNames && (
                                    <div className="relative group">
                                        <select
                                            className="w-full p-5 bg-gray-50 dark:bg-gray-900 border-none rounded-3xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-black dark:text-white italic tracking-tight appearance-none"
                                            onChange={(e) => setNewItemName(e.target.value)}
                                            value={""} // Always show placeholder to encourage "selection" or "typing" distinctness, or bind to newItemName if we want it to reflect.
                                        // Actually, binding to newItemName is better UX if they just picked it.
                                        // But if they type something custom, the select might look weird.
                                        // Let's stick to the Lab Panel implementation which binds value={newItemName}
                                        >
                                            <option value="">-- SELECT STANDARD TEMPLATE --</option>
                                            {metaOptions.departmentNames.map((name: string) => (
                                                <option key={name} value={name}>{name}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover:text-blue-500">
                                            <Database size={16} />
                                        </div>
                                    </div>
                                )}
                                <input
                                    autoFocus
                                    type="text"
                                    className="w-full p-5 bg-gray-50 dark:bg-gray-900 border-none rounded-3xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-black dark:text-white italic tracking-tight"
                                    placeholder="OR_INPUT_CUSTOM_NOMENCLATURE..."
                                    value={newItemName}
                                    onChange={e => setNewItemName(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={() => {
                                    if (showTestModal) { setFormData(prev => ({ ...prev, testName: newItemName })); setShowTestModal(false); }
                                    else if (showDeptModal) { handleAddNewDept(); }
                                    else if (showSampleModal) { setFormData(prev => ({ ...prev, sampleType: newItemName })); setShowSampleModal(false); }
                                    else if (showMethodModal) { setFormData(prev => ({ ...prev, method: newItemName })); setShowMethodModal(false); }
                                    else if (showTatModal) { setFormData(prev => ({ ...prev, turnaroundTime: newItemName })); setShowTatModal(false); }
                                    setNewItemName('');
                                }}
                                className="w-full py-5 bg-blue-600 text-white rounded-3xl font-black uppercase tracking-[0.3em] text-[10px] shadow-xl shadow-blue-500/20 active:scale-95"
                            >
                                Synchronize node
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


// ✅ OPTIMIZED: Memoized component
export default React.memo(HospitalAdminManageTestPage);
