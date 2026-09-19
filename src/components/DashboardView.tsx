import React from "react";
import {
  Users,
  AlertOctagon,
  Clock,
  Server,
  ArrowRight,
  AlertTriangle,
  Database,
  Building2,
  CheckCircle2,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
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
  currentUserName?: string;
  onNavigate: (tab: string) => void;
  onInitUnits: () => void;
}

const URGENCY_PALETTE: Record<string, string> = {
  CRITICAL: "#DC2626", // Clean medical red
  HIGH: "#F59E0B",     // Amber
  MODERATE: "#1976D2", // Healthcare blue
  LOW: "#16A34A",      // Success green
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  alerts,
  patients,
  resources,
  allocations,
  settings,
  currentUserName = "Hospital Staff",
  onNavigate,
  onInitUnits,
}) => {
  // Greeting based on current local hour
  const currentHour = new Date().getHours();
  const timeGreeting =
    currentHour < 12 ? "Good morning" : currentHour < 17 ? "Good afternoon" : "Good evening";

  // Check if database is empty
  const isDatabaseEmpty =
    !stats ||
    (stats.totalPatients === 0 &&
      stats.totalBeds === 0 &&
      stats.totalDoctors === 0 &&
      stats.totalIcu === 0 &&
      stats.activeAllocations === 0);

  if (isDatabaseEmpty) {
    return (
      <div className="medical-card p-12 max-w-xl mx-auto text-center space-y-5 my-8">
        <div className="w-14 h-14 rounded-full bg-[#EAF4FF] text-[#1976D2] flex items-center justify-center mx-auto">
          <Database className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-[#243447]">Hospital Database Ready</h2>
          <p className="mt-1.5 text-xs text-[#64748B] leading-relaxed">
            The database connection is active. Initialize standard clinical units or register patients to start live operations.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            id="empty-init-units-btn"
            onClick={onInitUnits}
            className="px-4 py-2 rounded-lg bg-[#1976D2] hover:bg-[#1565C0] text-white text-xs font-semibold shadow-xs transition"
          >
            Initialize Standard Units
          </button>
          <button
            id="empty-register-patient-btn"
            onClick={() => onNavigate("patients")}
            className="px-4 py-2 rounded-lg bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#243447] text-xs font-semibold transition"
          >
            Register Patient
          </button>
        </div>
      </div>
    );
  }

  // Active non-discharged patients
  const activePatients = patients.filter((p) => p.status !== "DISCHARGED");

  // Dynamic Row 1 Counts (strictly derived from database)
  const patientsTodayCount = stats?.totalPatients ?? activePatients.length;
  const criticalCasesCount =
    stats?.criticalPatients ??
    activePatients.filter((p) => p.urgencyLevel === "CRITICAL").length;
  const waitingPatientsCount =
    stats?.patientsWaiting ??
    activePatients.filter((p) => p.status === "WAITING" || p.status === "TRIAGED").length;
  const availableResourcesCount = resources.filter((r) => r.status === "AVAILABLE").length;

  // Donut Chart Data: Patient Priority Overview (Critical, High, Moderate, Low)
  const urgencyOrder = ["CRITICAL", "HIGH", "MODERATE", "LOW"] as const;
  const urgencyCounts = {
    CRITICAL: activePatients.filter((p) => p.urgencyLevel === "CRITICAL").length,
    HIGH: activePatients.filter((p) => p.urgencyLevel === "HIGH").length,
    MODERATE: activePatients.filter((p) => p.urgencyLevel === "MODERATE").length,
    LOW: activePatients.filter((p) => p.urgencyLevel === "LOW").length,
  };

  const urgencyDonutData = urgencyOrder
    .map((level) => ({
      name: level,
      value: urgencyCounts[level],
      color: URGENCY_PALETTE[level],
    }))
    .filter((d) => d.value > 0);

  // Resource Availability metrics (Horizontal progress bars)
  const getResourceMetric = (type: string, label: string) => {
    const total = resources.filter((r) => r.type === type).length;
    const occupied = resources.filter((r) => r.type === type && r.status === "IN_USE").length;
    const available = resources.filter((r) => r.type === type && r.status === "AVAILABLE").length;
    const pct = total > 0 ? Math.round((occupied / total) * 100) : 0;
    return { label, total, occupied, available, pct };
  };

  const resourceProgressItems = [
    getResourceMetric("BED", "General Beds"),
    getResourceMetric("ICU_BED", "ICU Beds"),
    getResourceMetric("OPERATING_ROOM", "Operating Rooms"),
    getResourceMetric("DOCTOR", "Doctors"),
    getResourceMetric("NURSE", "Nurses"),
  ];

  // Top 5 Priority Queue Cases (waiting / triaged, sorted by priorityScore descending)
  const topQueuePatients = activePatients
    .filter((p) => p.status === "WAITING" || p.status === "TRIAGED")
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 5);

  return (
    <div className="space-y-6 pb-8">
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2E8F0] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#243447] tracking-tight font-heading">
            {timeGreeting}, {currentUserName}
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Hospital Operations Overview • Shantideep Multispeciality Hospital
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E8F7F4] text-[#0F9D8A] font-semibold border border-[#0F9D8A]/20">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0F9D8A] animate-pulse" />
            <span>Live • Updated just now</span>
          </span>
        </div>
      </div>

      {/* ==================================================
          FIRST ROW: 4 COMPACT CARDS
          Patients Today | Critical Cases | Waiting Patients | Available Resources
          ================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Patients Today */}
        <div className="medical-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#64748B]">
            <span className="text-xs font-semibold">Patients Today</span>
            <Users className="w-4 h-4 text-[#1976D2]" />
          </div>
          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-bold text-[#243447] font-mono">
              {patientsTodayCount}
            </div>
          </div>
          <div className="text-[11px] text-[#64748B] flex items-center justify-between">
            <span>Total registered</span>
            <span className="text-[#1976D2] font-semibold cursor-pointer" onClick={() => onNavigate("patients")}>
              View roster →
            </span>
          </div>
        </div>

        {/* Card 2: Critical Cases */}
        <div className="medical-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#64748B]">
            <span className="text-xs font-semibold text-[#DC2626]">Critical Cases</span>
            <AlertOctagon className="w-4 h-4 text-[#DC2626]" />
          </div>
          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-bold text-[#DC2626] font-mono">
              {criticalCasesCount}
            </div>
          </div>
          <div className="text-[11px] text-[#64748B] flex items-center justify-between">
            <span className="text-[#DC2626] font-medium">Immediate attention</span>
            <span className="text-[#DC2626] font-semibold cursor-pointer" onClick={() => onNavigate("queue")}>
              Prioritize →
            </span>
          </div>
        </div>

        {/* Card 3: Waiting Patients */}
        <div className="medical-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#64748B]">
            <span className="text-xs font-semibold text-[#F59E0B]">Waiting Patients</span>
            <Clock className="w-4 h-4 text-[#F59E0B]" />
          </div>
          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-bold text-[#243447] font-mono">
              {waitingPatientsCount}
            </div>
          </div>
          <div className="text-[11px] text-[#64748B] flex items-center justify-between">
            <span>In triage & queue</span>
            <span className="text-[#F59E0B] font-semibold cursor-pointer" onClick={() => onNavigate("queue")}>
              View queue →
            </span>
          </div>
        </div>

        {/* Card 4: Available Resources */}
        <div className="medical-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#64748B]">
            <span className="text-xs font-semibold text-[#16A34A]">Available Resources</span>
            <Server className="w-4 h-4 text-[#16A34A]" />
          </div>
          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-bold text-[#243447] font-mono">
              {availableResourcesCount}
            </div>
          </div>
          <div className="text-[11px] text-[#64748B] flex items-center justify-between">
            <span>Ready for allocation</span>
            <span className="text-[#16A34A] font-semibold cursor-pointer" onClick={() => onNavigate("resources")}>
              Manage →
            </span>
          </div>
        </div>
      </div>

      {/* ==================================================
          SECOND ROW:
          LEFT: Patient Priority Overview (Donut Chart)
          RIGHT: Resource Availability (Horizontal Progress Bars)
          ================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Patient Priority Overview Donut Chart */}
        <div className="lg:col-span-5 medical-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#243447]">Patient Priority Overview</h2>
              <span className="text-[11px] font-medium text-[#64748B]">Active census</span>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">Urgency tier distribution</p>
          </div>

          <div className="my-4 flex items-center justify-between gap-4">
            {urgencyDonutData.length === 0 ? (
              <div className="w-full py-12 text-center text-xs text-[#64748B]">
                No patients in queue currently.
              </div>
            ) : (
              <>
                <div className="w-1/2 h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={urgencyDonutData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={42}
                        outerRadius={65}
                        paddingAngle={3}
                      >
                        {urgencyDonutData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#FFFFFF",
                          border: "1px solid #E2E8F0",
                          borderRadius: "8px",
                          fontSize: "12px",
                          color: "#243447",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="w-1/2 space-y-2 text-xs">
                  {urgencyOrder.map((level) => {
                    const count = urgencyCounts[level];
                    return (
                      <div key={level} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: URGENCY_PALETTE[level] }}
                          />
                          <span className="text-[#243447] font-medium capitalize">
                            {level.toLowerCase()}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-[#243447]">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between text-xs text-[#64748B]">
            <span>Total active patients: <strong>{activePatients.length}</strong></span>
            <button
              onClick={() => onNavigate("queue")}
              className="text-[#1976D2] font-semibold hover:underline"
            >
              Open Queue →
            </button>
          </div>
        </div>

        {/* Right: Resource Availability Horizontal Progress Bars */}
        <div className="lg:col-span-7 medical-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#243447]">Resource Availability</h2>
              <button
                onClick={() => onNavigate("resources")}
                className="text-xs font-semibold text-[#1976D2] hover:underline"
              >
                All Resources →
              </button>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">Real-time utilization and available units</p>
          </div>

          <div className="my-4 space-y-3.5">
            {resourceProgressItems.map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[#243447]">{item.label}</span>
                  <span className="font-mono text-[11px] text-[#64748B]">
                    <strong className="text-[#243447]">{item.available} available</strong> ({item.occupied}/{item.total} in use • {item.pct}%)
                  </span>
                </div>
                <div className="w-full bg-[#E2E8F0] h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      item.pct > 85
                        ? "bg-[#DC2626]"
                        : item.pct > 65
                        ? "bg-[#F59E0B]"
                        : "bg-[#1976D2]"
                    }`}
                    style={{ width: `${Math.min(item.pct, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between text-xs text-[#64748B]">
            <span>
              ICU status:{" "}
              <strong className={stats?.icuAvailable === 0 ? "text-[#DC2626]" : "text-[#16A34A]"}>
                {stats?.icuAvailable ?? 0} beds open
              </strong>
            </span>
            <span className="text-[#64748B]">Dynamic conflict prevention active</span>
          </div>
        </div>
      </div>

      {/* ==================================================
          THIRD ROW:
          LEFT: Priority Queue (5 most important cases)
          RIGHT: Operational Alerts (subtle alert colors)
          ================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Priority Queue (5 cases) */}
        <div className="lg:col-span-8 medical-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#243447]">Priority Queue</h2>
              <p className="text-xs text-[#64748B]">Top cases requiring clinical attention</p>
            </div>
            <button
              onClick={() => onNavigate("queue")}
              className="text-xs font-semibold text-[#1976D2] hover:underline flex items-center gap-1"
            >
              <span>Full Queue ({waitingPatientsCount})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {topQueuePatients.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#64748B]">
              <CheckCircle2 className="w-8 h-8 text-[#16A34A] mx-auto mb-2" />
              <p className="font-semibold text-[#243447]">No patients waiting</p>
              <p className="text-[#64748B] mt-0.5">New patients will appear here when registered.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-[#64748B] text-[11px] uppercase font-semibold">
                    <th className="pb-2">Patient</th>
                    <th className="pb-2">Priority</th>
                    <th className="pb-2">Waiting</th>
                    <th className="pb-2">Department</th>
                    <th className="pb-2">Required Resource</th>
                    <th className="pb-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {topQueuePatients.map((patient) => (
                    <tr
                      key={patient.id}
                      onClick={() => onNavigate("queue")}
                      className="hover:bg-[#F8FAFC] transition cursor-pointer"
                    >
                      <td className="py-2.5 font-medium text-[#243447]">
                        <div className="font-semibold">{patient.name}</div>
                        <div className="text-[10px] text-[#64748B] font-mono">{patient.mrn}</div>
                      </td>

                      <td className="py-2.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            patient.urgencyLevel === "CRITICAL"
                              ? "bg-red-50 text-red-700 border border-red-200"
                              : patient.urgencyLevel === "HIGH"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : patient.urgencyLevel === "MODERATE"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {patient.urgencyLevel}
                        </span>
                      </td>

                      <td className="py-2.5 font-mono text-[#64748B]">
                        {patient.waitingMinutes} min
                      </td>

                      <td className="py-2.5 text-[#243447]">
                        {patient.departmentName || "General"}
                      </td>

                      <td className="py-2.5 text-[#64748B] max-w-[140px] truncate">
                        {patient.requiredTreatment}
                      </td>

                      <td className="py-2.5 text-right">
                        <span className="text-[11px] font-semibold text-[#1976D2] bg-[#EAF4FF] px-2 py-0.5 rounded">
                          {patient.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: Operational Alerts */}
        <div className="lg:col-span-4 medical-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#243447]">Operational Alerts</h2>
              <span className="text-[11px] font-semibold text-[#64748B]">
                {alerts.length} active
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">Capacity and queue conditions</p>
          </div>

          <div className="my-3 space-y-2.5">
            {alerts.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#64748B]">
                <CheckCircle2 className="w-6 h-6 text-[#16A34A] mx-auto mb-1.5" />
                <p className="font-semibold text-[#243447]">Normal operations</p>
                <p className="text-[11px] text-[#64748B]">No operational alerts active.</p>
              </div>
            ) : (
              alerts.slice(0, 3).map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg border text-xs leading-relaxed ${
                    alert.severity === "CRITICAL"
                      ? "bg-red-50/70 border-red-200 text-red-900"
                      : "bg-amber-50/70 border-amber-200 text-amber-900"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-semibold">
                    <AlertTriangle
                      className={`w-3.5 h-3.5 shrink-0 ${
                        alert.severity === "CRITICAL" ? "text-red-600" : "text-amber-600"
                      }`}
                    />
                    <span>{alert.title}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-[#243447]">{alert.message}</p>
                </div>
              ))
            )}
          </div>

          <div className="pt-2 border-t border-[#E2E8F0]">
            <button
              onClick={() => onNavigate("queue")}
              className="w-full py-1.5 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] text-xs font-semibold text-[#243447] transition"
            >
              Review Queue & Resolve Alerts
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
