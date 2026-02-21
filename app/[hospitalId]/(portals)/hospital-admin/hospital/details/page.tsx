"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Building2,
  Save,
  MapPin,
  Phone,
  Mail,
  Globe,
  Calendar,
  Stethoscope,
  Activity,
  Bed,
  Shield,
  Eye,
  Edit3,
  Hash,
  Star,
  Clock,
  Truck,
  Layers,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { hospitalAdminService } from '@/lib/integrations/services/hospitalAdmin.service';
import { PageHeader, Card, Button, FormInput, FormTextarea } from '@/components/admin';
import { LogoManager } from '@/components/hospital-admin/LogoManager';
import { ipdService } from '@/lib/integrations/services/ipd.service';
import { useQuery } from '@tanstack/react-query';

const HospitalDetailsPage = () => {
  const [hospital, setHospital] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [formData, setFormData] = useState<any>({});

  const fetchHospitalData = useCallback(async () => {
    try {
      setLoading(true);
      console.log("[HospitalDetailsPage] Fetching data...");
      const [hRes, beds, meta, staffCounts] = await Promise.all([
        hospitalAdminService.getHospital(),
        ipdService.getBeds(),
        hospitalAdminService.getHospitalMetadata(),
        hospitalAdminService.getHospitalStaffCounts()
      ]);

      console.log("[HospitalDetailsPage] Data received:", { hRes, bedsLen: beds.length, metaRooms: meta.data.rooms?.length, staffCounts });

      const h = hRes.hospital;
      // Enrich hospital with live counts if missing or outdated
      const enrichedHospital = {
        ...h,
        numberOfBeds: beds.length || h.numberOfBeds || 0,
        availableBeds: beds.filter(b => b.status === "Vacant").length || 0,
        roomCount: meta.data.rooms?.length || h.roomCount || 0,
        departmentCount: meta.data.departments?.length || h.departmentCount || 0,
        // Use live staff count
        numberOfDoctors: staffCounts.total || h.numberOfDoctors || 0,
        medicalStaffCount: staffCounts.total || 0
      };

      console.log("[HospitalDetailsPage] Enriched Hospital:", enrichedHospital);

      setHospital(enrichedHospital);
      setFormData({
        name: enrichedHospital.name || '',
        address: enrichedHospital.address || '',
        phone: enrichedHospital.phone || '',
        email: enrichedHospital.email || '',
        pincode: enrichedHospital.pincode || '',
        website: enrichedHospital.website || '',
        establishedYear: enrichedHospital.establishedYear || '',
        rating: enrichedHospital.rating || '',
        operatingHours: enrichedHospital.operatingHours || '24/7',
        ambulanceAvailability: enrichedHospital.ambulanceAvailability || false,
        specialities: enrichedHospital.specialities?.join(', ') || '',
        services: enrichedHospital.services?.join(', ') || '',
      });
    } catch (error) {
      toast.error("Failed to synchronizing institutional parameters");
      console.error("[HospitalDetailsPage] Fetch error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHospitalData();
  }, [fetchHospitalData]);

  const handleSave = useCallback(async () => {
    try {
      setSaving(true);
      console.log("[HospitalDetailsPage] Saving form data:", formData);
      const payload = {
        ...formData,
        specialities: typeof formData.specialities === 'string' ? formData.specialities.split(',').map((s: string) => s.trim()).filter(Boolean) : formData.specialities,
        services: typeof formData.services === 'string' ? formData.services.split(',').map((s: string) => s.trim()).filter(Boolean) : formData.services,
        rating: Number(formData.rating) || 0,
        establishedYear: Number(formData.establishedYear) || 0
      };
      await hospitalAdminService.updateHospital(payload);
      toast.success("Institutional profile updated successfully");
      setMode('view');
      fetchHospitalData();
    } catch (error) {
      toast.error("Failed to update profile");
      console.error("[HospitalDetailsPage] Save error:", error);
    } finally {
      setSaving(false);
    }
  }, [formData, fetchHospitalData]);

  const handleLogoUpload = async (base64: string) => {
    try {
      console.log("[HospitalDetailsPage] Uploading logo...");
      // Convert base64 to blob
      const res = await fetch(base64);
      const blob = await res.blob();

      const formDataUpload = new FormData();
      formDataUpload.append('logo', blob, 'hospital-logo.png');

      console.log("[HospitalDetailsPage] Calling updateHospital with FormData");
      await hospitalAdminService.updateHospital(formDataUpload as any);
      toast.success("Logo updated successfully");
      fetchHospitalData();
    } catch (error) {
      toast.error("Failed to update logo");
      console.error(error);
    }
  };

  const occupancyRate = useMemo(() => {
    if (!hospital?.numberOfBeds) return 0;
    const available = hospital.availableBeds || 0;
    return Math.min(100, Math.round(((hospital.numberOfBeds - available) / hospital.numberOfBeds) * 100));
  }, [hospital]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin" />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Synchronizing Hospital Data...</p>
      </div>
    );
  }

  const isEdit = mode === 'edit';

  return (
    <div className="max-w-7xl mx-auto pb-12 px-4">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
        <PageHeader
          icon={<Building2 className="text-primary-theme" />}
          title="Facility Profile"
          subtitle="Manage institutional identification and operational parameters"
        />

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl relative w-44 h-11 border border-slate-200">
            <button
              onClick={() => setMode('view')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all z-10 ${mode === 'view' ? 'text-slate-900 bg-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Eye size={14} /> View
            </button>
            <button
              onClick={() => setMode('edit')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all z-10 ${mode === 'edit' ? 'text-slate-900 bg-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Edit3 size={14} /> Edit
            </button>
          </div>

          {isEdit && (
            <Button
              onClick={handleSave}
              loading={saving}
              variant="primary"
              className="bg-primary-theme hover:bg-primary-theme/80 h-11 px-6 rounded-xl shadow-lg shadow-primary-theme/10 flex items-center gap-2"
            >
              <Save size={16} />
              Save Changes
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Comprehensive Data Matrix */}
        <div className="lg:col-span-8 space-y-8">
          <Card padding="p-0 overflow-hidden">
            {/* Section: Core Identity */}
            <div className="p-8 border-b border-slate-100">
              <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8">
                <div className="flex items-center gap-4">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                      <Shield size={16} className="text-primary-theme" />
                    </div>
                    Institutional Identity
                  </h3>
                  {!isEdit && (
                    <button
                      onClick={() => setMode('edit')}
                      className="text-[9px] font-black text-primary-theme uppercase tracking-widest hover:underline"
                    >
                      ( Change Branding )
                    </button>
                  )}
                </div>

                <div className="w-full md:w-auto">
                  {isEdit ? (
                    <LogoManager
                      currentLogo={hospital?.logo}
                      onUpload={handleLogoUpload}
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-center overflow-hidden">
                      {hospital?.logo ? (
                        <img src={hospital.logo} alt="Logo" className="w-full h-full object-contain" />
                      ) : (
                        <Building2 size={24} className="text-slate-300" />
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
                <div className="md:col-span-2">
                  <FormInput
                    label="Official Hospital Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    readOnly={!isEdit}
                    placeholder="Enter hospital name"
                    className={!isEdit ? "bg-transparent border-none p-0 text-xl font-bold text-slate-900" : ""}
                  />
                </div>
                <div className="md:col-span-2">
                  <FormInput
                    label="Physical Address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    readOnly={!isEdit}
                    placeholder="Full street address"
                    className={!isEdit ? "bg-transparent border-none p-0 font-medium text-slate-600" : ""}
                  />
                </div>
                <div>
                  <FormInput
                    label="Pincode / Postal Code"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    readOnly={!isEdit}
                    placeholder="Enter pincode"
                    className={!isEdit ? "bg-transparent border-none p-0 font-bold text-slate-800" : ""}
                  />
                </div>
                <div>
                  <FormInput
                    label="Established Year"
                    value={formData.establishedYear}
                    onChange={(e) => setFormData({ ...formData, establishedYear: e.target.value })}
                    readOnly={!isEdit}
                    type="number"
                    className={!isEdit ? "bg-transparent border-none p-0 font-bold text-slate-800" : ""}
                  />
                </div>
              </div>
            </div>

            {/* Section: Connectivity */}
            <div className="p-8 border-b border-slate-100 bg-slate-50/30">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 mb-8">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Phone size={16} className="text-blue-600" />
                </div>
                Communication Nodes
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormInput
                  label="Contact Number"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  readOnly={!isEdit}
                  icon={<Phone size={14} className="text-slate-400" />}
                  className={!isEdit ? "bg-transparent border-none p-0 font-bold text-slate-800" : ""}
                />
                <FormInput
                  label="Official Email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  readOnly={!isEdit}
                  icon={<Mail size={14} className="text-slate-400" />}
                  className={!isEdit ? "bg-transparent border-none p-0 font-bold text-slate-800" : ""}
                />
                <FormInput
                  label="Institutional Website"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  readOnly={!isEdit}
                  icon={<Globe size={14} className="text-slate-400" />}
                  className={!isEdit ? "bg-transparent border-none p-0 font-bold text-emerald-600" : "lowercase"}
                />
                <FormInput
                  label="Quality Rating (Scale 1-5)"
                  value={formData.rating}
                  onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                  readOnly={!isEdit}
                  type="number"
                  step="0.1"
                  icon={<Star size={14} className="text-amber-500 fill-amber-500" />}
                  className={!isEdit ? "bg-transparent border-none p-0 font-bold text-slate-800" : ""}
                />
              </div>
            </div>

            {/* Section: Clinical Capability */}
            <div className="p-8">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 mb-8">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <Stethoscope size={16} className="text-emerald-600" />
                </div>
                Clinical Expertise
              </h3>

              <div className="space-y-8">
                <FormTextarea
                  label="Medical Specializations"
                  value={formData.specialities}
                  onChange={(e) => setFormData({ ...formData, specialities: e.target.value })}
                  readOnly={!isEdit}
                  rows={3}
                  placeholder="Comma separated list (e.g. Cardiology, Neurology)"
                  className={!isEdit ? "bg-transparent border-none p-0 font-medium text-slate-600" : "uppercase text-[11px]"}
                />
                <FormTextarea
                  label="Support Services Provided"
                  value={formData.services}
                  onChange={(e) => setFormData({ ...formData, services: e.target.value })}
                  readOnly={!isEdit}
                  rows={3}
                  placeholder="Comma separated list (e.g. 24/7 Pharmacy, Lab, Radiology)"
                  className={!isEdit ? "bg-transparent border-none p-0 font-medium text-slate-600 " : "uppercase text-[11px]"}
                />
              </div>
            </div>
          </Card>

          {/* Section: Operational Settings */}
          <Card className="border-l-4 border-l-emerald-500">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600">
                  <Clock size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Operating Schedule</p>
                  <div className="mt-1 flex items-center gap-3">
                    <FormInput
                      value={formData.operatingHours}
                      onChange={(e) => setFormData({ ...formData, operatingHours: e.target.value })}
                      readOnly={!isEdit}
                      className={`min-w-[120px] ${!isEdit ? "bg-transparent border-none p-0 text-lg font-bold text-slate-900" : "h-9"}`}
                    />
                  </div>
                </div>
              </div>

              <div className="h-12 w-px bg-slate-100 hidden md:block" />

              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${formData.ambulanceAvailability ? 'bg-primary-theme/10 text-primary-theme' : 'bg-slate-100 text-slate-400'}`}>
                  <Truck size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Emergency Logistics</p>
                  <div className="mt-1 flex items-center gap-4">
                    <p className={`font-bold text-sm ${formData.ambulanceAvailability ? 'text-primary-theme' : 'text-slate-500'}`}>
                      {formData.ambulanceAvailability ? 'Fleet Active' : 'Fleet Inactive'}
                    </p>
                    {isEdit && (
                      <button
                        onClick={() => setFormData({ ...formData, ambulanceAvailability: !formData.ambulanceAvailability })}
                        className={`relative w-10 h-5 rounded-full transition-all duration-300 ${formData.ambulanceAvailability ? 'bg-primary-theme' : 'bg-slate-300'}`}
                      >
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${formData.ambulanceAvailability ? 'left-5.5' : 'left-0.5'}`} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Asset Metrics */}
        <div className="lg:col-span-4 space-y-8">
          {/* Bed Occupancy Card */}
          <div className="bg-slate-900 rounded-[32px] p-8 text-white relative overflow-hidden group shadow-xl">
            <div className="absolute -right-4 -top-4 p-8 opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-700">
              <Bed size={120} />
            </div>

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-8">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Capacity Metrics</span>
                <div className="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-bold text-emerald-400">REALTIME</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
                <div className="space-y-1">
                  <p className="text-5xl sm:text-6xl font-black">{hospital.numberOfBeds || 0}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Inpatient Bed Matrix</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                    <span className="text-slate-400">Occupancy Status</span>
                    <span className="text-emerald-400">{occupancyRate}%</span>
                  </div>
                  <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-1000 ease-out"
                      style={{ width: `${occupancyRate}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[9px] font-bold text-emerald-400/80 uppercase tracking-wider">
                      {hospital.availableBeds || 0} Nodes Available
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Activity size={14} className="text-rose-500" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ICU Core</span>
              </div>
              <p className="text-2xl font-black text-slate-900">{hospital.ICUBeds || 0}</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Layers size={14} className="text-purple-500" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Room Nodes</span>
              </div>
              <p className="text-2xl font-black text-slate-900">{hospital.roomCount || 0}</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Shield size={14} className="text-amber-500" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Divisions</span>
              </div>
              <p className="text-2xl font-black text-slate-900">{hospital.departmentCount || 0}</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Stethoscope size={14} className="text-emerald-500" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Medical Staff</span>
              </div>
              <p className="text-2xl font-black text-slate-900">{hospital.medicalStaffCount || hospital.numberOfDoctors || 0}</p>
            </div>
          </div>

          {/* Institutional Status Card */}
          <div className="bg-primary-theme rounded-3xl p-8 text-white relative overflow-hidden shadow-xl shadow-emerald-900/10">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
              <Shield size={64} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-4 opacity-70">Regulatory Registry</p>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-100 uppercase tracking-wider">Auth Status</span>
                <span className="text-[10px] font-black bg-white/20 px-2 py-0.5 rounded uppercase backdrop-blur-md">
                  {hospital.status || 'Active'}
                </span>
              </div>
              <div className="h-px bg-white/10" />
              <div>
                <span className="text-[10px] font-bold text-emerald-100 uppercase tracking-wider block mb-1">Registration Identifier</span>
                <span className="text-[10px] font-black font-mono tracking-tighter break-all opacity-80">{hospital._id}</span>
              </div>
            </div>

            <button
              onClick={fetchHospitalData}
              className="mt-6 w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 backdrop-blur-sm border border-white/10"
            >
              <RefreshCw size={14} /> Refresh Node Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HospitalDetailsPage;
