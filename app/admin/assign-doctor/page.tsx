'use client';

import React, { useState, useEffect } from "react";
import { adminService } from "@/lib/integrations";
import { UserPlus, Building2, Stethoscope, Briefcase } from "lucide-react";
import toast from "react-hot-toast";
import {
  PageHeader,
  Card,
  FormInput,
  FormSelect,
  Button
} from "@/components/admin";
import type { Hospital, Doctor } from "@/lib/integrations";

function AssignDoctor() {
  const [formData, setFormData] = useState({
    hospitalId: "",
    doctorId: "",
    specialties: "",
    consultationFee: ""
  });

  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [hData, dData] = await Promise.all([
          adminService.getHospitalsClient(),
          adminService.getDoctorsClient()
        ]);
        setHospitals(hData);
        setDoctors(dData);
      } catch (err) {
        console.error("Failed to load dependency data", err);
      } finally {
        setFetchingData(false);
      }
    };
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await adminService.assignDoctorClient({
        hospitalId: formData.hospitalId,
        doctorProfileId: formData.doctorId,
        specialties: formData.specialties.split(",").map(s => s.trim()).filter(Boolean),
        consultationFee: Number(formData.consultationFee)
      });
      toast.success("Doctor successfully assigned to hospital!");
      setFormData({ hospitalId: "", doctorId: "", specialties: "", consultationFee: "" });
    } catch (err: any) {
      toast.error(err.message || "Failed to assign doctor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader
        title="Associate Healthcare Staff"
        subtitle="Assign doctors to hospitals with specific roles and fees"
        icon={<Briefcase className="text-indigo-500" />}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card title="Assignment Configuration" padding="p-8">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormSelect
                label="Select Hospital"
                value={formData.hospitalId}
                onChange={(e) => setFormData({ ...formData, hospitalId: e.target.value })}
                required
                options={[
                  { label: fetchingData ? "Loading..." : "Choose Hospital", value: "" },
                  ...hospitals.map(h => ({ label: h.name, value: h._id }))
                ]}
              />

              <FormSelect
                label="Select Doctor"
                value={formData.doctorId}
                onChange={(e) => setFormData({ ...formData, doctorId: e.target.value })}
                required
                options={[
                  { label: fetchingData ? "Loading..." : "Choose Doctor", value: "" },
                  ...doctors.map(d => ({ label: `${d.name} (${d.doctorId || 'No ID'})`, value: d.doctorId || d._id }))
                ]}
              />
            </div>

            <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 flex items-start gap-3">
              <Building2 className="text-blue-500 mt-0.5" size={18} />
              <div className="text-xs text-blue-400 leading-relaxed">
                Once assigned, the doctor will be able to manage appointments and records for this specific hospital location.
              </div>
            </div>

            <FormInput
              label="Role Specialties (Comma Separated)"
              placeholder="Cardiology, Emergency, OPD"
              value={formData.specialties}
              onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
              required
            />

            <FormInput
              label="Consultation Fee (₹)"
              type="number"
              placeholder="Eg. 500"
              value={formData.consultationFee}
              onChange={(e) => setFormData({ ...formData, consultationFee: e.target.value })}
              required
            />
          </div>
        </Card>

        <div className="flex justify-end pt-4">
          <Button
            type="submit"
            loading={loading}
            icon={<UserPlus size={18} />}
            className="w-full md:w-auto px-16 py-4"
          >
            Confirm Assignment
          </Button>
        </div>
      </form>
    </div>
  );
}

export default React.memo(AssignDoctor);
