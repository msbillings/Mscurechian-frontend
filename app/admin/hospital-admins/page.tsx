'use client';

import React, { useEffect, useState, Suspense } from "react";
import { Trash2, User, Edit3, Search, Building2, MapPin, Phone, Mail } from "lucide-react";
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
  FormSelect
} from '@/components/admin';

const getInitials = (name: string) => {
  if (!name) return "";
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

function HospitalAdminsList() {
  const { isAuthenticated } = useAuthStore();
  const [hospitalAdmins, setHospitalAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAdmin, setEditingAdmin] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    id: "",
    onConfirm: () => { }
  });

  useEffect(() => {
    if (isAuthenticated) {
      fetchHospitalAdmins();
    }
  }, [isAuthenticated]);

  const fetchHospitalAdmins = async () => {
    try {
      setLoading(true);
      const data = await adminService.getUsersClient({ role: 'hospital-admin' });
      setHospitalAdmins(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("Failed to fetch hospital admins", err);
      toast.error("Failed to fetch hospital administrators");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    setConfirmModal({
      isOpen: true,
      id: id,
      onConfirm: async () => {
        setIsDeleting(true);
        try {
          await adminService.deleteUserClient(id, 'hospital-admin');
          setHospitalAdmins(hospitalAdmins.filter((a) => a._id !== id));
          toast.success("Hospital admin deleted successfully");
        } catch (err: any) {
          toast.error(err.message || "Failed to delete hospital admin");
        } finally {
          setIsDeleting(false);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleEditClick = (admin: any) => {
    setEditingAdmin({ ...admin });
  };

  const handleUpdateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;
    setIsUpdating(true);
    try {
      const payload: any = {
        name: editingAdmin.name,
        email: editingAdmin.email,
        mobile: editingAdmin.mobile,
        status: editingAdmin.status
      };

      if (editingAdmin.password) {
        payload.password = editingAdmin.password;
      }

      const updated = await adminService.updateUserClient(editingAdmin._id, payload);

      setHospitalAdmins(hospitalAdmins.map((a) => (a._id === updated._id ? { ...a, ...updated } : a)));
      setEditingAdmin(null);
      toast.success("Hospital admin updated successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to update hospital admin");
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredAdmins = hospitalAdmins.filter((admin) =>
    admin.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    admin.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    admin.hospitalId?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const headers = ["Hospital Admin Details", "Hospital", "Contact Information", "Status", "Actions"];

  if (loading) return <div className="p-8 text-center" style={{ color: 'var(--text-color)' }}>Loading hospital administrators...</div>;

  return (
    <div className="max-w-7xl mx-auto">
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title="Remove Hospital Administrator"
        message="Are you sure you want to remove this hospital administrator? They will immediately lose access to their hospital dashboard."
        confirmText="Remove Access"
        type="danger"
      />

      <PageHeader
        title="Hospital Administrators"
        subtitle="Manage hospital-level administrative accounts"
        icon={<Building2 className="text-blue-500" />}
      />

      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Search by name, email, or hospital..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full border rounded-xl pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
          style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
        />
      </div>

      <Table headers={headers}>
        {filteredAdmins.length > 0 ? (
          filteredAdmins.map((admin) => (
            <tr
              key={admin._id}
              className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs ${getColor(admin.name)}`}>
                    {getInitials(admin.name)}
                  </div>
                  <div>
                    <div className="font-semibold">{admin.name}</div>
                    <div className="text-xs opacity-50 font-mono mt-0.5">{admin._id.slice(-8).toUpperCase()}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                {admin.hospitalId ? (
                  <div className="flex items-center gap-2">
                    <Building2 size={16} className="text-blue-500" />
                    <div>
                      <div className="font-medium text-sm">{typeof admin.hospitalId === 'object' ? admin.hospitalId.name : 'Unknown'}</div>
                      {typeof admin.hospitalId === 'object' && admin.hospitalId.hospitalId && (
                        <div className="text-xs opacity-60">{admin.hospitalId.hospitalId}</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <span className="text-xs opacity-50">No hospital assigned</span>
                )}
              </td>
              <td className="px-6 py-4 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Phone size={14} className="opacity-60" />
                  <span>{admin.mobile || 'No Mobile'}</span>
                </div>
                <div className="flex items-center gap-2 text-xs opacity-60">
                  <Mail size={14} />
                  <span>{admin.email || 'No Email'}</span>
                </div>
              </td>
              <td className="px-6 py-4">
                <Badge variant={admin.status === 'active' ? 'info' : 'danger'}>
                  {admin.status?.toUpperCase() || 'ACTIVE'}
                </Badge>
              </td>
              <td className="px-6 py-4">
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => handleEditClick(admin)}
                    className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg"
                    title="Edit"
                  >
                    <Edit3 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(admin._id)}
                    className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg"
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={5} className="py-12 text-center text-gray-500 italic">
              No hospital administrators found.
            </td>
          </tr>
        )}
      </Table>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingAdmin}
        onClose={() => setEditingAdmin(null)}
        title="Update Hospital Admin Record"
      >
        {editingAdmin && (
          <form onSubmit={handleUpdateAdmin} className="space-y-4">
            <FormInput
              label="Full Name"
              value={editingAdmin.name || ''}
              onChange={e => setEditingAdmin({ ...editingAdmin, name: e.target.value })}
              required
            />
            <FormInput
              label="Email Address"
              type="email"
              value={editingAdmin.email || ''}
              onChange={e => setEditingAdmin({ ...editingAdmin, email: e.target.value })}
              required
            />
            <FormInput
              label="Mobile Number"
              value={editingAdmin.mobile || ''}
              onChange={e => setEditingAdmin({ ...editingAdmin, mobile: e.target.value })}
            />
            <FormSelect
              label="Status"
              value={editingAdmin.status || 'active'}
              onChange={e => setEditingAdmin({ ...editingAdmin, status: e.target.value })}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'suspended', label: 'Suspended' }
              ]}
            />
            <FormInput
              label="New Password"
              type="password"
              placeholder="Leave blank to keep current password"
              value={editingAdmin.password || ''}
              onChange={e => setEditingAdmin({ ...editingAdmin, password: e.target.value })}
            />
            <div className="flex justify-end gap-3 mt-6">
              <Button type="button" variant="ghost" onClick={() => setEditingAdmin(null)}>
                Cancel
              </Button>
              <Button type="submit" loading={isUpdating}>
                Update Record
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

function HospitalAdminsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading Hospital Administrators...</div>}>
      <HospitalAdminsList />
    </Suspense>
  );
}

export default React.memo(HospitalAdminsPage);
