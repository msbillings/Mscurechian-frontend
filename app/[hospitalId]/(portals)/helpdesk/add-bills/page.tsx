'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, User, FileText, Plus, Trash2, Loader2, ArrowLeft,
    CheckCircle2, AlertTriangle, Receipt, TestTube, Activity,
    Building2, IndianRupee, Clock, Stethoscope, X, ChevronDown,
    Sparkles, Package, Heart, Microscope, Printer
} from 'lucide-react';
import { helpdeskService, ipdService } from '@/lib/integrations';
import { apiClient } from '@/lib/integrations/api/apiClient';
import toast from 'react-hot-toast';
import { generateAddBillsReceiptHtml, computeAgeFromDob } from '@/lib/print-utils';
import { useAuthStore } from '@/stores/authStore';
import { usePrintStore } from '@/stores/printStore';
import type { LabTest } from '@/lib/integrations/services/lab.service';

// ─── Types ──────────────────────────────────────────────────────────────────
interface BillItem {
    id: string;
    type: 'lab' | 'ipd_charge' | 'custom';
    name: string;
    category: string;
    amount: number;
    labTestId?: string; // Reference to lab test catalog
    isNew?: boolean;    // If this is a newly created test
    packageId?: string; // Reference to package if from a package
    packageName?: string; // Package name for display
}

type BillMode = 'lab' | 'ipd_charge' | 'custom' | 'package';

