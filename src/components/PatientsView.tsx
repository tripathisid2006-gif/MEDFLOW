import React, { useState } from "react";
import {
  UserPlus,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  UploadCloud,
  FileText,
  Search,
  CheckCircle2,
  Stethoscope,
  ChevronRight,
  Info,
  X,
} from "lucide-react";
import type {
  Patient,
  PatientAssessment,
  UrgencyLevel,
  UserRole,
  Department,
} from "../types";
import {
  createPatientApi,
  analyzePatientAi,
  confirmAssessmentApi,
  searchIcdApi,
} from "../api";

interface PatientsViewProps {
  patients: Patient[];
  departments: Department[];
  currentRole: UserRole;
  currentUserName: string;
  onPatientAdded: () => void;
  onSelectPatientForQueue?: (patientId: string) => void;
}

export const PatientsView: React.FC<PatientsViewProps> = ({
  patients,
  departments,
  currentRole,
  currentUserName,
  onPatientAdded,
}) => {
  // Form State
  const [name, setName] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [gender, setGender] = useState<"Male" | "Female" | "Other">("Male");
  const [contact, setContact] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [heartRate, setHeartRate] = useState<number | "">("");
  const [bpSystolic, setBpSystolic] = useState<number | "">("");
  const [bpDiastolic, setBpDiastolic] = useState<number | "">("");
  const [spo2, setSpo2] = useState<number | "">("");
  const [respRate, setRespRate] = useState<number | "">("");
  const [tempC, setTempC] = useState<number | "">("");
  const [knownConditions, setKnownConditions] = useState("");
  const [allergies, setAllergies] = useState("");
  const [requiredTreatment, setRequiredTreatment] = useState("");
  const [emergencyStatus, setEmergencyStatus] = useState(false);

  // Document upload state
  const [docFile, setDocFile] = useState<{ name: string; type: string; base64: string } | null>(null);

  // AI Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAssessment, setAiAssessment] = useState<any | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // ICD search
  const [icdQuery, setIcdQuery] = useState("");
  const [icdResults, setIcdResults] = useState<any[]>([]);
  const [selectedIcd, setSelectedIcd] = useState<any | null>(null);
  const [isSearchingIcd, setIsSearchingIcd] = useState(false);

  // Form submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [registeredPatient, setRegisteredPatient] = useState<Patient | null>(null);

  // List view search/filter
  const [filterQuery, setFilterQuery] = useState("");
  const [filterUrgency, setFilterUrgency] = useState<string>("ALL");
  const [viewingPatientModal, setViewingPatientModal] = useState<Patient | null>(null);

  // File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(",")[1];
      setDocFile({
        name: file.name,
        type: file.type,
        base64: base64Data,
      });
    };
    reader.readAsDataURL(file);
  };

  // Run AI Intake Analysis
  const handleRunAiAnalysis = async () => {
    if (!symptoms.trim()) {
      setAiError("Please enter patient symptoms first to run AI triage.");
      return;
    }
    setIsAnalyzing(true);
    setAiError(null);
    try {
      const payload = {
        patientName: name || "Intake Patient",
        age: Number(age) || 40,
        gender,
        symptoms,
        clinicalNotes,
        vitalSigns: {
          heartRate: heartRate !== "" ? Number(heartRate) : undefined,
          bloodPressureSystolic: bpSystolic !== "" ? Number(bpSystolic) : undefined,
          bloodPressureDiastolic: bpDiastolic !== "" ? Number(bpDiastolic) : undefined,
          oxygenSaturation: spo2 !== "" ? Number(spo2) : undefined,
          respiratoryRate: respRate !== "" ? Number(respRate) : undefined,
          temperatureCelsius: tempC !== "" ? Number(tempC) : undefined,
        },
        knownConditions: knownConditions.split(",").map((s) => s.trim()).filter(Boolean),
        allergies: allergies.split(",").map((s) => s.trim()).filter(Boolean),
        documentBase64: docFile?.base64,
        documentMimeType: docFile?.type,
      };

      const result = await analyzePatientAi(payload);
      setAiAssessment(result);

      // Auto-populate treatment or department if recommended
      if (result.recommended_department && !selectedDeptId) {
        const match = departments.find((d) =>
          d.name.toLowerCase().includes(result.recommended_department.toLowerCase())
        );
        if (match) setSelectedDeptId(match.id);
      }
      if (result.suggested_resources && result.suggested_resources.length > 0 && !requiredTreatment) {
        setRequiredTreatment(result.suggested_resources.map((r: any) => `${r.resource_type}: ${r.reason}`).join("; "));
      }
    } catch (err: any) {
      setAiError(err.message || "Failed to complete AI intake triage");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ICD Search Handler
  const handleSearchIcd = async (q: string) => {
    setIcdQuery(q);
    if (!q.trim()) {
      setIcdResults([]);
      return;
    }
    setIsSearchingIcd(true);
    try {
      const results = await searchIcdApi(q);
      setIcdResults(results);
    } catch {
      setIcdResults([]);
    } finally {
      setIsSearchingIcd(false);
    }
  };

  // Submit Patient Registration
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setSubmitError("Patient name is required.");
      return;
    }
    if (!symptoms.trim()) {
      setSubmitError("Primary symptoms are required.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const urgency: UrgencyLevel = aiAssessment?.urgency_level || (emergencyStatus ? "CRITICAL" : "MODERATE");
      const deptObj = departments.find((d) => d.id === selectedDeptId);

      const patientData: Partial<Patient> = {
        name,
        age: Number(age) || 0,
        gender,
        contact: contact || "Not provided",
        arrivalTime: new Date().toISOString(),
        symptoms,
        clinicalNotes,
        departmentId: selectedDeptId || undefined,
        departmentName: deptObj?.name,
        vitalSigns: {
          heartRate: heartRate !== "" ? Number(heartRate) : undefined,
          bloodPressureSystolic: bpSystolic !== "" ? Number(bpSystolic) : undefined,
          bloodPressureDiastolic: bpDiastolic !== "" ? Number(bpDiastolic) : undefined,
          oxygenSaturation: spo2 !== "" ? Number(spo2) : undefined,
          respiratoryRate: respRate !== "" ? Number(respRate) : undefined,
          temperatureCelsius: tempC !== "" ? Number(tempC) : undefined,
        },
        knownConditions: knownConditions.split(",").map((s) => s.trim()).filter(Boolean),
        allergies: allergies.split(",").map((s) => s.trim()).filter(Boolean),
        requiredTreatment: requiredTreatment || "Initial clinical evaluation",
        emergencyStatus,
        urgencyLevel: urgency,
        status: "WAITING",
        documentName: docFile?.name,
        documentType: docFile?.type,
      };

      const newPatient = await createPatientApi(patientData);

      // If AI assessment exists, save and link
      if (aiAssessment) {
        await analyzePatientAi({
          patientId: newPatient.id,
          ...aiAssessment,
        });
      }

      setRegisteredPatient(newPatient);
      onPatientAdded();

      // Reset form
      setName("");
      setAge("");
      setContact("");
      setSymptoms("");
      setClinicalNotes("");
      setHeartRate("");
      setBpSystolic("");
      setBpDiastolic("");
      setSpo2("");
      setRespRate("");
      setTempC("");
      setKnownConditions("");
      setAllergies("");
      setRequiredTreatment("");
      setEmergencyStatus(false);
      setDocFile(null);
      setAiAssessment(null);
    } catch (err: any) {
      setSubmitError(err.message || "Failed to register patient");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm Assessment action
  const handleConfirmAssessment = async (assessmentId: string) => {
    try {
      await confirmAssessmentApi(assessmentId, currentUserName, currentRole);
      onPatientAdded();
      if (viewingPatientModal) {
        setViewingPatientModal(null);
      }
    } catch (err: any) {
      alert("Error confirming assessment: " + err.message);
    }
  };

  // Filtered Patients
  const filteredPatients = patients.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
      p.mrn.toLowerCase().includes(filterQuery.toLowerCase()) ||
      p.symptoms.toLowerCase().includes(filterQuery.toLowerCase());
    const matchesUrgency = filterUrgency === "ALL" || p.urgencyLevel === filterUrgency;
    return matchesSearch && matchesUrgency;
  });

  return (
    <div className="space-y-8 pb-12">
      {/* Registration Form Header */}
      <div>
        <h2 className="text-lg font-bold text-white tracking-tight">Patient Intake & AI Triage</h2>
        <p className="text-xs text-slate-400">
          Register live patient, run structured Gemini clinical intake analysis, and insert into the deterministic queue.
        </p>
      </div>

      {registeredPatient && (
        <div className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-800 text-emerald-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <div>
              <span className="font-semibold text-emerald-100">Patient {registeredPatient.name} registered:</span>{" "}
              MRN {registeredPatient.mrn}, Urgency {registeredPatient.urgencyLevel}, Priority Score{" "}
              {registeredPatient.priorityScore}. Successfully entered the Priority Queue.
            </div>
          </div>
          <button
            onClick={() => setRegisteredPatient(null)}
            className="text-xs px-2.5 py-1 rounded bg-emerald-900/60 hover:bg-emerald-800 text-emerald-100 border border-emerald-700/60"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Registration Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Form */}
        <div className="lg:col-span-2 space-y-5">
          <form onSubmit={handleSubmit} className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2 flex items-center justify-between">
              <span>Patient Demographics & Arrival</span>
              <span className="text-[11px] font-normal text-slate-400">All fields persist to live database</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kulkarni"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Age *</label>
                <input
                  type="number"
                  min="0"
                  max="125"
                  required
                  placeholder="e.g. 54"
                  value={age}
                  onChange={(e) => setAge(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-hidden focus:border-blue-500"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Contact / Next of Kin</label>
                <input
                  type="text"
                  placeholder="e.g. +91 98450 12345 (Son)"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Target Department</label>
                <select
                  value={selectedDeptId}
                  onChange={(e) => setSelectedDeptId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-hidden focus:border-blue-500"
                >
                  <option value="">Auto-Assign by Triage</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name} ({dept.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Symptoms & Clinical Notes */}
            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Presenting Symptoms / Chief Complaint *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Acute substernal chest pressure radiating to left arm, diaphoresis, onset 45 minutes ago."
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-hidden focus:border-blue-500 leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Clinical Notes (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Patient is pale, clutching chest. History of hypertension and coronary artery disease."
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-hidden focus:border-blue-500 leading-relaxed"
                />
              </div>
            </div>

            {/* Vital Signs Grid */}
            <div className="pt-2">
              <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
                <span>Vital Signs (Clinical Risk Factor Inputs)</span>
                <span className="text-[11px] text-slate-400">Used by deterministic risk scoring</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-0.5">Heart Rate (bpm)</label>
                  <input
                    type="number"
                    placeholder="75"
                    value={heartRate}
                    onChange={(e) => setHeartRate(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-0.5">BP Systolic</label>
                  <input
                    type="number"
                    placeholder="120"
                    value={bpSystolic}
                    onChange={(e) => setBpSystolic(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-0.5">BP Diastolic</label>
                  <input
                    type="number"
                    placeholder="80"
                    value={bpDiastolic}
                    onChange={(e) => setBpDiastolic(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-0.5">SpO2 (%)</label>
                  <input
                    type="number"
                    placeholder="98"
                    value={spo2}
                    onChange={(e) => setSpo2(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-0.5">Resp Rate (/min)</label>
                  <input
                    type="number"
                    placeholder="16"
                    value={respRate}
                    onChange={(e) => setRespRate(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-0.5">Temp (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="36.8"
                    value={tempC}
                    onChange={(e) => setTempC(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Background Medical History */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Known Conditions (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Diabetes Type 2, Hypertension"
                  value={knownConditions}
                  onChange={(e) => setKnownConditions(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Allergies (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Penicillin, NSAIDs"
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs"
                />
              </div>
            </div>

            {/* Document Upload & Emergency Status Toggle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 items-center">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Attach Medical Document / ECG / Referral
                </label>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-300 text-xs flex items-center gap-2 transition">
                    <UploadCloud className="w-4 h-4 text-blue-400" />
                    <span>{docFile ? "Replace Document" : "Upload File / Image"}</span>
                    <input
                      type="file"
                      accept="image/*,.pdf,.txt"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  {docFile && (
                    <span className="text-xs text-slate-400 truncate max-w-xs">{docFile.name}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 sm:pt-0">
                <input
                  type="checkbox"
                  id="emergency-status-check"
                  checked={emergencyStatus}
                  onChange={(e) => setEmergencyStatus(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-red-600 focus:ring-red-500"
                />
                <label htmlFor="emergency-status-check" className="text-xs font-semibold text-slate-200 cursor-pointer">
                  Code Red / Emergency Status (Direct Trauma / Resuscitation)
                </label>
              </div>
            </div>

            {submitError && (
              <div className="p-3 rounded-lg bg-red-950/50 border border-red-900 text-red-300 text-xs">
                {submitError}
              </div>
            )}

            {/* Actions: AI Intake & Submit */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                id="run-ai-triage-btn"
                onClick={handleRunAiAnalysis}
                disabled={isAnalyzing}
                className="px-3.5 py-2 rounded-lg bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 border border-indigo-700/60 text-xs font-semibold flex items-center gap-2 transition disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>{isAnalyzing ? "Gemini Evaluating Intake..." : "Run AI Intake Analysis"}</span>
              </button>

              <button
                type="submit"
                id="register-patient-btn"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition disabled:opacity-50 flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>{isSubmitting ? "Registering..." : "Register & Add to Queue"}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Col: Structured AI Triage Card & WHO ICD Search */}
        <div className="space-y-4">
          {/* Gemini AI Assessment Panel */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">AI Intake Triage</h3>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-950 border border-indigo-800 text-indigo-300">
                Gemini 3.8
              </span>
            </div>

            {aiError && (
              <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-900/60 text-red-200 text-xs">
                {aiError}
              </div>
            )}

            {!aiAssessment ? (
              <div className="py-8 text-center text-xs text-slate-400 space-y-2">
                <Info className="w-6 h-6 text-slate-400 mx-auto" />
                <p>Fill symptoms and click &ldquo;Run AI Intake Analysis&rdquo; to receive structured triage, red flag detection, and resource recommendations.</p>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                {/* Urgency & Confidence */}
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div>
                    <span className="text-[11px] text-slate-400">Assessed Urgency:</span>
                    <div className="text-sm font-bold text-white mt-0.5">{aiAssessment.urgency_level}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400">Confidence:</span>
                    <div className="text-xs font-mono font-bold text-indigo-300 mt-0.5">
                      {Math.round(aiAssessment.confidence * 100)}%
                    </div>
                  </div>
                </div>

                {/* Red Flags */}
                {aiAssessment.red_flags && aiAssessment.red_flags.length > 0 && (
                  <div className="p-2.5 rounded-lg bg-red-950/30 border border-red-900/50 text-red-200 space-y-1">
                    <div className="font-semibold flex items-center gap-1.5 text-red-300">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Clinical Red Flags</span>
                    </div>
                    <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-red-300/90">
                      {aiAssessment.red_flags.map((flag: string, idx: number) => (
                        <li key={idx}>{flag}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Possible Conditions */}
                {aiAssessment.possible_conditions && aiAssessment.possible_conditions.length > 0 && (
                  <div>
                    <span className="font-semibold text-slate-300 block mb-1">Provisional Conditions:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {aiAssessment.possible_conditions.map((cond: string, idx: number) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded bg-slate-850 text-slate-300 border border-slate-750 text-[11px]"
                        >
                          {cond}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggested Resources */}
                {aiAssessment.suggested_resources && aiAssessment.suggested_resources.length > 0 && (
                  <div>
                    <span className="font-semibold text-slate-300 block mb-1">Recommended Resources:</span>
                    <div className="space-y-1">
                      {aiAssessment.suggested_resources.map((res: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-1.5 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-300 flex items-center justify-between"
                        >
                          <span className="font-semibold text-blue-300">
                            {res.quantity}x {res.resource_type}
                          </span>
                          <span className="text-slate-400 text-[10px] truncate max-w-xs">{res.reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mandatory Disclaimer */}
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400 leading-relaxed italic">
                  &ldquo;AI-assisted assessment — final clinical decisions must be made by authorized medical staff.&rdquo;
                </div>
              </div>
            )}
          </div>

          {/* WHO ICD Search Card */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">WHO ICD Taxonomy</h3>
              </div>
              <span className="text-[10px] text-slate-400">ICD-10 / ICD-11</span>
            </div>

            <input
              type="text"
              placeholder="Search condition (e.g. Infarction, Sepsis, Fracture)..."
              value={icdQuery}
              onChange={(e) => handleSearchIcd(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-hidden focus:border-blue-500"
            />

            {isSearchingIcd && <div className="text-[11px] text-slate-400">Searching WHO index...</div>}

            <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
              {icdResults.map((item) => (
                <div
                  key={item.code}
                  onClick={() => {
                    setSelectedIcd(item);
                    if (!knownConditions.includes(item.title)) {
                      setKnownConditions(
                        knownConditions ? `${knownConditions}, ${item.title}` : item.title
                      );
                    }
                  }}
                  className="p-2 rounded-lg bg-slate-950 hover:bg-slate-850 border border-slate-800 cursor-pointer text-xs transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-blue-400 font-bold">{item.code}</span>
                    <span className="text-[10px] text-slate-400">{item.category}</span>
                  </div>
                  <div className="text-slate-200 mt-0.5 text-[11px] line-clamp-1">{item.title}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Registered Patients Directory */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white">Registered Patient Directory</h3>
            <p className="text-xs text-slate-400">All live records currently in database</p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search by name, MRN, symptoms..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs w-56"
            />
            <select
              value={filterUrgency}
              onChange={(e) => setFilterUrgency(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs"
            >
              <option value="ALL">All Urgencies</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MODERATE">Moderate</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>

        {patients.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No patients registered yet. Register the first patient above to begin operations.
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No patients match the specified filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[11px] border-b border-slate-800">
                <tr>
                  <th className="px-3 py-2.5">MRN</th>
                  <th className="px-3 py-2.5">Patient Name</th>
                  <th className="px-3 py-2.5">Age/Gen</th>
                  <th className="px-3 py-2.5">Urgency</th>
                  <th className="px-3 py-2.5">Symptoms</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredPatients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-slate-850/50 transition">
                    <td className="px-3 py-2.5 font-mono text-blue-400 font-medium">{patient.mrn}</td>
                    <td className="px-3 py-2.5 font-semibold text-slate-100">{patient.name}</td>
                    <td className="px-3 py-2.5 text-slate-400">
                      {patient.age}y / {patient.gender[0]}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          patient.urgencyLevel === "CRITICAL"
                            ? "bg-red-950 text-red-300 border border-red-800"
                            : patient.urgencyLevel === "HIGH"
                            ? "bg-orange-950 text-orange-300 border border-orange-800"
                            : patient.urgencyLevel === "MODERATE"
                            ? "bg-amber-950 text-amber-300 border border-amber-800"
                            : "bg-blue-950 text-blue-300 border border-blue-800"
                        }`}
                      >
                        {patient.urgencyLevel}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-300 max-w-xs truncate">{patient.symptoms}</td>
                    <td className="px-3 py-2.5">
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                        {patient.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        onClick={() => setViewingPatientModal(patient)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
                      >
                        View Assessment
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Patient Assessment Modal */}
      {viewingPatientModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white">
                  Clinical Record: {viewingPatientModal.name} ({viewingPatientModal.mrn})
                </h3>
                <p className="text-xs text-slate-400">
                  Arrival: {new Date(viewingPatientModal.arrivalTime).toLocaleTimeString()} • Priority Score:{" "}
                  {viewingPatientModal.priorityScore}
                </p>
              </div>
              <button
                onClick={() => setViewingPatientModal(null)}
                className="p-1 text-slate-400 hover:text-slate-200 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="font-semibold text-slate-300 block mb-1">Symptoms & Clinical Notes:</span>
                <p className="text-slate-300 leading-relaxed">{viewingPatientModal.symptoms}</p>
                {viewingPatientModal.clinicalNotes && (
                  <p className="text-slate-400 mt-1 italic">{viewingPatientModal.clinicalNotes}</p>
                )}
              </div>

              {viewingPatientModal.assessment && (
                <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-900/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-indigo-300">Gemini Intake Assessment</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-900 text-indigo-200">
                      {viewingPatientModal.assessment.staffConfirmed ? "Clinically Confirmed" : "Pending Confirmation"}
                    </span>
                  </div>

                  <div className="text-slate-300">
                    Urgency: <span className="font-bold">{viewingPatientModal.assessment.urgency_level}</span> (
                    {Math.round(viewingPatientModal.assessment.confidence * 100)}% confidence)
                  </div>

                  {viewingPatientModal.assessment.red_flags.length > 0 && (
                    <div className="text-red-300">
                      Red Flags: {viewingPatientModal.assessment.red_flags.join(", ")}
                    </div>
                  )}

                  {viewingPatientModal.assessment.suggested_resources.length > 0 && (
                    <div className="text-slate-300">
                      Suggested Resources:{" "}
                      {viewingPatientModal.assessment.suggested_resources
                        .map((r) => `${r.quantity}x ${r.resource_type} (${r.reason})`)
                        .join("; ")}
                    </div>
                  )}

                  {!viewingPatientModal.assessment.staffConfirmed && (
                    <div className="pt-2">
                      <button
                        onClick={() => handleConfirmAssessment(viewingPatientModal.assessment!.id)}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center gap-1.5 transition"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>Confirm Triage as {currentUserName} ({currentRole})</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
