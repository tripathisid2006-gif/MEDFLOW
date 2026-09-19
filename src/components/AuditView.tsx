import React, { useState } from "react";
import {
  FileText,
  Download,
  Search,
  ShieldCheck,
  Clock,
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
    const dataStr =
      "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(auditEvents, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute(
      "download",
      `medflow-audit-trail-${new Date().toISOString().slice(0, 10)}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportCsv = () => {
    const headers = [
      "Timestamp",
      "Action",
      "EntityType",
      "EntityId",
      "PerformedBy",
      "Role",
      "Reason",
    ];
    const rows = auditEvents.map((e) => [
      `"${e.timestamp}"`,
      `"${e.action}"`,
      `"${e.entityType}"`,
      `"${e.entityId}"`,
      `"${e.performedBy || e.userName || "System"}"`,
      `"${e.userRole || ""}"`,
      `"${e.reason.replace(/"/g, '""')}"`,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", encodeURI(csvContent));
    downloadAnchor.setAttribute(
      "download",
      `medflow-audit-trail-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[#243447] tracking-tight font-heading">
              Clinical Audit Trail
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#EAF4FF] text-[#1976D2]">
              {auditEvents.length} Recorded Events
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Immutable log of all clinical allocations, manual overrides, AI triage confirmations, and system mode shifts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-[#F8FAFC] text-[#243447] border border-[#E2E8F0] text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleExportJson}
            className="px-3.5 py-1.5 rounded-lg bg-[#1976D2] hover:bg-[#1565C0] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="bg-white border border-[#E2E8F0] rounded-lg px-3 py-1.5 text-xs text-[#243447]"
          >
            <option value="ALL">All Event Types</option>
            <option value="ALLOCATION_CREATED">Allocation Created</option>
            <option value="ALLOCATION_RELEASED">Allocation Released</option>
            <option value="AI_TRIAGE_GENERATED">AI Triage Generated</option>
            <option value="AI_ASSESSMENT_CONFIRMED">Assessment Confirmed</option>
            <option value="SYSTEM_SETTINGS_UPDATED">Settings Updated</option>
          </select>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search action, clinician, reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-[#E2E8F0] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#243447] placeholder-[#94A3B8]"
          />
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="medical-card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#64748B]">
            No audit log entries matching criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#F8FAFC] text-[#64748B] text-[11px] uppercase font-semibold border-b border-[#E2E8F0]">
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Entity</th>
                  <th className="px-4 py-3">Operator / Clinician</th>
                  <th className="px-4 py-3">Audit Details & Rationale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filtered.map((ev) => (
                  <tr key={ev.id} className="hover:bg-[#F8FAFC] transition">
                    <td className="px-4 py-3 font-mono text-[#64748B] whitespace-nowrap">
                      {new Date(ev.timestamp).toLocaleString()}
                    </td>

                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded bg-[#F1F5F9] text-[#475569] font-mono text-[10px] font-semibold">
                        {ev.action}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-[#64748B]">
                      {ev.entityType}
                    </td>

                    <td className="px-4 py-3 font-medium text-[#243447]">
                      <div>{ev.performedBy || ev.userName || "System"}</div>
                      {ev.userRole && (
                        <span className="text-[10px] text-[#64748B]">{ev.userRole}</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-[#243447] leading-relaxed max-w-md">
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
