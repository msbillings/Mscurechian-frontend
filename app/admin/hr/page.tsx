'use client';

import React, { useEffect, useState } from "react";
import {
    Trash2,
    User,
    Building2,
    Search,
    Edit3,
    Mail,
    Phone,
    Shield,
    Database,
    Plus,
    X,
    AlertCircle,
    CheckCircle2
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
import { useRouter } from "next/navigation";

const HRManagementPage = () => {
    const router = useRouter();
    const { isAuthenticated } = useAuthStore();
    const [hrUsers, setHrUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [isSeeding, setIsSeeding] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [isUpdating, setIsUpdating] = useState(false);

    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        id: "",
        onConfirm: () => { }
    });

    useEffect(() => {
        if (isAuthenticated) {
            fetchHRUsers();
        }
    }, [isAuthenticated]);

    const fetchHRUsers = async () => {
        setLoading(true);
        try {
            const data = await adminService.getHRUsersClient();
            setHrUsers(Array.isArray(data) ? data : []);
        } catch (err: any) {
            console.error("Failed to fetch HR users", err);
            toast.error("Failed to fetch HR directory.");
        } finally {
            setLoading(false);
        }
    };

    const handleSeedHR = async () => {
        setIsSeeding(true);
        try {
            const res = await adminService.seedHRUsersClient();
            toast.success(res.message || "HR accounts seeded successfully.");
            fetchHRUsers();
        } catch (err: any) {
            toast.error("Seeding operation failed.");
        } finally {
            setIsSeeding(false);
        }
    };

    const handleDelete = (id: string) => {
        setConfirmModal({
            isOpen: true,
            id: id,
            onConfirm: async () => {
                try {
                    await adminService.deleteUserClient(id);
                    setHrUsers(prev => prev.filter(u => u._id !== id));
                    toast.success("HR record removed.");
                } catch (err: any) {
                    toast.error("Deletions failed.");
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

            setHrUsers(prev => prev.map((u) => (u._id === updated._id || u._id === editingUser._id ? { ...u, ...updated } : u)));
            setEditingUser(null);
            toast.success("HR profile updated.");
            fetchHRUsers(); // Refresh to get populated data
        } catch (err: any) {
            toast.error("Update failed.");
        } finally {
            setIsUpdating(false);
        }
    };

    const filteredUsers = hrUsers.filter((user) => {
        const term = searchQuery.toLowerCase();
        const hospitalName = user.hospital?.name?.toLowerCase() || "";
        return (
            (user.name?.toLowerCase() || "").includes(term) ||
            (user.email?.toLowerCase() || "").includes(term) ||
            hospitalName.includes(term)
        );
    });

    const headers = ["HR Personnel", "Hospital Assigned", "Contact Info", "Status", "Actions"];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto pb-12 p-4">
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title="Remove HR Access"
                message="Are you sure you want to revoke HR access for this hospital? This action cannot be undone."
                confirmText="Remove"
                type="danger"
            />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <PageHeader
                    title="HR Management"
                    subtitle="Administer Human Resource personnel across all network hospitals"
                    icon={<Shield className="text-blue-500" />}
                />
                <div className="flex items-center gap-3">
                    <Button 
                        variant="outline" 
                        onClick={handleSeedHR} 
                        loading={isSeeding}
                        className="flex items-center gap-2"
                    >
                        <Database size={16} />
                        Seed HR Users
                    </Button>
                    <Button 
                        onClick={() => router.push('/admin/create-hr')}
                        className="flex items-center gap-2"
                    >
                        <Plus size={16} />
                        Create HR
                    </Button>
                </div>
            </div>

            <div className="mb-6 relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500" size={18} />
                <input
                    type="text"
                    placeholder="Search by name, email or hospital..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full border rounded-xl pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm"
                    style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
                />
            </div>

            <Table headers={headers}>
                {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                        <tr key={user._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs bg-indigo-500`}>
                                        {user.name?.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-sm">{user.name}</div>
                                        <div className="text-[10px] opacity-40 font-mono">ID: {user._id.slice(-8).toUpperCase()}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium">{user.hospital?.name || "Unassigned"}</span>
                                    <span className="text-[10px] opacity-50">{user.hospital?.city || "Global"}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-1.5 text-xs opacity-70">
                                        <Mail size={12} className="text-blue-500" />
                                        {user.email}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs opacity-70">
                                        <Phone size={12} className="text-green-500" />
                                        {user.mobile}
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <Badge variant={getStatusVariant(user.status || 'active')}>
                                    <span className="text-[10px] font-bold">{(user.status || 'active').toUpperCase()}</span>
                                </Badge>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex justify-end gap-2">
                                    <button
                                        onClick={() => setEditingUser(user)}
                                        className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg"
                                        title="Edit HR"
                                    >
                                        <Edit3 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(user._id)}
                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg"
                                        title="Remove HR"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))
                ) : (
                    <tr>
                        <td colSpan={5} className="py-24 text-center">
                            <User className="mx-auto text-gray-200 mb-4" size={48} />
                            <p className="text-sm font-medium opacity-50">No HR personnel found.</p>
                        </td>
                    </tr>
                )}
            </Table>

            {/* Edit Modal */}
            <Modal
                isOpen={!!editingUser}
                onClose={() => setEditingUser(null)}
                title="Update HR Credentials"
            >
                {editingUser && (
                    <form onSubmit={handleUpdateUser} className="space-y-4">
                        <FormInput
                            label="HR Specialist Name"
                            value={editingUser.name}
                            onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                            required
                        />
                        <FormInput
                            label="Corporate Email"
                            type="email"
                            value={editingUser.email}
                            onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                            required
                        />
                        <FormInput
                            label="Contact Number"
                            value={editingUser.mobile}
                            onChange={(e) => setEditingUser({ ...editingUser, mobile: e.target.value })}
                            required
                        />
                        <div className="flex justify-end gap-3 mt-8">
                            <Button type="button" variant="ghost" onClick={() => setEditingUser(null)}>Cancel</Button>
                            <Button type="submit" loading={isUpdating}>Commit Changes</Button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
};

export default HRManagementPage;