// ─── Component ──────────────────────────────────────────────────────────────
export default function AddBillsPage() {
    const router = useRouter();

    // ── Patient Search ──
    const [patientSearch, setPatientSearch] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searchingPatients, setSearchingPatients] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState<any>(null);
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    // ── Active IPD Admission ──
    const [activeAdmission, setActiveAdmission] = useState<any>(null);
    const [loadingAdmission, setLoadingAdmission] = useState(false);

    // ── Lab Tests Catalog ──
    const [labTests, setLabTests] = useState<LabTest[]>([]);
    const [loadingLabTests, setLoadingLabTests] = useState(false);
    const [labTestSearch, setLabTestSearch] = useState('');
    const [showLabTestDropdown, setShowLabTestDropdown] = useState(false);
    const labTestRef = useRef<HTMLDivElement>(null);

    // ── Packages ──
    const [packages, setPackages] = useState<any[]>([]);
    const [loadingPackages, setLoadingPackages] = useState(false);
    const [selectedPackageId, setSelectedPackageId] = useState('');

    // ── Custom IPD Charges ──
    const [customCharges, setCustomCharges] = useState<any[]>([]);
    const [loadingCustomCharges, setLoadingCustomCharges] = useState(false);

    // ── Bill Items ──
    const [billItems, setBillItems] = useState<BillItem[]>([]);
    const [billMode, setBillMode] = useState<BillMode>('lab');

    // ── Custom / New Test Form ──
    const [newTestName, setNewTestName] = useState('');
    const [newTestPrice, setNewTestPrice] = useState('');
    const [newChargeCategory, setNewChargeCategory] = useState('Lab Test');
    const [newChargeDescription, setNewChargeDescription] = useState('');
    const [newChargeAmount, setNewChargeAmount] = useState('');

    // ── Submission ──
    const [submitting, setSubmitting] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'upi' | 'mixed' | 'due'>('cash');
    const [mixedDetails, setMixedDetails] = useState({ cash: 0, card: 0, upi: 0 });

    // ── Print Preview ──
    const [showPrintModal, setShowPrintModal] = useState(false);
    const { printWithHeader, setPrintWithHeader } = usePrintStore();
    const [previewHtml, setPreviewHtml] = useState("");

    // ── Local Storage Persistence ──
    const STORAGE_KEY = 'add-bills-form-state';
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.selectedPatient) setSelectedPatient(parsed.selectedPatient);
                if (parsed.patientSearch) setPatientSearch(parsed.patientSearch);
                if (parsed.billItems) setBillItems(parsed.billItems);
                if (parsed.activeAdmission) setActiveAdmission(parsed.activeAdmission);
                if (parsed.paymentMethod) setPaymentMethod(parsed.paymentMethod);
                if (parsed.mixedDetails) setMixedDetails(parsed.mixedDetails);
            }
        } catch (e) {
            console.error('Failed to load form state', e);
        }
    }, []);

    useEffect(() => {
        try {
            const stateToSave = {
                selectedPatient,
                patientSearch,
                billItems,
                activeAdmission,
                paymentMethod,
                mixedDetails
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
        } catch (e) {
            console.error('Failed to save form state', e);
        }
    }, [selectedPatient, patientSearch, billItems, activeAdmission, paymentMethod, mixedDetails]);

    // ── Load Lab Tests ──
    useEffect(() => {
        const fetchLabTests = async () => {
            try {
                setLoadingLabTests(true);
                const res: any = await apiClient('/helpdesk/lab-tests');
                const tests = res.tests || res.data || res || [];
                setLabTests(tests);
            } catch (e) {
                console.error('Failed to fetch lab tests', e);
            } finally {
                setLoadingLabTests(false);
            }
        };
        const fetchPackages = async () => {
            try {
                setLoadingPackages(true);
                const res: any = await apiClient('/helpdesk/packages?activeOnly=true');
                setPackages(res.data || []);
            } catch (e) {
                console.error('Failed to fetch packages', e);
            } finally {
                setLoadingPackages(false);
            }
        };
        const fetchCustomCharges = async () => {
            try {
                setLoadingCustomCharges(true);
                const res: any = await apiClient('/hospital/charges');
                if (res.success && res.data) {
                    setCustomCharges(res.data);
                }
            } catch (e) {
                console.error('Failed to fetch custom charges', e);
            } finally {
                setLoadingCustomCharges(false);
            }
        };
        fetchLabTests();
        fetchPackages();
        fetchCustomCharges();
    }, []);

    // ── Patient Search ──
    useEffect(() => {
        if (patientSearch.length < 3) {
            setSearchResults([]);
            return;
        }
        const timer = setTimeout(async () => {
            try {
                setSearchingPatients(true);
                const results = await helpdeskService.searchPatients(patientSearch);
                const list = Array.isArray(results) ? results : (results as any).data || [];
                setSearchResults(list);
                setShowSearchDropdown(true);
            } catch (e) {
                console.error('Search error', e);
            } finally {
                setSearchingPatients(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [patientSearch]);

    // ── Click Outside ──
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setShowSearchDropdown(false);
            }
            if (labTestRef.current && !labTestRef.current.contains(e.target as Node)) {
                setShowLabTestDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    // ── Select Patient → Check IPD Admission ──
    const handleSelectPatient = useCallback(async (patient: any) => {
        const transformed = {
            _id: patient.user?._id || patient._id || patient.id,
            patientId: patient._id || patient.id,
            name: patient.user?.name || patient.name,
            mobile: patient.user?.mobile || patient.profile?.contactNumber || patient.mobile || 'N/A',
            mrn: patient.mrn || patient.profile?.mrn || 'N/A',
            gender: patient.profile?.gender || patient.gender || 'N/A',
            age: patient.profile?.age || patient.age || 'N/A',
            bloodGroup: patient.profile?.bloodGroup || patient.bloodGroup || '',
        };
        setSelectedPatient(transformed);
        setPatientSearch('');
        setShowSearchDropdown(false);
        setBillItems([]);

        // Check for active IPD admission
        try {
            setLoadingAdmission(true);
            const admissions = await helpdeskService.getPatientIPDAdmissions(transformed.patientId || transformed._id);
            const admissionList = Array.isArray(admissions) ? admissions : (admissions as any).admissions || [];
            const active = admissionList.find((a: any) => a.status === 'Active');
            setActiveAdmission(active || null);
            if (active) {
                toast.success(`Active IPD Admission found: ${active.admissionId}`, { icon: '🏥' });
                try {
                    const prescs = await ipdService.getPrescriptions(active._id || active.id);
                    const autoItems: BillItem[] = [];
                    if (Array.isArray(prescs)) {
                        prescs.forEach((p: any) => {
                            if (Array.isArray(p.suggestedTests)) {
                                p.suggestedTests.forEach((testName: string) => {
                                    if (testName && typeof testName === 'string') {
                                        autoItems.push({
                                            id: `auto-test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                                            type: 'lab',
                                            name: testName.trim(),
                                            category: 'Doctor Prescribed Test',
                                            amount: 500,
                                        });
                                    }
                                });
                            }
                            if (Array.isArray(p.medicines)) {
                                p.medicines.forEach((med: any) => {
                                    if (med && med.name) {
                                        autoItems.push({
                                            id: `auto-med-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                                            type: 'ipd_charge',
                                            name: `${med.name} (${med.dosage || ''})`.trim(),
                                            category: 'Consumables',
                                            amount: 150,
                                        });
                                    }
                                });
                            }
                        });
                    }
                    if (autoItems.length > 0) {
                        setBillItems(prev => [...prev, ...autoItems]);
                        toast.success(`Auto-populated ${autoItems.length} doctor prescribed tests & charges!`, { icon: '✨' });
                    }
                } catch (err) {
                    console.error('Error fetching prescriptions for auto-fill:', err);
                }
            }
        } catch (e) {
            setActiveAdmission(null);
        } finally {
            setLoadingAdmission(false);
        }
    }, []);

    // ── Add Lab Test to Bill ──
    const addLabTestToBill = (test: LabTest) => {
        if (billItems.find(i => i.labTestId === test._id)) {
            toast.error('This test is already added');
            return;
        }
        const newItem: BillItem = {
            id: `lab-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            type: 'lab',
            name: test.name,
            category: test.category || test.department || 'Lab Test',
            amount: test.price || 0,
            labTestId: test._id,
        };
        setBillItems(prev => [...prev, newItem]);
        setLabTestSearch('');
        setShowLabTestDropdown(false);
        toast.success(`Added: ${test.name}`);
    };

    // ── Add New Custom Test ──
    const addNewTest = () => {
        if (!newTestName.trim()) { toast.error('Enter test name'); return; }
        if (!newTestPrice || parseFloat(newTestPrice) <= 0) { toast.error('Enter valid price'); return; }
        const newItem: BillItem = {
            id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            type: 'lab',
            name: newTestName.trim(),
            category: 'Lab Test (Custom)',
            amount: parseFloat(newTestPrice),
            isNew: true,
        };
        setBillItems(prev => [...prev, newItem]);
        setNewTestName('');
        setNewTestPrice('');
        toast.success(`Custom test added: ${newTestName.trim()}`);
    };

    // ── Add IPD Extra Charge ──
    const addIPDCharge = () => {
        if (!newChargeDescription.trim()) { toast.error('Enter charge description'); return; }
        if (!newChargeAmount || parseFloat(newChargeAmount) <= 0) { toast.error('Enter valid amount'); return; }
        const newItem: BillItem = {
            id: `ipd-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            type: 'ipd_charge',
            name: newChargeDescription.trim(),
            category: newChargeCategory,
            amount: parseFloat(newChargeAmount),
        };
        setBillItems(prev => [...prev, newItem]);
        setNewChargeDescription('');
        setNewChargeAmount('');
        toast.success(`IPD charge added: ${newChargeDescription.trim()}`);
    };

    // ── Remove Item ──
    const removeItem = (id: string) => {
        setBillItems(prev => prev.filter(i => i.id !== id));
    };

    // ── Total ──
    const totalAmount = billItems.reduce((sum, item) => sum + item.amount, 0);

    // ── Filtered Lab Tests ──
    const filteredLabTests = labTestSearch.length >= 1
        ? labTests.filter(t =>
            t.name.toLowerCase().includes(labTestSearch.toLowerCase()) ||
            (t.code && t.code.toLowerCase().includes(labTestSearch.toLowerCase()))
        ).slice(0, 15)
        : [];

    const showCreateNew = labTestSearch.length >= 2 && filteredLabTests.length === 0;

    // ── Submit Bill ──
    const handleSubmitBill = async () => {
        if (!selectedPatient) { toast.error('Select a patient first'); return; }
        if (billItems.length === 0) { toast.error('Add at least one item'); return; }

        if (paymentMethod === 'mixed') {
            const totalMixed = (mixedDetails.cash || 0) + (mixedDetails.card || 0) + (mixedDetails.upi || 0);
            if (Math.abs(totalMixed - Math.round(totalAmount)) > 2) {
                toast.error(`Mixed payments (₹${totalMixed}) do not match total (₹${Math.round(totalAmount)})`);
                return;
            }
        }

        setSubmitting(true);
        try {
            // Treat custom items as lab items if OPD (to ensure they create a transaction)
            const effectiveLabItems = [...billItems.filter(i => i.type === 'lab')];
            const ipdItems = billItems.filter(i => i.type === 'ipd_charge');
            let customItems = billItems.filter(i => i.type === 'custom');

            if (!activeAdmission && customItems.length > 0) {
                // If OPD, convert custom charges to lab test logic so they are billed properly
                customItems.forEach(item => {
                    effectiveLabItems.push({
                        ...item,
                        type: 'lab',
                        isNew: true, // Force creation in catalog
                        category: item.category || 'OPD Custom Charge'
                    });
                });
                customItems = []; // clear custom items since they are now lab items
            }

            const results: string[] = [];

            // 1. Create Lab Orders for lab tests (and OPD custom charges)
            if (effectiveLabItems.length > 0) {
                const newTests = effectiveLabItems.filter(i => i.isNew);

                // Create new tests in catalog first
                for (const nt of newTests) {
                    try {
                        await apiClient('/helpdesk/lab-tests', {
                            method: 'POST',
                            body: JSON.stringify({
                                testName: nt.name,
                                name: nt.name,
                                price: nt.amount,
                                category: nt.category || 'Custom',
                                isActive: true,
                            }),
                        });
                    } catch (e: any) {
                        console.error(`Failed to create test catalog entry ${nt.name}`, e);
                    }
                }

                try {
                    const totalLabAmount = effectiveLabItems.reduce((sum, i) => sum + i.amount, 0);

                    const labRatio = totalAmount > 0 ? totalLabAmount / totalAmount : 1;
                    const labMixed = {
                        cash: Math.round((mixedDetails.cash || 0) * labRatio),
                        card: Math.round((mixedDetails.card || 0) * labRatio),
                        upi: Math.round((mixedDetails.upi || 0) * labRatio)
                    };

                    await apiClient('/helpdesk/lab-orders', {
                        method: 'POST',
                        body: JSON.stringify({
                            patientId: selectedPatient._id,
                            patientDetails: {
                                name: selectedPatient.name,
                                mobile: selectedPatient.mobile || 'N/A',
                                age: selectedPatient.age,
                                ageUnit: selectedPatient.ageUnit || 'Years',
                                gender: selectedPatient.gender || 'Unknown',
                            },
                            items: effectiveLabItems.map(i => ({ testName: i.name })),
                            totalAmount: totalLabAmount,
                            finalAmount: totalLabAmount,
                            paymentMode: paymentMethod,
                            paidAmount: paymentMethod === 'due' ? 0 : totalLabAmount,
                            balance: paymentMethod === 'due' ? totalLabAmount : 0,
                            paymentDetails: paymentMethod === 'mixed' ? labMixed : undefined,
                            admissionId: activeAdmission?._id,
                            notes: `Bill created from Front Desk on ${new Date().toLocaleDateString()}`,
                        }),
                    });
                    results.push(`${effectiveLabItems.length} lab/custom item(s) ordered`);
                } catch (e: any) {
                    console.error('Failed to create lab order', e);
                    toast.error('Failed to process lab/custom items: ' + (e.message || 'Unknown error'));
                }
            }

            // 2 & 3. Create IPD Extra Charges and record the payment
            const combinedIpdCharges = [...ipdItems, ...customItems];
            if (combinedIpdCharges.length > 0 && activeAdmission) {
                let ipdTotalAmount = 0;
                for (const item of combinedIpdCharges) {
                    try {
                        await ipdService.addExtraCharge({
                            admissionId: activeAdmission._id,
                            category: item.category || 'Other',
                            description: item.name,
                            amount: item.amount,
                        });
                        ipdTotalAmount += item.amount;
                    } catch (e: any) {
                        console.error(`Failed to add IPD charge: ${item.name}`, e);
                        toast.error(`Failed: ${item.name}`);
                    }
                }

                // Record the actual payment against the IPD bill
                if (ipdTotalAmount > 0 && paymentMethod !== 'due') {
                    try {
                        if (paymentMethod === 'mixed') {
                            const ipdRatio = totalAmount > 0 ? ipdTotalAmount / totalAmount : 1;
                            const ipdMixed = {
                                cash: Math.round((mixedDetails.cash || 0) * ipdRatio),
                                card: Math.round((mixedDetails.card || 0) * ipdRatio),
                                upi: Math.round((mixedDetails.upi || 0) * ipdRatio)
                            };
                            if (ipdMixed.cash > 0) {
                                await ipdService.addAdvancePayment({ admissionId: activeAdmission._id, amount: ipdMixed.cash, mode: 'cash', transactionType: 'Advance', reference: 'Frontdesk Bill - Cash' });
                            }
                            if (ipdMixed.card > 0) {
                                await ipdService.addAdvancePayment({ admissionId: activeAdmission._id, amount: ipdMixed.card, mode: 'card', transactionType: 'Advance', reference: 'Frontdesk Bill - Card' });
                            }
                            if (ipdMixed.upi > 0) {
                                await ipdService.addAdvancePayment({ admissionId: activeAdmission._id, amount: ipdMixed.upi, mode: 'upi', transactionType: 'Advance', reference: 'Frontdesk Bill - UPI' });
                            }
                        } else {
                            await ipdService.addAdvancePayment({
                                admissionId: activeAdmission._id,
                                amount: ipdTotalAmount,
                                mode: paymentMethod,
                                transactionType: "Advance",
                                reference: `Frontdesk Bill - ${new Date().toLocaleDateString()}`,
                            });
                        }
                    } catch (e: any) {
                        console.error("Failed to record IPD payment:", e);
                        toast.error("Charges added but payment receipt failed");
                    }
                }
                results.push(`${combinedIpdCharges.length} IPD charge(s) billed ${paymentMethod !== 'due' ? '& paid' : ''}`);
            }

            // 4. Create Package Transactions (grouped by packageId)
            const packageItems = billItems.filter(i => i.packageId);
            if (packageItems.length > 0) {
                // Group items by packageId
                const packageGroups = packageItems.reduce((acc, item) => {
                    if (!acc[item.packageId!]) acc[item.packageId!] = [];
                    acc[item.packageId!].push(item);
                    return acc;
                }, {} as Record<string, BillItem[]>);

                for (const [packageId, items] of Object.entries(packageGroups)) {
                    try {
                        await apiClient('/helpdesk/packages/bill', {
                            method: 'POST',
                            body: JSON.stringify({
                                patientId: selectedPatient._id,
                                packageId,
                                paymentMethod,
                                items: items.map(i => ({ name: i.name, category: i.category, amount: i.amount })),
                            }),
                        });
                        results.push(`Package "${items[0]?.packageName}" billed`);
                    } catch (e: any) {
                        console.error(`Failed to submit package bill:`, e);
                        toast.error(`Failed to bill package: ${items[0]?.packageName || 'Unknown'}`);
                    }
                }
            }

            if (results.length > 0) {
                toast.success(`Bill created: ${results.join(', ')}`, { duration: 5000 });
                setBillItems([]);
            } else {
                toast.error('No items were processed successfully');
            }
        } catch (e: any) {
            toast.error('Bill submission failed: ' + (e.message || 'Unknown error'));
        } finally {
            setSubmitting(false);
        }
    };
    const handleClearForm = () => {
        setSelectedPatient(null);
        setPatientSearch('');
        setBillItems([]);
        setActiveAdmission(null);
        setPaymentMethod('cash');
        setMixedDetails({ cash: 0, card: 0, upi: 0 });
    };

    const handlePrint = async () => {
        if (!selectedPatient || billItems.length === 0) return;

        try {
            // Fetch actual hospital details for the main header/footer
            let hospitalData = useAuthStore.getState().user?.hospital as any;

            try {
                const { hospitalAdminService } = await import('@/lib/integrations/services/hospitalAdmin.service');
                const response = await hospitalAdminService.getHospital();
                if (response?.hospital) {
                    hospitalData = response.hospital;
                }
            } catch (err) {
                console.error("Failed to fetch full hospital details for print", err);
            }

            const htmlContent = generateAddBillsReceiptHtml({
                hospital: hospitalData,
                patient: {
                    name: selectedPatient.name,
                    mrn: selectedPatient.mrn,
                    mobile: selectedPatient.user?.mobile || selectedPatient.profile?.contactNumber || selectedPatient.mobile || 'N/A',
                    age: computeAgeFromDob(selectedPatient.dob, selectedPatient.age, selectedPatient.ageUnit),
                    gender: selectedPatient.gender || selectedPatient.profile?.gender || 'N/A',
                    bloodGroup: selectedPatient.bloodGroup || selectedPatient.profile?.bloodGroup || '',
                },
                items: billItems,
                payment: {
                    amount: totalAmount,
                    method: paymentMethod,
                    receiptNo: 'EST-' + Math.floor(Math.random() * 1000000)
                },
                preparedBy: useAuthStore.getState().user?.name || "System Administrator"
            });

            setPreviewHtml(htmlContent);
            setShowPrintModal(true);
        } catch (error: any) {
            console.error("Print Error:", error);
            toast.error("Failed to generate receipt: " + error.message);
        }
    };

    // Update preview if toggle changes while modal is open
    useEffect(() => {
        if (showPrintModal) {
            handlePrint();
        }
    }, [printWithHeader]);

    // ── IPD Charge Categories ──
    const staticIpdCategories = [
        'Room Charges', 'Nursing Charges', 'Consumables', 'Procedure Charges',
        'Equipment Charges', 'Doctor Visit', 'Physiotherapy', 'Emergency Services',
        'Ambulance', 'Blood Bank', 'Other'
    ];

    const adminPresets: Record<string, { desc: string; amount: number }[]> = {
        'Room Charges': [
            { desc: 'General Ward Room Rent (1 Day)', amount: 1500 },
            { desc: 'Semi-Private Room Rent (1 Day)', amount: 2500 },
            { desc: 'Private Deluxe Room Rent (1 Day)', amount: 4500 },
            { desc: 'ICU / ITU Bed Rent (1 Day)', amount: 8000 },
            { desc: 'NICU Incubator Bed Rent (1 Day)', amount: 6000 },
        ],
        'Nursing Charges': [
            { desc: 'General Ward Nursing Care (Per Day)', amount: 500 },
            { desc: 'ICU Intensive Nursing Care (Per Day)', amount: 1500 },
            { desc: 'Special 1-on-1 Nurse Assistance (12 Hrs)', amount: 2000 },
            { desc: 'Routine Injection & Dressing Fee', amount: 300 },
        ],
        'Consumables': [
            { desc: 'IV Fluids & Cannulation Kit', amount: 450 },
            { desc: 'Surgical Gloves & PPE Kit', amount: 350 },
            { desc: 'Nebulization Mask & Tubing Kit', amount: 250 },
            { desc: 'Catheterization Kit Complete', amount: 650 },
            { desc: 'Daily Hygiene & Bedding Kit', amount: 300 },
        ],
        'Procedure Charges': [
            { desc: 'Minor Wound Suturing / Dressing', amount: 1200 },
            { desc: 'Major Surgical Dressing Change', amount: 2500 },
            { desc: 'Central Line / CVC Insertion', amount: 4500 },
            { desc: 'Endo / Tracheostomy Care', amount: 3000 },
            { desc: 'Plaster / Cast Application', amount: 1800 },
        ],
        'Equipment Charges': [
            { desc: 'Oxygen Cylinder Support (Per Day)', amount: 1200 },
            { desc: 'Multi-Para Vital Monitor (Per Day)', amount: 1000 },
            { desc: 'Ventilator Life Support (Per Day)', amount: 5000 },
            { desc: 'Syringe / Infusion Pump Usage', amount: 800 },
            { desc: 'BiPAP / CPAP Machine Usage', amount: 2500 },
        ],
        'Doctor Visit': [
            { desc: 'Resident Doctor Daily Ward Round', amount: 600 },
            { desc: 'Senior Consultant Daily Round', amount: 1500 },
            { desc: 'Specialist / Surgeon Emergency Consultation', amount: 2500 },
            { desc: 'Night / On-Call Doctor Emergency Visit', amount: 1800 },
        ],
        'Physiotherapy': [
            { desc: 'Chest Physiotherapy Session', amount: 700 },
            { desc: 'Limb & Mobility Rehab Session', amount: 900 },
            { desc: 'Post-Op Neuro / Gait Rehab', amount: 1200 },
        ],
        'Emergency Services': [
            { desc: 'Emergency ER Triage & Resuscitation', amount: 3500 },
            { desc: 'Emergency Defibrillation / CPR', amount: 5000 },
            { desc: 'Emergency Stomach Wash / Gastric Lavage', amount: 2500 },
        ],
        'Ambulance': [
            { desc: 'Basic Life Support (BLS) Ambulance Transit', amount: 2000 },
            { desc: 'Advanced Life Support (ALS / ICU) Ambulance', amount: 4500 },
            { desc: 'Inter-Hospital Patient Transfer', amount: 3500 },
        ],
        'Blood Bank': [
            { desc: 'Packed Red Blood Cells (PRBC) - 1 Unit', amount: 3500 },
            { desc: 'Fresh Frozen Plasma (FFP) - 1 Unit', amount: 1800 },
            { desc: 'Single Donor Platelets (SDP) - 1 Unit', amount: 11000 },
            { desc: 'Random Donor Platelets (RDP) - 1 Unit', amount: 2000 },
        ],
        'Other': [
            { desc: 'Hospital Admission & Registration Fee', amount: 500 },
            { desc: 'Inpatient Diet & Nutrition (Per Day)', amount: 600 },
            { desc: 'Bio-Medical Waste Disposal Charge', amount: 200 },
            { desc: 'Medical Certificate / Documentation Fee', amount: 300 },
        ]
    };

    // Group custom charges from server
    const customPresets: Record<string, { desc: string; amount: number }[]> = {};
    if (customCharges && customCharges.length > 0) {
        customCharges.filter(c => c.isActive).forEach(c => {
            if (!customPresets[c.category]) {
                customPresets[c.category] = [];
            }
            customPresets[c.category].push({
                desc: c.description,
                amount: c.amount
            });
        });
    }

    const activePresets = Object.keys(customPresets).length > 0 ? customPresets : adminPresets;
    const ipdCategories = Array.from(new Set([
        ...staticIpdCategories,
        ...customCharges.map(c => c.category)
    ]));

    return (
        <div className="add-bills-page">
            <style jsx>{`
                .add-bills-page {
                    min-height: 100vh;
                    background: linear-gradient(135deg, #f0f9ff 0%, #f8fafc 40%, #f0fdf4 100%);
                    padding: 24px;
                    font-family: 'Inter', -apple-system, sans-serif;
                }
                @media (max-width: 768px) {
                    .add-bills-page {
                        padding: 0px;
                    }
                }
                .page-header {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    margin-bottom: 28px;
                }
                .back-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 40px;
                    height: 40px;
                    border-radius: 12px;
                    border: 1px solid #e2e8f0;
                    background: white;
                    cursor: pointer;
                    transition: all 0.2s;
                    color: #475569;
                }
                .back-btn:hover {
                    background: #f1f5f9;
                    border-color: #cbd5e1;
                    transform: translateX(-2px);
                }
                .page-title {
                    font-size: 1.5rem;
                    font-weight: 800;
                    color: #0f172a;
                    letter-spacing: -0.03em;
                }
                .page-subtitle {
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: #94a3b8;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                }

                .main-grid {
                    display: grid;
                    grid-template-columns: 1fr 380px;
                    gap: 24px;
                    max-width: 1400px;
                    margin: 0 auto;
                }
                @media (max-width: 1024px) {
                    .main-grid { grid-template-columns: 1fr; }
                }

                .card {
                    background: white;
                    border-radius: 20px;
                    border: 1px solid #e2e8f0;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.02);
                    overflow: hidden;
                }
                .card-header {
                    padding: 20px 24px;
                    border-bottom: 1px solid #f1f5f9;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .card-header-icon {
                    width: 36px;
                    height: 36px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                .card-header-title {
                    font-size: 0.85rem;
                    font-weight: 800;
                    color: #0f172a;
                    text-transform: uppercase;
                    letter-spacing: 0.06em;
                }
                .card-body { padding: 24px; }
                @media (max-width: 768px) {
                    .card-body { padding: 12px; }
                    .page-header { padding: 12px 12px 0 12px; margin-bottom: 16px; }
                }

                /* ── Patient Search ── */
                .search-container { position: relative; }
                .search-input-wrapper {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 12px 16px;
                    background: #f8fafc;
                    border: 2px solid #e2e8f0;
                    border-radius: 14px;
                    transition: all 0.2s;
                }
                .search-input-wrapper:focus-within {
                    border-color: #14b8a6;
                    background: white;
                    box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.1);
                }
                .search-input {
                    flex: 1;
                    border: none;
                    background: transparent;
                    font-size: 0.9rem;
                    font-weight: 500;
                    color: #0f172a;
                    outline: none;
                }
                .search-input::placeholder { color: #94a3b8; }
                .search-dropdown {
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                    margin-top: 6px;
                    background: white;
                    border-radius: 14px;
                    border: 1px solid #e2e8f0;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.12);
                    z-index: 50;
                    max-height: 280px;
                    overflow-y: auto;
                }
                .search-result-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px 16px;
                    cursor: pointer;
                    transition: background 0.15s;
                    border-bottom: 1px solid #f8fafc;
                }
                .search-result-item:hover { background: #f0fdf4; }
                .search-result-avatar {
                    width: 36px;
                    height: 36px;
                    border-radius: 10px;
                    background: linear-gradient(135deg, #14b8a6, #0d9488);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 0.75rem;
                    font-weight: 700;
                    flex-shrink: 0;
                }
                .search-result-name {
                    font-size: 0.85rem;
                    font-weight: 600;
                    color: #0f172a;
                }
                .search-result-meta {
                    font-size: 0.7rem;
                    color: #64748b;
                    font-weight: 500;
                }

                /* ── Patient Card ── */
                .patient-card {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    padding: 16px;
                    background: linear-gradient(135deg, #f0fdf4, #ecfdf5);
                    border-radius: 14px;
                    border: 1px solid #bbf7d0;
                }
                .patient-avatar {
                    width: 48px;
                    height: 48px;
                    border-radius: 14px;
                    background: linear-gradient(135deg, #14b8a6, #059669);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 1rem;
                    font-weight: 800;
                    flex-shrink: 0;
                }
                .patient-info { flex: 1; }
                .patient-name {
                    font-size: 1rem;
                    font-weight: 700;
                    color: #0f172a;
                }
                .patient-details {
                    font-size: 0.75rem;
                    color: #475569;
                    font-weight: 500;
                    margin-top: 2px;
                }
                .ipd-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    padding: 4px 10px;
                    background: linear-gradient(135deg, #f97316, #ea580c);
                    color: white;
                    border-radius: 8px;
                    font-size: 0.65rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                .change-patient-btn {
                    padding: 6px 12px;
                    border-radius: 8px;
                    border: 1px solid #e2e8f0;
                    background: white;
                    color: #64748b;
                    font-size: 0.7rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .change-patient-btn:hover {
                    background: #fee2e2;
                    border-color: #fca5a5;
                    color: #dc2626;
                }

                /* ── Bill Mode Tabs ── */
                .mode-tabs {
                    display: flex;
                    gap: 6px;
                    padding: 4px;
                    background: #f1f5f9;
                    border-radius: 12px;
                    margin-bottom: 20px;
                }
                .mode-tab {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    padding: 10px 12px;
                    border-radius: 10px;
                    border: none;
                    background: transparent;
                    color: #64748b;
                    font-size: 0.72rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .mode-tab.active {
                    background: white;
                    color: #0f172a;
                    box-shadow: 0 1px 4px rgba(0,0,0,0.06);
                }
                .mode-tab:hover:not(.active) { background: #e2e8f0; }

                /* ── Lab Test Selector ── */
                .lab-test-container { position: relative; }
                .lab-test-dropdown {
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                    margin-top: 6px;
                    background: white;
                    border-radius: 14px;
                    border: 1px solid #e2e8f0;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.12);
                    z-index: 40;
                    max-height: 240px;
                    overflow-y: auto;
                }
                .lab-test-item {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 10px 16px;
                    cursor: pointer;
                    transition: background 0.15s;
                    border-bottom: 1px solid #f8fafc;
                }
                .lab-test-item:hover { background: #eff6ff; }
                .lab-test-name {
                    font-size: 0.82rem;
                    font-weight: 600;
                    color: #0f172a;
                }
                .lab-test-info {
                    font-size: 0.68rem;
                    color: #64748b;
                    font-weight: 500;
                }
                .lab-test-price {
                    font-size: 0.82rem;
                    font-weight: 700;
                    color: #059669;
                }
                .create-new-test-banner {
                    padding: 14px 16px;
                    background: linear-gradient(135deg, #eff6ff, #e0f2fe);
                    border-radius: 12px;
                    margin-top: 12px;
                    border: 1px dashed #93c5fd;
                }
                .create-new-test-title {
                    font-size: 0.78rem;
                    font-weight: 700;
                    color: #1e40af;
                    margin-bottom: 8px;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                /* ── IPD Charge Form ── */
                .form-group {
                    margin-bottom: 14px;
                }
                .form-label {
                    display: block;
                    font-size: 0.7rem;
                    font-weight: 700;
                    color: #475569;
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                    margin-bottom: 6px;
                }
                .form-input {
                    width: 100%;
                    padding: 10px 14px;
                    border: 2px solid #e2e8f0;
                    border-radius: 10px;
                    font-size: 0.85rem;
                    font-weight: 500;
                    color: #0f172a;
                    background: #f8fafc;
                    transition: all 0.2s;
                    outline: none;
                }
                .form-input:focus {
                    border-color: #14b8a6;
                    background: white;
                    box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.08);
                }
                .form-select {
                    width: 100%;
                    padding: 10px 14px;
                    border: 2px solid #e2e8f0;
                    border-radius: 10px;
                    font-size: 0.85rem;
                    font-weight: 500;
                    color: #0f172a;
                    background: #f8fafc;
                    cursor: pointer;
                    outline: none;
                    appearance: none;
                    transition: all 0.2s;
                }
                .form-select:focus {
                    border-color: #14b8a6;
                    background: white;
                }
                .form-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                }

                .add-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    width: 100%;
                    padding: 12px;
                    border-radius: 12px;
                    border: none;
                    background: linear-gradient(135deg, #14b8a6, #0d9488);
                    color: white;
                    font-size: 0.8rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.06em;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .add-btn:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 16px rgba(20, 184, 166, 0.3);
                }
                .add-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                    transform: none;
                }

                /* ── Bill Summary (Right Panel) ── */
                .bill-summary-card {
                    position: sticky;
                    top: 24px;
                }
                .bill-item-row {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 10px 14px;
                    background: #f8fafc;
                    border-radius: 10px;
                    margin-bottom: 8px;
                    transition: all 0.2s;
                }
                .bill-item-row:hover {
                    background: #f1f5f9;
                }
                .bill-item-icon {
                    width: 30px;
                    height: 30px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                .bill-item-icon.lab {
                    background: linear-gradient(135deg, #dbeafe, #bfdbfe);
                    color: #2563eb;
                }
                .bill-item-icon.ipd {
                    background: linear-gradient(135deg, #ffedd5, #fed7aa);
                    color: #ea580c;
                }
                .bill-item-icon.custom {
                    background: linear-gradient(135deg, #e9d5ff, #d8b4fe);
                    color: #7c3aed;
                }
                .bill-item-info { flex: 1; min-width: 0; }
                .bill-item-name {
                    font-size: 0.78rem;
                    font-weight: 600;
                    color: #0f172a;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .bill-item-cat {
                    font-size: 0.65rem;
                    color: #94a3b8;
                    font-weight: 500;
                }
                .bill-item-amount {
                    font-size: 0.82rem;
                    font-weight: 700;
                    color: #059669;
                    white-space: nowrap;
                }
                .bill-item-remove {
                    width: 26px;
                    height: 26px;
                    border-radius: 6px;
                    border: none;
                    background: transparent;
                    color: #cbd5e1;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                }
                .bill-item-remove:hover {
                    background: #fee2e2;
                    color: #dc2626;
                }
                .bill-total-section {
                    padding: 16px;
                    background: linear-gradient(135deg, #0f172a, #1e293b);
                    border-radius: 14px;
                    margin-top: 16px;
                }
                .bill-total-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .bill-total-label {
                    font-size: 0.72rem;
                    font-weight: 700;
                    color: #94a3b8;
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                }
                .bill-total-value {
                    font-size: 1.3rem;
                    font-weight: 800;
                    color: white;
                    letter-spacing: -0.02em;
                }

                /* ── Payment Section ── */
                .payment-methods {
                    display: flex;
                    gap: 6px;
                    margin: 16px 0;
                }
                .payment-method-btn {
                    flex: 1;
                    padding: 8px 10px;
                    border-radius: 8px;
                    border: 2px solid #e2e8f0;
                    background: white;
                    color: #64748b;
                    font-size: 0.68rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    cursor: pointer;
                    transition: all 0.2s;
                    text-align: center;
                }
                .payment-method-btn.active {
                    border-color: #14b8a6;
                    background: #f0fdfa;
                    color: #0d9488;
                }

                .submit-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    width: 100%;
                    padding: 6px 12px;
                    border-radius: 8px;
                    border: none;
                    background: linear-gradient(135deg, #059669, #047857);
                    color: white;
                    font-size: 0.75rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    cursor: pointer;
                    transition: all 0.25s;
                }
                .submit-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 24px rgba(5, 150, 105, 0.35);
                }
                .submit-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                    transform: none;
                    box-shadow: none;
                }

                .empty-state {
                    padding: 40px 20px;
                    text-align: center;
                }
                .empty-state-icon {
                    width: 56px;
                    height: 56px;
                    border-radius: 16px;
                    background: #f1f5f9;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 14px;
                    color: #94a3b8;
                }
                .empty-state-text {
                    font-size: 0.82rem;
                    font-weight: 600;
                    color: #94a3b8;
                }
                .empty-state-sub {
                    font-size: 0.7rem;
                    color: #cbd5e1;
                    margin-top: 4px;
                }

                .item-count-badge {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    min-width: 20px;
                    height: 20px;
                    border-radius: 6px;
                    background: linear-gradient(135deg, #14b8a6, #0d9488);
                    color: white;
                    font-size: 0.65rem;
                    font-weight: 800;
                    padding: 0 5px;
                }                /* ── Print Styles ── */
                @media print {
                    @page { margin: 0; size: auto; }
                    body { background: white; padding: 0; margin: 0; }
                    body * { visibility: hidden; }
                    .bill-summary-card, .bill-summary-card * { visibility: visible; }
                    .bill-summary-card {
                        position: fixed;
                        left: 0;
                        top: 0;
                        width: 100vw;
                        height: 100vh;
                        margin: 0;
                        padding: 40px; /* give some print margin */
                        border: none !important;
                        box-shadow: none !important;
                        z-index: 9999;
                        background: white;
                    }
                    .main-grid { display: block; }
                    .card { border: none !important; box-shadow: none !important; }
                    .bill-item-remove, .submit-btn, button[onClick*="window.print()"], .payment-methods, .empty-state, .card-header-icon { 
                        display: none !important; 
                    }
                    /* Optional: Show patient info in print */
                    .card-header::after {
                        content: 'Bill Estimate';
                        font-size: 1.2rem;
                        font-weight: 800;
                        color: black;
                        margin-left: auto;
                    }
                }
            `}</style>

            {/* ── Header ── */}
            <div className="page-header">
                <button className="back-btn" onClick={() => router.back()}>
                    <ArrowLeft size={18} />
                </button>
                <div>
                    <div className="page-title">Add Bills</div>
                    <div className="page-subtitle">Front Desk Billing · Create Lab Orders & IPD Charges</div>
                </div>
            </div>

            <div className="main-grid">
                {/* ── LEFT PANEL: Patient + Bill Form ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                    {/* ── Patient Search / Selection ── */}
                    <div className="card">
                        <div className="card-header">
                            <div className="card-header-icon" style={{ background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)', color: '#2563eb' }}>
                                <User size={18} />
                            </div>
                            <div className="card-header-title">Select Patient</div>
                        </div>
                        <div className="card-body">
                            {!selectedPatient ? (
                                <div className="search-container" ref={searchRef}>
                                    <div className="search-input-wrapper">
                                        <Search size={18} style={{ color: '#94a3b8' }} />
                                        <input
                                            className="search-input"
                                            placeholder="Search by name, mobile, or MRN..."
                                            value={patientSearch}
                                            onChange={e => setPatientSearch(e.target.value)}
                                            autoFocus
                                        />
                                        {searchingPatients && <Loader2 size={16} className="animate-spin" style={{ color: '#14b8a6' }} />}
                                    </div>
                                    <AnimatePresence>
                                        {showSearchDropdown && searchResults.length > 0 && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -8 }}
                                                className="search-dropdown"
                                            >
                                                {searchResults.map((p: any) => (
                                                    <div
                                                        key={p._id || p.id}
                                                        className="search-result-item"
                                                        onClick={() => handleSelectPatient(p)}
                                                    >
                                                        <div className="search-result-avatar">
                                                            {(p.user?.name || p.name || 'P').charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div className="search-result-name">{p.user?.name || p.name}</div>
                                                            <div className="search-result-meta">
                                                                {p.mrn || p.profile?.mrn || '—'} · {p.user?.mobile || p.profile?.contactNumber || p.mobile || '—'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="patient-card"
                                >
                                    <div className="patient-avatar">
                                        {(selectedPatient.name || 'P').charAt(0).toUpperCase()}
                                    </div>
                                    <div className="patient-info">
                                        <div className="patient-name">{selectedPatient.name}</div>
                                        <div className="patient-details">
                                            MRN: {selectedPatient.mrn} · {selectedPatient.gender}, {selectedPatient.age}y · {selectedPatient.mobile}
                                        </div>
                                        {loadingAdmission && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: '0.7rem', color: '#94a3b8' }}>
                                                <Loader2 size={12} className="animate-spin" /> Checking IPD status...
                                            </div>
                                        )}
                                        {activeAdmission && (
                                            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                <span className="ipd-badge">
                                                    <Building2 size={12} /> IPD Admitted · {activeAdmission.admissionId || activeAdmission.id}
                                                </span>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: '#e0e7ff', color: '#3730a3', borderRadius: 8, fontSize: '0.68rem', fontWeight: 700 }}>
                                                    Ward: {activeAdmission.wardName || activeAdmission.department || 'General Ward'} · Bed: {activeAdmission.bedNumber || activeAdmission.bed?.bedNumber || activeAdmission.bed?.number || 'Assigned'}
                                                </span>
                                                {(activeAdmission.doctorName || activeAdmission.attendingDoctor?.name) && (
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: '#d1fae5', color: '#065f46', borderRadius: 8, fontSize: '0.68rem', fontWeight: 700 }}>
                                                        <Stethoscope size={12} /> Dr. {activeAdmission.doctorName || activeAdmission.attendingDoctor?.name}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        className="change-patient-btn"
                                        onClick={() => {
                                            setSelectedPatient(null);
                                            setActiveAdmission(null);
                                            setBillItems([]);
                                        }}
                                    >
                                        <X size={12} /> Change
                                    </button>
                                </motion.div>
                            )}
                        </div>
                    </div>

                    {/* ── Bill Items Form ── */}
                    {selectedPatient && (
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="card"
                        >
                            <div className="card-header">
                                <div className="card-header-icon" style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)', color: '#d97706' }}>
                                    <FileText size={18} />
                                </div>
                                <div className="card-header-title">Add Charges</div>
                            </div>
                            <div className="card-body">
                                {/* Mode Tabs */}
                                <div className="mode-tabs">
                                    <button
                                        className={`mode-tab ${billMode === 'lab' ? 'active' : ''}`}
                                        onClick={() => setBillMode('lab')}
                                    >
                                        <TestTube size={14} /> Lab Tests
                                    </button>
                                    {activeAdmission && (
                                        <button
                                            className={`mode-tab ${billMode === 'ipd_charge' ? 'active' : ''}`}
                                            onClick={() => {
                                                setBillMode('ipd_charge');
                                                setNewChargeCategory('Room Charges');
                                            }}
                                        >
                                            <Building2 size={14} /> IPD Charges
                                        </button>
                                    )}
                                    <button
                                        className={`mode-tab ${billMode === 'custom' ? 'active' : ''}`}
                                        onClick={() => {
                                            setBillMode('custom');
                                            setNewChargeCategory('Miscellaneous');
                                        }}
                                    >
                                        <Sparkles size={14} /> Custom
                                    </button>
                                    <button
                                        className={`mode-tab ${billMode === 'package' ? 'active' : ''}`}
                                        onClick={() => setBillMode('package')}
                                    >
                                        <Package size={14} /> Package
                                    </button>
                                </div>

                                {/* Lab Tests Mode */}
                                {billMode === 'lab' && (
                                    <div>
                                        <div className="lab-test-container" ref={labTestRef}>
                                            <div className="search-input-wrapper">
                                                <Microscope size={18} style={{ color: '#94a3b8' }} />
                                                <input
                                                    className="search-input"
                                                    placeholder="Search lab tests (e.g., CBC, Thyroid, Lipid)..."
                                                    value={labTestSearch}
                                                    onChange={e => {
                                                        setLabTestSearch(e.target.value);
                                                        setShowLabTestDropdown(true);
                                                    }}
                                                    onFocus={() => labTestSearch.length >= 1 && setShowLabTestDropdown(true)}
                                                />
                                                {loadingLabTests && <Loader2 size={14} className="animate-spin" style={{ color: '#14b8a6' }} />}
                                            </div>
                                            <AnimatePresence>
                                                {showLabTestDropdown && filteredLabTests.length > 0 && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: -8 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -8 }}
                                                        className="lab-test-dropdown"
                                                    >
                                                        {filteredLabTests.map(test => (
                                                            <div
                                                                key={test._id}
                                                                className="lab-test-item"
                                                                onClick={() => addLabTestToBill(test)}
                                                            >
                                                                <div>
                                                                    <div className="lab-test-name">{test.name}</div>
                                                                    <div className="lab-test-info">
                                                                        {test.code && `${test.code} · `}{test.category || test.department || 'General'}
                                                                    </div>
                                                                </div>
                                                                <div className="lab-test-price">₹{test.price?.toLocaleString()}</div>
                                                            </div>
                                                        ))}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        {/* Create New Test */}
                                        {showCreateNew && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="create-new-test-banner"
                                            >
                                                <div className="create-new-test-title">
                                                    <Plus size={14} /> Test not found? Create a new one:
                                                </div>
                                                <div className="form-row">
                                                    <div className="form-group" style={{ margin: 0 }}>
                                                        <input
                                                            className="form-input"
                                                            placeholder="Test Name"
                                                            value={newTestName || labTestSearch}
                                                            onChange={e => setNewTestName(e.target.value)}
                                                        />
                                                    </div>
                                                    <div style={{ display: 'flex', gap: 8 }}>
                                                        <input
                                                            className="form-input"
                                                            placeholder="₹ Price"
                                                            type="number"
                                                            min="0"
                                                            value={newTestPrice}
                                                            onChange={e => setNewTestPrice(e.target.value)}
                                                            style={{ flex: 1 }}
                                                        />
                                                        <button className="add-btn" onClick={addNewTest} style={{ width: 'auto', padding: '10px 20px' }}>
                                                            <Plus size={14} /> Add
                                                        </button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}

                                        {/* Quick-create always visible */}
                                        {!showCreateNew && (
                                            <div style={{ marginTop: 16, padding: '14px', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                                                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <Plus size={12} /> Quick Add Custom Test
                                                </div>
                                                <div className="form-row">
                                                    <input
                                                        className="form-input"
                                                        placeholder="Test Name"
                                                        value={newTestName}
                                                        onChange={e => setNewTestName(e.target.value)}
                                                    />
                                                    <div style={{ display: 'flex', gap: 8 }}>
                                                        <input
                                                            className="form-input"
                                                            placeholder="₹ Price"
                                                            type="number"
                                                            min="0"
                                                            value={newTestPrice}
                                                            onChange={e => setNewTestPrice(e.target.value)}
                                                            style={{ flex: 1 }}
                                                        />
                                                        <button className="add-btn" onClick={addNewTest} style={{ width: 'auto', padding: '10px 20px' }}>
                                                            <Plus size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* IPD Charges Mode */}
                                {billMode === 'ipd_charge' && activeAdmission && (
                                    <div>
                                        <div className="form-group">
                                            <label className="form-label">Category</label>
                                            <select
                                                className="form-select"
                                                value={newChargeCategory}
                                                onChange={e => setNewChargeCategory(e.target.value)}
                                            >
                                                {ipdCategories.map(cat => (
                                                    <option key={cat} value={cat}>{cat}</option>
                                                ))}
                                            </select>
                                        </div>
                                        {/* Admin Standard Preset Charges */}
                                        <div style={{ marginBottom: 16 }}>
                                            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#0284c7', fontSize: '0.72rem' }}>
                                                <Sparkles size={14} /> Admin Standard Rates ({newChargeCategory})
                                            </label>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                                                {loadingCustomCharges ? (
                                                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Loading custom rates...</div>
                                                ) : (activePresets[newChargeCategory] || []).length === 0 ? (
                                                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>No rates defined. Customize them in Admin portal.</div>
                                                ) : (activePresets[newChargeCategory] || []).map((preset, idx) => (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => {
                                                            setNewChargeDescription(preset.desc);
                                                            setNewChargeAmount(preset.amount.toString());
                                                        }}
                                                        style={{
                                                            padding: '6px 12px',
                                                            background: newChargeDescription === preset.desc ? '#0284c7' : '#f0f9ff',
                                                            color: newChargeDescription === preset.desc ? 'white' : '#0369a1',
                                                            border: '1px solid #bae6fd',
                                                            borderRadius: 20,
                                                            fontSize: '0.72rem',
                                                            fontWeight: 700,
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 6
                                                        }}
                                                    >
                                                        <span>{preset.desc}</span>
                                                        <span style={{ background: newChargeDescription === preset.desc ? 'rgba(255,255,255,0.2)' : '#e0f2fe', padding: '2px 6px', borderRadius: 10, fontSize: '0.65rem' }}>₹{preset.amount}</span>
                                                    </button>
                                                ))}
                                                {/* fallback message if using default hardcoded presets */}
                                                {(!customCharges || customCharges.length === 0) && !loadingCustomCharges && (
                                                    <div style={{ width: '100%', fontSize: '0.65rem', color: '#94a3b8', fontStyle: 'italic', marginTop: 4 }}>
                                                        * Showing default system presets. Hospital admin can customize these prices in setup.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Description</label>
                                            <input
                                                className="form-input"
                                                placeholder="e.g., ICU Bed Charges for Day 3"
                                                value={newChargeDescription}
                                                onChange={e => setNewChargeDescription(e.target.value)}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Amount (₹)</label>
                                            <input
                                                className="form-input"
                                                placeholder="Enter amount"
                                                type="number"
                                                min="0"
                                                value={newChargeAmount}
                                                onChange={e => setNewChargeAmount(e.target.value)}
                                            />
                                        </div>
                                        <button className="add-btn" onClick={addIPDCharge}>
                                            <Plus size={16} /> Add IPD Charge
                                        </button>
                                    </div>
                                )}

                                {/* Custom Charges Mode */}
                                {billMode === 'custom' && (
                                    <div>
                                        <div className="form-group">
                                            <label className="form-label">Service / Item Name</label>
                                            <input
                                                className="form-input"
                                                placeholder="e.g., Dressing Kit, Special Consultation"
                                                value={newChargeDescription}
                                                onChange={e => setNewChargeDescription(e.target.value)}
                                            />
                                        </div>
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label className="form-label">Category</label>
                                                <select
                                                    className="form-select"
                                                    value={newChargeCategory}
                                                    onChange={e => setNewChargeCategory(e.target.value)}
                                                >
                                                    <option value="Miscellaneous">Miscellaneous</option>
                                                    <option value="Consultation">Consultation</option>
                                                    <option value="Procedure">Procedure</option>
                                                    <option value="Supplies">Supplies</option>
                                                    <option value="Other">Other</option>
                                                </select>
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Amount (₹)</label>
                                                <input
                                                    className="form-input"
                                                    placeholder="Enter amount"
                                                    type="number"
                                                    min="0"
                                                    value={newChargeAmount}
                                                    onChange={e => setNewChargeAmount(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <button className="add-btn" onClick={() => {
                                            if (!newChargeDescription.trim()) { toast.error('Enter description'); return; }
                                            if (!newChargeAmount || parseFloat(newChargeAmount) <= 0) { toast.error('Enter valid amount'); return; }
                                            const newItem: BillItem = {
                                                id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                                                type: activeAdmission ? 'ipd_charge' : 'custom',
                                                name: newChargeDescription.trim(),
                                                category: newChargeCategory,
                                                amount: parseFloat(newChargeAmount),
                                            };
                                            setBillItems(prev => [...prev, newItem]);
                                            setNewChargeDescription('');
                                            setNewChargeAmount('');
                                            toast.success(`Added: ${newItem.name}`);
                                        }}>
                                            <Plus size={16} /> Add Custom Charge
                                        </button>
                                    </div>
                                )}

                                {/* Package Mode */}
                                {billMode === 'package' && (
                                    <div>
                                        <div className="form-group">
                                            <label className="form-label">Select a Package</label>
                                            {loadingPackages ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12 }}>
                                                    <Loader2 size={16} className="animate-spin" style={{ color: '#14b8a6' }} />
                                                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Loading packages...</span>
                                                </div>
                                            ) : packages.length === 0 ? (
                                                <div style={{ padding: '20px', textAlign: 'center', background: '#f8fafc', borderRadius: 12, border: '1px dashed #e2e8f0' }}>
                                                    <Package size={24} style={{ color: '#94a3b8', marginBottom: 8 }} />
                                                    <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>No packages available</div>
                                                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 4 }}>Ask admin to create packages</div>
                                                </div>
                                            ) : (
                                                <>
                                                    <select
                                                        className="form-select"
                                                        value={selectedPackageId}
                                                        onChange={e => setSelectedPackageId(e.target.value)}
                                                    >
                                                        <option value="">-- Choose a package --</option>
                                                        {packages.map((pkg: any) => (
                                                            <option key={pkg._id} value={pkg._id}>
                                                                {pkg.name} — ₹{pkg.totalPrice?.toLocaleString()}
                                                            </option>
                                                        ))}
                                                    </select>

                                                    {/* Package Preview */}
                                                    {selectedPackageId && (() => {
                                                        const pkg = packages.find((p: any) => p._id === selectedPackageId);
                                                        if (!pkg) return null;
                                                        const bd = pkg.breakdown || {};
                                                        const items = [
                                                            { label: 'Doctor Fees', amount: bd.doctorFees || 0 },
                                                            { label: 'Lab Charges', amount: bd.labCharges || 0 },
                                                            { label: 'Pharmacy Charges', amount: bd.pharmacyCharges || 0 },
                                                            { label: 'Radiology Charges', amount: bd.radiologyCharges || 0 },
                                                            { label: 'Room/Bed Charges', amount: bd.roomCharges || 0 },
                                                            { label: 'Other Charges', amount: bd.otherCharges || 0 },
                                                        ].filter(i => i.amount > 0);

                                                        return (
                                                            <div style={{ marginTop: 14, padding: 16, background: 'linear-gradient(135deg, #eff6ff, #e0f2fe)', borderRadius: 14, border: '1px solid #93c5fd' }}>
                                                                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e3a5f', marginBottom: 4 }}>{pkg.name}</div>
                                                                {pkg.description && <div style={{ fontSize: '0.72rem', color: '#475569', marginBottom: 12 }}>{pkg.description}</div>}
                                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                                                                    {items.map(item => (
                                                                        <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#334155', padding: '4px 0' }}>
                                                                            <span>{item.label}</span>
                                                                            <span style={{ fontWeight: 700 }}>₹{item.amount.toLocaleString()}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1px solid #93c5fd', fontWeight: 800, fontSize: '0.9rem', color: '#1e40af' }}>
                                                                    <span>Total</span>
                                                                    <span>₹{pkg.totalPrice?.toLocaleString()}</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}
                                                </>
                                            )}
                                        </div>

                                        {selectedPackageId && (
                                            <button
                                                className="add-btn"
                                                style={{ marginTop: 14 }}
                                                onClick={() => {
                                                    const pkg = packages.find((p: any) => p._id === selectedPackageId);
                                                    if (!pkg) return;
                                                    const bd = pkg.breakdown || {};
                                                    const breakdownItems = [
                                                        { label: 'Doctor Fees', amount: bd.doctorFees, cat: 'Doctor Fees' },
                                                        { label: 'Lab Charges', amount: bd.labCharges, cat: 'Lab' },
                                                        { label: 'Pharmacy Charges', amount: bd.pharmacyCharges, cat: 'Pharmacy' },
                                                        { label: 'Radiology Charges', amount: bd.radiologyCharges, cat: 'Radiology' },
                                                        { label: 'Room/Bed Charges', amount: bd.roomCharges, cat: 'Room Charges' },
                                                        { label: 'Other Charges', amount: bd.otherCharges, cat: 'Other' },
                                                    ].filter(i => i.amount > 0);

                                                    const newItems: BillItem[] = breakdownItems.map(item => ({
                                                        id: `pkg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                                                        type: activeAdmission ? 'ipd_charge' : 'custom',
                                                        name: `${pkg.name} — ${item.label}`,
                                                        category: item.cat,
                                                        amount: item.amount,
                                                        packageId: pkg._id,
                                                        packageName: pkg.name,
                                                    }));

                                                    setBillItems(prev => [...prev, ...newItems]);
                                                    setSelectedPackageId('');
                                                    toast.success(`Package "${pkg.name}" applied with ${newItems.length} items`);
                                                }}
                                            >
                                                <Package size={16} /> Apply Package to Bill
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </div>

                {/* ── RIGHT PANEL: Bill Summary ── */}
                <div className="bill-summary-card">
                    <div className="card">
                        <div className="card-header">
                            <div className="card-header-icon" style={{ background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)', color: '#059669' }}>
                                <Receipt size={18} />
                            </div>
                            <div className="card-header-title">Bill Summary</div>
                            {billItems.length > 0 && (
                                <span className="item-count-badge">{billItems.length}</span>
                            )}
                        </div>
                        <div className="card-body">
                            {billItems.length === 0 ? (
                                <div className="empty-state">
                                    <div className="empty-state-icon">
                                        <FileText size={24} />
                                    </div>
                                    <div className="empty-state-text">No items added yet</div>
                                    <div className="empty-state-sub">Search for lab tests or add custom charges</div>
                                </div>
                            ) : (
                                <div>
                                    <AnimatePresence>
                                        {(() => {
                                            const groupedItems: any[] = [];
                                            const packageMap: Record<string, any> = {};

                                            billItems.forEach(item => {
                                                if (item.packageId) {
                                                    if (!packageMap[item.packageId]) {
                                                        packageMap[item.packageId] = {
                                                            id: `pkg-group-${item.packageId}`,
                                                            isPackage: true,
                                                            packageName: item.packageName,
                                                            items: [],
                                                            totalAmount: 0,
                                                        };
                                                        groupedItems.push(packageMap[item.packageId]);
                                                    }
                                                    packageMap[item.packageId].items.push(item);
                                                    packageMap[item.packageId].totalAmount += item.amount;
                                                } else {
                                                    groupedItems.push(item);
                                                }
                                            });

                                            return groupedItems.map(group => {
                                                if (group.isPackage) {
                                                    return (
                                                        <motion.div key={group.id} className="bill-item-row" layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                                <div className="bill-item-icon" style={{ background: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)', color: '#4f46e5' }}>
                                                                    <Package size={14} />
                                                                </div>
                                                                <div className="bill-item-info">
                                                                    <div className="bill-item-name">{group.packageName}</div>
                                                                    <div className="bill-item-cat">Hospital Package</div>
                                                                </div>
                                                                <div className="bill-item-amount">₹{Math.round(group.totalAmount).toLocaleString()}</div>
                                                                <button className="bill-item-remove" onClick={() => {
                                                                    const idsToRemove = group.items.map((i: any) => i.id);
                                                                    setBillItems(prev => prev.filter(i => !idsToRemove.includes(i.id)));
                                                                }}>
                                                                    <Trash2 size={13} />
                                                                </button>
                                                            </div>
                                                            <div style={{ paddingLeft: 46, paddingTop: 10, marginTop: 10, borderTop: '1px dashed #e2e8f0', fontSize: '0.75rem', color: '#64748b' }}>
                                                                {group.items.map((sub: any) => (
                                                                    <div key={sub.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                                                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                            <span style={{ width: 4, height: 4, background: '#cbd5e1', borderRadius: '50%' }}></span>
                                                                            {sub.category}
                                                                        </span>
                                                                        <span>₹{sub.amount.toLocaleString()}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </motion.div>
                                                    );
                                                } else {
                                                    const item = group;
                                                    return (
                                                        <motion.div
                                                            key={item.id}
                                                            initial={{ opacity: 0, x: 20 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            exit={{ opacity: 0, x: -20 }}
                                                            layout
                                                            className="bill-item-row"
                                                        >
                                                            <div className={`bill-item-icon ${item.type === 'lab' ? 'lab' : item.type === 'ipd_charge' ? 'ipd' : 'custom'}`}>
                                                                {item.type === 'lab' ? <TestTube size={14} /> :
                                                                    item.type === 'ipd_charge' ? <Building2 size={14} /> :
                                                                        <Package size={14} />}
                                                            </div>
                                                            <div className="bill-item-info">
                                                                <div className="bill-item-name">{item.name}</div>
                                                                <div className="bill-item-cat">
                                                                    {item.category}
                                                                    {item.isNew && ' · NEW'}
                                                                </div>
                                                            </div>
                                                            <div className="bill-item-amount">₹{item.amount.toLocaleString()}</div>
                                                            <button className="bill-item-remove" onClick={() => removeItem(item.id)}>
                                                                <Trash2 size={13} />
                                                            </button>
                                                        </motion.div>
                                                    );
                                                }
                                            });
                                        })()}
                                    </AnimatePresence>

                                    {/* Total */}
                                    <div className="bill-total-section">
                                        <div className="bill-total-row">
                                            <div className="bill-total-label">Total Amount</div>
                                            <div className="bill-total-value">₹{Math.round(totalAmount).toLocaleString()}</div>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                                            <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{billItems.length} item(s)</span>
                                            <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                                                {billItems.filter(i => i.type === 'lab').length > 0 && `${billItems.filter(i => i.type === 'lab').length} Lab`}
                                                {billItems.filter(i => i.type === 'ipd_charge').length > 0 && ` · ${billItems.filter(i => i.type === 'ipd_charge').length} IPD`}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Payment Method */}
                                    <div style={{ marginTop: 16 }}>
                                        <label className="form-label">Payment Method</label>
                                        <div className="payment-methods" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                            {(['cash', 'card', 'upi', 'mixed', 'due'] as const).map(m => (
                                                <button
                                                    key={m}
                                                    className={`payment-method-btn ${paymentMethod === m ? 'active' : ''}`}
                                                    onClick={() => setPaymentMethod(m)}
                                                >
                                                    {m === 'cash' ? '💵' : m === 'card' ? '💳' : m === 'upi' ? '📱' : m === 'mixed' ? '🔄' : '⏳'} {m}
                                                </button>
                                            ))}
                                        </div>

                                        {paymentMethod === 'mixed' && (
                                            <div style={{ marginTop: 12, padding: 12, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                                                <div>
                                                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>Cash (₹)</label>
                                                    <input type="number" min="0" value={mixedDetails.cash || ''} onChange={e => setMixedDetails(prev => ({ ...prev, cash: Number(e.target.value) }))} style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none' }} />
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>Card (₹)</label>
                                                    <input type="number" min="0" value={mixedDetails.card || ''} onChange={e => setMixedDetails(prev => ({ ...prev, card: Number(e.target.value) }))} style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none' }} />
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>UPI (₹)</label>
                                                    <input type="number" min="0" value={mixedDetails.upi || ''} onChange={e => setMixedDetails(prev => ({ ...prev, upi: Number(e.target.value) }))} style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none' }} />
                                                </div>
                                                <div style={{ gridColumn: '1 / -1', fontSize: '0.75rem', fontWeight: 700, color: (mixedDetails.cash + mixedDetails.card + mixedDetails.upi) === Math.round(totalAmount) ? '#10b981' : '#ef4444', textAlign: 'right', marginTop: 4 }}>
                                                    Total: ₹{mixedDetails.cash + mixedDetails.card + mixedDetails.upi} / ₹{Math.round(totalAmount)}
                                                </div>
                                            </div>
                                        )}
                                        {paymentMethod === 'due' && (
                                            <div style={{ marginTop: 12, padding: 10, background: '#fff1f2', borderRadius: 12, border: '1px solid #fecdd3', color: '#e11d48', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                Amount will be added as pending due.
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 8, marginTop: 16 }}>
                                        <button
                                            onClick={handleClearForm}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: 4,
                                                padding: '6px 12px', borderRadius: 8,
                                                background: 'white', color: '#ef4444',
                                                border: '1px solid #fecaca', fontWeight: 600, fontSize: '0.75rem',
                                                cursor: 'pointer', transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.borderColor = '#ef4444'}
                                            onMouseLeave={e => e.currentTarget.style.borderColor = '#fecaca'}
                                        >
                                            <Trash2 size={14} />
                                            Clear Form
                                        </button>
                                        <button
                                            className="submit-btn"
                                            onClick={handleSubmitBill}
                                            disabled={submitting || billItems.length === 0 || !selectedPatient || (paymentMethod === 'mixed' && (mixedDetails.cash + mixedDetails.card + mixedDetails.upi) !== Math.round(totalAmount))}
                                            style={{ margin: 0 }}
                                        >
                                            {submitting ? (
                                                <>
                                                    <Loader2 size={14} className="animate-spin" />
                                                    Processing...
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle2 size={14} />
                                                    Submit Bill · ₹{Math.round(totalAmount).toLocaleString()}
                                                </>
                                            )}
                                        </button>
                                        <button
                                            onClick={handlePrint}
                                            disabled={billItems.length === 0 || !selectedPatient}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: 4,
                                                padding: '6px 12px', borderRadius: 8,
                                                background: 'white', color: '#0f172a',
                                                border: '1px solid #e2e8f0', fontWeight: 600, fontSize: '0.75rem',
                                                cursor: (billItems.length === 0 || !selectedPatient) ? 'not-allowed' : 'pointer',
                                                opacity: (billItems.length === 0 || !selectedPatient) ? 0.5 : 1,
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={e => { if (billItems.length > 0 && selectedPatient) (e.currentTarget.style.borderColor = '#cbd5e1') }}
                                            onMouseLeave={e => { if (billItems.length > 0 && selectedPatient) (e.currentTarget.style.borderColor = '#e2e8f0') }}
                                        >
                                            <Printer size={14} />
                                            Print
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── PRINT PREVIEW MODAL ── */}
            <AnimatePresence>
                {showPrintModal && (
                    <motion.div
                        className="modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
                    >
                        <motion.div
                            className="modal-content"
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            style={{ background: '#f8fafc', width: '100%', maxWidth: 900, height: '90vh', borderRadius: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}
                        >
                            {/* Modal Header */}
                            <div style={{ padding: '16px 24px', background: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ background: '#e0e7ff', color: '#4f46e5', padding: 8, borderRadius: 8 }}>
                                        <Printer size={20} />
                                    </div>
                                    <div>
                                        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Print Preview</h2>
                                        <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>Review bill details before printing</p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    {/* Toggle Header/Footer */}
                                    <button
                                        onClick={() => setPrintWithHeader(!printWithHeader)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 8,
                                            padding: '8px 16px', borderRadius: 8,
                                            background: printWithHeader ? '#e0e7ff' : '#f1f5f9',
                                            color: printWithHeader ? '#4f46e5' : '#64748b',
                                            border: `1px solid ${printWithHeader ? '#c7d2fe' : '#e2e8f0'}`,
                                            fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s'
                                        }}
                                    >
                                        <div style={{ width: 32, height: 18, background: printWithHeader ? '#4f46e5' : '#cbd5e1', borderRadius: 10, position: 'relative', transition: 'all 0.2s' }}>
                                            <div style={{ width: 14, height: 14, background: 'white', borderRadius: '50%', position: 'absolute', top: 1, left: printWithHeader ? 15 : 1, transition: 'all 0.2s' }} />
                                        </div>
                                        Header & Footer
                                    </button>

                                    <button onClick={() => setShowPrintModal(false)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4 }}>
                                        <X size={24} />
                                    </button>
                                </div>
                            </div>

                            {/* Modal Body (Iframe) */}
                            <div style={{ flex: 1, padding: 0, background: '#f1f5f9', overflow: 'hidden', display: 'flex', justifyContent: 'center', position: 'relative' }}>
                                <iframe
                                    srcDoc={previewHtml
                                        .replace('<body onload="window.print();">', `
                                            <body style="margin:0; background:#f1f5f9; overflow:hidden; display:flex; justify-content:center; align-items:center;">
                                            <style>
                                                .no-print { display: none !important; }
                                                ::-webkit-scrollbar { display: none; }
                                            </style>
                                            <div id="print-wrapper" style="width:794px; height:1123px; background:white; transform-origin:center; box-shadow:0 10px 25px -5px rgba(0,0,0,0.1); position:relative; overflow:hidden;">
                                        `)
                                        .replace('</body>', `
                                            </div>
                                            <script>
                                                function setScale() {
                                                    var scale = Math.min((window.innerWidth - 40) / 794, (window.innerHeight - 40) / 1123);
                                                    if(scale > 1) scale = 1;
                                                    document.getElementById('print-wrapper').style.transform = 'scale(' + scale + ')';
                                                }
                                                window.addEventListener('resize', setScale);
                                                setTimeout(setScale, 10);
                                            </script>
                                            </body>
                                        `)
                                    }
                                    style={{ width: '100%', height: '100%', border: 'none' }}
                                    scrolling="no"
                                    title="Print Preview"
                                />
                            </div>

                            {/* Modal Footer */}
                            <div style={{ padding: '16px 24px', background: 'white', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                                <button
                                    onClick={() => setShowPrintModal(false)}
                                    style={{ padding: '10px 20px', borderRadius: 10, background: 'white', color: '#475569', border: '1px solid #cbd5e1', fontWeight: 600, cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        const printWindow = window.open('', '_blank');
                                        if (printWindow) {
                                            printWindow.document.open();
                                            printWindow.document.write(previewHtml);
                                            printWindow.document.close();
                                            setShowPrintModal(false);
                                        }
                                    }}
                                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', borderRadius: 10, background: '#0f172a', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer' }}
                                >
                                    <Printer size={18} />
                                    Print Receipt
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
