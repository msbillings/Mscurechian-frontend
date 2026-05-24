'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, User, FileText, Plus, Trash2, Loader2, ArrowLeft,
    CheckCircle2, AlertTriangle, Receipt, TestTube, Activity,
    Building2, IndianRupee, Clock, Stethoscope, X, ChevronDown,
    Sparkles, Package, Heart, Microscope
} from 'lucide-react';
import { helpdeskService, ipdService } from '@/lib/integrations';
import { apiClient } from '@/lib/integrations/api/apiClient';
import toast from 'react-hot-toast';
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
}

type BillMode = 'lab' | 'ipd_charge' | 'custom';

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
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'upi'>('cash');

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
        fetchLabTests();
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

        setSubmitting(true);
        try {
            const labItems = billItems.filter(i => i.type === 'lab');
            const ipdItems = billItems.filter(i => i.type === 'ipd_charge');
            const customItems = billItems.filter(i => i.type === 'custom');

            const results: string[] = [];

            // 1. Create Lab Orders for lab tests
            if (labItems.length > 0) {
                const existingTestIds = labItems.filter(i => i.labTestId).map(i => i.labTestId!);
                const newTests = labItems.filter(i => i.isNew);

                // Create new tests in catalog first
                for (const nt of newTests) {
                    try {
                        const created: any = await apiClient('/helpdesk/lab-tests', {
                            method: 'POST',
                            body: JSON.stringify({
                                name: nt.name,
                                price: nt.amount,
                                category: 'Custom',
                                isActive: true,
                            }),
                        });
                        if (created.test?._id) {
                            existingTestIds.push(created.test._id);
                        }
                    } catch (e: any) {
                        console.error(`Failed to create test ${nt.name}`, e);
                        toast.error(`Could not create test: ${nt.name}`);
                    }
                }

                if (existingTestIds.length > 0) {
                    try {
                        await apiClient('/helpdesk/lab-orders', {
                            method: 'POST',
                            body: JSON.stringify({
                                patientId: selectedPatient._id,
                                tests: existingTestIds,
                                notes: `Bill created from Front Desk on ${new Date().toLocaleDateString()}`,
                            }),
                        });
                        results.push(`${existingTestIds.length} lab test(s) ordered`);
                    } catch (e: any) {
                        console.error('Failed to create lab order', e);
                        toast.error('Failed to create lab order: ' + (e.message || 'Unknown error'));
                    }
                }
            }

            // 2. Create IPD Extra Charges
            if (ipdItems.length > 0 && activeAdmission) {
                for (const item of ipdItems) {
                    try {
                        await ipdService.addExtraCharge({
                            admissionId: activeAdmission._id,
                            category: item.category,
                            description: item.name,
                            amount: item.amount,
                        });
                    } catch (e: any) {
                        console.error(`Failed to add charge: ${item.name}`, e);
                        toast.error(`Failed: ${item.name}`);
                    }
                }
                results.push(`${ipdItems.length} IPD charge(s) added`);
            }

            // 3. Custom charges as IPD Extra Charges (if IPD) or Lab Orders (if OPD)
            if (customItems.length > 0) {
                if (activeAdmission) {
                    for (const item of customItems) {
                        try {
                            await ipdService.addExtraCharge({
                                admissionId: activeAdmission._id,
                                category: item.category,
                                description: item.name,
                                amount: item.amount,
                            });
                        } catch (e: any) {
                            console.error(`Failed to add custom charge: ${item.name}`, e);
                        }
                    }
                    results.push(`${customItems.length} custom charge(s) added`);
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

    // ── IPD Charge Categories ──
    const ipdCategories = [
        'Room Charges', 'Nursing Charges', 'Consumables', 'Procedure Charges',
        'Equipment Charges', 'Doctor Visit', 'Physiotherapy', 'Emergency Services',
        'Ambulance', 'Blood Bank', 'Other'
    ];

    return (
        <div className="add-bills-page">
            <style jsx>{`
                .add-bills-page {
                    min-height: 100vh;
                    background: linear-gradient(135deg, #f0f9ff 0%, #f8fafc 40%, #f0fdf4 100%);
                    padding: 24px;
                    font-family: 'Inter', -apple-system, sans-serif;
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
                    gap: 10px;
                    width: 100%;
                    padding: 14px;
                    border-radius: 14px;
                    border: none;
                    background: linear-gradient(135deg, #059669, #047857);
                    color: white;
                    font-size: 0.82rem;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
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
                                            <div style={{ marginTop: 6 }}>
                                                <span className="ipd-badge">
                                                    <Building2 size={10} /> IPD Admitted · {activeAdmission.admissionId}
                                                </span>
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
                                            onClick={() => setBillMode('ipd_charge')}
                                        >
                                            <Building2 size={14} /> IPD Charges
                                        </button>
                                    )}
                                    <button
                                        className={`mode-tab ${billMode === 'custom' ? 'active' : ''}`}
                                        onClick={() => setBillMode('custom')}
                                    >
                                        <Sparkles size={14} /> Custom
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
                                        {billItems.map(item => (
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
                                        ))}
                                    </AnimatePresence>

                                    {/* Total */}
                                    <div className="bill-total-section">
                                        <div className="bill-total-row">
                                            <div className="bill-total-label">Total Amount</div>
                                            <div className="bill-total-value">₹{totalAmount.toLocaleString()}</div>
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
                                        <div className="payment-methods">
                                            {(['cash', 'card', 'upi'] as const).map(m => (
                                                <button
                                                    key={m}
                                                    className={`payment-method-btn ${paymentMethod === m ? 'active' : ''}`}
                                                    onClick={() => setPaymentMethod(m)}
                                                >
                                                    {m === 'cash' ? '💵' : m === 'card' ? '💳' : '📱'} {m}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Submit */}
                                    <button
                                        className="submit-btn"
                                        onClick={handleSubmitBill}
                                        disabled={submitting || billItems.length === 0 || !selectedPatient}
                                    >
                                        {submitting ? (
                                            <>
                                                <Loader2 size={18} className="animate-spin" />
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 size={18} />
                                                Submit Bill · ₹{totalAmount.toLocaleString()}
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
