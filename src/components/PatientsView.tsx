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
  X,
  Users,
  Activity,
  HeartPulse,
} from "lucide-react";
import type {
  Patient,
  UrgencyLevel,
  UserRole,
  Department,
} from "../types";
import {
  createPatientApi,
  analyzePatientAi,
  confirmAssessmentApi,
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
      setAiError("Please describe patient symptoms first to run intake evaluation.");
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

      if (result.recommended_department && !selectedDeptId) {
        const match = departments.find((d) =>
          d.name.toLowerCase().includes(result.recommended_department.toLowerCase())
        );
        if (match) setSelectedDeptId(match.id);
      }
      if (result.suggested_resources && result.suggested_resources.length > 0 && !requiredTreatment) {
        setRequiredTreatment(
          result.suggested_resources.map((r: any) => `${r.resource_type}: ${r.reason}`).join("; ")
        );
      }
    } catch (err: any) {
      setAiError(err.message || "Failed to complete AI triage");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Submit Patient Registration
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setSubmitError("Patient full name is required.");
      return;
    }
    if (!symptoms.trim()) {
      setSubmitError("Chief complaints / symptoms are required.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const urgency: UrgencyLevel =
        aiAssessment?.urgency_level || (emergencyStatus ? "CRITICAL" : "MODERATE");
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
      alert("Assessment confirmed by clinical physician.");
      onPatientAdded();
    } catch (err: any) {
      alert("Failed to confirm assessment: " + err.message);
    }
  };

  // Filtered Patients List
  const filteredPatients = patients.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
      p.mrn.toLowerCase().includes(filterQuery.toLowerCase()) ||
      p.symptoms.toLowerCase().includes(filterQuery.toLowerCase()) ||
      (p.departmentName && p.departmentName.toLowerCase().includes(filterQuery.toLowerCase()));

    const matchesUrgency = filterUrgency === "ALL" || p.urgencyLevel === filterUrgency;
    return matchesSearch && matchesUrgency;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="border-b border-[#E2E8F0] pb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-bold text-[#243447] tracking-tight font-heading">
            Patient Admissions & Roster
          </h1>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#EAF4FF] text-[#1976D2]">
            {patients.length} Registered Patients
          </span>
        </div>
        <p className="text-xs text-[#64748B] mt-0.5">
          Emergency intake triage, vital sign capture, electronic medical records, and bed assignment queue.
        </p>
      </div>

      {registeredPatient && (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold">
                Patient Registered Successfully: {registeredPatient.name}
              </span>{" "}
              (MRN: {registeredPatient.mrn} • Urgency: {registeredPatient.urgencyLevel})
            </div>
          </div>
          <button
            onClick={() => setRegisteredPatient(null)}
            className="text-xs font-semibold text-emerald-800 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Grid: Registration Form (Left) & Active Roster (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Admission Form */}
        <div className="lg:col-span-6 medical-card p-5 space-y-4">
          <div className="border-b border-[#E2E8F0] pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-[#1976D2]" />
              <h2 className="text-sm font-bold text-[#243447]">New Patient Admission & Intake</h2>
            </div>
            <span className="text-[11px] text-[#64748B]">OPD / Emergency Intake</span>
          </div>

          {submitError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{submitError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Demographics */}
            <div className="space-y-2">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                1. Patient Demographics
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#243447] mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2 text-xs text-[#243447] focus:outline-none focus:border-[#1976D2] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#243447] mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2 text-xs text-[#243447] focus:outline-none focus:border-[#1976D2] focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#243447] mb-1">Age</label>
                  <input
                    type="number"
                    placeholder="e.g. 52"
                    value={age}
                    onChange={(e) => setAge(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2 text-xs text-[#243447]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#243447] mb-1">Gender</label>
                  <select
                    value={gender}
                    onChange={(e: any) => setGender(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2 text-xs text-[#243447]"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Clinical Symptoms */}
            <div className="space-y-2 pt-2 border-t border-[#E2E8F0]">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                2. Symptoms & Clinical Evaluation
              </h3>
              <div>
                <label className="block font-semibold text-[#243447] mb-1">
                  Primary Symptoms / Chief Complaint *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Acute severe chest pain radiating to left arm, shortness of breath, diaphoresis for 45 minutes"
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2 text-xs text-[#243447] focus:outline-none focus:border-[#1976D2] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#243447] mb-1">Admitting Department</label>
                  <select
                    value={selectedDeptId}
                    onChange={(e) => setSelectedDeptId(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2 text-xs text-[#243447]"
                  >
                    <option value="">General Facility</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#243447] mb-1">Required Treatment</label>
                  <input
                    type="text"
                    placeholder="e.g. Emergency Cardiac Catheterization"
                    value={requiredTreatment}
                    onChange={(e) => setRequiredTreatment(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2 text-xs text-[#243447]"
                  />
                </div>
              </div>
            </div>

            {/* Vital Signs */}
            <div className="space-y-2 pt-2 border-t border-[#E2E8F0]">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                3. Triage Vital Signs
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-[10px] text-[#64748B] mb-0.5">Heart Rate (bpm)</label>
                  <input
                    type="number"
                    placeholder="78"
                    value={heartRate}
                    onChange={(e) => setHeartRate(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded p-1.5 text-xs text-[#243447]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-[#64748B] mb-0.5">Systolic BP</label>
                  <input
                    type="number"
                    placeholder="120"
                    value={bpSystolic}
                    onChange={(e) => setBpSystolic(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded p-1.5 text-xs text-[#243447]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-[#64748B] mb-0.5">SpO2 (%)</label>
                  <input
                    type="number"
                    placeholder="98"
                    value={spo2}
                    onChange={(e) => setSpo2(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded p-1.5 text-xs text-[#243447]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-[#64748B] mb-0.5">Temp (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="37.0"
                    value={tempC}
                    onChange={(e) => setTempC(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded p-1.5 text-xs text-[#243447]"
                  />
                </div>
              </div>
            </div>

            {/* Document Upload & AI Assist button */}
            <div className="space-y-2 pt-2 border-t border-[#E2E8F0]">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                  4. Clinical Intake Assistance
                </h3>
                <label className="cursor-pointer text-[11px] text-[#1976D2] hover:underline flex items-center gap-1">
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>{docFile ? docFile.name : "Attach Report / ECG"}</span>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Quiet AI Assist Trigger */}
              <button
                type="button"
                onClick={handleRunAiAnalysis}
                disabled={isAnalyzing || !symptoms.trim()}
                className="w-full py-2 rounded-lg bg-[#EAF4FF] hover:bg-[#dbeafe] text-[#1976D2] font-semibold text-xs flex items-center justify-center gap-2 border border-[#1976D2]/30 transition disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>
                  {isAnalyzing
                    ? "Evaluating clinical indicators..."
                    : "Generate AI-Assisted Intake Assessment"}
                </span>
              </button>

              {aiError && (
                <p className="text-[11px] text-[#DC2626]">{aiError}</p>
              )}

              {/* AI Assessment Result in Medical Record style */}
              {aiAssessment && (
                <div className="p-3.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#243447] flex items-center gap-1.5">
                      <Stethoscope className="w-3.5 h-3.5 text-[#1976D2]" />
                      <span>AI-Assisted Assessment</span>
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        aiAssessment.urgency_level === "CRITICAL"
                          ? "bg-red-50 text-red-700 border border-red-200"
                          : aiAssessment.urgency_level === "HIGH"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-blue-50 text-blue-700 border border-blue-200"
                      }`}
                    >
                      {aiAssessment.urgency_level}
                    </span>
                  </div>

                  <p className="text-[11px] text-[#243447] leading-relaxed">
                    {aiAssessment.clinical_rationale || aiAssessment.assessment_summary}
                  </p>

                  <div className="text-[10px] text-[#64748B] italic pt-1 border-t border-[#E2E8F0]">
                    AI-assisted assessment requires clinical review.
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-semibold text-[#DC2626] cursor-pointer">
                <input
                  type="checkbox"
                  checked={emergencyStatus}
                  onChange={(e) => setEmergencyStatus(e.target.checked)}
                  className="rounded border-[#DC2626] text-[#DC2626] focus:ring-red-500"
                />
                <span>Direct Emergency Alert</span>
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-lg bg-[#1976D2] hover:bg-[#1565C0] text-white text-xs font-semibold shadow-xs transition disabled:opacity-50"
              >
                {isSubmitting ? "Registering..." : "Admit & Queue Patient"}
              </button>
            </div>
          </form>
        </div>

        {/* Patients Roster List */}
        <div className="lg:col-span-6 space-y-4">
          <div className="medical-card p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#1976D2]" />
                <h2 className="text-sm font-bold text-[#243447]">Active Hospital Census</h2>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={filterUrgency}
                  onChange={(e) => setFilterUrgency(e.target.value)}
                  className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-2.5 py-1 text-xs text-[#243447]"
                >
                  <option value="ALL">All Urgencies</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MODERATE">Moderate</option>
                  <option value="LOW">Low</option>
                </select>
              </div>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search patient name, MRN, diagnosis..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#243447] placeholder-[#94A3B8]"
              />
            </div>

            {/* Patients List Table */}
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-[#64748B] text-[11px] uppercase font-semibold">
                    <th className="pb-2">Patient</th>
                    <th className="pb-2">Urgency</th>
                    <th className="pb-2">Department</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {filteredPatients.map((patient) => (
                    <tr
                      key={patient.id}
                      onClick={() => setViewingPatientModal(patient)}
                      className="hover:bg-[#F8FAFC] transition cursor-pointer"
                    >
                      <td className="py-2.5">
                        <div className="font-semibold text-[#243447]">{patient.name}</div>
                        <div className="text-[10px] text-[#64748B] font-mono">
                          {patient.mrn} • {patient.age}y {patient.gender[0]}
                        </div>
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

                      <td className="py-2.5 text-[#64748B]">
                        {patient.departmentName || "General"}
                      </td>

                      <td className="py-2.5">
                        <span className="text-[11px] font-semibold text-[#1976D2]">
                          {patient.status}
                        </span>
                      </td>

                      <td className="py-2.5 text-right">
                        <span className="text-xs font-semibold text-[#1976D2] hover:underline">
                          Inspect →
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Patient Record Modal */}
      {viewingPatientModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-xl max-w-lg w-full p-5 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div>
                <h3 className="text-base font-bold text-[#243447]">
                  {viewingPatientModal.name}
                </h3>
                <p className="text-xs text-[#64748B] font-mono">
                  MRN: {viewingPatientModal.mrn} • Age: {viewingPatientModal.age} • {viewingPatientModal.gender}
                </p>
              </div>
              <button
                onClick={() => setViewingPatientModal(null)}
                className="p-1 text-[#64748B] hover:text-[#243447] rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                <div className="font-semibold text-[#243447]">Symptoms / Chief Complaint:</div>
                <p className="text-[#64748B] leading-relaxed">{viewingPatientModal.symptoms}</p>
              </div>

              {viewingPatientModal.vitalSigns && (
                <div>
                  <div className="font-semibold text-[#243447] mb-1">Vital Signs:</div>
                  <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
                    <div className="bg-[#F8FAFC] p-1.5 rounded border border-[#E2E8F0]">
                      <div className="text-[10px] text-[#64748B]">Heart Rate</div>
                      <div className="font-bold">
                        {viewingPatientModal.vitalSigns.heartRate
                          ? `${viewingPatientModal.vitalSigns.heartRate} bpm`
                          : "—"}
                      </div>
                    </div>
                    <div className="bg-[#F8FAFC] p-1.5 rounded border border-[#E2E8F0]">
                      <div className="text-[10px] text-[#64748B]">Blood Pressure</div>
                      <div className="font-bold">
                        {viewingPatientModal.vitalSigns.bloodPressureSystolic &&
                        viewingPatientModal.vitalSigns.bloodPressureDiastolic
                          ? `${viewingPatientModal.vitalSigns.bloodPressureSystolic}/${viewingPatientModal.vitalSigns.bloodPressureDiastolic}`
                          : "—"}
                      </div>
                    </div>
                    <div className="bg-[#F8FAFC] p-1.5 rounded border border-[#E2E8F0]">
                      <div className="text-[10px] text-[#64748B]">SpO2</div>
                      <div className="font-bold">
                        {viewingPatientModal.vitalSigns.oxygenSaturation
                          ? `${viewingPatientModal.vitalSigns.oxygenSaturation}%`
                          : "—"}
                      </div>
                    </div>
                    <div className="bg-[#F8FAFC] p-1.5 rounded border border-[#E2E8F0]">
                      <div className="text-[10px] text-[#64748B]">Temp</div>
                      <div className="font-bold">
                        {viewingPatientModal.vitalSigns.temperatureCelsius
                          ? `${viewingPatientModal.vitalSigns.temperatureCelsius}°C`
                          : "—"}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded bg-[#F8FAFC] border border-[#E2E8F0]">
                  <span className="text-[#64748B] block text-[10px]">Current Status</span>
                  <strong className="text-[#1976D2]">{viewingPatientModal.status}</strong>
                </div>
                <div className="p-2.5 rounded bg-[#F8FAFC] border border-[#E2E8F0]">
                  <span className="text-[#64748B] block text-[10px]">Priority Score</span>
                  <strong className="text-[#243447]">{viewingPatientModal.priorityScore} pts</strong>
                </div>
              </div>

              {/* Assessment review */}
              {viewingPatientModal.assessment && (
                <div className="p-3 rounded-lg bg-[#EAF4FF] border border-[#1976D2]/20 space-y-1">
                  <div className="font-semibold text-[#1976D2]">
                    Clinical Assessment ({viewingPatientModal.assessment.possible_conditions?.join(", ") || "Evaluated"})
                  </div>
                  <p className="text-[11px] text-[#243447]">
                    {viewingPatientModal.assessment.clinicalNotes || viewingPatientModal.clinicalNotes}
                  </p>
                  <div className="text-[10px] text-[#64748B] italic pt-1">
                    AI-assisted assessment requires clinical review.
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#E2E8F0] flex justify-end">
              <button
                onClick={() => setViewingPatientModal(null)}
                className="px-4 py-2 rounded-lg bg-[#1976D2] text-white text-xs font-semibold"
              >
                Close Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
