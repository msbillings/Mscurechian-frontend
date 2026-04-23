"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import QRCode from "react-qr-code";
import { useAuthStore } from "@/stores/authStore";
import { hospitalAdminService } from "@/lib/integrations/services/hospitalAdmin.service";
import {
  QrCode,
  Download,
  Printer,
  Copy,
  CheckCheck,
  Building2,
  Smartphone,
  Info,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function QRGeneratorPage() {
  const user = useAuthStore((s) => s.user) as any;
  const hospitalMongoId: string = user?.hospital || user?.hospitalId || "";

  const [hospital, setHospital] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [qrSize, setQrSize] = useState(260);
  const [fgColor, setFgColor] = useState("#0f172a");
  const [bgColor, setBgColor] = useState("#ffffff");

  const qrWrapperRef = useRef<HTMLDivElement>(null);
  const printFrameRef = useRef<HTMLDivElement>(null);

  // Deep link encoded in QR — uses the MongoDB _id of the hospital
  const deepLink = hospitalMongoId
    ? `mscurechain://book?hospitalId=${hospitalMongoId}`
    : "";

  // ── Fetch hospital info using existing service layer ─────────────────────
  useEffect(() => {
    hospitalAdminService
      .getHospital()
      .then((res: any) => {
        const h = res?.hospital || res;
        setHospital(h ?? null);
      })
      .catch((err: any) => {
        console.error("[QRGenerator] getHospital error:", err);
        setError("Could not load hospital details.");
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Copy deep link ────────────────────────────────────────────────────────
  const handleCopy = useCallback(() => {
    if (!deepLink) return;
    navigator.clipboard.writeText(deepLink).then(() => {
      setCopied(true);
      toast.success("Deep link copied to clipboard!");
      setTimeout(() => setCopied(false), 2500);
    });
  }, [deepLink]);

  // ── Download QR as PNG ────────────────────────────────────────────────────
  const handleDownload = useCallback(() => {
    const svg = qrWrapperRef.current?.querySelector("svg");
    if (!svg) return;

    const xml = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([xml], { type: "image/svg+xml" });
    const svgUrl = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      const pad = 48;
      const canvas = document.createElement("canvas");
      canvas.width = img.width + pad * 2;
      canvas.height = img.height + pad * 2;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, pad, pad);
      canvas.toBlob((pngBlob) => {
        if (!pngBlob) return;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(pngBlob);
        a.download = `${hospital?.name || "hospital"}-booking-qr.png`;
        a.click();
        toast.success("QR code downloaded!");
      });
      URL.revokeObjectURL(svgUrl);
    };
    img.src = svgUrl;
  }, [hospital, bgColor]);

  // ── Print QR Card ─────────────────────────────────────────────────────────
  const handlePrint = useCallback(() => {
    const content = printFrameRef.current?.innerHTML;
    if (!content) return;
    const win = window.open("", "_blank", "width=680,height=900");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html><html>
      <head>
        <title>QR – ${hospital?.name || "Hospital"}</title>
        <style>
          *{box-sizing:border-box;margin:0;padding:0}
          body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
            display:flex;align-items:center;justify-content:center;
            min-height:100vh;background:#f1f5f9;padding:24px}
          .card{background:#fff;border-radius:24px;padding:44px 40px;
            text-align:center;max-width:440px;width:100%;
            box-shadow:0 8px 48px rgba(0,0,0,.14);border:1px solid #e2e8f0}
          .badge{display:inline-block;background:#ecfdf5;color:#059669;
            border:1px solid #a7f3d0;padding:5px 14px;border-radius:999px;
            font-size:11px;font-weight:700;letter-spacing:.5px;
            text-transform:uppercase;margin-bottom:18px}
          .hospital-name{font-size:24px;font-weight:800;color:#0f172a;margin-bottom:6px}
          .hospital-addr{font-size:13px;color:#64748b;margin-bottom:28px;line-height:1.5}
          .qr-box{display:inline-block;padding:18px;border:2px solid #e2e8f0;
            border-radius:18px;margin-bottom:28px;background:#fff}
          .divider{height:1px;background:#e2e8f0;margin:24px 0}
          .cta-title{font-size:17px;font-weight:700;color:#0f172a;margin-bottom:8px}
          .cta-sub{font-size:13px;color:#64748b;line-height:1.6;margin-bottom:20px}
          .stores{display:flex;justify-content:center;gap:12px;margin-bottom:20px}
          .store{background:#0f172a;color:#fff;border-radius:10px;
            padding:9px 18px;font-size:12px;font-weight:600}
          .url{font-size:10px;color:#94a3b8;word-break:break-all;margin-top:4px}
          @media print{body{background:#fff}.card{box-shadow:none;border:none}}
        </style>
      </head>
      <body><div class="card">${content}</div></body></html>
    `);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 400);
  }, [hospital]);

  // ─── Color presets ────────────────────────────────────────────────────────
  const presets = [
    { fg: "#0f172a", bg: "#ffffff", label: "Classic" },
    { fg: "#059669", bg: "#f0fdf4", label: "Emerald" },
    { fg: "#1e40af", bg: "#eff6ff", label: "Ocean" },
    { fg: "#7c3aed", bg: "#faf5ff", label: "Royal" },
    { fg: "#be185d", bg: "#fdf2f8", label: "Rose" },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-72">
        <div className="h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!hospitalMongoId) {
    return (
      <div className="flex flex-col items-center justify-center h-72 gap-3 text-slate-500">
        <AlertCircle className="w-12 h-12 text-slate-300" />
        <p className="font-medium">No hospital linked to your account.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/40 p-4 md:p-8">

      {/* ── Header ── */}
      <div className="mb-8 flex items-start gap-4">
        <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
          <QrCode className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Hospital QR Code Generator</h1>
          <p className="text-sm text-slate-500 mt-1">
            Patients scan this QR to instantly open the booking screen for <strong>{hospital?.name || "your hospital"}</strong> in the MSCurechain app.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-sm px-4 py-3 rounded-xl">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error} Hospital ID is still embedded in the QR.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 max-w-6xl">

        {/* ── Left: Live QR Preview (3 cols) ── */}
        <div className="lg:col-span-3 bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">

          {/* Gradient header band */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-500 px-6 py-3.5 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-white/80" />
            <span className="text-white font-semibold text-sm tracking-wide">Live QR Preview</span>
          </div>

          <div className="p-8 flex flex-col items-center">

            {/* Hospital name badge */}
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <span className="font-bold text-slate-900 text-xl">
                {hospital?.name || "Your Hospital"}
              </span>
            </div>
            {(hospital?.city || hospital?.address) && (
              <p className="text-xs text-slate-400 mb-6 text-center">
                {[hospital?.city, hospital?.address].filter(Boolean).join(" · ")}
              </p>
            )}
            {!hospital?.city && !hospital?.address && <div className="mb-6" />}

            {/* QR Code — from react-qr-code npm package */}
            <div
              ref={qrWrapperRef}
              className="rounded-2xl p-4 border-2 border-slate-100 shadow-inner"
              style={{ background: bgColor }}
            >
              {deepLink ? (
                <QRCode
                  value={deepLink}
                  size={qrSize}
                  fgColor={fgColor}
                  bgColor={bgColor}
                  level="H"   /* High error correction for printed materials */
                />
              ) : (
                <div
                  className="flex items-center justify-center bg-slate-100 rounded-xl text-slate-400 text-sm"
                  style={{ width: qrSize, height: qrSize }}
                >
                  No hospital ID
                </div>
              )}
            </div>

            {/* Scan CTA badge */}
            <div className="mt-5 flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-emerald-100">
              <Smartphone className="w-3 h-3" />
              Scan to Book an Appointment
            </div>

            {/* Deep link display + copy */}
            <div className="mt-4 w-full bg-slate-50 rounded-xl px-4 py-3 border border-slate-100 flex items-center gap-2">
              <span className="text-xs text-slate-500 font-mono truncate flex-1 select-all">
                {deepLink}
              </span>
              <button
                onClick={handleCopy}
                title="Copy deep link"
                className="flex-shrink-0 p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
              >
                {copied
                  ? <CheckCheck className="w-4 h-4 text-emerald-600" />
                  : <Copy className="w-4 h-4 text-slate-400" />}
              </button>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 mt-6 w-full">
              <button
                onClick={handleDownload}
                className="flex-1 flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-700 text-white font-semibold py-3 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 text-sm"
              >
                <Download className="w-4 h-4" />
                Download PNG
              </button>
              <button
                onClick={handlePrint}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 text-sm"
              >
                <Printer className="w-4 h-4" />
                Print Card
              </button>
            </div>
          </div>

          {/* Hidden print template — rendered to DOM so innerHTML is accessible */}
          <div className="hidden">
            <div ref={printFrameRef}>
              <div className="badge">MSCurechain · Book Appointment</div>
              <div className="hospital-name">{hospital?.name || "Hospital"}</div>
              {hospital?.address && (
                <div className="hospital-addr">{hospital.address}</div>
              )}
              <div className="qr-box">
                <QRCode value={deepLink || " "} size={220} fgColor="#0f172a" bgColor="#ffffff" level="H" />
              </div>
              <div className="divider" />
              <div className="cta-title">📱 Scan to Book Your Appointment</div>
              <div className="cta-sub">
                Open your camera or the MSCurechain app, scan this QR code,
                and book an appointment instantly with doctors at this hospital.
              </div>
              <div className="stores">
                <div className="store">App Store</div>
                <div className="store">Google Play</div>
              </div>
              <div className="url">{deepLink}</div>
            </div>
          </div>
        </div>

        {/* ── Right: Controls + Info (2 cols) ── */}
        <div className="lg:col-span-2 flex flex-col gap-5">

          {/* Customise */}
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-6">
            <h2 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              Customise QR Code
            </h2>

            {/* Size slider */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-500 mb-2">
                QR Size — {qrSize}px
              </label>
              <input
                type="range" min={160} max={380} step={20} value={qrSize}
                onChange={(e) => setQrSize(Number(e.target.value))}
                className="w-full accent-emerald-600"
              />
            </div>

            {/* Color pickers */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2">QR Colour</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={fgColor}
                    onChange={(e) => setFgColor(e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-slate-200 p-0.5"
                  />
                  <span className="text-xs text-slate-400 font-mono">{fgColor}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2">Background</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-slate-200 p-0.5"
                  />
                  <span className="text-xs text-slate-400 font-mono">{bgColor}</span>
                </div>
              </div>
            </div>

            {/* Presets */}
            <label className="block text-xs font-semibold text-slate-500 mb-2">Presets</label>
            <div className="flex gap-2 flex-wrap">
              {presets.map((p) => (
                <button
                  key={p.label}
                  onClick={() => { setFgColor(p.fg); setBgColor(p.bg); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium hover:border-emerald-400 hover:bg-emerald-50 transition-colors"
                >
                  <span className="w-3 h-3 rounded-full border border-slate-300 flex-shrink-0" style={{ background: p.fg }} />
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Flow explanation */}
          <div className="bg-slate-900 rounded-3xl p-6 text-white">
            <h2 className="font-bold text-sm mb-4 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              Patient Flow (After Scan)
            </h2>
            <ol className="space-y-3">
              {[
                "Patient scans QR with phone camera",
                "MSCurechain app opens automatically",
                "Booking screen loads — filtered to this hospital only",
                "Patient picks doctor → selects time slot",
                "Pays via Razorpay → appointment confirmed ✅",
              ].map((text, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-5 h-5 bg-emerald-500/20 border border-emerald-500 rounded-full flex items-center justify-center text-emerald-400 text-[10px] font-bold">
                    {i + 1}
                  </span>
                  <span className="text-sm text-slate-300 leading-relaxed">{text}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Tech details */}
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
            <h3 className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Info className="w-3.5 h-3.5" />
              Technical Reference
            </h3>
            <div className="space-y-2">
              {[
                { label: "Deep Link", value: "mscurechain://book?hospitalId=…" },
                { label: "Hospital ID", value: hospitalMongoId || "—" },
                { label: "Error Correction", value: "Level H (30%)" },
                { label: "API Filter", value: "GET /api/doctors?hospitalId=…" },
                { label: "Package", value: "react-qr-code" },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-start gap-2">
                  <span className="text-xs font-semibold text-blue-700 flex-shrink-0">{label}</span>
                  <span className="text-xs text-blue-600 font-mono text-right break-all">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
