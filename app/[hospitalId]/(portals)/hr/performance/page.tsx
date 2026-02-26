"use client";

import { useState, useMemo, useEffect } from "react";
import {
  usePerformanceDashboardV2,
  usePerformanceDoctors,
  usePerformanceNurses,
  usePerformanceStaff,
  useEmployeeTrends,
} from "@/lib/integrations/hooks/useHRQueries";
import {
  Award,
  Users,
  Activity,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Star,
  Stethoscope,
  Heart,
  Briefcase,
  ChevronRight,
  Calendar,
  BarChart3,
  Target,
  UserCheck,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  X,
  ChevronDown,
} from "lucide-react";
import type { PerformanceEmployee } from "@/lib/integrations/services/performance.service";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

function scoreColor(score: number) {
  if (score >= 4) return "#22c55e";
  if (score >= 3) return "#eab308";
  if (score >= 2) return "#f97316";
  return "#ef4444";
}

function scoreLabel(score: number) {
  if (score >= 4) return "Excellent";
  if (score >= 3) return "Good";
  if (score >= 2) return "Needs Work";
  return "Critical";
}

function roleIcon(role: string) {
  if (role === "doctor") return <Stethoscope size={14} className="perf-role-icon" />;
  if (role === "nurse") return <Heart size={14} className="perf-role-icon" />;
  return <Briefcase size={14} className="perf-role-icon" />;
}

function roleColor(role: string) {
  if (role === "doctor") return "#6366f1";   // indigo
  if (role === "nurse") return "#ec4899";    // pink
  return "#10b981";                          // emerald
}

function Avatar({ name, image, size = 36 }: { name: string; image?: string; size?: number }) {
  if (image) {
    return <img src={image} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }} />;
  }
  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "linear-gradient(135deg,#6366f1,#a21caf)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.35, fontWeight: 700, color: "#fff", flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

function ScoreRing({ score, size = 52 }: { score: number; size?: number }) {
  const max = 5;
  const pct = Math.min(1, score / max);
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;
  const color = scoreColor(score);
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={5} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.6s ease" }} />
      <text x="50%" y="54%" textAnchor="middle" dominantBaseline="middle"
        style={{ transform: "rotate(90deg) translate(0,0)", transformOrigin: "center", fill: color, fontSize: size * 0.24, fontWeight: 700 }}>
      </text>
    </svg>
  );
}

// ─── Trend Badge ─────────────────────────────────────────────────────────────
function TrendBadge({ value }: { value: number | null }) {
  if (value === null) return null;
  if (value > 0) return <span className="perf-trend-up"><ArrowUpRight size={11} /> +{value}%</span>;
  if (value < 0) return <span className="perf-trend-down"><ArrowDownRight size={11} /> {value}%</span>;
  return <span className="perf-trend-neutral"><Minus size={11} /> 0%</span>;
}

// ─── Risk Badges ─────────────────────────────────────────────────────────────
function RiskBadges({ flags }: { flags: string[] }) {
  if (!flags || flags.length === 0) return null;
  return (
    <div className="perf-risk-row">
      {flags.includes("low_attendance") && (
        <span className="perf-risk-badge orange"><AlertTriangle size={10} /> Attendance</span>
      )}
      {flags.includes("low_rating") && (
        <span className="perf-risk-badge red"><Star size={10} /> Low Rating</span>
      )}
      {flags.includes("burnout_risk") && (
        <span className="perf-risk-badge purple"><ShieldAlert size={10} /> Burnout</span>
      )}
    </div>
  );
}

