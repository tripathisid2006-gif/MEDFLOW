import React, { useState, useEffect, useCallback } from "react";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { DashboardView } from "./components/DashboardView";
import { PriorityQueueView } from "./components/PriorityQueueView";
import { PatientsView } from "./components/PatientsView";
import { ResourcesView } from "./components/ResourcesView";
import { AllocationsView } from "./components/AllocationsView";
import { DepartmentsView } from "./components/DepartmentsView";
import { AmbulancesView } from "./components/AmbulancesView";
import { StrategiesView } from "./components/StrategiesView";
import { AuditView } from "./components/AuditView";
import { SettingsView } from "./components/SettingsView";
import type {
  HospitalStats,
  HospitalAlert,
  Patient,
  Resource,
  Department,
  Ambulance,
  StaffMember,
  ResourceAllocation,
  AuditEvent,
  SystemSettings,
  UserRole,
  AllocationStrategy,
} from "./types";
import {
  fetchHospitalStatsApi,
  fetchAlertsApi,
  fetchPatientsApi,
  fetchResourcesApi,
  fetchDepartmentsApi,
  fetchAmbulancesApi,
  fetchStaffApi,
  fetchAllocationsApi,
  fetchAuditEventsApi,
  fetchSettingsApi,
  initUnitsApi,
  subscribeToRealtime,
} from "./api";

