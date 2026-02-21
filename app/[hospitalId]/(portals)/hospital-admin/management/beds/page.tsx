"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
    Plus,
    Trash2,
    Upload,
    Search,
    Bed as BedIcon,
    MapPin,
    DoorOpen,
    Building2,
    FileText,
    AlertCircle,
    X,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { ipdService } from '@/lib/integrations/services/ipd.service';
import { ConfirmModal } from '@/components/admin/Modal';

const BedsManagement = () => {
    const [beds, setBeds] = useState<any[]>([]);
    const [rooms, setRooms] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [unitTypes, setUnitTypes] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [filterType, setFilterType] = useState("");
    const [filterRoom, setFilterRoom] = useState("");
    const [isRoomFilterOpen, setIsRoomFilterOpen] = useState(false);
    const [roomSearchTerm, setRoomSearchTerm] = useState("");
    const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
    const [addRoomSearch, setAddRoomSearch] = useState("");
    const [isEditRoomOpen, setIsEditRoomOpen] = useState(false);
    const [editRoomSearch, setEditRoomSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    const [showAddModal, setShowAddModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);

    // New Bed State
    const [newBed, setNewBed] = useState({ bedId: "", type: "", floor: "", room: "", department: "", ward: "", pricePerDay: 0 });
    const [editingBed, setEditingBed] = useState<any>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [importFile, setImportFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({ isOpen: false, title: "", message: "", onConfirm: () => { } });

    const roomDropdownRef = useRef<HTMLDivElement>(null);
    const addRoomRef = useRef<HTMLDivElement>(null);
    const editRoomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (roomDropdownRef.current && !roomDropdownRef.current.contains(event.target as Node)) {
                setIsRoomFilterOpen(false);
            }
            if (addRoomRef.current && !addRoomRef.current.contains(event.target as Node)) {
                setIsAddRoomOpen(false);
            }
            if (editRoomRef.current && !editRoomRef.current.contains(event.target as Node)) {
                setIsEditRoomOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const [bedsData, roomsData, deptsData, typesData] = await Promise.all([
                ipdService.getBeds(),
                ipdService.getRooms(),
                ipdService.getIPDDepartments(),
                ipdService.getUnitTypes()
            ]);
            setBeds(bedsData);
            setRooms(roomsData);
            setDepartments(deptsData);
            setUnitTypes(typesData);
        } catch (error) {
            toast.error("Failed to load inventory");
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validations
        if (!newBed.bedId.trim()) return toast.error("Bed ID is required");
        if (!/^[A-Z0-9-]+$/.test(newBed.bedId.toUpperCase())) return toast.error("Bed ID should be alphanumeric (e.g., ICU-101)");
        if (!newBed.room) return toast.error("Please select a room");
        if (!newBed.floor) return toast.error("Floor is required");
        if (newBed.pricePerDay < 0) return toast.error("Price cannot be negative");

        try {
            setSubmitting(true);
            await ipdService.createBed({ ...newBed, type: newBed.type.toUpperCase() });
            toast.success("Bed registered successfully");
            setShowAddModal(false);
            setNewBed({ bedId: "", type: "", floor: "", room: "", department: "", ward: "", pricePerDay: 0 });
            fetchInitialData();
        } catch (error: any) {
            toast.error(error.message || "Failed to register bed");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string, bedId: string) => {
        setConfirmModal({
            isOpen: true,
            title: "Decommission Bed",
            message: `Are you sure you want to decommission bed ${bedId}?`,
            onConfirm: async () => {
                try {
                    await ipdService.deleteBed(id);
                    toast.success("Bed decommissioned");
                    fetchInitialData();
                } catch (error) {
                    toast.error("Failed to delete bed");
                }
            }
        });
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingBed) return;

        // Validations
        if (!editingBed.bedId.trim()) return toast.error("Bed ID is required");
        if (!/^[A-Z0-9-]+$/.test(editingBed.bedId.toUpperCase())) return toast.error("Bed ID should be alphanumeric");
        if (!editingBed.room) return toast.error("Please select a room");
        if (!editingBed.floor) return toast.error("Floor is required");
        if (editingBed.pricePerDay < 0) return toast.error("Price cannot be negative");

        try {
            setSubmitting(true);
            await ipdService.updateBed(editingBed._id, {
                bedId: editingBed.bedId.toUpperCase(),
                type: editingBed.type,
                floor: editingBed.floor,
                room: editingBed.room,
                department: editingBed.department,
                ward: editingBed.ward,
                pricePerDay: editingBed.pricePerDay
            });
            toast.success("Bed updated successfully");
            setShowEditModal(false);
            setEditingBed(null);
            fetchInitialData();
        } catch (error: any) {
            toast.error(error.message || "Failed to update bed");
        } finally {
            setSubmitting(false);
        }
    };

    const handleImport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!importFile) return;
        try {
            setImporting(true);
            const formData = new FormData();
            formData.append('file', importFile);
            const res = await ipdService.importAssets('beds', formData);
            toast.success(res.message);
            setShowImportModal(false);
            setImportFile(null);
            fetchInitialData();
        } catch (error: any) {
            toast.error(error.message || "Import failed");
        } finally {
            setImporting(false);
        }
    };

    const filtered = beds.filter(b => {
        const matchesSearch = b.bedId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            b.room?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            b.type.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === "" || b.status === filterStatus;
        const matchesType = filterType === "" || b.type.toLowerCase() === filterType.toLowerCase();
        const matchesRoom = filterRoom === "" || b.room === filterRoom;
        return matchesSearch && matchesStatus && matchesType && matchesRoom;
    });

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="p-8 max-w-7xl mx-auto min-h-screen bg-slate-50/50">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div>
                    <h1 className="text-xl font-black text-slate-900  flex items-center gap-3">
                        <BedIcon className="text-primary-theme" size={24} />
                        BED INVENTORY
                    </h1>
                    <p className="text-slate-500 font-bold text-sm tracking-widest mt-1 uppercase opacity-70">
                        Asset Allocation & Clinical Node Management
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowImportModal(true)}
                        className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
                    >
                        <Upload size={16} />
                        Sync Data
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-6 py-3 bg-primary-theme text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary-theme/80 transition-all flex items-center gap-2 shadow-lg shadow-primary-theme/20"
                    >
                        <Plus size={16} />
                        Deploy Bed
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                {[
                    { label: 'Total Units', value: beds.length, color: 'text-teal-600', bg: 'bg-teal-50' },
                    { label: 'Vacant Nodes', value: beds.filter(b => b.status === 'Vacant').length, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Active Occupancy', value: beds.filter(b => b.status === 'Occupied').length, color: 'text-rose-600', bg: 'bg-rose-50' },
                    { label: 'Maintenance', value: beds.filter(b => b.status === 'Cleaning').length, color: 'text-amber-600', bg: 'bg-amber-50' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
                        <p className={`text-[8px] font-black uppercase tracking-widest ${stat.color} mb-1`}>{stat.label}</p>
                        <p className="text-xl font-black text-slate-900">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Search & Filters */}
            <div className="bg-white p-2 rounded-2xl border border-slate-100 shadow-sm mb-8 flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search by Bed ID, Room, or Type..."
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="w-full pl-11 pr-4 py-2 bg-slate-50 border-none rounded-xl text-xs font-bold uppercase tracking-widest focus:ring-2 focus:ring-teal-500/20 outline-none transition-all placeholder:text-slate-300"
                    />
                </div>

                <select
                    className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none"
                    value={filterStatus}
                    onChange={(e) => {
                        setFilterStatus(e.target.value);
                        setCurrentPage(1);
                    }}
                >
                    <option value="">All Status</option>
                    <option value="Vacant">Vacant</option>
                    <option value="Occupied">Occupied</option>
                    <option value="Cleaning">Cleaning</option>
                </select>

                <select
                    className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none"
                    value={filterType}
                    onChange={(e) => {
                        setFilterType(e.target.value);
                        setCurrentPage(1);
                    }}
                >
                    <option value="">All Types</option>
                    {unitTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                    ))}
                </select>

                <div className="relative min-w-[160px]" ref={roomDropdownRef}>
                    <div
                        onClick={() => setIsRoomFilterOpen(!isRoomFilterOpen)}
                        className="flex items-center justify-between w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer hover:border-teal-500 transition-all"
                    >
                        <span className="truncate">{filterRoom || "All Rooms"}</span>
                        <ChevronDown size={14} className={`text-slate-400 transition-transform ${isRoomFilterOpen ? 'rotate-180' : ''}`} />
                    </div>

                    {isRoomFilterOpen && (
                        <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[150] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-3 border-b border-slate-100 bg-slate-50">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                    <input
                                        type="text"
                                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold outline-none focus:border-teal-500 transition-all"
                                        placeholder="Search room..."
                                        value={roomSearchTerm}
                                        onChange={(e) => setRoomSearchTerm(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <div className="max-h-64 overflow-y-auto custom-scrollbar">
                                <div
                                    onClick={() => {
                                        setFilterRoom("");
                                        setIsRoomFilterOpen(false);
                                        setRoomSearchTerm("");
                                    }}
                                    className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 cursor-pointer border-b border-slate-50"
                                >
                                    All Rooms
                                </div>
                                {rooms
                                    .filter(r => !filterType || r.type?.toLowerCase() === filterType.toLowerCase())
                                    .filter(r => r.label.toLowerCase().includes(roomSearchTerm.toLowerCase()))
                                    .map(room => (
                                        <div
                                            key={room._id}
                                            onClick={() => {
                                                setFilterRoom(room.label);
                                                setIsRoomFilterOpen(false);
                                                setRoomSearchTerm("");
                                            }}
                                            className={`px-4 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-teal-50 hover:text-teal-600 cursor-pointer transition-colors ${filterRoom === room.label ? 'bg-teal-50 text-teal-600' : 'text-slate-700'}`}
                                        >
                                            {room.label}
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* COMPACT PAGINATION */}
                {!loading && totalPages > 1 && (
                    <div className="flex items-center gap-1 border-l border-slate-100 pl-3 py-1 ml-auto md:ml-0">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-teal-600 disabled:opacity-20 transition-all"
                        >
                            <ChevronLeft size={16} strokeWidth={3} />
                        </button>
                        <span className="text-[10px] font-black w-6 text-center text-slate-900">{currentPage}</span>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-teal-600 disabled:opacity-20 transition-all"
                        >
                            <ChevronRight size={16} strokeWidth={3} />
                        </button>
                    </div>
                )}
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-50 shadow-sm gap-4">
                    <div className="w-12 h-12 border-4 border-teal-500/10 border-t-teal-600 rounded-full animate-spin" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Syncing Inventory Ledger...</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 bg-white rounded-3xl border border-slate-50 shadow-sm text-center">
                    <div className="w-20 h-20 bg-slate-50 text-slate-200 rounded-full flex items-center justify-center mb-6">
                        <BedIcon size={40} />
                    </div>
                    <h3 className="text-slate-900 font-black text-xl mb-2">Inventory Empty</h3>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">No active bed nodes found</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                    {paginated.map((bed) => (
                        <div key={bed._id} className="group bg-white rounded-[20px] border border-slate-100 p-3 shadow-sm hover:shadow-xl hover:shadow-teal-200/30 transition-all duration-300 relative overflow-hidden flex flex-col justify-between h-full">
                            <div>
                                <div className="absolute top-0 right-0 p-2 flex gap-1 z-10">
                                    <button
                                        onClick={() => {
                                            setEditingBed(bed);
                                            setShowEditModal(true);
                                        }}
                                        className="w-6 h-6 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                    >
                                        <FileText size={10} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(bed._id, bed.bedId)}
                                        className="w-6 h-6 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                                    >
                                        <Trash2 size={10} />
                                    </button>
                                </div>

                                <div className="mb-3">
                                    <div className={`w-8 h-8 ${bed.status === 'Occupied' ? 'bg-rose-600 shadow-rose-200' : 'bg-slate-900'} text-white rounded-xl flex items-center justify-center mb-2 shadow-lg`}>
                                        <BedIcon size={14} />
                                    </div>
                                    <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-tight truncate pr-8 leading-tight">{bed.bedId}</h3>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className={`text-[6px] font-black uppercase tracking-widest px-1 py-0.5 rounded-md ${bed.status === 'Vacant' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                            bed.status === 'Occupied' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                                'bg-slate-100 text-slate-400 border border-slate-200'
                                            }`}>
                                            {bed.status}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex flex-col gap-0.5 pt-2 border-t border-slate-50">
                                    <div className="flex items-center gap-1">
                                        <DoorOpen size={8} className="text-slate-400 shrink-0" />
                                        <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest truncate">
                                            R:{bed.room || "?"} F:{bed.floor || "?"}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Building2 size={8} className="text-slate-400 shrink-0" />
                                        <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest truncate">
                                            {bed.department || "General"}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between text-[6px] font-bold text-slate-300">
                                    <span>#{bed._id.slice(-4).toUpperCase()}</span>
                                    <span>W-{bed.ward || "A"}</span>
                                </div>
                                {bed.pricePerDay > 0 && (
                                    <div className="mt-1 flex items-center justify-between border-t border-slate-50 pt-1">
                                        <span className="text-[6px] font-black text-teal-600 uppercase tracking-widest">Rate</span>
                                        <span className="text-[9px] font-black text-slate-900">₹{bed.pricePerDay}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6 z-[100] animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Deploy Node</h2>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Register new clinical bed unit</p>
                            </div>
                            <button onClick={() => setShowAddModal(false)} className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center hover:bg-slate-100 hover:text-slate-900 transition-all">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreate} className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bed ID</label>
                                    <input
                                        required
                                        value={newBed.bedId}
                                        onChange={(e) => setNewBed(prev => ({ ...prev, bedId: e.target.value }))}
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold uppercase focus:border-teal-500 outline-none transition-all"
                                        placeholder="E.G. BED-101"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Type</label>
                                    <select
                                        value={newBed.type}
                                        onChange={(e: any) => setNewBed(prev => ({ ...prev, type: e.target.value, room: "" }))}
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold uppercase focus:border-teal-500 outline-none transition-all"
                                    >
                                        <option value="">Select Type</option>
                                        {unitTypes.map(type => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-xs">Floor</label>
                                    <input
                                        required
                                        value={newBed.floor}
                                        onChange={(e) => setNewBed(prev => ({ ...prev, floor: e.target.value }))}
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold uppercase focus:border-teal-500 outline-none transition-all"
                                        placeholder="E.G 1"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-xs">Room</label>
                                    <div className="relative" ref={addRoomRef}>
                                        <div
                                            onClick={() => setIsAddRoomOpen(!isAddRoomOpen)}
                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold uppercase cursor-pointer hover:border-teal-500 transition-all flex justify-between items-center"
                                        >
                                            <span>{newBed.room || "Select Room"}</span>
                                            <ChevronDown size={14} className={`text-slate-400 transition-transform ${isAddRoomOpen ? 'rotate-180' : ''}`} />
                                        </div>

                                        {isAddRoomOpen && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[150] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                                <div className="p-3 border-b border-slate-100 bg-slate-50">
                                                    <div className="relative">
                                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                                        <input
                                                            type="text"
                                                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold outline-none focus:border-teal-500 transition-all uppercase"
                                                            placeholder="Find room..."
                                                            value={addRoomSearch}
                                                            onChange={(e) => setAddRoomSearch(e.target.value)}
                                                            autoFocus
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                                    {rooms
                                                        .filter(r => !newBed.type || r.type?.toLowerCase() === newBed.type.toLowerCase())
                                                        .filter(r => r.label.toLowerCase().includes(addRoomSearch.toLowerCase()))
                                                        .length > 0 ? (
                                                        rooms
                                                            .filter(r => !newBed.type || r.type?.toLowerCase() === newBed.type.toLowerCase())
                                                            .filter(r => r.label.toLowerCase().includes(addRoomSearch.toLowerCase()))
                                                            .map(r => (
                                                                <div
                                                                    key={r._id}
                                                                    onClick={() => {
                                                                        setNewBed(prev => ({ ...prev, room: r.label, type: r.type || prev.type }));
                                                                        setIsAddRoomOpen(false);
                                                                        setAddRoomSearch("");
                                                                    }}
                                                                    className={`px-6 py-4 text-xs font-bold uppercase hover:bg-teal-50 hover:text-teal-600 cursor-pointer transition-colors ${newBed.room === r.label ? 'bg-teal-50 text-teal-600' : 'text-slate-700'}`}
                                                                >
                                                                    {r.label}
                                                                </div>
                                                            ))
                                                    ) : (
                                                        <div className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase text-center">No rooms found</div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-xs">Department</label>
                                    <select
                                        value={newBed.department}
                                        onChange={(e) => setNewBed(prev => ({ ...prev, department: e.target.value }))}
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold uppercase focus:border-teal-500 outline-none transition-all"
                                    >
                                        <option value="">Select Dept</option>
                                        {departments.map(d => <option key={d._id} value={d.name}>{d.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-xs">Ward Section</label>
                                    <input
                                        value={newBed.ward}
                                        onChange={(e) => setNewBed(prev => ({ ...prev, ward: e.target.value }))}
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold uppercase focus:border-teal-500 outline-none transition-all"
                                        placeholder="E.G A, B, C"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-teal-600 uppercase tracking-widest ml-1">Price per Day (₹)</label>
                                <input
                                    type="number"
                                    value={newBed.pricePerDay}
                                    onChange={(e) => setNewBed(prev => ({ ...prev, pricePerDay: Number(e.target.value) }))}
                                    className="w-full px-6 py-4 bg-teal-50 border border-teal-100 rounded-2xl text-xs font-black focus:border-teal-500 outline-none transition-all"
                                    placeholder="0.00"
                                />
                            </div>
                            <button
                                disabled={submitting}
                                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-50 shadow-xl"
                            >
                                {submitting ? "Deploying Node..." : "Authorize Integration"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && editingBed && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6 z-[100] animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-teal-600 text-white">
                            <div>
                                <h2 className="text-xl font-black uppercase tracking-tight">Refine Node</h2>
                                <p className="text-[10px] font-bold text-teal-100 uppercase tracking-widest mt-1">Update clinical bed unit</p>
                            </div>
                            <button onClick={() => setShowEditModal(false)} className="w-10 h-10 bg-white/10 text-white rounded-xl flex items-center justify-center hover:bg-white/20 transition-all">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleUpdate} className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bed ID</label>
                                    <input
                                        required
                                        value={editingBed.bedId}
                                        onChange={(e) => setEditingBed((prev: any) => ({ ...prev, bedId: e.target.value }))}
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold uppercase focus:border-teal-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Type</label>
                                    <select
                                        value={editingBed.type}
                                        onChange={(e: any) => setEditingBed((prev: any) => ({ ...prev, type: e.target.value, room: "" }))}
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold uppercase focus:border-teal-500 outline-none transition-all"
                                    >
                                        <option value="">Select Type</option>
                                        {unitTypes.map(type => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-xs">Floor</label>
                                    <input
                                        required
                                        value={editingBed.floor}
                                        onChange={(e) => setEditingBed((prev: any) => ({ ...prev, floor: e.target.value }))}
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold uppercase focus:border-teal-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-xs">Room</label>
                                    <div className="relative" ref={editRoomRef}>
                                        <div
                                            onClick={() => setIsEditRoomOpen(!isEditRoomOpen)}
                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold uppercase cursor-pointer hover:border-teal-500 transition-all flex justify-between items-center"
                                        >
                                            <span>{editingBed.room || "Select Room"}</span>
                                            <ChevronDown size={14} className={`text-slate-400 transition-transform ${isEditRoomOpen ? 'rotate-180' : ''}`} />
                                        </div>

                                        {isEditRoomOpen && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[150] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                                <div className="p-3 border-b border-slate-100 bg-slate-50">
                                                    <div className="relative">
                                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                                        <input
                                                            type="text"
                                                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold outline-none focus:border-teal-500 transition-all uppercase"
                                                            placeholder="Find room..."
                                                            value={editRoomSearch}
                                                            onChange={(e) => setEditRoomSearch(e.target.value)}
                                                            autoFocus
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                                    {rooms
                                                        .filter(r => !editingBed.type || r.type?.toLowerCase() === editingBed.type.toLowerCase())
                                                        .filter(r => r.label.toLowerCase().includes(editRoomSearch.toLowerCase()))
                                                        .length > 0 ? (
                                                        rooms
                                                            .filter(r => !editingBed.type || r.type?.toLowerCase() === editingBed.type.toLowerCase())
                                                            .filter(r => r.label.toLowerCase().includes(editRoomSearch.toLowerCase()))
                                                            .map(r => (
                                                                <div
                                                                    key={r._id}
                                                                    onClick={() => {
                                                                        setEditingBed((prev: any) => ({ ...prev, room: r.label, type: r.type || prev.type }));
                                                                        setIsEditRoomOpen(false);
                                                                        setEditRoomSearch("");
                                                                    }}
                                                                    className={`px-6 py-4 text-xs font-bold uppercase hover:bg-teal-50 hover:text-teal-600 cursor-pointer transition-colors ${editingBed.room === r.label ? 'bg-teal-50 text-teal-600' : 'text-slate-700'}`}
                                                                >
                                                                    {r.label}
                                                                </div>
                                                            ))
                                                    ) : (
                                                        <div className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase text-center">No rooms found</div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-xs">Department</label>
                                    <select
                                        value={editingBed.department}
                                        onChange={(e) => setEditingBed((prev: any) => ({ ...prev, department: e.target.value }))}
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold uppercase focus:border-teal-500 outline-none transition-all"
                                    >
                                        <option value="">Select Dept</option>
                                        {departments.map(d => <option key={d._id} value={d.name}>{d.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-xs">Ward Section</label>
                                    <input
                                        value={editingBed.ward}
                                        onChange={(e) => setEditingBed((prev: any) => ({ ...prev, ward: e.target.value }))}
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold uppercase focus:border-teal-500 outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-teal-600 uppercase tracking-widest ml-1">Price per Day (₹)</label>
                                <input
                                    type="number"
                                    value={editingBed.pricePerDay}
                                    onChange={(e) => setEditingBed((prev: any) => ({ ...prev, pricePerDay: Number(e.target.value) }))}
                                    className="w-full px-6 py-4 bg-teal-50 border border-teal-100 rounded-2xl text-xs font-black focus:border-teal-500 outline-none transition-all"
                                />
                            </div>
                            <button
                                disabled={submitting}
                                className="w-full py-4 bg-teal-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-teal-700 transition-all disabled:opacity-50 shadow-xl shadow-teal-200"
                            >
                                {submitting ? "Updating..." : "Save Changes"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Import Modal */}
            {showImportModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6 z-[100] animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-teal-600 text-white">
                            <div>
                                <h2 className="text-xl font-black uppercase tracking-tight">Bulk Deployment</h2>
                                <p className="text-[10px] font-bold text-teal-100 uppercase tracking-widest mt-1">Import Bed Assets via CSV</p>
                            </div>
                            <button onClick={() => setShowImportModal(false)} className="w-10 h-10 bg-white/10 text-white rounded-xl flex items-center justify-center hover:bg-white/20 transition-all">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleImport} className="p-8 space-y-6">
                            <div className="bg-teal-50 p-4 rounded-xl border border-teal-100 flex gap-4">
                                <AlertCircle size={20} className="text-teal-600 shrink-0" />
                                <div className="text-[10px] text-teal-700 font-bold uppercase leading-relaxed">
                                    CSV must include: <span className="text-teal-900">bedId, type, floor, room, department, ward, pricePerDay</span>
                                </div>
                            </div>
                            <div
                                className={`h-48 border-2 border-dashed ${importFile ? 'border-teal-500 bg-teal-50/30' : 'border-slate-200 bg-slate-50'} rounded-2xl flex flex-col items-center justify-center gap-4 transition-all relative overflow-hidden`}
                            >
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                                <div className={`w-12 h-12 ${importFile ? 'bg-teal-600 text-white' : 'bg-white text-slate-400'} rounded-xl flex items-center justify-center shadow-sm`}>
                                    {importFile ? <CheckCircle2 size={24} /> : <FileText size={24} />}
                                </div>
                                <div className="text-center">
                                    <p className="text-xs font-black text-slate-900 uppercase tracking-tight">
                                        {importFile ? importFile.name : "Select Asset File"}
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Click or Drag CSV here</p>
                                </div>
                            </div>
                            <button
                                disabled={!importFile || importing}
                                className="w-full py-4 bg-teal-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-teal-700 transition-all disabled:opacity-50 shadow-lg shadow-teal-200"
                            >
                                {importing ? "Processing Asset Ledger..." : "Commence Asset Sync"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
            />
        </div>
    );
};

export default BedsManagement;
