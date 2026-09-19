import React, { useState } from "react";
import {
  Ambulance as AmbulanceIcon,
  Plus,
  Navigation,
  CheckCircle,
  AlertTriangle,
  Clock,
  Wrench,
  X,
  MapPin,
  Users,
  ShieldCheck,
} from "lucide-react";
import type {
  Ambulance,
  Patient,
  UserRole,
} from "../types";
import {
  createAmbulanceApi,
  updateAmbulanceStatusApi,
} from "../api";

interface AmbulancesViewProps {
  ambulances: Ambulance[];
  patients: Patient[];
  currentRole: UserRole;
  currentUserName: string;
  onRefresh: () => void;
  onInitUnits: () => void;
}

export const AmbulancesView: React.FC<AmbulancesViewProps> = ({
  ambulances,
  patients,
  currentRole,
  currentUserName,
  onRefresh,
  onInitUnits,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [unitNumber, setUnitNumber] = useState("");
  const [plate, setPlate] = useState("");
  const [model, setModel] = useState("");
  const [baseStation, setBaseStation] = useState("");
  const [crew, setCrew] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dispatch modal
  const [dispatchingAmb, setDispatchingAmb] = useState<Ambulance | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [destination, setDestination] = useState("");
  const [isDispatching, setIsDispatching] = useState(false);

  // Status modal
  const [editingAmb, setEditingAmb] = useState<Ambulance | null>(null);
  const [newStatus, setNewStatus] = useState<any>("AVAILABLE");

  const waitingPatients = patients.filter((p) => p.status === "WAITING" || p.status === "TRIAGED");

  const handleAddAmbulance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitNumber.trim()) return;
    setIsSubmitting(true);
    try {
      await createAmbulanceApi({
        unitNumber: unitNumber.trim(),
        licensePlate: plate.trim() || "KA-04-ME-1024",
        vehicleModel: model.trim() || "Force Traveller Advance Life Support (ALS)",
        baseStation: baseStation.trim() || "Hospital Trauma Bay 1",
        crewOnBoard: crew.split(",").map((s) => s.trim()).filter(Boolean),
        status: "AVAILABLE",
      });
      setShowAddModal(false);
      setUnitNumber("");
      setPlate("");
      setModel("");
      setBaseStation("");
      setCrew("");
      onRefresh();
    } catch (err: any) {
      alert("Failed to add ambulance: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchingAmb) return;
    setIsDispatching(true);
    try {
      const patient = patients.find((p) => p.id === selectedPatientId);
      await updateAmbulanceStatusApi(
        dispatchingAmb.id,
        "DISPATCHED",
        selectedPatientId,
        patient?.name,
        destination || "Emergency Scene Dispatch"
      );
      setDispatchingAmb(null);
      setSelectedPatientId("");
      setDestination("");
      onRefresh();
    } catch (err: any) {
      alert("Failed to dispatch ambulance: " + err.message);
    } finally {
      setIsDispatching(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!editingAmb) return;
    try {
      await updateAmbulanceStatusApi(editingAmb.id, newStatus);
      setEditingAmb(null);
      onRefresh();
    } catch (err: any) {
      alert("Failed to update ambulance status: " + err.message);
    }
  };

  // Fleet summary counts
  const availableCount = ambulances.filter((a) => a.status === "AVAILABLE").length;
  const dispatchedCount = ambulances.filter(
    (a) => a.status === "DISPATCHED" || a.status === "EN_ROUTE" || a.status === "AT_HOSPITAL"
  ).length;
  const maintenanceCount = ambulances.filter((a) => a.status === "MAINTENANCE").length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[#243447] tracking-tight font-heading">
              Ambulance Emergency Fleet
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#EAF4FF] text-[#1976D2]">
              {ambulances.length} Emergency Units
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Rapid trauma dispatch, live GPS telemetry, paramedic crew management, and intake routing.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {ambulances.length === 0 && (
            <button
              onClick={onInitUnits}
              className="px-3.5 py-2 rounded-lg bg-[#0F9D8A] hover:bg-[#0c8575] text-white text-xs font-semibold shadow-xs flex items-center gap-2 transition"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Initialize Fleet</span>
            </button>
          )}

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-lg bg-[#1976D2] hover:bg-[#1565C0] text-white text-xs font-semibold shadow-xs flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Ambulance</span>
          </button>
        </div>
      </div>

      {/* Fleet Summary KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="medical-card p-4">
          <span className="text-xs font-semibold text-[#64748B]">Total Fleet</span>
          <div className="text-2xl font-bold font-mono text-[#243447] mt-1">{ambulances.length}</div>
          <span className="text-[11px] text-[#64748B] mt-0.5 block">ALS & BLS Units</span>
        </div>

        <div className="medical-card p-4">
          <span className="text-xs font-semibold text-[#16A34A]">Ready / Available</span>
          <div className="text-2xl font-bold font-mono text-[#16A34A] mt-1">{availableCount}</div>
          <span className="text-[11px] text-[#16A34A] mt-0.5 block">Immediate dispatch</span>
        </div>

        <div className="medical-card p-4">
          <span className="text-xs font-semibold text-[#1976D2]">In Transit / Dispatched</span>
          <div className="text-2xl font-bold font-mono text-[#1976D2] mt-1">{dispatchedCount}</div>
          <span className="text-[11px] text-[#64748B] mt-0.5 block">En route or scene</span>
        </div>

        <div className="medical-card p-4">
          <span className="text-xs font-semibold text-[#DC2626]">Maintenance</span>
          <div className="text-2xl font-bold font-mono text-[#DC2626] mt-1">{maintenanceCount}</div>
          <span className="text-[11px] text-[#64748B] mt-0.5 block">Servicing / check</span>
        </div>
      </div>

      {/* Ambulances Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {ambulances.map((amb) => {
          const isAvailable = amb.status === "AVAILABLE";
          const isDispatched =
            amb.status === "DISPATCHED" || amb.status === "EN_ROUTE" || amb.status === "AT_HOSPITAL";

          return (
            <div
              key={amb.id}
              className="medical-card p-5 flex flex-col justify-between space-y-4 hover:border-[#CBD5E1] transition"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-[#EAF4FF] text-[#1976D2] flex items-center justify-center">
                      <AmbulanceIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-[#243447] font-mono">{amb.unitNumber || amb.vehicleNumber}</h2>
                      <p className="text-xs text-[#64748B]">{amb.licensePlate}</p>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                      isAvailable
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : isDispatched
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                  >
                    {amb.status.replace("_", " ")}
                  </span>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-[#64748B]">
                  <div className="text-[#243447] font-medium">{amb.vehicleModel}</div>

                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#94A3B8]" />
                    <span>Station: {amb.baseStation || "Emergency Bay"}</span>
                  </div>

                  {amb.currentPatientName && (
                    <div className="p-2 rounded bg-[#EAF4FF] text-[#1976D2] font-medium text-[11px]">
                      Patient on board: <strong>{amb.currentPatientName}</strong>
                    </div>
                  )}

                  {amb.crewOnBoard && amb.crewOnBoard.length > 0 && (
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <Users className="w-3.5 h-3.5 text-[#94A3B8]" />
                      <span>Crew: {amb.crewOnBoard.join(", ")}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between gap-2">
                <button
                  onClick={() => {
                    setEditingAmb(amb);
                    setNewStatus(amb.status);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#243447] text-xs font-semibold transition"
                >
                  Status
                </button>

                {isAvailable ? (
                  <button
                    onClick={() => {
                      setDispatchingAmb(amb);
                      setSelectedPatientId("");
                      setDestination("");
                    }}
                    className="flex-1 py-1.5 rounded-lg bg-[#1976D2] hover:bg-[#1565C0] text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Dispatch</span>
                  </button>
                ) : (
                  <button
                    onClick={async () => {
                      await updateAmbulanceStatusApi(amb.id, "AVAILABLE");
                      onRefresh();
                    }}
                    className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition"
                  >
                    Mark Ready / Clear
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Dispatch Modal */}
      {dispatchingAmb && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <form
            onSubmit={handleDispatch}
            className="bg-white border border-[#E2E8F0] rounded-xl max-w-md w-full p-5 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <h3 className="text-sm font-bold text-[#243447]">
                Dispatch Ambulance {dispatchingAmb.unitNumber}
              </h3>
              <button
                type="button"
                onClick={() => setDispatchingAmb(null)}
                className="p-1 text-[#64748B] hover:text-[#243447] rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#243447] mb-1">Select Incoming Patient (Optional)</label>
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2 text-xs text-[#243447]"
                >
                  <option value="">-- No specific patient assigned yet --</option>
                  {waitingPatients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.mrn}) • {p.urgencyLevel}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#243447] mb-1">Destination / Incident Location *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ring Road Junction Trauma, Bengaluru"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2 text-xs text-[#243447] focus:outline-none focus:border-[#1976D2]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setDispatchingAmb(null)}
                className="px-4 py-2 rounded-lg bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#243447] text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isDispatching}
                className="px-4 py-2 rounded-lg bg-[#1976D2] hover:bg-[#1565C0] text-white text-xs font-semibold shadow-xs disabled:opacity-50"
              >
                {isDispatching ? "Dispatching..." : "Confirm Dispatch"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Status Modal */}
      {editingAmb && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-xl max-w-md w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <h3 className="text-sm font-bold text-[#243447]">
                Update Status: {editingAmb.unitNumber}
              </h3>
              <button
                onClick={() => setEditingAmb(null)}
                className="p-1 text-[#64748B] hover:text-[#243447] rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <label className="block font-semibold text-[#243447]">Ambulance Status</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2 text-xs text-[#243447]"
              >
                <option value="AVAILABLE">AVAILABLE (Stationed in trauma bay)</option>
                <option value="DISPATCHED">DISPATCHED (En route to emergency scene)</option>
                <option value="EN_ROUTE">EN ROUTE TO HOSPITAL (Patient loaded)</option>
                <option value="AT_HOSPITAL">AT HOSPITAL (Arrived at ED bay)</option>
                <option value="MAINTENANCE">MAINTENANCE (Mechanical or oxygen servicing)</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
              <button
                onClick={() => setEditingAmb(null)}
                className="px-4 py-2 rounded-lg bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#243447] text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateStatus}
                className="px-4 py-2 rounded-lg bg-[#1976D2] hover:bg-[#1565C0] text-white text-xs font-semibold shadow-xs"
              >
                Save Status
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
