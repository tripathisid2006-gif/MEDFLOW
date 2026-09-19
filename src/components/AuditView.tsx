import React, { useState } from "react";
import {
  FileText,
  Download,
  Search,
  Filter,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Layers,
  Users,
  Server,
  Sliders,
} from "lucide-react";
import type { AuditEvent } from "../types";

interface AuditViewProps {
  auditEvents: AuditEvent[];
}

export const AuditView: React.FC<AuditViewProps> = ({ auditEvents }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAction, setFilterAction] = useState("ALL");

  const filtered = auditEvents.filter((ev) => {
    const operator = ev.performedBy || ev.userName || "System";
    const matchesAction = filterAction === "ALL" || ev.action === filterAction;
    const matchesSearch =
      ev.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      operator.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.entityType.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesAction && matchesSearch;
  });

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(auditEvents, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `medflow-audit-trail-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportCsv = () => {
    const headers = ["Timestamp", "Action", "EntityType", "EntityId", "PerformedBy", "Role", "Reason"];
    const rows = auditEvents.map((e) => [
      `"${e.timestamp}"`,
      `"${e.action}"`,
      `"${e.entityType}"`,
      `"${e.entityId}"`,
      `"${e.performedBy || e.userName || "System"}"`,
      `"${e.userRole || ""}"`,
      `"${e.reason.replace(/"/g, '""')}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", encodeURI(csvContent));
    downloadAnchor.setAttribute("download", `medflow-audit-trail-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            <span>Tamper-Evident Clinical Audit Log</span>
          </h2>
          <p className="text-xs text-slate-400">
            Immutable log of all clinical allocations, manual overrides, AI triage confirmations, and system mode shifts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleExportJson}
            className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search audit trail by user, reason, action..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs w-64"
          />

          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs"
          >
            <option value="ALL">All Event Types</option>
            <option value="ALLOCATION_CREATED">Allocations Created</option>
            <option value="ALLOCATION_RELEASED">Allocations Released</option>
            <option value="MANUAL_OVERRIDE">Manual Overrides</option>
            <option value="PATIENT_CREATED">Patients Registered</option>
            <option value="AI_TRIAGE_CONFIRMED">AI Triage Confirmed</option>
            <option value="SETTINGS_UPDATED">Settings Updated</option>
          </select>
        </div>

        <span className="text-xs text-slate-400 font-mono">
          Showing {filtered.length} of {auditEvents.length} events
        </span>
      </div>

      {/* Audit List Table */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
        {auditEvents.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400 space-y-2">
            <FileText className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="font-semibold text-slate-300">Audit trail is currently empty</p>
            <p className="text-slate-400">Events will appear here as patients are triaged and resources allocated.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No audit records match your search filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[11px] border-b border-slate-800">
                <tr>
                  <th className="px-3 py-2.5">Timestamp</th>
                  <th className="px-3 py-2.5">Action</th>
                  <th className="px-3 py-2.5">Entity</th>
                  <th className="px-3 py-2.5">Operator & Role</th>
                  <th className="px-3 py-2.5">Clinical Justification / Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filtered.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-850/50 transition">
                    <td className="px-3 py-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                      {new Date(ev.timestamp).toLocaleString()}
                    </td>

                    <td className="px-3 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                          ev.action.includes("OVERRIDE")
                            ? "bg-amber-950 text-amber-300 border border-amber-800"
                            : ev.action.includes("RELEASED")
                            ? "bg-purple-950 text-purple-300 border border-purple-800"
                            : ev.action.includes("CREATED")
                            ? "bg-blue-950 text-blue-300 border border-blue-800"
                            : "bg-emerald-950 text-emerald-300 border border-emerald-800"
                        }`}
                      >
                        {ev.action}
                      </span>
                    </td>

                    <td className="px-3 py-3 font-mono text-[11px] text-slate-400">
                      {ev.entityType} ({ev.entityId.slice(0, 10)})
                    </td>

                    <td className="px-3 py-3">
                      <div className="font-semibold text-slate-200">{ev.performedBy || ev.userName || "System"}</div>
                      {ev.userRole && (
                        <span className="text-[10px] text-slate-400 font-mono">[{ev.userRole}]</span>
                      )}
                    </td>

                    <td className="px-3 py-3 text-slate-300 max-w-md leading-relaxed">
                      {ev.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
