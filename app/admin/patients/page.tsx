'use client';

import React, { useEffect, useState, Suspense } from "react";
import { Trash2, User, Activity, Edit3, Search, Heart, ShieldAlert } from "lucide-react";
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
import type { Patient } from '@/lib/integrations';

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

function PatientsList() {
  const { isAuthenticated } = useAuthStore();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<Patient | any>(null);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
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
      fetchPatients();
    }
  }, [isAuthenticated]);

  const fetchPatients = async () => {
    try {
      const data = await adminService.getPatientsClient();
      setPatients(data);
    } catch (err: any) {
      console.error("Failed to fetch patients", err);
      toast.error("Failed to fetch patients");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setConfirmModal({
      isOpen: true,
      title: "Delete Patient",
      message: "Are you sure you want to delete this patient account? This will permanently remove their records from the system.",
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "danger",
      onConfirm: async () => {
        setIsDeleting(true);
        try {
          await adminService.deleteUserClient(id);
          setPatients(patients.filter((p) => p._id !== id));
          toast.success("Patient deleted successfully");
        } catch (err: any) {
          toast.error("Failed to delete patient");
        } finally {
          setIsDeleting(false);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleEditClick = (e: React.MouseEvent, patient: Patient) => {
    e.stopPropagation();
    setEditingPatient({ ...patient });
  };

  const handleUpdatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPatient) return;
    setIsUpdating(true);
    try {
      const updated = await adminService.updateUserClient(editingPatient._id, {
        name: editingPatient.name,
        email: editingPatient.email,
        mobile: editingPatient.mobile
      });

      setPatients(patients.map((p) => (p._id === updated._id ? { ...p, ...updated } : p)));
      setEditingPatient(null);
      toast.success("Patient updated successfully");
    } catch (err: any) {
      toast.error("Failed to update patient");
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredPatients = patients.filter((patient) =>
    patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.mobile?.includes(searchQuery)
  );

  const headers = ["Patient", "Age/Gender", "Contact", "Status", "Actions"];

  if (loading) return <div className="p-8 text-center" style={{ color: 'var(--text-color)' }}>Loading patients...</div>;

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
        title="Patients Management"
        subtitle="Manage patient records and system access"
        icon={<Activity className="text-purple-500" />}
      />

      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Search by name, email or mobile..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full border rounded-xl pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
          style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
        />
      </div>

      <Table headers={headers}>
        {filteredPatients.length > 0 ? (
          filteredPatients.map((patient) => (
            <tr
              key={patient._id}
              className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
              onClick={() => setSelectedPatient(patient)}
            >
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs ${getColor(patient.name)}`}>
                    {getInitials(patient.name)}
                  </div>
                  <div>
                    <div className="font-semibold">{patient.name}</div>
                    <div className="text-xs opacity-50 font-mono mt-0.5">{patient._id.slice(-8).toUpperCase()}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex flex-col">
                  <span className="text-sm">{(patient as any).age ? `${(patient as any).age} Years` : 'Age N/A'}</span>
                  <span className="text-xs opacity-50 capitalize">{(patient as any).gender || 'Unknown'}</span>
                </div>
              </td>
              <td className="px-6 py-4 text-sm">
                <div>{patient.mobile || 'No Mobile'}</div>
                <div className="text-xs opacity-60 mt-1">{patient.email}</div>
              </td>
              <td className="px-6 py-4">
                <Badge variant={patient.status === 'active' ? 'success' : 'danger'}>
                  {patient.status.toUpperCase()}
                </Badge>
              </td>
              <td className="px-6 py-4">
                <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={(e) => handleEditClick(e, patient)}
                    className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg"
                    title="Edit"
                  >
                    <Edit3 size={18} />
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, patient._id)}
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
              No patients found.
            </td>
          </tr>
        )}
      </Table>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingPatient}
        onClose={() => setEditingPatient(null)}
        title="Edit Patient Info"
      >
        {editingPatient && (
          <form onSubmit={handleUpdatePatient} className="space-y-4">
            <FormInput
              label="Full Name"
              value={editingPatient.name}
              onChange={e => setEditingPatient({ ...editingPatient, name: e.target.value })}
              required
            />
            <FormInput
              label="Email Address"
              type="email"
              value={editingPatient.email}
              onChange={e => setEditingPatient({ ...editingPatient, email: e.target.value })}
              required
            />
            <FormInput
              label="Mobile Number"
              value={editingPatient.mobile || ''}
              onChange={e => setEditingPatient({ ...editingPatient, mobile: e.target.value })}
            />
            <div className="flex justify-end gap-3 mt-6">
              <Button type="button" variant="ghost" onClick={() => setEditingPatient(null)}>
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
        isOpen={!!selectedPatient}
        onClose={() => setSelectedPatient(null)}
        title="Patient Record"
        maxWidth="max-w-2xl"
      >
        {selectedPatient && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 border-b pb-6" style={{ borderColor: 'var(--border-color)' }}>
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-sm ${getColor(selectedPatient.name)}`}>
                {getInitials(selectedPatient.name)}
              </div>
              <div>
                <h2 className="text-2xl font-bold">{selectedPatient.name}</h2>
                <div className="flex gap-2 mt-2">
                  <Badge variant={selectedPatient.status === 'active' ? 'success' : 'danger'}>
                    {selectedPatient.status.toUpperCase()}
                  </Badge>
                  <Badge variant="info">PATIENT</Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                <div>
                  <span className="text-xs uppercase font-bold text-gray-500 tracking-wider">Contact Details</span>
                  <p className="mt-1 font-medium">{selectedPatient.mobile || 'N/A'}</p>
                  <p className="text-sm opacity-70">{selectedPatient.email}</p>
                </div>
                <div>
                  <span className="text-xs uppercase font-bold text-gray-500 tracking-wider">Address</span>
                  <p className="mt-1 text-sm">{selectedPatient.address || 'Address not listed'}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs uppercase font-bold text-gray-500 tracking-wider">Age</span>
                    <p className="mt-1 text-lg font-bold">{selectedPatient.age || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-xs uppercase font-bold text-gray-500 tracking-wider">Gender</span>
                    <p className="mt-1 text-lg font-bold capitalize">{selectedPatient.gender || 'N/A'}</p>
                  </div>
                </div>
                <div>
                  <span className="text-xs uppercase font-bold text-gray-500 tracking-wider">Date of Birth</span>
                  <p className="mt-1 text-sm font-medium">{selectedPatient.dob ? new Date(selectedPatient.dob).toLocaleDateString() : 'N/A'}</p>
                </div>
              </div>
            </div>

            <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3 text-red-500">
                <ShieldAlert size={18} />
                <span className="text-sm font-bold uppercase tracking-wider">Medical Alerts & Allergies</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Allergies</span>
                  <p className="text-sm font-medium">{selectedPatient.allergies || 'NONE REPORTED'}</p>
                </div>
                <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Conditions</span>
                  <p className="text-sm font-medium">{selectedPatient.conditions || 'NONE REPORTED'}</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
              <span className="text-xs uppercase font-bold text-gray-500 tracking-wider">Vital Information</span>
              <div className="flex gap-6 mt-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 text-xs font-bold">H</div>
                  <div>
                    <span className="text-[10px] text-gray-400 block leading-none">Height</span>
                    <span className="font-bold">{selectedPatient.height || '--'} cm</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500 text-xs font-bold">W</div>
                  <div>
                    <span className="text-[10px] text-gray-400 block leading-none">Weight</span>
                    <span className="font-bold">{selectedPatient.weight || '--'} kg</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="primary" onClick={() => setSelectedPatient(null)}>
                Close Record
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function PatientsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading Patients...</div>}>
      <PatientsList />
    </Suspense>
  );
}

export default React.memo(PatientsPage);