// ─── Employee Row ─────────────────────────────────────────────────────────────
function EmployeeRow({
  emp,
  onSelect,
  selected,
}: {
  emp: PerformanceEmployee;
  onSelect: (id: string) => void;
  selected: boolean;
}) {
  return (
    <div
      className={`perf-emp-row ${selected ? "perf-emp-row-active" : ""}`}
      onClick={() => onSelect(emp._id)}
    >
      <div className="perf-emp-rank">#{emp.rank ?? "—"}</div>
      <Avatar name={emp.name} image={emp.image} size={34} />
      <div className="perf-emp-info">
        <span className="perf-emp-name">{emp.name}</span>
        <div className="perf-emp-meta">
          <span className="perf-emp-role" style={{ color: roleColor(emp.role) }}>
            {roleIcon(emp.role)} {emp.role}
          </span>
          {emp.employeeId && <span className="perf-emp-id">#{emp.employeeId}</span>}
        </div>
      </div>
      <div className="perf-emp-att">
        <span className="perf-att-pct">{emp.attendance.rate}%</span>
        <span className="perf-att-label">Attend.</span>
      </div>
      <div className="perf-emp-score-col">
        <span className="perf-score-val" style={{ color: scoreColor(emp.compositeScore) }}>
          {emp.compositeScore.toFixed(1)}
        </span>
        <span className="perf-score-label" style={{ color: scoreColor(emp.compositeScore) }}>
          {scoreLabel(emp.compositeScore)}
        </span>
      </div>
      <div className="perf-emp-trend">
        <TrendBadge value={emp.improvementVsPrevMonth} />
      </div>
      <div className="perf-emp-flags">
        <RiskBadges flags={emp.riskFlags} />
      </div>
      <ChevronRight size={14} className="perf-emp-chevron" />
    </div>
  );
}

// ─── Trend Mini-Chart ─────────────────────────────────────────────────────────
function TrendChart({ trends }: { trends: any[] }) {
  if (!trends || trends.length === 0) {
    return <div className="perf-trend-empty">No trend data available yet.</div>;
  }
  const scores = trends.map((t) => t.compositeScore);
  const maxScore = Math.max(...scores, 5);
  const minScore = 0;
  const range = maxScore - minScore || 1;
  const W = 340, H = 90, LABEL_H = 18; // extra space below for month labels
  const TOTAL_H = H + LABEL_H;
  const step = (W - 40) / (trends.length - 1 || 1);
  const points = trends.map((t, i) => ({
    x: 20 + i * step,
    y: H - 10 - ((t.compositeScore - minScore) / range) * (H - 20),
  }));
  const poly = points.map((p) => `${p.x},${p.y}`).join(" ");
  const area = `M${points[0].x},${H} L${poly.split(" ").map((pt, i) => points[i] ? `${points[i].x},${points[i].y}` : pt).join(" L")} L${points[points.length - 1].x},${H} Z`;

  return (
    <div className="perf-trend-chart-wrap">
      <svg width="100%" viewBox={`0 0 ${W} ${TOTAL_H}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#trendGrad)" />
        <polyline points={poly} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={4} fill="#6366f1" />
            {/* label sits BELOW the chart area, inside the extended viewBox */}
            <text x={p.x} y={H + 12} textAnchor="middle" fontSize="8" fill="#94a3b8">
              {trends[i]?.label?.split(" ")?.[0] ?? ""}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ─── Employee Detail Panel ────────────────────────────────────────────────────
function EmployeePanel({
  emp,
  onClose,
}: {
  emp: PerformanceEmployee;
  onClose: () => void;
}) {
  const { data: trendData, isLoading: trendLoading } = useEmployeeTrends(emp._id);
  const trends = trendData?.data?.trends ?? [];

  const rm = emp.roleMetrics;

  return (
    <div className="perf-detail-panel">
      <button className="perf-panel-close" onClick={onClose}><X size={16} /></button>
      <div className="perf-panel-header">
        <Avatar name={emp.name} image={emp.image} size={52} />
        <div>
          <div className="perf-panel-name">{emp.name}</div>
          <div className="perf-panel-meta">
            <span style={{ color: roleColor(emp.role) }}>{roleIcon(emp.role)} {emp.role}</span>
            {emp.specialization && <span className="perf-panel-spec">· {emp.specialization}</span>}
            {emp.employeeId && <span className="perf-panel-id">#{emp.employeeId}</span>}
          </div>
          <div className="perf-panel-period">Period: {emp.period}</div>
        </div>
      </div>

      {/* Score overview */}
      <div className="perf-panel-scores">
        <div className="perf-panel-score-item">
          <ScoreRing score={emp.compositeScore} size={52} />
          <div className="perf-panel-score-info">
            <span className="perf-panel-score-num" style={{ color: scoreColor(emp.compositeScore) }}>
              {emp.compositeScore.toFixed(2)} / 5.00
            </span>
            <span className="perf-panel-score-sub">Composite Score</span>
            <span className="perf-panel-score-badge" style={{ color: scoreColor(emp.compositeScore) }}>
              {scoreLabel(emp.compositeScore)}
            </span>
          </div>
        </div>
        <div className="perf-panel-divider" />
        <div className="perf-panel-score-item">
          <div style={{ fontSize: 28, fontWeight: 700, color: emp.attendance.rate >= 70 ? "#22c55e" : "#ef4444" }}>
            {emp.attendance.rate}%
          </div>
          <div className="perf-panel-score-info">
            <span className="perf-panel-score-sub">Attendance Rate</span>
            <span className="perf-panel-score-sub" style={{ opacity: 0.6 }}>
              {emp.attendance.presentDays}/{emp.attendance.totalDays} days
            </span>
          </div>
        </div>
        {emp.improvementVsPrevMonth !== null && (
          <>
            <div className="perf-panel-divider" />
            <div className="perf-panel-score-item">
              <TrendBadge value={emp.improvementVsPrevMonth} />
              <span className="perf-panel-score-sub">vs Last Month</span>
            </div>
          </>
        )}
      </div>

      <RiskBadges flags={emp.riskFlags} />

      {/* Role KPIs */}
      <div className="perf-panel-section-title">Role KPIs</div>
      <div className="perf-panel-kpis">
        {emp.role === "doctor" && (
          <>
            <KpiItem label="Appointments" value={rm.totalAppointments ?? 0} />
            <KpiItem label="Completed" value={rm.completedAppointments ?? 0} />
            <KpiItem label="Prescriptions" value={rm.totalPrescriptions ?? 0} />
            <KpiItem label="Avg Rating" value={`${(rm.avgPatientRating ?? 0).toFixed(1)} ★`} />
            <KpiItem label="Feedback" value={rm.feedbackCount ?? 0} />
            {rm.followUpRatio !== undefined && (
              <KpiItem label="Follow-up Ratio" value={`${(rm.followUpRatio * 100).toFixed(0)}%`} />
            )}
          </>
        )}
        {emp.role === "nurse" && (
          <>
            <KpiItem label="Total Tasks" value={rm.totalTasks ?? 0} />
            <KpiItem label="Completed" value={rm.completedTasks ?? 0} />
            <KpiItem label="Task Rate" value={`${rm.taskCompletionRate ?? 0}%`} />
            <KpiItem label="Med Tasks" value={rm.medicationTasks ?? 0} />
            <KpiItem label="Med Accuracy" value={`${rm.medicationAccuracy ?? 0}%`} />
          </>
        )}
        {emp.role === "staff" && (
          <>
            <KpiItem label="Daily Throughput" value={rm.dailyThroughput ?? 0} />
          </>
        )}
      </div>

      {/* 6-month trend */}
      <div className="perf-panel-section-title">6-Month Performance Trend</div>
      {trendLoading ? (
        <div className="perf-trend-loading">Loading trends…</div>
      ) : (
        <TrendChart trends={trends} />
      )}
    </div>
  );
}

function KpiItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="perf-kpi-item">
      <span className="perf-kpi-val">{value}</span>
      <span className="perf-kpi-label">{label}</span>
    </div>
  );
}

// ─── Quarter-circle stat card ─────────────────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="perf-stat-card">
      <div className="perf-stat-icon" style={{ background: `${color}18`, color }}>
        <Icon size={16} />
      </div>
      <div className="perf-stat-body">
        <div className="perf-stat-value">{value}</div>
        <div className="perf-stat-label">{label}</div>
        {sub && <div className="perf-stat-sub">{sub}</div>}
      </div>
    </div>
  );
}

// ─── Top Performer Card ───────────────────────────────────────────────────────
function TopPerformerCard({
  emp,
  position,
  onSelect,
}: {
  emp: PerformanceEmployee;
  position: number;
  onSelect: (id: string) => void;
}) {
  const medals = ["🥇", "🥈", "🥉"];
  return (
    <div
      className={`perf-top-card ${position === 0 ? "perf-top-card-gold" : ""}`}
      onClick={() => onSelect(emp._id)}
    >
      <div className="perf-top-medal">{medals[position] ?? `#${position + 1}`}</div>
      <Avatar name={emp.name} image={emp.image} size={42} />
      <div className="perf-top-info">
        <div className="perf-top-name">{emp.name}</div>
        <div style={{ color: roleColor(emp.role), fontSize: 11, display: "flex", alignItems: "center", gap: 3 }}>
          {roleIcon(emp.role)} {emp.specialization ?? emp.role}
        </div>
      </div>
      <div className="perf-top-score" style={{ color: scoreColor(emp.compositeScore) }}>
        {emp.compositeScore.toFixed(1)}
        <span style={{ fontSize: 10, opacity: 0.7 }}>/5</span>
      </div>
    </div>
  );
}

// ─── Department Summary Bar ───────────────────────────────────────────────────
function DeptBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="perf-dept-bar-row">
      <span className="perf-dept-bar-label">{label}</span>
      <div className="perf-dept-bar-track">
        <div className="perf-dept-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="perf-dept-bar-val">{value}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function PerformanceAnalyticsPage() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState<"overview" | "doctors" | "nurses" | "staff">("overview");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);

  // Debounce search: immediate clear when empty, 300ms delay when typing
  useEffect(() => {
    if (!search.trim()) {
      setDebouncedSearch("");
      return;
    }
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);


  const params = { month: selectedMonth, year: selectedYear };

  const { data: dashboard, isLoading: dashLoading } = usePerformanceDashboardV2(params);
  const { data: doctorData, isLoading: doctorLoading } = usePerformanceDoctors(
    activeTab === "doctors" ? params : undefined,
  );
  const { data: nurseData, isLoading: nurseLoading } = usePerformanceNurses(
    activeTab === "nurses" ? params : undefined,
  );
  const { data: staffData, isLoading: staffLoading } = usePerformanceStaff(
    activeTab === "staff" ? params : undefined,
  );

  const dash = dashboard?.data;
  const stats = dash?.stats;

  // Active role employees list
  const activeEmployees = useMemo(() => {
    let list: PerformanceEmployee[] = [];
    if (activeTab === "overview") list = dash?.employees ?? [];
    else if (activeTab === "doctors") list = doctorData?.data?.employees ?? [];
    else if (activeTab === "nurses") list = nurseData?.data?.employees ?? [];
    else if (activeTab === "staff") list = staffData?.data?.employees ?? [];

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.employeeId?.toLowerCase().includes(q) ||
          (e.specialization?.toLowerCase().includes(q) ?? false),
      );
    }
    return list;
  }, [activeTab, dash, doctorData, nurseData, staffData, debouncedSearch]);


  const selectedEmp = useMemo(
    () => activeEmployees.find((e) => e._id === selectedEmpId) ?? null,
    [activeEmployees, selectedEmpId],
  );

  const isLoading = dashLoading || (activeTab === "doctors" && doctorLoading) ||
    (activeTab === "nurses" && nurseLoading) || (activeTab === "staff" && staffLoading);

  return (
    <div className="perf-root">
      <style>{`
        /* ─── CSS Variables (Light Mode) ────────────────────────────── */
        .perf-root {
          --bg: #f1f5f9;
          --surface: #ffffff;
          --surface2: #f8fafc;
          --border: #e2e8f0;
          --text: #1e293b;
          --muted: #64748b;
          --primary: #6366f1;
          --primary-light: rgba(99,102,241,0.08);
          font-family: 'Inter', 'Segoe UI', sans-serif;
          background: var(--bg);
          min-height: 100vh;
          color: var(--text);
          font-size: 13px;
        }

        /* ─── Layout ─────────────────────────────────────────────── */
        .perf-layout { display: flex; gap: 0; min-height: 100vh; }
        .perf-main { flex: 1; overflow-y: auto; padding: 20px 24px 40px; max-width: calc(100% - 360px); }
        .perf-main.full-width { max-width: 100%; }

        /* ─── Header ─────────────────────────────────────────────── */
        .perf-header { margin-bottom: 20px; }
        .perf-header-top { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
        .perf-title { font-size: 20px; font-weight: 700; background: linear-gradient(90deg,#6366f1,#a855f7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .perf-subtitle { font-size: 12px; color: var(--muted); margin-top: 2px; }
        .perf-filters { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
        .perf-select {
          background: var(--surface); border: 1px solid var(--border); border-radius: 8px;
          color: var(--text); padding: 6px 24px 6px 10px; font-size: 12px; cursor: pointer; outline: none;
          appearance: none; box-shadow: 0 1px 2px rgba(0,0,0,0.04);
        }
        .perf-select:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }

        /* ─── Stats Cards ─────────────────────────────────────────── */
        .perf-stats-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 8px; margin-bottom: 20px; overflow-x: auto; }
        .perf-stat-card {
          background: var(--surface); border: 1px solid var(--border); border-radius: 10px;
          padding: 10px 8px; display: flex; align-items: center; gap: 8px;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05); min-width: 0;
        }
        .perf-stat-card:hover { border-color: #a5b4fc; box-shadow: 0 4px 12px rgba(99,102,241,0.1); }
        .perf-stat-icon { width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .perf-stat-body { min-width: 0; overflow: hidden; }
        .perf-stat-value { font-size: 15px; font-weight: 700; line-height: 1; color: var(--text); white-space: nowrap; }
        .perf-stat-label { font-size: 9px; color: var(--muted); margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .perf-stat-sub { font-size: 9px; color: #94a3b8; white-space: nowrap; }

        /* ─── Tabs ───────────────────────────────────────────────── */
        .perf-tabs { display: flex; gap: 4px; margin-bottom: 16px; background: var(--surface); border-radius: 10px; padding: 4px; border: 1px solid var(--border); width: fit-content; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .perf-tab {
          padding: 6px 16px; border-radius: 7px; font-size: 12px; font-weight: 500; cursor: pointer; border: none;
          background: transparent; color: var(--muted); transition: all 0.2s; display: flex; align-items: center; gap: 5px;
        }
        .perf-tab:hover { color: var(--text); background: var(--bg); }
        .perf-tab.active { background: var(--primary); color: #fff; box-shadow: 0 2px 6px rgba(99,102,241,0.3); }

        /* ─── Controls Row ───────────────────────────────────────── */
        .perf-controls { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
        .perf-search {
          flex: 1; min-width: 180px; max-width: 260px;
          background: var(--surface); border: 1px solid var(--border); border-radius: 8px;
          color: var(--text); padding: 7px 12px; font-size: 12px; outline: none;
          box-shadow: 0 1px 2px rgba(0,0,0,0.04);
        }
        .perf-search:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
        .perf-search::placeholder { color: #94a3b8; }
        .perf-count { font-size: 11px; color: var(--muted); margin-left: auto; }

        /* ─── Employee List ───────────────────────────────────────── */
        .perf-emp-list { display: flex; flex-direction: column; gap: 4px; }
        .perf-emp-row {
          background: var(--surface); border: 1px solid var(--border); border-radius: 10px;
          padding: 10px 14px; display: flex; align-items: center; gap: 10px; cursor: pointer;
          transition: all 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.04);
        }
        .perf-emp-row:hover { border-color: #a5b4fc; background: #fafbff; box-shadow: 0 2px 8px rgba(99,102,241,0.08); }
        .perf-emp-row.perf-emp-row-active { border-color: var(--primary); background: var(--primary-light); }
        .perf-emp-rank { width: 28px; font-size: 11px; font-weight: 700; color: #94a3b8; text-align: center; flex-shrink: 0; }
        .perf-emp-info { flex: 1; min-width: 0; }
        .perf-emp-name { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; color: var(--text); }
        .perf-emp-meta { display: flex; align-items: center; gap: 8px; margin-top: 1px; }
        .perf-emp-role { font-size: 10px; display: flex; align-items: center; gap: 3px; }
        .perf-emp-id { font-size: 10px; color: #94a3b8; }
        .perf-role-icon { flex-shrink: 0; }
        .perf-emp-att { text-align: right; flex-shrink: 0; width: 48px; }
        .perf-att-pct { font-size: 13px; font-weight: 700; display: block; color: var(--text); }
        .perf-att-label { font-size: 9px; color: var(--muted); }
        .perf-emp-score-col { flex-shrink: 0; width: 64px; text-align: center; }
        .perf-score-val { font-size: 15px; font-weight: 700; display: block; }
        .perf-score-label { font-size: 9px; display: block; }
        .perf-emp-trend { flex-shrink: 0; width: 60px; text-align: center; }
        .perf-emp-flags { flex-shrink: 0; min-width: 60px; }
        .perf-emp-chevron { color: #cbd5e1; flex-shrink: 0; }

        /* ─── Risk badges ────────────────────────────────────────── */
        .perf-risk-row { display: flex; flex-wrap: wrap; gap: 4px; }
        .perf-risk-badge {
          font-size: 9px; padding: 2px 6px; border-radius: 4px; font-weight: 600;
          display: flex; align-items: center; gap: 3px;
        }
        .perf-risk-badge.orange { background: #fff7ed; color: #ea580c; border: 1px solid #fed7aa; }
        .perf-risk-badge.red { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
        .perf-risk-badge.purple { background: #faf5ff; color: #9333ea; border: 1px solid #e9d5ff; }

        /* ─── Trend badges ───────────────────────────────────────── */
        .perf-trend-up, .perf-trend-down, .perf-trend-neutral {
          font-size: 10px; font-weight: 600; display: flex; align-items: center; gap: 2px;
          padding: 2px 6px; border-radius: 4px;
        }
        .perf-trend-up { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
        .perf-trend-down { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
        .perf-trend-neutral { background: #f8fafc; color: #64748b; border: 1px solid #e2e8f0; }

        /* ─── Top performers ─────────────────────────────────────── */
        .perf-top-section { margin-bottom: 20px; }
        .perf-top-section-title { font-size: 12px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 8px; display: flex; align-items: center; gap: 5px; }
        .perf-top-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 8px; }
        .perf-top-card {
          background: var(--surface); border: 1px solid var(--border); border-radius: 10px;
          padding: 10px 12px; display: flex; align-items: center; gap: 10px; cursor: pointer;
          transition: all 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .perf-top-card:hover { border-color: #a5b4fc; box-shadow: 0 4px 12px rgba(99,102,241,0.1); }
        .perf-top-card-gold { border-color: #fcd34d; background: #fffbeb; }
        .perf-top-medal { font-size: 18px; flex-shrink: 0; }
        .perf-top-info { flex: 1; min-width: 0; }
        .perf-top-name { font-size: 12px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text); }
        .perf-top-score { font-size: 17px; font-weight: 700; flex-shrink: 0; text-align: right; }

        /* ─── Dept bars ──────────────────────────────────────────── */
        .perf-dept-bars { display: flex; flex-direction: column; gap: 8px; }
        .perf-dept-bar-row { display: flex; align-items: center; gap: 8px; }
        .perf-dept-bar-label { font-size: 11px; color: var(--muted); width: 56px; flex-shrink: 0; }
        .perf-dept-bar-track { flex: 1; height: 6px; background: #e2e8f0; border-radius: 99px; overflow: hidden; }
        .perf-dept-bar-fill { height: 100%; border-radius: 99px; transition: width 0.5s ease; }
        .perf-dept-bar-val { font-size: 11px; font-weight: 600; width: 24px; text-align: right; color: var(--text); }

        /* ─── Detail panel ───────────────────────────────────────── */
        .perf-detail-panel {
          width: 360px; min-width: 340px; background: var(--surface); border-left: 1px solid var(--border);
          padding: 20px; position: sticky; top: 0; min-height: 100vh; overflow-y: auto; flex-shrink: 0;
          box-shadow: -2px 0 12px rgba(0,0,0,0.04);
        }
        .perf-panel-close {
          float: right; background: var(--bg); border: 1px solid var(--border); color: var(--muted); cursor: pointer;
          padding: 4px 6px; border-radius: 6px; transition: all 0.2s;
        }
        .perf-panel-close:hover { color: var(--text); border-color: #a5b4fc; }
        .perf-panel-header { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px; }
        .perf-panel-name { font-size: 16px; font-weight: 700; color: var(--text); }
        .perf-panel-meta { display: flex; align-items: center; gap: 6px; margin-top: 3px; font-size: 11px; }
        .perf-panel-spec { color: var(--muted); }
        .perf-panel-id { background: var(--bg); border: 1px solid var(--border); padding: 1px 6px; border-radius: 4px; font-size: 10px; color: var(--muted); }
        .perf-panel-period { font-size: 10px; color: #94a3b8; margin-top: 4px; }
        .perf-panel-scores { display: flex; align-items: center; gap: 12px; background: var(--bg); border: 1px solid var(--border); border-radius: 10px; padding: 12px; margin-bottom: 12px; flex-wrap: wrap; }
        .perf-panel-score-item { display: flex; align-items: center; gap: 8px; }
        .perf-panel-score-info { display: flex; flex-direction: column; }
        .perf-panel-score-num { font-size: 14px; font-weight: 700; color: var(--text); }
        .perf-panel-score-sub { font-size: 10px; color: var(--muted); }
        .perf-panel-score-badge { font-size: 10px; font-weight: 600; margin-top: 2px; }
        .perf-panel-divider { width: 1px; height: 32px; background: var(--border); }
        .perf-panel-section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #94a3b8; margin: 14px 0 8px; }
        .perf-panel-kpis { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .perf-kpi-item { background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 8px 10px; }
        .perf-kpi-val { font-size: 15px; font-weight: 700; display: block; color: var(--text); }
        .perf-kpi-label { font-size: 9px; color: var(--muted); display: block; margin-top: 1px; }

        /* ─── Trend chart ─────────────────────────────────────────── */
        .perf-trend-chart-wrap { background: var(--bg); border: 1px solid var(--border); border-radius: 10px; padding: 12px 8px 4px; }
        .perf-trend-empty { color: var(--muted); font-size: 11px; text-align: center; padding: 24px; }
        .perf-trend-loading { color: var(--muted); font-size: 11px; padding: 12px; }

        /* ─── Section heading ─────────────────────────────────────── */
        .perf-section { margin-bottom: 20px; }
        .perf-section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
        .perf-section-title { font-size: 13px; font-weight: 700; display: flex; align-items: center; gap: 6px; color: var(--text); }

        /* ─── Skeleton loader ─────────────────────────────────────── */
        .perf-skeleton { background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 10px; }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

        /* ─── Empty state ─────────────────────────────────────────── */
        .perf-empty { text-align: center; padding: 40px 20px; color: var(--muted); }
        .perf-empty-icon { font-size: 36px; margin-bottom: 12px; }
        .perf-empty-title { font-size: 14px; font-weight: 600; color: var(--text); margin-bottom: 4px; }
        .perf-empty-sub { font-size: 12px; color: var(--muted); }

        /* ─── Dept section ────────────────────────────────────────── */
        .perf-dept-section { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }

        /* ─── Responsive ──────────────────────────────────────────── */
        @media (max-width: 900px) {
          .perf-detail-panel { display: none; }
          .perf-main { max-width: 100%; }
          .perf-emp-trend, .perf-emp-flags { display: none; }
        }
      `}</style>


      <div className="perf-layout">
        {/* ── Main Column ── */}
        <div className={`perf-main ${!selectedEmp ? "full-width" : ""}`}>
          {/* Header */}
          <div className="perf-header">
            <div className="perf-header-top">
              <div>
                <div className="perf-title">Performance Analytics</div>
                <div className="perf-subtitle">
                  Enterprise-grade HR performance reporting · all data from live records
                </div>
              </div>
              <div className="perf-filters">
                <Calendar size={14} style={{ color: "var(--muted)" }} />
                <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                  <select
                    className="perf-select"
                    value={selectedMonth}
                    onChange={(e) => { setSelectedMonth(Number(e.target.value)); setSelectedEmpId(null); }}
                  >
                    {MONTHS.map((m, i) => (
                      <option key={i} value={i}>{m}</option>
                    ))}
                  </select>
                  <ChevronDown size={12} style={{ position: "absolute", right: 8, pointerEvents: "none", color: "var(--muted)" }} />
                </div>
                <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                  <select
                    className="perf-select"
                    value={selectedYear}
                    onChange={(e) => { setSelectedYear(Number(e.target.value)); setSelectedEmpId(null); }}
                  >
                    {YEARS.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  <ChevronDown size={12} style={{ position: "absolute", right: 8, pointerEvents: "none", color: "var(--muted)" }} />
                </div>
              </div>
            </div>
          </div>

          {/* Stats grid - always from dashboard API */}
          <div className="perf-stats-grid">
            {dashLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="perf-skeleton" style={{ height: 72 }} />
              ))
            ) : (
              <>
                <StatCard icon={Users} label="Total Staff" value={stats?.totalStaff ?? 0} color="#818cf8" />
                <StatCard icon={Stethoscope} label="Doctors" value={stats?.totalDoctors ?? 0} color="#818cf8" />
                <StatCard icon={Heart} label="Nurses" value={stats?.totalNurses ?? 0} color="#f472b6" />
                <StatCard icon={Briefcase} label="Staff" value={stats?.totalStaffCount ?? 0} color="#34d399" />
                <StatCard icon={UserCheck} label="Avg Attend." value={`${stats?.avgAttendanceRate ?? 0}%`} color="#22c55e" />
                <StatCard icon={BarChart3} label="Avg Score" value={`${stats?.avgCompositeScore ?? 0}/5`} sub="composite" color="#6366f1" />
                <StatCard icon={Award} label="High Perf." value={stats?.highPerformers ?? 0} sub="score ≥ 4.0" color="#eab308" />
                <StatCard icon={AlertTriangle} label="Risk Flags" value={(stats?.attendanceBelow70 ?? 0) + (stats?.lowRatingAlerts ?? 0)} sub="needs attention" color="#ef4444" />
              </>
            )}
          </div>

          {/* Department Overview */}
          {!dashLoading && dash?.departmentStats && dash.departmentStats.length > 0 && (
            <div className="perf-section">
              <div className="perf-section-header">
                <span className="perf-section-title"><Target size={15} style={{ color: "#818cf8" }} /> Department Overview</span>
              </div>
              <div className="perf-dept-section">
                <div className="perf-dept-bars">
                  {dash.departmentStats.map((dept) => (
                    <DeptBar
                      key={dept.role}
                      label={dept.department}
                      value={dept.count}
                      total={dash.stats?.totalStaff ?? dept.count}
                      color={roleColor(dept.role)}
                    />
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 12 }}>
                  {dash.departmentStats.map((dept) => (
                    <div key={dept.role} style={{ background: "var(--bg)", borderRadius: 8, padding: "10px 12px", border: "1px solid var(--border)" }}>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>{dept.department}</div>
                      <div style={{ display: "flex", gap: 12 }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700 }}>{dept.avgAttendance}%</div>
                          <div style={{ fontSize: 9, color: "var(--muted)" }}>Attendance</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: scoreColor(dept.avgCompositeScore) }}>{dept.avgCompositeScore}</div>
                          <div style={{ fontSize: 9, color: "var(--muted)" }}>Avg Score</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="perf-tabs">
            {(["overview", "doctors", "nurses", "staff"] as const).map((tab) => (
              <button
                key={tab}
                className={`perf-tab ${activeTab === tab ? "active" : ""}`}
                onClick={() => { setActiveTab(tab); setSelectedEmpId(null); }}
              >
                {tab === "doctors" && <Stethoscope size={12} />}
                {tab === "nurses" && <Heart size={12} />}
                {tab === "staff" && <Briefcase size={12} />}
                {tab === "overview" && <Users size={12} />}
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Top performers for current view */}
          {!isLoading && activeTab === "overview" && dash?.topPerformers && (
            <div className="perf-top-section">
              <div className="perf-top-section-title"><Award size={11} /> Top Performers</div>
              <div className="perf-top-grid">
                {[...dash.topPerformers.doctors.slice(0, 3), ...dash.topPerformers.nurses.slice(0, 2)].map((emp, i) => (
                  <TopPerformerCard key={emp._id} emp={emp} position={i} onSelect={setSelectedEmpId} />
                ))}
              </div>
            </div>
          )}

          {/* Employee list */}
          <div className="perf-section">
            <div className="perf-section-header">
              <span className="perf-section-title"><Activity size={15} style={{ color: "#818cf8" }} /> Employee Performance</span>
            </div>
            <div className="perf-controls">
              <input
                className="perf-search"
                placeholder="Search by name, ID or specialization…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <span className="perf-count">{activeEmployees.length} employee{activeEmployees.length !== 1 ? "s" : ""}</span>
            </div>

            {isLoading ? (
              <div className="perf-emp-list">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="perf-skeleton" style={{ height: 58 }} />
                ))}
              </div>
            ) : activeEmployees.length === 0 ? (
              <div className="perf-empty">
                <div className="perf-empty-icon">📊</div>
                <div className="perf-empty-title">No data for this period</div>
                <div className="perf-empty-sub">Try a different month/year or add attendance records.</div>
              </div>
            ) : (
              <div className="perf-emp-list">
                {activeEmployees.map((emp) => (
                  <EmployeeRow
                    key={emp._id}
                    emp={emp}
                    onSelect={setSelectedEmpId}
                    selected={selectedEmpId === emp._id}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Detail Panel ── */}
        {selectedEmp && (
          <EmployeePanel emp={selectedEmp} onClose={() => setSelectedEmpId(null)} />
        )}
      </div>
    </div>
  );
}
