'use client';

import React, { useEffect, useState, Suspense } from "react";
import { Trash2, User, Activity, Edit3, Search, Stethoscope, Building2 } from "lucide-react";
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
import type { Doctor } from '@/lib/integrations';

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

function DoctorsList() {
  const { isAuthenticated } = useAuthStore();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Delete",
    cancelText: "Cancel",
    type: "danger" as "danger" | "warning" | "info",
    onConfirm: () => { }
  });

  useEffect(() => {
    if (isAuthenticated) {
      fetchDoctors();
    }
  }, [isAuthenticated]);

  const fetchDoctors = async () => {
    try {
      const data = await adminService.getDoctorsClient();
      setDoctors(data);
    } catch (err: any) {
      console.error("Failed to fetch doctors", err);
      toast.error("Failed to fetch doctors");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setConfirmModal({
      isOpen: true,
      title: "Delete Doctor",
      message: "Are you sure you want to delete this doctor? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "danger",
      onConfirm: async () => {
        setIsDeleting(true);
        try {
          await adminService.deleteUserClient(id);
          setDoctors(doctors.filter((d) => d._id !== id));
          toast.success("Doctor deleted successfully");
        } catch (err: any) {
          toast.error("Failed to delete doctor");
        } finally {
          setIsDeleting(false);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleEditClick = (e: React.MouseEvent, doctor: Doctor) => {
    e.stopPropagation();
    setEditingDoctor({ ...doctor });
  };

  const handleUpdateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoctor) return;
    setIsUpdating(true);
    try {
      const updated = await adminService.updateUserClient(editingDoctor._id, {
        name: editingDoctor.name,
        email: editingDoctor.email,
        mobile: editingDoctor.mobile
      });

      setDoctors(doctors.map((d) => (d._id === updated._id ? { ...d, ...updated } : d)));
      setEditingDoctor(null);
      toast.success("Doctor updated successfully");
    } catch (err: any) {
      toast.error("Failed to update doctor");
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredDoctors = doctors.filter((doctor) =>
    doctor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doctor.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doctor.specialties?.some(spec => spec.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const headers = ["Doctor", "Specialties", "Contact", "Status", "Actions"];

  if (loading) return <div className="p-8 text-center" style={{ color: 'var(--text-color)' }}>Loading doctors...</div>;

  return (
    <div className="max-w-7xl mx-auto">
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        type={confirmModal.type}
      />

      <PageHeader
        title="Doctors Management"
        subtitle="Manage and monitor all healthcare professionals"
        icon={<Stethoscope className="text-green-500" />}
      />

      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Search by name, email or specialty..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full border rounded-xl pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
          style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
        />
      </div>

      <Table headers={headers}>
        {filteredDoctors.length > 0 ? (
          filteredDoctors.map((doctor) => (
            <tr
              key={doctor._id}
              className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
              onClick={() => setSelectedDoctor(doctor)}
            >
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  {doctor.profilePic ? (
                    <img
                      src={doctor.profilePic}
                      alt={doctor.name}
                      className="w-10 h-10 rounded-full object-cover border"
                      style={{ borderColor: 'var(--border-color)' }}
                      onError={(e) => { (e.target as HTMLImageElement).src = "/avatar.png"; }}
                    />
                  ) : (
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs ${getColor(doctor.name)}`}>
                      {getInitials(doctor.name)}
                    </div>
                  )}
                  <div>
                    <div className="font-semibold">{doctor.name}</div>
                    <div className="text-xs opacity-50 font-mono mt-0.5">{doctor._id.slice(-8).toUpperCase()}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex flex-wrap gap-1">
                  {doctor.specialties && doctor.specialties.length > 0 ? (
                    doctor.specialties.slice(0, 2).map((s, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20">
                        {s}
                      </span>
                    ))
                  ) : <span className="text-xs opacity-40 italic">None</span>}
                  {doctor.specialties && doctor.specialties.length > 2 && (
                    <span className="text-[10px] opacity-50">+{doctor.specialties.length - 2} more</span>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 text-sm">
                <div>{doctor.mobile}</div>
                <div className="text-xs opacity-60 mt-1">{doctor.email}</div>
              </td>
              <td className="px-6 py-4">
                <Badge variant={doctor.status === 'active' ? 'success' : 'danger'}>
                  {doctor.status.toUpperCase()}
                </Badge>
              </td>
              <td className="px-6 py-4">
                <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={(e) => handleEditClick(e, doctor)}
                    className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg"
                    title="Edit"
                  >
                    <Edit3 size={18} />
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, doctor._id)}
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
              No doctors found.
            </td>
          </tr>
        )}
      </Table>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingDoctor}
        onClose={() => setEditingDoctor(null)}
        title="Edit Doctor Info"
      >
        {editingDoctor && (
          <form onSubmit={handleUpdateDoctor} className="space-y-4">
            <FormInput
              label="Full Name"
              value={editingDoctor.name}
              onChange={e => setEditingDoctor({ ...editingDoctor, name: e.target.value })}
              required
            />
            <FormInput
              label="Email Address"
              type="email"
              value={editingDoctor.email}
              onChange={e => setEditingDoctor({ ...editingDoctor, email: e.target.value })}
              required
            />
            <FormInput
              label="Mobile Number"
              value={editingDoctor.mobile || ''}
              onChange={e => setEditingDoctor({ ...editingDoctor, mobile: e.target.value })}
            />
            <div className="flex justify-end gap-3 mt-6">
              <Button type="button" variant="ghost" onClick={() => setEditingDoctor(null)}>
                Cancel
              </Button>
              <Button type="submit" loading={isUpdating}>
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Detail View Modal */}
      <Modal
        isOpen={!!selectedDoctor}
        onClose={() => setSelectedDoctor(null)}
        title="Doctor Profile"
        maxWidth="max-w-2xl"
      >
        {selectedDoctor && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 border-b pb-6" style={{ borderColor: 'var(--border-color)' }}>
              {selectedDoctor.profilePic ? (
                <img src={selectedDoctor.profilePic} className="w-24 h-24 rounded-2xl object-cover border shadow-sm" alt="" />
              ) : (
                <div className={`w-24 h-24 rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-sm ${getColor(selectedDoctor.name)}`}>
                  {getInitials(selectedDoctor.name)}
                </div>
              )}
              <div>
                <h2 className="text-2xl font-bold">{selectedDoctor.name}</h2>
                <p className="text-blue-500 font-medium">{selectedDoctor.qualification || 'Medical Professional'}</p>
                <div className="mt-2">
                  <Badge variant={selectedDoctor.status === 'active' ? 'success' : 'danger'}>
                    {selectedDoctor.status.toUpperCase()}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                <div>
                  <span className="text-xs uppercase font-bold text-gray-500 tracking-wider">Contact Details</span>
                  <p className="mt-1 font-medium">{selectedDoctor.mobile || 'N/A'}</p>
                  <p className="text-sm opacity-70">{selectedDoctor.email}</p>
                </div>
                <div>
                  <span className="text-xs uppercase font-bold text-gray-500 tracking-wider">Current Hospital</span>
                  <div className="flex items-center gap-2 mt-1">
                    <Building2 size={16} className="text-gray-400" />
                    <span className="font-medium">
                      {(selectedDoctor.hospital && typeof selectedDoctor.hospital === 'object') ? (selectedDoctor.hospital as any).name : 'Not Assigned'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-xs uppercase font-bold text-gray-500 tracking-wider">Experience</span>
                  <p className="mt-1 font-medium italic">
                    {selectedDoctor.experienceStartDate ? `${new Date().getFullYear() - new Date(selectedDoctor.experienceStartDate).getFullYear()} Years Practice` : 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="text-xs uppercase font-bold text-gray-500 tracking-wider">Consultation Fee</span>
                  <p className="mt-1 text-xl font-bold text-green-500">₹{selectedDoctor.consultationFee || 0}</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
              <span className="text-xs uppercase font-bold text-gray-500 tracking-wider">Specialties</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedDoctor.specialties && selectedDoctor.specialties.length > 0 ?
                  selectedDoctor.specialties.map((s, i) => (
                    <span key={i} className="text-xs px-2 py-1 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20">
                      {s}
                    </span>
                  )) :
                  <span className="text-sm italic opacity-50">None listed</span>
                }
              </div>
            </div>

            {selectedDoctor.bio && (
              <div className="pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
                <span className="text-xs uppercase font-bold text-gray-500 tracking-wider">Bio</span>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed italic">
                  "{selectedDoctor.bio}"
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="primary" onClick={() => setSelectedDoctor(null)}>
                Close Profile
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function DoctorsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading Doctors...</div>}>
      <DoctorsList />
    </Suspense>
  );
}

export default React.memo(DoctorsPage);
