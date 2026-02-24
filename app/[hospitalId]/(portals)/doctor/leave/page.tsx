"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
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
import { useCreateLeave } from "@/lib/integrations/hooks/useStaffQueries";

const LEAVE_TYPES = [
  { value: "casual", label: "Casual Leave" },
  { value: "sick", label: "Sick Leave" },
  { value: "annual", label: "Annual Leave" },
  { value: "emergency", label: "Emergency Leave" },
  { value: "other", label: "Other" }
];

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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error when user starts typing / selecting
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // ── Required core fields ──────────────────────────────────────
    if (!formData.leaveType) {
      newErrors.leaveType = "Please select a leave type";
    }
    if (!formData.startDate) {
      newErrors.startDate = "Please select a start date";
    }
    if (!formData.endDate) {
      newErrors.endDate = "Please select an end date";
    }

    // ── Reason validation ─────────────────────────────────────────
    const trimmedReason = formData.reason.trim();
    if (!trimmedReason) {
      newErrors.reason = "Please provide a reason for leave";
    } else if (trimmedReason.length < 10) {
      newErrors.reason = "Reason must be at least 10 characters";
    }

    // ── Date logic ────────────────────────────────────────────────
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (start < today) {
        newErrors.startDate = "Start date cannot be in the past";
      }
      if (start > end) {
        newErrors.endDate = "End date must be after start date";
      }
    }

    // ── Emergency contact cross-field validation ──────────────────
    // If any one field is filled, all three become required
    const hasAnyContactField =
      formData.emergencyContactName.trim() ||
      formData.emergencyContactMobile.trim() ||
      formData.emergencyContactRelationship.trim();

    if (hasAnyContactField) {
      if (!formData.emergencyContactName.trim()) {
        newErrors.emergencyContactName = "Contact name is required";
      }

      if (!formData.emergencyContactMobile.trim()) {
        newErrors.emergencyContactMobile = "Contact mobile is required";
      } else if (!/^\d{10}$/.test(formData.emergencyContactMobile.trim())) {
        newErrors.emergencyContactMobile = "Enter a valid 10-digit mobile number";
      }

      if (!formData.emergencyContactRelationship.trim()) {
        newErrors.emergencyContactRelationship = "Relationship is required";
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
        emergencyContact: formData.emergencyContactName.trim()
          ? {
              name: formData.emergencyContactName.trim(),
              mobile: formData.emergencyContactMobile.trim(),
              relationship: formData.emergencyContactRelationship.trim()
            }
          : undefined,
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
      setErrors({});

      // Redirect to leave history
      setTimeout(() => {
        router.push("/doctor/leaves");
      }, 1000);
    } catch (err: any) {
      console.error("Leave request error:", err);
      toast.error(err.message || "Failed to submit leave request", { duration: 5000 });
    }
  };

  const reasonLength = formData.reason.trim().length;

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <PageHeader
        icon={<Calendar className="text-blue-500" />}
        title="Request Leave"
        subtitle="Submit a leave application for approval"
      />

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {/* ── Leave Details ─────────────────────────────────────── */}
        <Card title="Leave Details" icon={<FileText className="text-blue-500" />} padding="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Leave Type */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--text-color)" }}
              >
                Leave Type <span className="text-red-500">*</span>
              </label>
              <select
                name="leaveType"
                value={formData.leaveType}
                onChange={handleChange}
                className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.leaveType ? "border-red-500" : ""
                }`}
                style={{
                  backgroundColor: "var(--card-bg)",
                  color: "var(--text-color)",
                  borderColor: errors.leaveType
                    ? "var(--error-color, #ef4444)"
                    : "var(--border-color)"
                }}
              >
                <option value="">Select Leave Type</option>
                {LEAVE_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              {errors.leaveType && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.leaveType}
                </p>
              )}
            </div>

            {/* Start Date */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--text-color)" }}
              >
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                min={new Date().toISOString().split("T")[0]}
                className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.startDate ? "border-red-500" : ""
                }`}
                style={{
                  backgroundColor: "var(--card-bg)",
                  color: "var(--text-color)",
                  borderColor: errors.startDate
                    ? "var(--error-color, #ef4444)"
                    : "var(--border-color)"
                }}
              />
              {errors.startDate && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.startDate}
                </p>
              )}
            </div>

            {/* End Date */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--text-color)" }}
              >
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                min={formData.startDate || new Date().toISOString().split("T")[0]}
                className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.endDate ? "border-red-500" : ""
                }`}
                style={{
                  backgroundColor: "var(--card-bg)",
                  color: "var(--text-color)",
                  borderColor: errors.endDate
                    ? "var(--error-color, #ef4444)"
                    : "var(--border-color)"
                }}
              />
              {errors.endDate && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.endDate}
                </p>
              )}
            </div>
          </div>

          {/* Reason */}
          <div className="mt-4">
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: "var(--text-color)" }}
            >
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              rows={3}
              placeholder="Please provide a detailed reason for leave (minimum 10 characters)..."
              className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                errors.reason ? "border-red-500" : ""
              }`}
              style={{
                backgroundColor: "var(--card-bg)",
                color: "var(--text-color)",
                borderColor: errors.reason
                  ? "var(--error-color, #ef4444)"
                  : "var(--border-color)"
              }}
            />
            {/* Character counter + error row */}
            <div className="flex items-center justify-between mt-1">
              {errors.reason ? (
                <p className="text-red-500 text-xs flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.reason}
                </p>
              ) : (
                <span />
              )}
              <span
                className={`text-xs font-medium ml-auto ${
                  reasonLength === 0
                    ? "text-gray-400"
                    : reasonLength < 10
                    ? "text-amber-500"
                    : "text-green-500"
                }`}
              >
                {reasonLength} / 10 min
              </span>
            </div>
          </div>

          {/* Additional Notes */}
          <div className="mt-4">
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: "var(--text-color)" }}
            >
              Additional Notes
            </label>
            <textarea
              name="additionalNotes"
              value={formData.additionalNotes}
              onChange={handleChange}
              rows={2}
              placeholder="Any additional information..."
              className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              style={{
                backgroundColor: "var(--card-bg)",
                color: "var(--text-color)",
                borderColor: "var(--border-color)"
              }}
            />
          </div>
        </Card>

        {/* ── Emergency Contact ─────────────────────────────────── */}
        <Card
          title="Emergency Contact"
          icon={<Phone className="text-red-500" />}
          padding="p-6"
        >
          <p className="text-xs text-gray-500 mb-4 italic">
            Optional — if any field below is filled, all three become required.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Contact Name */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--text-color)" }}
              >
                Contact Name
              </label>
              <input
                type="text"
                name="emergencyContactName"
                value={formData.emergencyContactName}
                onChange={handleChange}
                placeholder="Emergency contact name"
                className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.emergencyContactName ? "border-red-500" : ""
                }`}
                style={{
                  backgroundColor: "var(--card-bg)",
                  color: "var(--text-color)",
                  borderColor: errors.emergencyContactName
                    ? "var(--error-color, #ef4444)"
                    : "var(--border-color)"
                }}
              />
              {errors.emergencyContactName && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.emergencyContactName}
                </p>
              )}
            </div>

            {/* Contact Mobile */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--text-color)" }}
              >
                Contact Mobile
              </label>
              <input
                type="tel"
                name="emergencyContactMobile"
                value={formData.emergencyContactMobile}
                onChange={handleChange}
                placeholder="10-digit mobile number"
                maxLength={10}
                className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.emergencyContactMobile ? "border-red-500" : ""
                }`}
                style={{
                  backgroundColor: "var(--card-bg)",
                  color: "var(--text-color)",
                  borderColor: errors.emergencyContactMobile
                    ? "var(--error-color, #ef4444)"
                    : "var(--border-color)"
                }}
              />
              {errors.emergencyContactMobile && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.emergencyContactMobile}
                </p>
              )}
            </div>

            {/* Relationship */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--text-color)" }}
              >
                Relationship
              </label>
              <input
                type="text"
                name="emergencyContactRelationship"
                value={formData.emergencyContactRelationship}
                onChange={handleChange}
                placeholder="e.g., Spouse, Parent"
                className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.emergencyContactRelationship ? "border-red-500" : ""
                }`}
                style={{
                  backgroundColor: "var(--card-bg)",
                  color: "var(--text-color)",
                  borderColor: errors.emergencyContactRelationship
                    ? "var(--error-color, #ef4444)"
                    : "var(--border-color)"
                }}
              />
              {errors.emergencyContactRelationship && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.emergencyContactRelationship}
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* ── Work Handover ─────────────────────────────────────── */}
        <Card
          title="Work Handover"
          icon={<User className="text-green-500" />}
          padding="p-6"
        >
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: "var(--text-color)" }}
            >
              Handover Notes
            </label>
            <textarea
              name="handoverNotes"
              value={formData.handoverNotes}
              onChange={handleChange}
              rows={3}
              placeholder="Please provide details about work handover, patient assignments, or any important notes for colleagues covering your duties..."
              className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              style={{
                backgroundColor: "var(--card-bg)",
                color: "var(--text-color)",
                borderColor: "var(--border-color)"
              }}
            />
          </div>
        </Card>

        {/* ── Action Buttons ────────────────────────────────────── */}
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
