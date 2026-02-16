"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { adminService } from "@/lib/integrations";
import {
  Calendar,
  FileText,
  Phone,
  User,
  Send,
  AlertCircle
} from "lucide-react";
import toast from "react-hot-toast";
import { PageHeader, Card, Button } from "@/components/admin";

const LEAVE_TYPES = [
  { value: "casual", label: "Casual Leave" },
  { value: "sick", label: "Sick Leave" },
  { value: "annual", label: "Annual Leave" },
  { value: "emergency", label: "Emergency Leave" },
  { value: "other", label: "Other" }
];

import { useCreateLeave } from "@/lib/integrations/hooks/useStaffQueries";

function DoctorLeaveRequest() {
  const router = useRouter();
  const createLeaveMutation = useCreateLeave();

  const [formData, setFormData] = useState({
    leaveType: "",
    startDate: "",
    endDate: "",
    reason: "",
    additionalNotes: "",
    emergencyContactName: "",
    emergencyContactMobile: "",
    emergencyContactRelationship: "",
    handoverNotes: ""
  });

  const loading = createLeaveMutation.isPending;
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.leaveType) newErrors.leaveType = "Please select leave type";
    if (!formData.startDate) newErrors.startDate = "Please select start date";
    if (!formData.endDate) newErrors.endDate = "Please select end date";
    if (!formData.reason.trim()) newErrors.reason = "Please provide a reason";

    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (start > end) {
        newErrors.endDate = "End date must be after start date";
      }

      if (start < today) {
        newErrors.startDate = "Start date cannot be in the past";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fix the errors in the form");
      return;
    }

    try {
      const leaveData = {
        leaveType: formData.leaveType as any,
        startDate: formData.startDate,
        endDate: formData.endDate,
        reason: formData.reason.trim(),
        additionalNotes: formData.additionalNotes.trim() || undefined,
        emergencyContact: formData.emergencyContactName ? {
          name: formData.emergencyContactName,
          mobile: formData.emergencyContactMobile,
          relationship: formData.emergencyContactRelationship
        } : undefined,
        handoverNotes: formData.handoverNotes.trim() || undefined
      };

      await createLeaveMutation.mutateAsync(leaveData);

      toast.success("Leave request submitted successfully!", { duration: 4000 });

      // Reset form
      setFormData({
        leaveType: "",
        startDate: "",
        endDate: "",
        reason: "",
        additionalNotes: "",
        emergencyContactName: "",
        emergencyContactMobile: "",
        emergencyContactRelationship: "",
        handoverNotes: ""
      });

      // Redirect to leave history or dashboard
      setTimeout(() => {
        router.push("/doctor/leaves");
      }, 1000);

    } catch (err: any) {
      console.error("Leave request error:", err);
      toast.error(err.message || "Failed to submit leave request", { duration: 5000 });
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-12 ">
      <PageHeader
        icon={<Calendar className="text-blue-500" />}
        title="Request Leave"
        subtitle="Submit a leave application for approval"
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Leave Details */}
        <Card title="Leave Details" icon={<FileText className="text-blue-500" />} padding="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-color)' }}>
                Leave Type <span className="text-red-500">*</span>
              </label>
              <select
                name="leaveType"
                value={formData.leaveType}
                onChange={handleChange}
                className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.leaveType ? 'border-red-500' : ''
                }`}
                style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-color)', borderColor: errors.leaveType ? 'var(--error-color)' : 'var(--border-color)' }}
              >
                <option value="">Select Leave Type</option>
                {LEAVE_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
              {errors.leaveType && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.leaveType}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-color)' }}>
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                min={new Date().toISOString().split('T')[0]}
                className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.startDate ? 'border-red-500' : ''
                }`}
                style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-color)', borderColor: errors.startDate ? 'var(--error-color)' : 'var(--border-color)' }}
              />
              {errors.startDate && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.startDate}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-color)' }}>
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                min={formData.startDate || new Date().toISOString().split('T')[0]}
                className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.endDate ? 'border-red-500' : ''
                }`}
                style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-color)', borderColor: errors.endDate ? 'var(--error-color)' : 'var(--border-color)' }}
              />
              {errors.endDate && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.endDate}
                </p>
              )}
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-color)' }}>
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              rows={3}
              placeholder="Please provide detailed reason for leave..."
              className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                errors.reason ? 'border-red-500' : ''
              }`}
              style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-color)', borderColor: errors.reason ? 'var(--error-color)' : 'var(--border-color)' }}
            />
            {errors.reason && (
              <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                <AlertCircle size={12} /> {errors.reason}
              </p>
            )}
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-color)' }}>
              Additional Notes
            </label>
            <textarea
              name="additionalNotes"
              value={formData.additionalNotes}
              onChange={handleChange}
              rows={2}
              placeholder="Any additional information..."
              className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
            />
          </div>
        </Card>

        {/* Emergency Contact */}
        <Card title="Emergency Contact" icon={<Phone className="text-red-500" />} padding="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-color)' }}>
                Contact Name
              </label>
              <input
                type="text"
                name="emergencyContactName"
                value={formData.emergencyContactName}
                onChange={handleChange}
                placeholder="Emergency contact name"
                className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-color)' }}>
                Contact Mobile
              </label>
              <input
                type="tel"
                name="emergencyContactMobile"
                value={formData.emergencyContactMobile}
                onChange={handleChange}
                placeholder="10-digit mobile"
                className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-color)' }}>
                Relationship
              </label>
              <input
                type="text"
                name="emergencyContactRelationship"
                value={formData.emergencyContactRelationship}
                onChange={handleChange}
                placeholder="e.g., Spouse, Parent"
                className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
              />
            </div>
          </div>
        </Card>

        {/* Work Handover */}
        <Card title="Work Handover" icon={<User className="text-green-500" />} padding="p-6">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-color)' }}>
              Handover Notes
            </label>
            <textarea
              name="handoverNotes"
              value={formData.handoverNotes}
              onChange={handleChange}
              rows={3}
              placeholder="Please provide details about work handover, patient assignments, or any important notes for colleagues covering your duties..."
              className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
            />
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push("/doctor/leaves")}
            disabled={loading}
            className="px-8"
          >
            View My Leaves
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            icon={<Send size={18} />}
            className="px-12 py-4 text-lg shadow-lg hover:shadow-xl"
          >
            Submit Leave Request
          </Button>
        </div>
      </form>
    </div>
  );
}

export default React.memo(DoctorLeaveRequest);
