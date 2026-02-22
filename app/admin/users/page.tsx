'use client';

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
    Trash2,
    User,
    Activity,
    Building2,
    Search,
    Edit3,
    Shield,
    Headphones,
    Stethoscope,
    Mail,
    Phone,
    MapPin,
    Calendar,
    X,
    AlertCircle
} from "lucide-react";
import toast from "react-hot-toast";
import { adminService } from '@/lib/integrations';
import { useAuthStore } from '@/stores/authStore';
import {
    PageHeader,
    Table,
    Badge,
    Button,
    Modal,
    ConfirmModal,
    FormInput,
    getStatusVariant
} from '@/components/admin';
import type { User as IntegrationUser, Doctor, Patient, Helpdesk, Admin } from '@/lib/integrations';

const getInitials = (name: string) => {
    if (!name) return "";
    if (name.startsWith("FD - ")) {
        const hospitalName = name.replace("FD - ", "");
        const parts = hospitalName.trim().split(" ");
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
};

const getColor = (name: string) => {
    if (!name) return "bg-gray-500";
    const colors = ["bg-red-500", "bg-green-500", "bg-blue-500", "bg-yellow-500", "bg-purple-500", "bg-pink-500", "bg-indigo-500", "bg-teal-500", "bg-orange-500"];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

const getRoleGradient = (role: string) => {
    switch (role) {
        case 'doctor': return 'from-blue-500/20 to-purple-500/20';
        case 'patient': return 'from-green-500/20 to-teal-500/20';
        case 'admin': return 'from-red-500/20 to-orange-500/20';
        case 'helpdesk': return 'from-orange-500/20 to-yellow-500/20';
        default: return 'from-gray-500/20 to-slate-500/20';
    }
};

const UsersList = () => {
    const searchParams = useSearchParams();
    const role = searchParams.get('role');

    const { isAuthenticated } = useAuthStore();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [isUpdating, setIsUpdating] = useState(false);

    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        id: "",
        onConfirm: () => { }
    });

    useEffect(() => {
        if (isAuthenticated) {
            fetchUsers();
        }
    }, [role, isAuthenticated]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await adminService.getUsersClient(role ? { role } : undefined);
            setUsers(Array.isArray(data) ? data : []);
        } catch (err: any) {
            console.error("Failed to fetch users", err);
            toast.error("Failed to fetch user directory.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (id: string, roleParam?: string) => {
        setConfirmModal({
            isOpen: true,
            id: id,
            onConfirm: async () => {
                try {
                    const userObj = users.find(u => u._id === id);

                    if (!userObj?.userId) {
                        // If no userId, try deleting with the object ID itself
                        console.warn("No linked userId found, attempting delete with object ID:", id);
                    }

                    console.log('Deleting user:', {
                        id: userObj?.userId || id,
                        role: roleParam,
                    });

                    // Service now handles 404 fallbacks internally
                    await adminService.deleteUserClient(userObj?.userId || id);

                    // Update UI
                    setUsers(prev => prev.filter(u => u._id !== id));
                    toast.success("Account permanently deleted.");
                } catch (err: any) {
                    console.error("Delete operation failed:", err);
                    toast.error(err.message || "Failed to delete user record.");
                } finally {
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        setIsUpdating(true);
        try {
            const updated = await adminService.updateUserClient(editingUser._id, {
                name: editingUser.name,
                email: editingUser.email,
                mobile: editingUser.mobile
            });

            setUsers(prev => prev.map((u) => (u._id === updated._id ? { ...u, ...updated } : u)));
            setEditingUser(null);
            toast.success("Profile updated successfully.");
        } catch (err: any) {
            toast.error("Correction failed.");
        } finally {
            setIsUpdating(false);
        }
    };

    const filteredUsers = users.filter((user) => {
        const term = searchQuery.toLowerCase();
        return (
            (user.name?.toLowerCase() || "").includes(term) ||
            (user.email?.toLowerCase() || "").includes(term) ||
            (user.doctorId?.toLowerCase() || "").includes(term) ||
            (user.patientProfileId?.toLowerCase() || "").includes(term)
        );
    });

    const getRoleIcon = (roleName: string) => {
        switch (roleName) {
            case 'doctor': return <Stethoscope size={16} className="text-blue-500" />;
            case 'patient': return <Activity size={16} className="text-green-500" />;
            case 'admin': return <Shield size={16} className="text-red-500" />;
            case 'helpdesk': return <Headphones size={16} className="text-orange-500" />;
            default: return <User size={16} />;
        }
    };

    const headers = ["User Identity", "Role", "Dept / Specialization", "Reach", "Status", "Actions"];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="text-sm font-medium opacity-50">Indexing global directory...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto pb-12">
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title="Deactivate Account"
                message="Are you sure you want to permanently decommission this account? This action will revoke all security clearances."
                confirmText="Deactivate"
                type="danger"
            />

            <PageHeader
                title={role ? `${role.charAt(0).toUpperCase() + role.slice(1)}s Directory` : "Network Directory"}
                subtitle={`Management of ${role || 'all registered'} entities within the CureChain infrastructure`}
                icon={role ? getRoleIcon(role) : <User className="text-blue-500" />}
            />

            <div className="mb-6 relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500" size={18} />
                <input
                    type="text"
                    placeholder="Search by identity, email, or system ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full border rounded-xl pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm group-hover:shadow-md"
                    style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
                />
            </div>

            <Table headers={headers}>
                {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                        <tr
                            key={user._id}
                            className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                            onClick={() => setSelectedUser(user)}
                        >
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    {user.role === 'doctor' && (user.profilePic || user.avatar) ? (
                                        <img
                                            src={user.profilePic || user.avatar}
                                            className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-500/10"
                                            alt=""
                                            onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${user.name}&background=random`; }}
                                        />
                                    ) : (
                                        <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-white font-bold text-xs ${getColor(user.name)}`}>
                                            {getInitials(user.name)}
                                        </div>
                                    )}
                                    <div className="max-w-[150px]">
                                        <div className="font-semibold truncate text-sm">{user.name}</div>
                                        <div className="text-[10px] opacity-40 font-mono mt-0.5 truncate tracking-tighter">{(user.doctorId || user.patientProfileId || user._id).toUpperCase()}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <Badge variant={getStatusVariant(user.role)}>
                                    <span className="flex items-center gap-1.5 capitalize text-[10px] font-bold">
                                        {getRoleIcon(user.role)}
                                        {user.role === 'helpdesk' ? 'Front Desk' : user.role}
                                    </span>
                                </Badge>
                            </td>
                            <td className="px-6 py-4 text-sm">
                                {user.role === 'doctor' && (user.specialties?.length > 0 || user.specialities?.length > 0) ? (
                                    <span className="text-blue-500 font-medium text-xs">{(user.specialties || user.specialities || []).slice(0, 2).join(", ")}{(user.specialties || user.specialities || []).length > 2 ? '...' : ''}</span>
                                ) : user.role === 'helpdesk' ? (
                                    <span className="text-indigo-500 font-medium text-xs truncate max-w-[120px] inline-block">{user.hospitalName || "Active Station"}</span>
                                ) : (
                                    <span className="opacity-30 text-xs">-</span>
                                )}
                            </td>
                            <td className="px-6 py-4 text-sm">
                                <div className="opacity-80 truncate max-w-[150px] text-xs">{user.email || 'N/A'}</div>
                                <div className="text-[10px] opacity-40 mt-0.5">{user.mobile || 'No Contact'}</div>
                            </td>
                            <td className="px-6 py-4">
                                <Badge variant={getStatusVariant(user.status || 'active')}>
                                    <span className="text-[10px] font-bold">{(user.status || 'active').toUpperCase()}</span>
                                </Badge>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setEditingUser(user); }}
                                        className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg"
                                        title="Modify Access"
                                    >
                                        <Edit3 size={16} />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDelete(user._id, user.role); }}
                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg"
                                        title="Revoke Permission"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))
                ) : (
                    <tr>
                        <td colSpan={6} className="py-24 text-center">
                            <User className="mx-auto text-gray-200 mb-4" size={48} />
                            <p className="text-sm font-medium opacity-50">No search results in this sector.</p>
                        </td>
                    </tr>
                )}
            </Table>

            {/* Edit User Modal */}
            <Modal
                isOpen={!!editingUser}
                onClose={() => setEditingUser(null)}
                title="Modify Security Credentials"
            >
                {editingUser && (
                    <form onSubmit={handleUpdateUser} className="space-y-4">
                        <FormInput
                            label="Legal Name"
                            value={editingUser.name}
                            onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                            required
                        />
                        <FormInput
                            label="Email Address (Login ID)"
                            type="email"
                            value={editingUser.email || ''}
                            onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                            required
                        />
                        <FormInput
                            label="Emergency Mobile Number"
                            value={editingUser.mobile || ''}
                            onChange={(e) => setEditingUser({ ...editingUser, mobile: e.target.value })}
                        />
                        <div className="flex justify-end gap-3 mt-8">
                            <Button type="button" variant="ghost" onClick={() => setEditingUser(null)}>Cancel</Button>
                            <Button type="submit" loading={isUpdating}>Commit Changes</Button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* User Detail Modal */}
            <Modal
                isOpen={!!selectedUser}
                onClose={() => setSelectedUser(null)}
                title="Entity Profile Data"
                maxWidth="max-w-4xl"
            >
                {selectedUser && (
                    <div className="relative">
                        <div className={`absolute -top-6 -left-6 -right-6 h-32 bg-linear-to-r ${getRoleGradient(selectedUser.role)} opacity-50 z-0`}></div>

                        <div className="relative z-10">
                            <div className="flex flex-col md:flex-row gap-8 items-start mb-8 border-b pb-8" style={{ borderColor: 'var(--border-color)' }}>
                                <div className="shrink-0">
                                    <div className="relative">
                                        <div className="w-32 h-32 rounded-2xl overflow-hidden border-4 shadow-xl flex items-center justify-center bg-white dark:bg-gray-800"
                                            style={{ borderColor: 'var(--card-bg)' }}>
                                            {(selectedUser.role === 'doctor' || selectedUser.avatar || selectedUser.profilePic) ? (
                                                <img
                                                    src={selectedUser.avatar || selectedUser.profilePic || `https://ui-avatars.com/api/?name=${selectedUser.name}&background=random`}
                                                    alt={selectedUser.name}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${selectedUser.name}&background=random`; }}
                                                />
                                            ) : (
                                                <div className={`w-full h-full flex items-center justify-center text-4xl font-bold text-white ${getColor(selectedUser.name)}`}>
                                                    {getInitials(selectedUser.name)}
                                                </div>
                                            )}
                                        </div>
                                        <span className="absolute -bottom-3 -right-3 bg-green-500 text-white text-[10px] font-bold px-3 py-1 rounded-full border-4 shadow-sm"
                                            style={{ borderColor: 'var(--card-bg)' }}>
                                            VERIFIED
                                        </span>
                                    </div>
                                </div>

                                <div className="grow pt-2">
                                    <div className="flex flex-wrap items-center gap-3 mb-2">
                                        <h2 className="text-3xl font-bold">{selectedUser.name}</h2>
                                        <Badge variant={getStatusVariant(selectedUser.role)} className="uppercase px-3 py-1 text-[10px] font-bold">
                                            {selectedUser.role === 'helpdesk' ? 'Front Desk' : selectedUser.role}
                                        </Badge>
                                    </div>
                                    <p className="font-mono text-[10px] opacity-40 mb-4 tracking-widest">UID: {selectedUser.doctorId || selectedUser.patientProfileId || selectedUser._id}</p>

                                    {selectedUser.bio && (
                                        <p className="text-sm opacity-80 leading-relaxed max-w-xl italic">
                                            "{selectedUser.bio}"
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="rounded-2xl p-6 border bg-gray-50/50 dark:bg-gray-900/50"
                                    style={{ borderColor: 'var(--border-color)' }}>
                                    <h3 className="text-[10px] font-bold uppercase tracking-widest mb-6 flex items-center gap-2 text-blue-500">
                                        <Mail size={14} /> Contact Information
                                    </h3>
                                    <div className="space-y-6">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] uppercase font-bold opacity-30 tracking-widest">Primary Node (Email)</span>
                                            <span className="font-medium text-sm mt-1">{selectedUser.email || 'N/A'}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] uppercase font-bold opacity-30 tracking-widest">Network Access (Mobile)</span>
                                            <span className="font-medium text-sm mt-1">{selectedUser.mobile || 'No mobile provided'}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] uppercase font-bold opacity-30 tracking-widest">Physical Location</span>
                                            <span className="font-medium text-xs mt-1 opacity-70 leading-relaxed italic">{selectedUser.address || 'Global Access Only'}</span>
                                        </div>
                                    </div>
                                </div>

                                {selectedUser.role === 'doctor' && (
                                    <div className="rounded-2xl p-6 border bg-gray-50/50 dark:bg-gray-900/50"
                                        style={{ borderColor: 'var(--border-color)' }}>
                                        <h3 className="text-[10px] font-bold uppercase tracking-widest mb-6 flex items-center gap-2 text-blue-500">
                                            <Stethoscope size={14} /> Medical Credentials
                                        </h3>
                                        <div className="space-y-6">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] uppercase font-bold opacity-30 tracking-widest">Active Specializations</span>
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {(selectedUser.specialties || selectedUser.specialities) && (selectedUser.specialties || selectedUser.specialities).length > 0 ? (
                                                        ((selectedUser.specialties || selectedUser.specialities) as string[]).map((spec, index) => (
                                                            <span key={index} className="bg-blue-500/10 text-blue-600 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-blue-500/10 uppercase tracking-tighter">
                                                                {spec}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-xs opacity-40 italic">General Practice</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] uppercase font-bold opacity-30 tracking-widest">Certification</span>
                                                    <span className="font-bold text-xs mt-1">{selectedUser.qualifications?.join(", ") || selectedUser.qualification || "Verified Practitioner"}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] uppercase font-bold opacity-30 tracking-widest">Domain Rank</span>
                                                    <span className="font-bold text-xs mt-1">
                                                        {selectedUser.experienceStart || selectedUser.experienceStartDate ? `Exp. since ${new Date(selectedUser.experienceStart || selectedUser.experienceStartDate).getFullYear()}` : "Active"}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {selectedUser.role === 'patient' && (
                                    <div className="rounded-2xl p-6 border bg-gray-50/50 dark:bg-gray-900/50"
                                        style={{ borderColor: 'var(--border-color)' }}>
                                        <h3 className="text-[10px] font-bold uppercase tracking-widest mb-6 flex items-center gap-2 text-green-500">
                                            <Activity size={14} /> Health Registry
                                        </h3>
                                        <div className="grid grid-cols-2 gap-6 mb-6">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] uppercase font-bold opacity-30 tracking-widest">Date of Birth</span>
                                                <span className="font-bold text-sm mt-1">
                                                    {selectedUser.dob ? new Date(selectedUser.dob).toLocaleDateString() : "-"}
                                                </span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] uppercase font-bold opacity-30 tracking-widest">Biometric Gender</span>
                                                <span className="font-bold text-sm mt-1 capitalize">{selectedUser.gender || "Unspecified"}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="p-3 rounded-xl border border-red-500/10 bg-red-500/5">
                                                <span className="text-[10px] uppercase font-bold opacity-50 tracking-widest block mb-1">Critical Allergies</span>
                                                <span className={`font-bold text-xs ${selectedUser.allergies && selectedUser.allergies !== 'None' ? 'text-red-500' : 'opacity-40'}`}>{selectedUser.allergies || 'NONE REPORTED'}</span>
                                            </div>
                                            <div className="p-3 rounded-xl border border-orange-500/10 bg-orange-500/5">
                                                <span className="text-[10px] uppercase font-bold opacity-50 tracking-widest block mb-1">Persistent Conditions</span>
                                                <span className={`font-bold text-xs ${selectedUser.conditions && selectedUser.conditions !== 'None' ? 'text-orange-500' : 'opacity-40'}`}>{selectedUser.conditions || 'STABLE'}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {selectedUser.role === 'helpdesk' && (
                                    <div className="rounded-2xl p-6 border bg-gray-50/50 dark:bg-gray-900/50"
                                        style={{ borderColor: 'var(--border-color)' }}>
                                        <h3 className="text-[10px] font-bold uppercase tracking-widest mb-6 flex items-center gap-2 text-orange-500">
                                            <Building2 size={14} /> Operational Node
                                        </h3>
                                        <div className="flex flex-col gap-6">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] uppercase font-bold opacity-30 tracking-widest">Active Station</span>
                                                <span className="font-extrabold text-xl mt-1 text-orange-600 block">
                                                    {selectedUser.hospitalName || (selectedUser.hospital as any)?.name || "CENTRAL COMMAND"}
                                                </span>
                                            </div>
                                            {(selectedUser.hospitalId || selectedUser.hospital) && (
                                                <div className="p-4 rounded-2xl border border-orange-500/10 bg-orange-500/5 font-mono">
                                                    <p className="text-[10px] opacity-40 uppercase font-bold mb-2">Station Fingerprint</p>
                                                    <p className="text-[10px] break-all opacity-80">{selectedUser.hospitalId || (selectedUser.hospital as any)?._id || selectedUser.hospital}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end pt-8 mt-6">
                                <Button variant="ghost" onClick={() => setSelectedUser(null)} className="px-12">Return to Directory</Button>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

function UsersPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        }>
            <UsersList />
        </Suspense>
    );
}

export default React.memo(UsersPage);
