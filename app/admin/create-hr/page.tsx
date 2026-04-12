"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { adminService, createHRAction } from "@/lib/integrations";
import { Building2, UserPlus, Eye, EyeOff, Search, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import { PageHeader, Card, FormInput, Button } from "@/components/admin";
import type { Hospital } from "@/lib/integrations/types";

interface FormData {
  name: string;
  email: string;
  mobile: string;
  password: string;
  hospitalId: string;
}

function CreateHRPage() {
  const router = useRouter();

  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    mobile: "",
    password: "",
    hospitalId: ""
  });

  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [filteredHospitals, setFilteredHospitals] = useState<Hospital[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHospitals, setLoadingHospitals] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showHospitalDropdown, setShowHospitalDropdown] = useState(false);

  useEffect(() => {
    fetchHospitals();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.hospital-dropdown-container')) {
        setShowHospitalDropdown(false);
      }
    };

    if (showHospitalDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showHospitalDropdown]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = hospitals.filter(hospital =>
        hospital.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        hospital.hospitalId?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredHospitals(filtered);
    } else {
      setFilteredHospitals(hospitals);
    }
  }, [searchQuery, hospitals]);

  const fetchHospitals = async () => {
    try {
      setLoadingHospitals(true);
      const data = await adminService.getHospitalsClient();
      setHospitals(data || []);
      setFilteredHospitals(data || []);
    } catch (error: any) {
      toast.error("Failed to load hospitals");
    } finally {
      setLoadingHospitals(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleHospitalSelect = (hospital: Hospital) => {
    setFormData(prev => ({ ...prev, hospitalId: hospital._id }));
    setShowHospitalDropdown(false);
    setSearchQuery(hospital.name);
  };

  const selectedHospital = hospitals.find(h => h._id === formData.hospitalId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.hospitalId) {
      toast.error("Please select a target hospital.");
      return;
    }

    setLoading(true);
    try {
      const result = await createHRAction(formData);

      if (!result.success) {
        throw new Error(result.error);
      }

      toast.success(`HR account created for ${selectedHospital?.name}`);
      router.push("/admin/hr");
    } catch (err: any) {
      toast.error(err.message || "Operation failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <PageHeader
        icon={<ShieldCheck className="text-blue-500" />}
        title="Provision HR Specialist"
        subtitle="Assign a dedicated Human Resource officer to a hospital node"
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card title="Station Assignment" padding="p-6">
          <div className="relative hospital-dropdown-container">
            <label className="block text-sm font-bold mb-2 opacity-70 uppercase tracking-widest text-[10px]">
              Target Hospital
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery || selectedHospital?.name || ""}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowHospitalDropdown(true);
                }}
                onFocus={() => setShowHospitalDropdown(true)}
                placeholder="Search hospital network..."
                className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  backgroundColor: 'var(--card-bg)',
                  color: 'var(--text-color)',
                  borderColor: 'var(--border-color)'
                }}
                required
              />
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            </div>

            {showHospitalDropdown && filteredHospitals.length > 0 && (
              <div className="absolute z-10 w-full mt-2 rounded-xl shadow-2xl max-h-60 overflow-y-auto border"
                style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                {filteredHospitals.map((hospital) => (
                  <button
                    key={hospital._id}
                    type="button"
                    onClick={() => handleHospitalSelect(hospital)}
                    className="w-full text-left px-4 py-3 hover:bg-blue-50 dark:hover:bg-gray-800 border-b last:border-b-0"
                    style={{ borderColor: 'var(--border-color)' }}
                  >
                    <div className="font-bold text-sm" style={{ color: 'var(--text-color)' }}>{hospital.name}</div>
                    <div className="text-[10px] opacity-50 uppercase tracking-tighter mt-1">{hospital.hospitalId} • {hospital.city}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card title="Personnel Credentials" icon={<UserPlus className="text-blue-500" />} padding="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormInput
              label="Full Name"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. John Doe"
            />
            <FormInput
              label="Professional Email"
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="hr@hospital.com"
            />
            <FormInput
              label="Mobile Access"
              name="mobile"
              required
              value={formData.mobile}
              onChange={handleChange}
              placeholder="10-digit mobile"
            />
            <div className="relative">
              <FormInput
                label="System Password"
                type={showPassword ? "text" : "password"}
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-9 opacity-50 hover:opacity-100"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" loading={loading} className="px-12">Initialize HR Node</Button>
        </div>
      </form>
    </div>
  );
}

export default CreateHRPage;
