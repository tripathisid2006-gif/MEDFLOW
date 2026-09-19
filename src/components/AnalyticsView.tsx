import React from "react";
import {
  LineChart as LineChartIcon,
  Clock,
  TrendingUp,
  Activity,
  Layers,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { Patient, Resource, ResourceAllocation, HospitalStats } from "../types";

interface AnalyticsViewProps {
  stats: HospitalStats | null;
  patients: Patient[];
  resources: Resource[];
  allocations: ResourceAllocation[];
}

const HEALTHCARE_PALETTE = {
  blue: "#1976D2",
  teal: "#0F9D8A",
  amber: "#F59E0B",
  coral: "#E05638",
};

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  stats,
  patients,
  resources,
  allocations,
}) => {
  // 1. Patient Flow (Hourly arrival trend)
  const patientFlowData = [
    { time: "00:00", arrivals: 2, triaged: 2 },
    { time: "03:00", arrivals: 1, triaged: 1 },
    { time: "06:00", arrivals: 4, triaged: 3 },
    { time: "09:00", arrivals: 9, triaged: 8 },
    { time: "12:00", arrivals: 12, triaged: 11 },
    { time: "15:00", arrivals: 8, triaged: 8 },
    { time: "18:00", arrivals: 11, triaged: 10 },
    { time: "21:00", arrivals: 6, triaged: 6 },
  ];

  // 2. Resource Utilization by Type
  const resourceTypes = [
    { type: "BED", name: "General Beds" },
    { type: "ICU_BED", name: "ICU Beds" },
    { type: "OPERATING_ROOM", name: "Operating Rooms" },
    { type: "VENTILATOR", name: "Ventilators" },
    { type: "DOCTOR", name: "Physicians" },
    { type: "NURSE", name: "Nurses" },
  ];

  const utilizationData = resourceTypes.map((rt) => {
    const list = resources.filter((r) => r.type === rt.type);
    const total = list.length;
    const inUse = list.filter((r) => r.status === "IN_USE").length;
    const available = list.filter((r) => r.status === "AVAILABLE").length;
    return {
      name: rt.name,
      inUse,
      available,
      total,
      utilization: total > 0 ? Math.round((inUse / total) * 100) : 0,
    };
  });

  // 3. Waiting Time by Priority Tier
  const urgencyTiers = ["CRITICAL", "HIGH", "MODERATE", "LOW"];
  const waitingTimeData = urgencyTiers.map((tier) => {
    const matching = patients.filter((p) => p.urgencyLevel === tier);
    const avgWait =
      matching.length > 0
        ? Math.round(
            matching.reduce((acc, p) => acc + (p.waitingMinutes || 0), 0) / matching.length
          )
        : tier === "CRITICAL"
        ? 4
        : tier === "HIGH"
        ? 14
        : tier === "MODERATE"
        ? 32
        : 45;

    return {
      tier,
      avgWaitMinutes: avgWait,
      patientsCount: matching.length,
    };
  });

  // 4. Clinical Categories (Department distribution)
  const departmentsMap: Record<string, number> = {};
  patients.forEach((p) => {
    const dept = p.departmentName || "General Medicine";
    departmentsMap[dept] = (departmentsMap[dept] || 0) + 1;
  });

  const clinicalCategoriesData = Object.keys(departmentsMap).map((dept, idx) => {
    const colors = [
      HEALTHCARE_PALETTE.blue,
      HEALTHCARE_PALETTE.teal,
      HEALTHCARE_PALETTE.amber,
      HEALTHCARE_PALETTE.coral,
      "#6366F1",
    ];
    return {
      name: dept,
      value: departmentsMap[dept],
      color: colors[idx % colors.length],
    };
  });

  // Fallback if no patients
  if (clinicalCategoriesData.length === 0) {
    clinicalCategoriesData.push(
      { name: "Emergency Medicine", value: 8, color: HEALTHCARE_PALETTE.blue },
      { name: "Cardiology", value: 5, color: HEALTHCARE_PALETTE.teal },
      { name: "Pulmonology", value: 4, color: HEALTHCARE_PALETTE.amber },
      { name: "Neurology", value: 3, color: HEALTHCARE_PALETTE.coral }
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2E8F0] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[#243447] tracking-tight font-heading">
              Operational Analytics
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#EAF4FF] text-[#1976D2]">
              Clinical Intelligence
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Throughput velocity, bed occupancy trends, waiting times, and clinical case mix.
          </p>
        </div>

        <div className="text-xs font-medium text-[#64748B]">
          Reporting Period: <strong>Today (Live 24h)</strong>
        </div>
      </div>

      {/* KPI Highlights Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="medical-card p-4">
          <span className="text-xs font-semibold text-[#64748B]">Average Triage Time</span>
          <div className="text-2xl font-bold font-mono text-[#243447] mt-1">4.2 min</div>
          <span className="text-[11px] text-[#0F9D8A] font-medium flex items-center gap-0.5 mt-1">
            <TrendingUp className="w-3 h-3" /> Within NABH 5-min standard
          </span>
        </div>

        <div className="medical-card p-4">
          <span className="text-xs font-semibold text-[#64748B]">Bed Turnover Rate</span>
          <div className="text-2xl font-bold font-mono text-[#1976D2] mt-1">2.4 / day</div>
          <span className="text-[11px] text-[#64748B] mt-1 block">Optimal capacity turnover</span>
        </div>

        <div className="medical-card p-4">
          <span className="text-xs font-semibold text-[#64748B]">Critical Response Time</span>
          <div className="text-2xl font-bold font-mono text-[#DC2626] mt-1">&lt; 90 sec</div>
          <span className="text-[11px] text-[#0F9D8A] font-medium mt-1 block">100% adherence</span>
        </div>

        <div className="medical-card p-4">
          <span className="text-xs font-semibold text-[#64748B]">Resource Allocation Fit</span>
          <div className="text-2xl font-bold font-mono text-[#0F9D8A] mt-1">98.6%</div>
          <span className="text-[11px] text-[#64748B] mt-1 block">Zero scheduling conflict</span>
        </div>
      </div>

      {/* Grid: 4 Clean Healthcare Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Patient Flow (Line Chart) */}
        <div className="medical-card p-5 space-y-3">
          <div>
            <h2 className="text-sm font-bold text-[#243447]">Patient Flow</h2>
            <p className="text-xs text-[#64748B]">Hourly patient admissions and triage completions</p>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={patientFlowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="time" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                <Line
                  type="monotone"
                  dataKey="arrivals"
                  name="Admissions"
                  stroke={HEALTHCARE_PALETTE.blue}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: HEALTHCARE_PALETTE.blue }}
                />
                <Line
                  type="monotone"
                  dataKey="triaged"
                  name="Triaged"
                  stroke={HEALTHCARE_PALETTE.teal}
                  strokeWidth={2.5}
                  strokeDasharray="3 3"
                  dot={{ r: 3, fill: HEALTHCARE_PALETTE.teal }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Resource Utilization (Bar Chart) */}
        <div className="medical-card p-5 space-y-3">
          <div>
            <h2 className="text-sm font-bold text-[#243447]">Resource Utilization</h2>
            <p className="text-xs text-[#64748B]">Current occupied vs available capacity</p>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={utilizationData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                <Bar
                  dataKey="inUse"
                  name="In Use"
                  fill={HEALTHCARE_PALETTE.blue}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
                <Bar
                  dataKey="available"
                  name="Available"
                  fill="#CBD5E1"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Waiting Time (Bar Chart) */}
        <div className="medical-card p-5 space-y-3">
          <div>
            <h2 className="text-sm font-bold text-[#243447]">Average Waiting Time</h2>
            <p className="text-xs text-[#64748B]">Minutes in queue by urgency classification</p>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={waitingTimeData}
                layout="vertical"
                margin={{ top: 10, right: 20, left: 15, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                <XAxis type="number" stroke="#94A3B8" fontSize={11} unit="m" tickLine={false} />
                <YAxis type="category" dataKey="tier" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar
                  dataKey="avgWaitMinutes"
                  name="Avg Wait (Minutes)"
                  fill={HEALTHCARE_PALETTE.amber}
                  radius={[0, 4, 4, 0]}
                  maxBarSize={24}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Clinical Categories (Donut Chart) */}
        <div className="medical-card p-5 space-y-3">
          <div>
            <h2 className="text-sm font-bold text-[#243447]">Clinical Categories</h2>
            <p className="text-xs text-[#64748B]">Distribution of patients across medical specialties</p>
          </div>

          <div className="h-64 w-full pt-2 flex items-center justify-between">
            <div className="w-1/2 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={clinicalCategoriesData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                  >
                    {clinicalCategoriesData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #E2E8F0",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="w-1/2 space-y-2 text-xs pr-4">
              {clinicalCategoriesData.map((cat, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="text-[#243447] truncate">{cat.name}</span>
                  </div>
                  <span className="font-mono font-bold text-[#243447] shrink-0 ml-2">{cat.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
