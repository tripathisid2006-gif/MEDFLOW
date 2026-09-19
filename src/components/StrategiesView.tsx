import React, { useState } from "react";
import {
  GitCompare,
  CheckCircle2,
  ShieldCheck,
  TrendingUp,
  Clock,
  HeartPulse,
  Activity,
  Award,
} from "lucide-react";
import type { Patient, Resource, AllocationStrategy, UserRole } from "../types";
import { compareStrategiesApi, updateSettingsApi } from "../api";

interface StrategiesViewProps {
  patients: Patient[];
  resources: Resource[];
  activeStrategy: AllocationStrategy;
  currentRole: UserRole;
  currentUserName: string;
  onRefresh: () => void;
}

export const StrategiesView: React.FC<StrategiesViewProps> = ({
  activeStrategy,
  currentRole,
  currentUserName,
  onRefresh,
}) => {
  const [comparisonResults, setComparisonResults] = useState<any[] | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [appliedMsg, setAppliedMsg] = useState<string | null>(null);

  const handleRunComparison = async () => {
    setIsRunning(true);
    setAppliedMsg(null);
    try {
      const results = await compareStrategiesApi();
      setComparisonResults(results);
    } catch (err: any) {
      alert("Failed to run strategy simulation: " + err.message);
    } finally {
      setIsRunning(false);
    }
  };

  const handleApplyStrategy = async (strategy: AllocationStrategy) => {
    try {
      await updateSettingsApi(
        { activeStrategy: strategy },
        `${currentUserName} (${currentRole})`,
        currentRole
      );
      setAppliedMsg(
        `Allocation strategy updated to ${strategy}. Priority scores and queue ranks have re-indexed.`
      );
      onRefresh();
    } catch (err: any) {
      alert("Failed to update active strategy: " + err.message);
    }
  };

  const strategyDescriptions: Record<string, { name: string; tag: string; desc: string }> = {
    PRIORITY_FIRST: {
      name: "Strategy A: Critical Urgency First (Default)",
      tag: "Maximum Clinical Safety",
      desc: "Strict clinical urgency hierarchy. Critical and high-risk patients are immediately allocated resources with waiting-time anti-starvation aging.",
    },
    FIRST_COME_FIRST_SERVED: {
      name: "Strategy B: First-Come First-Served (FCFS)",
      tag: "Chronological Fairness",
      desc: "Queue ordered strictly by arrival timestamp. Eliminates order bias but presents unacceptable safety delays for sudden acute emergencies.",
    },
    SHORTEST_TREATMENT_FIRST: {
      name: "Strategy C: Shortest Expected Treatment",
      tag: "Maximum Census Throughput",
      desc: "Prioritizes cases with the fastest turnaround times. Clears waiting capacity quickly but risks delaying intensive critical cases.",
    },
    BALANCED_HYBRID: {
      name: "Strategy D: Balanced Clinical & Throughput",
      tag: "Balanced Optimization",
      desc: "Combines 50% clinical urgency weight with 50% turnover velocity and waiting aging. Best for high patient volume surges.",
    },
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[#243447] tracking-tight font-heading">
              Allocation Strategy Comparative Engine
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#EAF4FF] text-[#1976D2]">
              Algorithmic Policy
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Simulate and contrast clinical outcomes across 4 distinct allocation heuristics using live census data.
          </p>
        </div>

        <button
          onClick={handleRunComparison}
          disabled={isRunning}
          className="px-4 py-2 rounded-lg bg-[#1976D2] hover:bg-[#1565C0] text-white text-xs font-semibold shadow-xs flex items-center gap-2 transition disabled:opacity-50"
        >
          <GitCompare className="w-4 h-4" />
          <span>{isRunning ? "Simulating Algorithms..." : "Run Heuristics Simulation"}</span>
        </button>
      </div>

      {appliedMsg && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{appliedMsg}</span>
          </div>
          <button
            onClick={() => setAppliedMsg(null)}
            className="text-xs font-semibold text-emerald-800 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 4 Strategy Policy Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {(Object.keys(strategyDescriptions) as AllocationStrategy[]).map((key) => {
          const item = strategyDescriptions[key];
          const isCurrentlyActive = activeStrategy === key;

          return (
            <div
              key={key}
              className={`medical-card p-5 flex flex-col justify-between space-y-4 transition ${
                isCurrentlyActive ? "border-[#1976D2] ring-1 ring-[#1976D2] bg-[#F7FAFC]" : ""
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-[#243447]">{item.name}</h2>
                    <span className="text-[11px] font-semibold text-[#1976D2]">{item.tag}</span>
                  </div>
                  {isCurrentlyActive && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#1976D2] text-white">
                      ACTIVE POLICY
                    </span>
                  )}
                </div>

                <p className="text-xs text-[#64748B] leading-relaxed mt-2.5">{item.desc}</p>
              </div>

              <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between">
                <span className="text-[11px] text-[#64748B]">
                  {isCurrentlyActive ? "Enforcing live allocations" : "Available to activate"}
                </span>

                {!isCurrentlyActive && (
                  <button
                    onClick={() => handleApplyStrategy(key)}
                    className="px-3 py-1.5 rounded-lg bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#243447] text-xs font-semibold transition"
                  >
                    Apply Strategy
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Simulation Comparative Results */}
      {comparisonResults && (
        <div className="medical-card p-5 space-y-4">
          <div className="border-b border-[#E2E8F0] pb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#243447]">Simulation Comparative Results</h2>
            <span className="text-xs text-[#64748B]">Benchmarked across live patient queue</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#F8FAFC] text-[#64748B] text-[11px] uppercase font-semibold border-b border-[#E2E8F0]">
                  <th className="px-4 py-2.5">Strategy Model</th>
                  <th className="px-4 py-2.5">Avg Waiting Time</th>
                  <th className="px-4 py-2.5">Critical Allocations</th>
                  <th className="px-4 py-2.5">Total Throughput</th>
                  <th className="px-4 py-2.5">Fairness Index</th>
                  <th className="px-4 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {comparisonResults.map((r, i) => (
                  <tr key={i} className="hover:bg-[#F8FAFC] transition">
                    <td className="px-4 py-3 font-semibold text-[#243447]">{r.strategy}</td>
                    <td className="px-4 py-3 font-mono">{r.avgWaitMinutes} min</td>
                    <td className="px-4 py-3 font-mono font-bold text-[#DC2626]">
                      {r.criticalAllocated}
                    </td>
                    <td className="px-4 py-3 font-mono">{r.totalAllocated} patients</td>
                    <td className="px-4 py-3 font-mono text-[#0F9D8A]">
                      {Math.round(r.fairnessScore * 100)}%
                    </td>
                    <td className="px-4 py-3 text-right">
                      {activeStrategy === r.strategy ? (
                        <span className="text-[11px] font-bold text-[#1976D2]">Active</span>
                      ) : (
                        <button
                          onClick={() => handleApplyStrategy(r.strategy)}
                          className="text-xs font-semibold text-[#1976D2] hover:underline"
                        >
                          Switch
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
