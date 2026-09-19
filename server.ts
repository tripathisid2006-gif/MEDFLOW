import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import {
  getPatients,
  getPatientById,
  createPatient,
  updatePatient,
  savePatientAssessment,
  confirmAssessment,
  getResources,
  createResource,
  updateResource,
  getAllocations,
  createAllocation,
  releaseAllocation,
  getDepartments,
  createDepartment,
  getStaff,
  getAmbulances,
  createAmbulance,
  updateAmbulance,
  getAuditLogs,
  getSettings,
  updateSettings,
  setSurgeMode,
  setStaffShortageMode,
  getHospitalStats,
  getHospitalAlerts,
  initializeHospitalUnits,
  resetSyntheticHospitalDataset,
  createAuditLog,
} from "./server/db";
import { analyzePatientIntake } from "./server/gemini";
import { computeSmartAllocation, runStrategyComparison } from "./server/allocationEngine";
import { searchIcdDataset } from "./server/icd";
import { registerRealtimeClient } from "./server/realtime";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "25mb" }));

  // 1. Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", app: "MEDFLOW", timestamp: new Date().toISOString() });
  });

  // 2. Real-time SSE stream
  app.get("/api/realtime", (req, res) => {
    const clientId = `client-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    registerRealtimeClient(clientId, res);
  });

  // 3. Stats & Alerts
  app.get("/api/stats", (_req, res) => {
    res.json(getHospitalStats());
  });

  app.get("/api/alerts", (_req, res) => {
    res.json(getHospitalAlerts());
  });

  // 4. Patients API
  app.get("/api/patients", (_req, res) => {
    res.json(getPatients());
  });

  app.get("/api/patients/:id", (req, res) => {
    const p = getPatientById(req.params.id);
    if (!p) return res.status(404).json({ error: "Patient not found" });
    res.json(p);
  });

  app.post("/api/patients", (req, res) => {
    try {
      const patient = createPatient(req.body);
      res.status(201).json(patient);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to create patient" });
    }
  });

  app.put("/api/patients/:id", (req, res) => {
    const updatedBy = req.body.updatedBy || "Authorized Clinician";
    const patient = updatePatient(req.params.id, req.body, updatedBy);
    if (!patient) return res.status(404).json({ error: "Patient not found" });
    res.json(patient);
  });

  // 5. AI Intake Analysis (Gemini Integration)
  app.post("/api/patients/analyze", async (req, res) => {
    try {
      const analysis = await analyzePatientIntake(req.body);
      if (req.body.patientId) {
        const assessment = savePatientAssessment({
          patientId: req.body.patientId,
          staffConfirmed: false,
          ...analysis,
        });
        return res.json({
          ...assessment,
          disclaimer: "AI-assisted assessment — final clinical decisions must be made by authorized medical staff.",
        });
      }
      res.json({
        ...analysis,
        disclaimer: "AI-assisted assessment — final clinical decisions must be made by authorized medical staff.",
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Triage analysis failed" });
    }
  });

  // 6. Confirm Assessment (Staff clinical verification)
  app.post("/api/assessments/:id/confirm", (req, res) => {
    const { confirmedBy, role } = req.body;
    const confirmed = confirmAssessment(req.params.id, confirmedBy || "Attending Physician", role || "DOCTOR");
    if (!confirmed) return res.status(404).json({ error: "Assessment not found" });
    res.json(confirmed);
  });

  // 7. Resources API
  app.get("/api/resources", (_req, res) => {
    res.json(getResources());
  });

  app.post("/api/resources", (req, res) => {
    try {
      const resource = createResource(req.body);
      res.status(201).json(resource);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to create resource" });
    }
  });

  app.put("/api/resources/:id", (req, res) => {
    const updatedBy = req.body.updatedBy || "Administrator";
    const updated = updateResource(req.params.id, req.body, updatedBy);
    if (!updated) return res.status(404).json({ error: "Resource not found" });
    res.json(updated);
  });

  // 8. Allocations API
  app.get("/api/allocations", (_req, res) => {
    res.json(getAllocations());
  });

  app.post("/api/allocations", (req, res) => {
    const { patientId, resourceId, allocatedBy, reason, userRole } = req.body;
    const result = createAllocation(
      patientId,
      resourceId,
      allocatedBy || "Operator",
      reason || "Clinical allocation",
      userRole || "OPERATOR"
    );
    if (!result.success) {
      return res.status(409).json({ error: result.error });
    }
    res.status(201).json(result.allocation);
  });

  app.post("/api/allocations/:id/release", (req, res) => {
    const { releasedBy, releaseReason, userRole, dischargePatient } = req.body;
    const result = releaseAllocation(
      req.params.id,
      releasedBy || "Operator",
      releaseReason || "Procedure completed",
      userRole || "OPERATOR",
      Boolean(dischargePatient)
    );
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    res.json({ message: "Resource successfully released" });
  });

  // 9. Smart Allocation calculation & batch execution
  app.post("/api/allocations/smart-calculate", (_req, res) => {
    const result = computeSmartAllocation(
      getPatients(),
      getResources(),
      getStaff(),
      getAllocations(),
      getSettings()
    );
    res.json(result);
  });

  app.post("/api/allocations/smart-execute", (req, res) => {
    const { items, allocatedBy, userRole } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "No allocation items provided" });
    }

    const executed: any[] = [];
    const errors: any[] = [];

    for (const item of items) {
      const result = createAllocation(
        item.patientId,
        item.resourceId,
        allocatedBy || "Operator (Smart Allocate)",
        item.justification || "Smart allocation optimization",
        userRole || "OPERATOR"
      );
      if (result.success) {
        executed.push(result.allocation);
      } else {
        errors.push({ item, error: result.error });
      }
    }

    res.json({ executed, errors, summary: `Successfully executed ${executed.length} allocations.` });
  });

  // 10. Departments, Staff, Ambulances
  app.get("/api/departments", (_req, res) => {
    res.json(getDepartments());
  });

  app.post("/api/departments", (req, res) => {
    const dept = createDepartment(req.body);
    res.status(201).json(dept);
  });

  app.get("/api/staff", (_req, res) => {
    res.json(getStaff());
  });

  app.get("/api/ambulances", (_req, res) => {
    res.json(getAmbulances());
  });

  app.post("/api/ambulances", (req, res) => {
    const amb = createAmbulance(req.body);
    res.status(201).json(amb);
  });

  app.put("/api/ambulances/:id", (req, res) => {
    const updated = updateAmbulance(req.params.id, req.body, req.body.updatedBy);
    if (!updated) return res.status(404).json({ error: "Ambulance not found" });
    res.json(updated);
  });

  // 11. Audit Logs
  app.get("/api/audit-logs", (_req, res) => {
    res.json(getAuditLogs());
  });

  // 12. Settings & Operational Modes
  app.get("/api/settings", (_req, res) => {
    res.json(getSettings());
  });

  app.put("/api/settings", (req, res) => {
    const updated = updateSettings(req.body, req.body.updatedBy, req.body.userRole);
    res.json(updated);
  });

  app.post("/api/settings/surge-mode", (req, res) => {
    const { active, activatedBy, userRole } = req.body;
    const settings = setSurgeMode(Boolean(active), activatedBy || "Administrator", userRole || "ADMIN");
    res.json(settings);
  });

  app.post("/api/settings/staff-shortage", (req, res) => {
    const { active, doctorShortage, nurseShortage, configuredBy, userRole } = req.body;
    const settings = setStaffShortageMode(
      Boolean(active),
      Number(doctorShortage || 0),
      Number(nurseShortage || 0),
      configuredBy || "Administrator",
      userRole || "ADMIN"
    );
    res.json(settings);
  });

  app.post("/api/settings/init-hospital-units", (req, res) => {
    const result = initializeHospitalUnits(req.body.adminName || "Dr. Arvind Reddy");
    res.json(result);
  });

  app.post("/api/admin/reset-synthetic-data", (req, res) => {
    const result = resetSyntheticHospitalDataset(req.body.adminName || "Dr. Arvind Reddy");
    res.json(result);
  });

  // 13. Strategy Comparison
  app.get("/api/strategies/compare", (_req, res) => {
    const comparison = runStrategyComparison(
      getPatients(),
      getResources(),
      getStaff(),
      getAllocations(),
      getSettings()
    );
    res.json(comparison);
  });

  // 14. WHO ICD search API
  app.get("/api/icd/search", (req, res) => {
    const query = String(req.query.q || "");
    res.json(searchIcdDataset(query));
  });

  // Vite middleware for development / static serving for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`MEDFLOW server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