export function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  // User Role Simulation
  const [currentRole, setCurrentRole] = useState<UserRole>("TRIAGE_NURSE");
  const [currentUserName, setCurrentUserName] = useState<string>("Nurse J. Martinez, RN");

  // Domain Data States
  const [stats, setStats] = useState<HospitalStats | null>(null);
  const [alerts, setAlerts] = useState<HospitalAlert[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [ambulances, setAmbulances] = useState<Ambulance[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [allocations, setAllocations] = useState<ResourceAllocation[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  // Loading & Error States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Master Data Refresh
  const loadAllData = useCallback(async () => {
    try {
      const [
        statsData,
        alertsData,
        patientsData,
        resourcesData,
        departmentsData,
        ambulancesData,
        staffData,
        allocationsData,
        auditData,
        settingsData,
      ] = await Promise.all([
        fetchHospitalStatsApi(),
        fetchAlertsApi(),
        fetchPatientsApi(),
        fetchResourcesApi(),
        fetchDepartmentsApi(),
        fetchAmbulancesApi(),
        fetchStaffApi(),
        fetchAllocationsApi(),
        fetchAuditEventsApi(),
        fetchSettingsApi(),
      ]);

      setStats(statsData);
      setAlerts(alertsData);
      setPatients(patientsData);
      setResources(resourcesData);
      setDepartments(departmentsData);
      setAmbulances(ambulancesData);
      setStaff(staffData);
      setAllocations(allocationsData);
      setAuditEvents(auditData);
      setSettings(settingsData);
      setLoadError(null);
    } catch (err: any) {
      setLoadError(err.message || "Failed to connect to MedFlow hospital server");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial Load and Realtime SSE setup
  useEffect(() => {
    loadAllData();

    // Subscribe to SSE updates from server
    const unsubscribe = subscribeToRealtime((event) => {
      // Whenever server broadcasts state change, refresh data
      loadAllData();
    });

    return () => {
      unsubscribe();
    };
  }, [loadAllData]);

  // Handle Role Switch
  const handleRoleChange = (role: UserRole, name?: string) => {
    setCurrentRole(role);
    if (name) {
      setCurrentUserName(name);
    } else if (role === "DOCTOR") {
      setCurrentUserName("Dr. Marcus Chen, MD");
    } else if (role === "TRIAGE_NURSE" || role === "NURSE") {
      setCurrentUserName("Nurse J. Martinez, RN");
    } else if (role === "COORDINATOR" || role === "OPERATOR") {
      setCurrentUserName("Alex Rivera (ED Coordinator)");
    } else {
      setCurrentUserName("Admin Sarah Connor");
    }
  };

  // Initialize Standard Hospital Units
  const handleInitUnits = async () => {
    try {
      await initUnitsApi();
      await loadAllData();
    } catch (err: any) {
      alert("Failed to initialize units: " + err.message);
    }
  };

  // Summary counts for badges
  const waitingPatientsCount = patients.filter(
    (p) => p.status === "WAITING" || p.status === "TRIAGED"
  ).length;
  const criticalPatientsCount = patients.filter(
    (p) => p.urgencyLevel === "CRITICAL" && p.status !== "DISCHARGED"
  ).length;
  const activeAllocationsCount = allocations.filter(
    (a) => a.status === "ACTIVE" || a.status === "FLAGGED_REVIEW"
  ).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased">
      {/* Top Application Header */}
      <Header
        currentRole={currentRole}
        currentUserName={currentUserName}
        onRoleChange={handleRoleChange}
        settings={settings}
        alerts={alerts}
        realtimeConnected={true}
        onNavigateToTab={setActiveTab}
      />

      {/* Main App Layout: Sidebar + Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          waitingCount={waitingPatientsCount}
          criticalCount={criticalPatientsCount}
          activeAllocationsCount={activeAllocationsCount}
          currentRole={currentRole}
        />

        <main className="flex-1 overflow-y-auto bg-slate-950 px-6 py-6 lg:px-8">
          {loadError && (
            <div className="mb-6 p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-xs flex items-center justify-between">
              <div>
                <span className="font-bold">Server connection alert:</span> {loadError}
              </div>
              <button
                onClick={loadAllData}
                className="px-3 py-1 rounded bg-red-900 hover:bg-red-800 text-white font-semibold"
              >
                Retry
              </button>
            </div>
          )}

          {activeTab === "dashboard" && (
            <DashboardView
              stats={stats}
              alerts={alerts}
              patients={patients}
              resources={resources}
              allocations={allocations}
              settings={settings}
              onNavigate={setActiveTab}
              onInitUnits={handleInitUnits}
            />
          )}

          {activeTab === "queue" && (
            <PriorityQueueView
              patients={patients}
              resources={resources}
              staff={staff}
              allocations={allocations}
              settings={settings}
              currentRole={currentRole}
              currentUserName={currentUserName}
              onRefresh={loadAllData}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === "patients" && (
            <PatientsView
              patients={patients}
              departments={departments}
              currentRole={currentRole}
              currentUserName={currentUserName}
              onPatientAdded={loadAllData}
              onSelectPatientForQueue={(pId) => {
                setActiveTab("queue");
              }}
            />
          )}

          {activeTab === "resources" && (
            <ResourcesView
              resources={resources}
              departments={departments}
              currentRole={currentRole}
              currentUserName={currentUserName}
              onRefresh={loadAllData}
              onInitUnits={handleInitUnits}
            />
          )}

          {activeTab === "allocations" && (
            <AllocationsView
              allocations={allocations}
              resources={resources}
              patients={patients}
              currentRole={currentRole}
              currentUserName={currentUserName}
              onRefresh={loadAllData}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === "departments" && (
            <DepartmentsView
              departments={departments}
              patients={patients}
              resources={resources}
              currentRole={currentRole}
              currentUserName={currentUserName}
              onRefresh={loadAllData}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === "ambulances" && (
            <AmbulancesView
              ambulances={ambulances}
              patients={patients}
              currentRole={currentRole}
              currentUserName={currentUserName}
              onRefresh={loadAllData}
              onInitUnits={handleInitUnits}
            />
          )}

          {activeTab === "strategies" && (
            <StrategiesView
              patients={patients}
              resources={resources}
              activeStrategy={(settings?.activeStrategy as AllocationStrategy) || "PRIORITY_FIRST"}
              currentRole={currentRole}
              currentUserName={currentUserName}
              onRefresh={loadAllData}
            />
          )}

          {activeTab === "audit" && <AuditView auditEvents={auditEvents} />}

          {activeTab === "settings" && (
            <SettingsView
              settings={settings}
              currentRole={currentRole}
              currentUserName={currentUserName}
              onRefresh={loadAllData}
              onInitUnits={handleInitUnits}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
