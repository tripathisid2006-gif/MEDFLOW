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
  patients,
  resources,
  activeStrategy,
  currentRole,
  currentUserName,
  onRefresh,
}) => {
  const [comparisonResults, setComparisonResults] = useState<any[] | null>(null);
  const [selectedStrategyToApply, setSelectedStrategyToApply] = useState<AllocationStrategy>(activeStrategy);
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
      setSelectedStrategyToApply(strategy);
      setAppliedMsg(`Strategy successfully updated to ${strategy}. Priority scores and queue ranks have re-indexed.`);
      onRefresh();
    } catch (err: any) {
      alert("Failed to update active strategy: " + err.message);
    }
  };

  const strategyDescriptions: Record<string, { name: string; tag: string; desc: string }> = {
    PRIORITY_FIRST: {
      name: "Strategy A: Critical Urgency First (Default)",
      tag: "Maximum Survival Rate",
      desc: "Strict triage urgency hierarchy. Critical and high-risk patients are immediately allocated life-saving resources, with anti-starvation aging to prevent lower-urgency neglect.",
    },
    FIRST_COME_FIRST_SERVED: {
      name: "Strategy B: First-Come First-Served (FCFS)",
      tag: "Pure Chronological Fairness",
      desc: "Strict queue discipline ordered entirely by arrival timestamp. Eliminates subjective bias but presents unacceptable mortality risk for sudden critical deterioration.",
    },
    SHORTEST_TREATMENT_FIRST: {
      name: "Strategy C: Shortest Expected Treatment",
      tag: "Maximum Patient Throughput",
      desc: "Prioritizes cases with the fastest anticipated bed turnaround. Clears waiting rooms quickly but severely delays complex, multi-resource critical interventions.",
    },
    BALANCED_HYBRID: {
      name: "Strategy D: Balanced Clinical & Throughput",
      tag: "Balanced Optimization",
      desc: "Combines 50% clinical urgency weight with 50% turnover velocity and waiting aging. Optimizes overall hospital bed flow during sustained high census.",
    },
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-indigo-400" />
            <span>Allocation Strategy Comparative Engine</span>
          </h2>
          <p className="text-xs text-slate-400">
            Simulate and contrast operational outcomes across 4 distinct allocation heuristics using live census data.
          </p>
        </div>

        <button
          id="run-strategy-simulation-btn"
          onClick={handleRunComparison}
          disabled={isRunning}
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md flex items-center gap-2 transition disabled:opacity-50"
        >
          <TrendingUp className="w-4 h-4" />
          <span>{isRunning ? "Simulating Trade-offs..." : "Run Heuristic Comparison"}</span>
        </button>
      </div>

      {appliedMsg && (
        <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-800 text-emerald-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{appliedMsg}</span>
          </div>
          <button onClick={() => setAppliedMsg(null)} className="text-xs text-emerald-300">
            Dismiss
          </button>
        </div>
      )}

      {/* 4 Strategy Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(
          [
            "PRIORITY_FIRST",
            "FIRST_COME_FIRST_SERVED",
            "SHORTEST_TREATMENT_FIRST",
            "BALANCED_HYBRID",
          ] as AllocationStrategy[]
        ).map((stratKey) => {
          const info = strategyDescriptions[stratKey];
          const isCurrentActive = activeStrategy === stratKey;
          const simData = comparisonResults?.find((r) => r.strategy === stratKey);

          return (
            <div
              key={stratKey}
              className={`p-5 rounded-xl border transition flex flex-col justify-between space-y-4 ${
                isCurrentActive
                  ? "bg-slate-900 border-indigo-600 shadow-md shadow-indigo-950/40"
                  : "bg-slate-900 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-950 border border-indigo-800 text-indigo-300">
                      {info.tag}
                    </span>
                    <h3 className="text-sm font-bold text-white mt-1.5">{info.name}</h3>
                  </div>

                  {isCurrentActive && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Active</span>
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-300 mt-2 leading-relaxed">{info.desc}</p>

                {simData && (
                  <div className="mt-4 p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Live Simulation Metrics
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-1.5 rounded bg-slate-900 border border-slate-850">
                        <div className="text-[10px] text-slate-400">Survival Index</div>
                        <div className="mt-0.5 font-bold font-mono text-emerald-400">
                          {simData.criticalSurvivalRate}%
                        </div>
                      </div>

                      <div className="p-1.5 rounded bg-slate-900 border border-slate-850">
                        <div className="text-[10px] text-slate-400">Avg Wait</div>
                        <div className="mt-0.5 font-bold font-mono text-white">
                          {simData.avgWaitMinutes} min
                        </div>
                      </div>

                      <div className="p-1.5 rounded bg-slate-900 border border-slate-850">
                        <div className="text-[10px] text-slate-400">12h Turnover</div>
                        <div className="mt-0.5 font-bold font-mono text-indigo-300">
                          {simData.throughput12h} pts
                        </div>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-400 mt-1 leading-normal italic">
                      Trade-off: {simData.tradeoffSummary}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-850 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  {isCurrentActive ? "Active hospital engine" : "Alternative model"}
                </span>

                {!isCurrentActive ? (
                  <button
                    onClick={() => handleApplyStrategy(stratKey)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
                  >
                    Activate Strategy
                  </button>
                ) : (
                  <span className="text-xs font-bold text-emerald-400 font-mono">ENFORCED</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
