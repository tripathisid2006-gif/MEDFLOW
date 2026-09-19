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

const AMB_STATUS_BADGES: Record<
  string,
  { label: string; bg: string; text: string; border: string }
> = {
  AVAILABLE: {
    label: "AVAILABLE",
    bg: "bg-emerald-950/80",
    text: "text-emerald-300",
    border: "border-emerald-800",
  },
  DISPATCHED: {
    label: "DISPATCHED",
    bg: "bg-blue-950/80",
    text: "text-blue-300",
    border: "border-blue-800",
  },
  EN_ROUTE_HOSPITAL: {
    label: "EN ROUTE TO ED",
    bg: "bg-indigo-950/80",
    text: "text-indigo-300",
    border: "border-indigo-800",
  },
  MAINTENANCE: {
    label: "MAINTENANCE",
    bg: "bg-amber-950/80",
    text: "text-amber-300",
    border: "border-amber-800",
  },
};

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

  // Status toggle
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
        licensePlate: plate.trim() || "MED-FL-01",
        vehicleModel: model.trim() || "Ford Transit Type II Mobile ICU",
        baseStation: baseStation.trim() || "Hospital ED Bay 1",
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
      const pat = patients.find((p) => p.id === selectedPatientId);
      await updateAmbulanceStatusApi(
        dispatchingAmb.id,
        "DISPATCHED",
        selectedPatientId || undefined,
        pat?.name,
        destination || "Scene Dispatch"
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

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAmb) return;
    try {
      await updateAmbulanceStatusApi(editingAmb.id, newStatus);
      setEditingAmb(null);
      onRefresh();
    } catch (err: any) {
      alert("Failed to update status: " + err.message);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <AmbulanceIcon className="w-5 h-5 text-yellow-400" />
            <span>Emergency Ambulance Fleet</span>
          </h2>
          <p className="text-xs text-slate-400">
            Pre-hospital trauma coordination, mobile intensive care units, and fleet readiness.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {ambulances.length === 0 && (
            <button
              onClick={onInitUnits}
              className="px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold shadow-sm transition"
            >
              Initialize Standard Fleet
            </button>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Ambulance Unit</span>
          </button>
        </div>
      </div>

      {ambulances.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate-400 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
          <AmbulanceIcon className="w-10 h-10 text-slate-400 mx-auto" />
          <p className="font-semibold text-slate-200">No emergency fleet units configured</p>
          <p className="text-slate-400">Initialize standard units or add mobile trauma rigs to begin tracking.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ambulances.map((amb) => {
            const badge = AMB_STATUS_BADGES[amb.status] || AMB_STATUS_BADGES.AVAILABLE;
            return (
              <div
                key={amb.id}
                className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3 hover:border-slate-700 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-yellow-400">
                        <AmbulanceIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-white">{amb.unitNumber}</div>
                        <div className="text-[11px] font-mono text-slate-400">{amb.licensePlate}</div>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badge.bg} ${badge.text} ${badge.border}`}
                    >
                      {badge.label}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs text-slate-400">
                    <div className="flex items-center justify-between">
                      <span>Vehicle Model:</span>
                      <span className="text-slate-200 font-medium">{amb.vehicleModel}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span>Base Station:</span>
                      <span className="text-slate-200">{amb.baseStation}</span>
                    </div>

                    {amb.crewOnBoard && amb.crewOnBoard.length > 0 && (
                      <div className="flex items-center justify-between">
                        <span>Crew:</span>
                        <span className="text-slate-300 truncate max-w-xs">{amb.crewOnBoard.join(", ")}</span>
                      </div>
                    )}

                    {amb.currentPatientName && (
                      <div className="p-2 rounded bg-indigo-950/40 border border-indigo-900/60 text-indigo-200 text-[11px] mt-2">
                        Assigned: <span className="font-semibold">{amb.currentPatientName}</span>
                        {amb.currentLocation && ` • Destination: ${amb.currentLocation}`}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-850 flex items-center justify-between">
                  <button
                    onClick={() => {
                      setEditingAmb(amb);
                      setNewStatus(amb.status);
                    }}
                    className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Status</span>
                  </button>

                  {amb.status === "AVAILABLE" ? (
                    <button
                      onClick={() => {
                        setDispatchingAmb(amb);
                        setSelectedPatientId("");
                        setDestination("");
                      }}
                      className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Dispatch</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => updateAmbulanceStatusApi(amb.id, "AVAILABLE").then(onRefresh)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
                    >
                      Mark Available
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dispatch Modal */}
      {dispatchingAmb && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleDispatch}
            className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">
                Dispatch Ambulance: {dispatchingAmb.unitNumber}
              </h3>
              <button
                type="button"
                onClick={() => setDispatchingAmb(null)}
                className="p-1 text-slate-400 hover:text-slate-200 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Assign to Incoming / Registered Patient (Optional)
                </label>
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs"
                >
                  <option value="">-- General Scene Dispatch --</option>
                  {waitingPatients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.mrn}) — {p.urgencyLevel}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Dispatch Location / Coordinates *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Highway 101 North Mile Marker 42, Multi-vehicle collision"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDispatchingAmb(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isDispatching}
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition disabled:opacity-50 flex items-center gap-2"
              >
                <Navigation className="w-4 h-4" />
                <span>{isDispatching ? "Dispatching..." : "Confirm Dispatch"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Status Modal */}
      {editingAmb && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleUpdateStatus}
            className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">
                Update Status: {editingAmb.unitNumber}
              </h3>
              <button
                type="button"
                onClick={() => setEditingAmb(null)}
                className="p-1 text-slate-400 hover:text-slate-200 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Ambulance Fleet Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs"
                >
                  <option value="AVAILABLE">AVAILABLE (Stationed at bay)</option>
                  <option value="DISPATCHED">DISPATCHED (En route to emergency)</option>
                  <option value="EN_ROUTE_HOSPITAL">EN ROUTE TO ED (Patient on board)</option>
                  <option value="MAINTENANCE">MAINTENANCE (Mechanical servicing)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingAmb(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition"
              >
                Save Status
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Ambulance Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleAddAmbulance}
            className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">Add Ambulance Unit</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-200 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Unit Call Sign / ID *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AMB-04"
                  value={unitNumber}
                  onChange={(e) => setUnitNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">License Plate</label>
                  <input
                    type="text"
                    placeholder="e.g. MED-9912"
                    value={plate}
                    onChange={(e) => setPlate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Vehicle Model</label>
                  <input
                    type="text"
                    placeholder="e.g. Mercedes Sprinter MICU"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Base Station / Bay</label>
                <input
                  type="text"
                  placeholder="e.g. Hospital Trauma Bay 2"
                  value={baseStation}
                  onChange={(e) => setBaseStation(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Crew Members (comma separated)</label>
                <input
                  type="text"
                  placeholder="e.g. John Miller (EMT-P), Sarah Connor (RN)"
                  value={crew}
                  onChange={(e) => setCrew(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition disabled:opacity-50"
              >
                {isSubmitting ? "Creating..." : "Save Unit"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
