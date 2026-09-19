import React from "react";
import {
  Users,
  AlertOctagon,
  Clock,
  Bed,
  HeartPulse,
  Syringe,
  Stethoscope,
  Activity,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Layers,
  Database,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type {
  HospitalStats,
  HospitalAlert,
  Patient,
  Resource,
  ResourceAllocation,
  SystemSettings,
} from "../types";

interface DashboardViewProps {
  stats: HospitalStats | null;
  alerts: HospitalAlert[];
  patients: Patient[];
  resources: Resource[];
  allocations: ResourceAllocation[];
  settings: SystemSettings | null;
  onNavigate: (tab: string) => void;
  onInitUnits: () => void;
}

const URGENCY_COLORS: Record<string, string> = {
  CRITICAL: "#ef4444", // Red
  HIGH: "#f97316", // Orange
  MODERATE: "#eab308", // Amber
  LOW: "#3b82f6", // Blue
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  alerts,
  patients,
  resources,
  allocations,
  settings,
  onNavigate,
  onInitUnits,
}) => {
  // Empty state check
  const isDatabaseEmpty =
    !stats ||
    (stats.totalPatients === 0 &&
      stats.totalBeds === 0 &&
      stats.totalDoctors === 0 &&
      stats.totalIcu === 0 &&
      stats.activeAllocations === 0);

  if (isDatabaseEmpty) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-blue-900/30 border border-blue-700/50 flex items-center justify-center text-blue-400 mx-auto">
          <Database className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">No live hospital data yet</h2>
          <p className="mt-2 text-sm text-slate-400 max-w-md mx-auto">
            The database is live and initialized. Register patients through intake or configure hospital units to begin deterministic resource allocation.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <button
            id="empty-init-units-btn"
            onClick={onInitUnits}
            className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg transition flex items-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            Initialize Standard Hospital Units
          </button>
          <button
            id="empty-register-patient-btn"
            onClick={() => onNavigate("patients")}
            className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-semibold transition flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            Register First Patient
          </button>
        </div>
        <div className="mt-8 p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 text-xs text-slate-400 max-w-lg mx-auto text-left space-y-1.5">
          <div className="font-semibold text-slate-300">MedFlow Core Architecture:</div>
          <div>• Operationally authentic synthetic Indian hospital records.</div>
          <div>• Real-time deterministic allocation with conflict detection.</div>
          <div>• Explainable AI triage analysis with physician confirmation.</div>
        </div>
      </div>
    );
  }

  // Calculate Urgency Distribution from real patients
  const activePatients = patients.filter((p) => p.status !== "DISCHARGED");
  const urgencyCounts: Record<string, number> = {
    CRITICAL: activePatients.filter((p) => p.urgencyLevel === "CRITICAL").length,
    HIGH: activePatients.filter((p) => p.urgencyLevel === "HIGH").length,
    MODERATE: activePatients.filter((p) => p.urgencyLevel === "MODERATE").length,
    LOW: activePatients.filter((p) => p.urgencyLevel === "LOW").length,
  };
  const urgencyPieData = Object.entries(urgencyCounts)
    .filter(([_, count]) => count > 0)
    .map(([level, count]) => ({ name: level, value: count }));

  // Resource Utilization metrics
  const calcUtil = (type: string) => {
    const total = resources.filter((r) => r.type === type).length;
    const occupied = resources.filter((r) => r.type === type && r.status === "IN_USE").length;
    return {
      total,
      occupied,
      pct: total > 0 ? Math.round((occupied / total) * 100) : 0,
    };
  };

  const bedsUtil = calcUtil("BED");
  const icuUtil = calcUtil("ICU_BED");
  const orUtil = calcUtil("OPERATING_ROOM");
  const docUtil = calcUtil("DOCTOR");
  const nurseUtil = calcUtil("NURSE");
  const ambUtil = calcUtil("AMBULANCE");

  // Patients by Condition Category (Real from patient assessments / knownConditions)
  const conditionMap: Record<string, number> = {};
  for (const pat of activePatients) {
    const conditions = pat.assessment?.possible_conditions || pat.knownConditions;
    if (conditions && conditions.length > 0) {
      for (const cond of conditions.slice(0, 1)) {
        conditionMap[cond] = (conditionMap[cond] || 0) + 1;
      }
    } else if (pat.symptoms) {
      const cat = pat.symptoms.split(",")[0].trim().slice(0, 20);
      conditionMap[cat] = (conditionMap[cat] || 0) + 1;
    }
  }
  const conditionBarData = Object.entries(conditionMap)
    .slice(0, 5)
    .map(([cat, count]) => ({ category: cat, patients: count }));

  // Waiting Time Metrics
  const waitingPatients = activePatients.filter((p) => p.status === "WAITING" || p.status === "TRIAGED");
  const totalWait = waitingPatients.reduce((sum, p) => sum + p.waitingMinutes, 0);
  const avgWait = waitingPatients.length > 0 ? Math.round(totalWait / waitingPatients.length) : 0;
  const longestWaitPatient = waitingPatients.reduce<Patient | null>(
    (max, p) => (!max || p.waitingMinutes > max.waitingMinutes ? p : max),
    null
  );
  const threshold = settings?.maxWaitingThresholdMinutes || 45;
  const patientsOverThreshold = waitingPatients.filter((p) => p.waitingMinutes > threshold).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Section: TODAY'S OPERATIONS */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Today&apos;s Operations</h2>
            <p className="text-xs text-slate-400">Real-time status across hospital capacity and clinical queue</p>
          </div>
          <button
            onClick={() => onNavigate("queue")}
            className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition"
          >
            <span>Live Priority Queue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Live KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Total Patients</span>
              <Users className="w-4 h-4 text-slate-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-white font-mono">{stats?.totalPatients ?? 0}</div>
            <div className="text-[11px] text-slate-400 mt-1">Active hospital census</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span className="text-red-400">Critical Cases</span>
              <AlertOctagon className="w-4 h-4 text-red-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-red-400 font-mono">{stats?.criticalPatients ?? 0}</div>
            <div className="text-[11px] text-red-400/80 mt-1">Immediate life threat</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span className="text-amber-400">Patients Waiting</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-amber-300 font-mono">{stats?.patientsWaiting ?? 0}</div>
            <div className="text-[11px] text-slate-400 mt-1">In triage or queued</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>ICU Availability</span>
              <HeartPulse className="w-4 h-4 text-pink-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-white font-mono">
              <span className={stats && stats.icuAvailable === 0 ? "text-red-400" : "text-emerald-400"}>
                {stats?.icuAvailable ?? 0}
              </span>
              <span className="text-slate-400 text-sm font-normal"> / {stats?.totalIcu ?? 0}</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Critical care beds open</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>General Beds</span>
              <Bed className="w-4 h-4 text-blue-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-white font-mono">
              <span className="text-emerald-400">{stats?.availableBeds ?? 0}</span>
              <span className="text-slate-400 text-sm font-normal"> / {stats?.totalBeds ?? 0}</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Acute & ward beds open</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Operating Rooms</span>
              <Syringe className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-white font-mono">
              <span className="text-emerald-400">{stats?.operatingRoomsAvailable ?? 0}</span>
              <span className="text-slate-400 text-sm font-normal"> / {stats?.totalOperatingRooms ?? 0}</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Surgical suites open</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Doctors Available</span>
              <Stethoscope className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-white font-mono">
              <span className="text-emerald-400">{stats?.doctorsAvailable ?? 0}</span>
              <span className="text-slate-400 text-sm font-normal"> / {stats?.totalDoctors ?? 0}</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">On-duty physicians</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Nurses Available</span>
              <Activity className="w-4 h-4 text-teal-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-white font-mono">
              <span className="text-emerald-400">{stats?.nursesAvailable ?? 0}</span>
              <span className="text-slate-400 text-sm font-normal"> / {stats?.totalNurses ?? 0}</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">On-duty nursing staff</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Active Allocations</span>
              <Layers className="w-4 h-4 text-purple-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-purple-300 font-mono">{stats?.activeAllocations ?? 0}</div>
            <div className="text-[11px] text-slate-400 mt-1">Assigned resource pairs</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Ambulances Available</span>
              <Activity className="w-4 h-4 text-yellow-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-white font-mono">
              <span className="text-emerald-400">{stats?.ambulancesAvailable ?? 0}</span>
              <span className="text-slate-400 text-sm font-normal"> / {stats?.totalAmbulances ?? 0}</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Ready for dispatch</div>
          </div>
        </div>
      </div>

      {/* Real-time Alerts Banner if present */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.slice(0, 2).map((alert) => (
            <div
              key={alert.id}
              className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                alert.severity === "CRITICAL"
                  ? "bg-red-950/40 border-red-800/80 text-red-200"
                  : "bg-amber-950/40 border-amber-800/80 text-amber-200"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <div>
                  <span className="font-semibold">{alert.title}:</span> {alert.message}
                </div>
              </div>
              <button
                onClick={() => onNavigate(alert.alertType === "CRITICAL_PATIENT" ? "queue" : "allocations")}
                className="shrink-0 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold border border-slate-700/60 transition"
              >
                Take Action
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* A. Urgency Distribution */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-bold text-white">Patient Urgency Distribution</h3>
              <p className="text-xs text-slate-400">Clinical breakdown of active patients</p>
            </div>
          </div>

          {urgencyPieData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-slate-400">
              Not enough live data for this chart yet.
            </div>
          ) : (
            <div className="h-52 flex items-center justify-between">
              <div className="w-1/2 h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={urgencyPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={4}
                    >
                      {urgencyPieData.map((entry) => (
                        <Cell key={entry.name} fill={URGENCY_COLORS[entry.name] || "#64748b"} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        border: "1px solid #334155",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="w-1/2 space-y-2 pr-2">
                {Object.entries(urgencyCounts).map(([level, count]) => (
                  <div key={level} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: URGENCY_COLORS[level] }}
                      />
                      <span className="text-slate-300 font-medium">{level}</span>
                    </div>
                    <span className="font-mono text-slate-200 font-bold">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* B. Resource Utilization */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="mb-3">
            <h3 className="text-sm font-bold text-white">Resource Utilization</h3>
            <p className="text-xs text-slate-400">Percentage of active units assigned</p>
          </div>

          {resources.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-slate-400">
              Not enough live data for this chart yet.
            </div>
          ) : (
            <div className="space-y-2.5">
              {[
                { name: "General Beds", ...bedsUtil },
                { name: "ICU Beds", ...icuUtil },
                { name: "Operating Rooms", ...orUtil },
                { name: "Doctors", ...docUtil },
                { name: "Nurses", ...nurseUtil },
                { name: "Ambulances", ...ambUtil },
              ].map((res) => (
                <div key={res.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300">{res.name}</span>
                    <span className="font-mono text-slate-400">
                      {res.occupied}/{res.total} ({res.pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        res.pct > 85 ? "bg-red-500" : res.pct > 60 ? "bg-amber-500" : "bg-blue-500"
                      }`}
                      style={{ width: `${Math.min(res.pct, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* C. Patients by Disease / Clinical Category */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="mb-2">
            <h3 className="text-sm font-bold text-white">Patients by Clinical Category</h3>
            <p className="text-xs text-slate-400">Categorized from verified records and WHO ICD suggestions</p>
          </div>

          {conditionBarData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-slate-400">
              Not enough live data for this chart yet.
            </div>
          ) : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={conditionBarData} layout="vertical" margin={{ left: 20, right: 20, top: 10, bottom: 0 }}>
                  <XAxis type="number" stroke="#64748b" fontSize={11} allowDecimals={false} />
                  <YAxis type="category" dataKey="category" stroke="#64748b" fontSize={11} width={110} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      border: "1px solid #334155",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="patients" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* D. Waiting Time & Fairness Metrics */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Queue Waiting Time & Fairness</h3>
            <p className="text-xs text-slate-400">Active wait tracking with aging enforcement</p>
          </div>

          {waitingPatients.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-slate-400">
              Zero patients waiting in queue currently.
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-center">
                <div className="text-[11px] text-slate-400 font-medium">Average Wait</div>
                <div className="mt-1 text-xl font-bold font-mono text-white">{avgWait} min</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Across all queues</div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-center">
                <div className="text-[11px] text-slate-400 font-medium">Longest Wait</div>
                <div className="mt-1 text-xl font-bold font-mono text-amber-400">
                  {longestWaitPatient?.waitingMinutes ?? 0} min
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                  {longestWaitPatient?.name || "None"}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-center">
                <div className="text-[11px] text-slate-400 font-medium">Beyond Threshold</div>
                <div
                  className={`mt-1 text-xl font-bold font-mono ${
                    patientsOverThreshold > 0 ? "text-red-400" : "text-emerald-400"
                  }`}
                >
                  {patientsOverThreshold}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">{`> ${threshold} minutes`}</div>
              </div>
            </div>
          )}

          <div className="mt-4 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Fairness Aging Rate: +{settings?.waitingAgingRatePer10Min || 5} pts / 10 min</span>
            <span className="text-blue-400 font-semibold cursor-pointer hover:underline" onClick={() => onNavigate("settings")}>
              Adjust Formula
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
