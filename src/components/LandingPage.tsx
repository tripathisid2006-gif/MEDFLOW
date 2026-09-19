import React, { useState } from "react";
import {
  Activity,
  Shield,
  Clock,
  CheckCircle2,
  Users,
  Server,
  Layers,
  LineChart,
  Stethoscope,
  Phone,
  MapPin,
  ArrowRight,
  Building2,
  Ambulance,
  HeartPulse,
  Award,
} from "lucide-react";
import { HOSPITAL_IMAGES } from "../assets";

interface LandingPageProps {
  onEnterPortal: () => void;
  onSelectRole?: (role: any, name: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterPortal, onSelectRole }) => {
  const [activeNav, setActiveNav] = useState<string>("home");

  const scrollToSection = (id: string) => {
    setActiveNav(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-[#F7FAFC] text-[#243447] flex flex-col font-sans">
      {/* Top Notification Bar - Emergency Contact */}
      <div className="bg-[#1976D2] text-white text-xs py-2 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-medium">
              <Phone className="w-3.5 h-3.5 text-blue-200" />
              <span>24x7 Emergency & Trauma: <strong>+91 (080) 2841-0000</strong></span>
            </span>
            <span className="hidden md:inline-block text-blue-200">•</span>
            <span className="hidden md:flex items-center gap-1.5 text-blue-100">
              <MapPin className="w-3.5 h-3.5 text-blue-200" />
              <span>Shantideep Multispeciality Hospital, Bannerghatta Road, Bengaluru</span>
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1 text-emerald-200 bg-blue-800/40 px-2 py-0.5 rounded text-[11px] font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              NABH Accredited Tertiary Center
            </span>
          </div>
        </div>
      </div>

      {/* Primary Hospital Navigation */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#E2E8F0] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          {/* MEDFLOW Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => scrollToSection("home")}>
            <div className="w-9 h-9 rounded-lg bg-[#1976D2] flex items-center justify-center text-white shadow-xs">
              <HeartPulse className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-bold tracking-tight text-[#1976D2] font-heading">MEDFLOW</span>
                <span className="text-[10px] uppercase font-semibold text-[#64748B] tracking-wider px-1.5 py-0.5 bg-[#F1F5F9] rounded">
                  Hospital OS
                </span>
              </div>
              <p className="text-[11px] text-[#64748B] leading-none hidden sm:block">
                Shantideep Multispeciality Hospital
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-[#64748B]">
            <button
              onClick={() => scrollToSection("home")}
              className={`hover:text-[#1976D2] transition ${activeNav === "home" ? "text-[#1976D2] font-bold" : ""}`}
            >
              Home
            </button>
            <button
              onClick={() => scrollToSection("about")}
              className={`hover:text-[#1976D2] transition ${activeNav === "about" ? "text-[#1976D2] font-bold" : ""}`}
            >
              About
            </button>
            <button
              onClick={() => scrollToSection("services")}
              className={`hover:text-[#1976D2] transition ${activeNav === "services" ? "text-[#1976D2] font-bold" : ""}`}
            >
              Services
            </button>
            <button
              onClick={() => scrollToSection("capabilities")}
              className={`hover:text-[#1976D2] transition ${activeNav === "capabilities" ? "text-[#1976D2] font-bold" : ""}`}
            >
              Hospital Operations
            </button>
            <button
              onClick={() => scrollToSection("contact")}
              className={`hover:text-[#1976D2] transition ${activeNav === "contact" ? "text-[#1976D2] font-bold" : ""}`}
            >
              Contact
            </button>
          </nav>

          {/* Right Side Buttons: Staff Portal / Login */}
          <div className="flex items-center gap-3">
            <button
              id="staff-login-header-btn"
              onClick={onEnterPortal}
              className="px-3.5 py-2 text-xs font-semibold text-[#1976D2] hover:bg-[#EAF4FF] rounded-lg transition border border-[#1976D2]/30"
            >
              Staff Login
            </button>
            <button
              id="staff-portal-header-btn"
              onClick={onEnterPortal}
              className="px-4 py-2 text-xs font-semibold bg-[#1976D2] hover:bg-[#1565C0] text-white rounded-lg shadow-xs transition flex items-center gap-1.5"
            >
              <span>Staff Portal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="home" className="py-12 md:py-16 px-4 sm:px-8 border-b border-[#E2E8F0] bg-gradient-to-b from-white to-[#F7FAFC]">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Side: Hero Text */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EAF4FF] text-[#1976D2] text-xs font-semibold">
                <Shield className="w-3.5 h-3.5" />
                <span>Next-Gen Healthcare Resource Intelligence</span>
              </div>

              <div className="space-y-3">
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#243447] tracking-tight leading-tight font-heading">
                  MEDFLOW
                </h1>
                <p className="text-xl sm:text-2xl font-bold text-[#1976D2]">
                  Prioritize Patients. Optimize Resources.
                </p>
                <p className="text-base text-[#64748B] leading-relaxed max-w-xl">
                  Smarter hospital operations for faster patient care, better resource utilization, and safer clinical coordination across Shantideep Multispeciality Hospital.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  id="hero-staff-login-btn"
                  onClick={onEnterPortal}
                  className="px-6 py-3 rounded-lg bg-[#1976D2] hover:bg-[#1565C0] text-white text-sm font-semibold shadow-xs transition flex items-center gap-2"
                >
                  <span>Staff Login</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  id="hero-explore-btn"
                  onClick={() => scrollToSection("about")}
                  className="px-6 py-3 rounded-lg bg-white hover:bg-[#F1F5F9] text-[#1976D2] text-sm font-semibold border border-[#1976D2] transition shadow-2xs"
                >
                  Explore MEDFLOW
                </button>
              </div>

              {/* Hero Information: Three simple trust points */}
              <div className="pt-6 border-t border-[#E2E8F0] grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-start gap-2.5">
                  <div className="p-2 rounded-lg bg-[#EAF4FF] text-[#1976D2] shrink-0">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#243447] uppercase tracking-wide">Real-Time Operations</h4>
                    <p className="text-xs text-[#64748B] mt-0.5">Live patient and resource visibility</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="p-2 rounded-lg bg-[#E8F7F4] text-[#0F9D8A] shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#243447] uppercase tracking-wide">Smart Prioritization</h4>
                    <p className="text-xs text-[#64748B] mt-0.5">Urgent cases receive appropriate priority</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="p-2 rounded-lg bg-[#EAF4FF] text-[#1976D2] shrink-0">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#243447] uppercase tracking-wide">Resource Optimization</h4>
                    <p className="text-xs text-[#64748B] mt-0.5">Reduce conflicts and improve utilization</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side: High Quality Realistic Hospital Image */}
            <div className="lg:col-span-6">
              <div className="relative rounded-2xl overflow-hidden border-4 border-white shadow-md bg-white">
                <img
                  src={HOSPITAL_IMAGES.heroTeam}
                  alt="Modern Indian Hospital Medical Team in Clinical Consultation at Shantideep Hospital"
                  className="w-full h-80 sm:h-96 md:h-[420px] object-cover"
                  loading="eager"
                  onError={(e) => {
                    // Graceful fallback
                    e.currentTarget.style.display = "none";
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent pointer-events-none" />

                {/* Subtle medical badge overlay */}
                <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-xs p-3.5 rounded-xl border border-[#E2E8F0] shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#E8F7F4] text-[#0F9D8A] flex items-center justify-center font-bold">
                      <Stethoscope className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#243447]">Shantideep Clinical Governance</div>
                      <div className="text-[11px] text-[#64748B]">Continuous multi-speciality inpatient and ED monitoring</div>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EAF4FF] text-[#1976D2] text-xs font-semibold">
                    <span className="w-2 h-2 rounded-full bg-[#1976D2] animate-ping" />
                    Live 24/7
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-14 px-4 sm:px-8 bg-white border-b border-[#E2E8F0]">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-[#1976D2] bg-[#EAF4FF] px-3 py-1 rounded-full">
            About MEDFLOW
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#243447] tracking-tight font-heading">
            Designed for Better Hospital Operations
          </h2>
          <p className="text-base text-[#64748B] leading-relaxed max-w-2xl mx-auto">
            Hospitals operate under constant pressure and limited resources. MEDFLOW helps teams understand patient priority, resource availability, and operational constraints from one clear interface.
          </p>
        </div>

        {/* Hospital Care Imagery supporting about */}
        <div className="max-w-7xl mx-auto mt-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="rounded-xl overflow-hidden border border-[#E2E8F0] shadow-2xs">
            <img
              src={HOSPITAL_IMAGES.careWard}
              alt="Shantideep Multispeciality Hospital Patient Inpatient Care"
              className="w-full h-72 object-cover"
              loading="lazy"
            />
          </div>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-[#EAF4FF] text-[#1976D2] shrink-0 mt-1">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#243447]">Human-Centered Clinical Workflow</h4>
                <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">
                  Engineered specifically for doctors, charge nurses, triage teams, and operations directors to reduce administrative burden and eliminate bedside delays.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-[#E8F7F4] text-[#0F9D8A] shrink-0 mt-1">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#243447]">Deterministic Clinical Priority</h4>
                <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">
                  Transparent mathematical scoring that protects critical trauma cases while preventing long-waiting moderate patients from experiencing queue starvation.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-[#EAF4FF] text-[#1976D2] shrink-0 mt-1">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#243447]">Instant Dispatch & Conflict Prevention</h4>
                <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">
                  Zero double-booking for critical ICU ventilators, cath lab suites, or surgical theaters, ensuring equipment readiness for arriving ambulances.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Capabilities (4-column) */}
      <section id="capabilities" className="py-14 px-4 sm:px-8 bg-[#F7FAFC] border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#1976D2]">
              Operational Intelligence
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#243447] tracking-tight font-heading">
              Core Capabilities
            </h2>
            <p className="text-xs sm:text-sm text-[#64748B] max-w-xl mx-auto">
              Four fundamental pillars that power the day-to-day operations of Shantideep Multispeciality Hospital.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Capability 1 */}
            <div className="medical-card p-6 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-[#EAF4FF] text-[#1976D2] flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-[#243447]">Patient Prioritization</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Multi-factor urgency scoring with vital signs, diagnosis, waiting time, and clinical urgency.
              </p>
            </div>

            {/* Capability 2 */}
            <div className="medical-card p-6 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-[#E8F7F4] text-[#0F9D8A] flex items-center justify-center">
                <Server className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-[#243447]">Resource Management</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Live visibility into ICU beds, ventilators, operating rooms, doctor rosters, and equipment status.
              </p>
            </div>

            {/* Capability 3 */}
            <div className="medical-card p-6 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-[#EAF4FF] text-[#1976D2] flex items-center justify-center">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-[#243447]">Real-Time Operations</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Instant updates across departments with real-time SSE broadcasts, conflict detection, and audit logs.
              </p>
            </div>

            {/* Capability 4 */}
            <div className="medical-card p-6 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-[#E8F7F4] text-[#0F9D8A] flex items-center justify-center">
                <LineChart className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-[#243447]">Operational Analytics</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Bottleneck detection, waiting time distributions, bed turnover rates, and capacity forecasting.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Hospital Clinical Services & Emergency Bay Section */}
      <section id="services" className="py-14 px-4 sm:px-8 bg-white border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-6 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0F9D8A] bg-[#E8F7F4] px-3 py-1 rounded-full">
                Clinical Facilities
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#243447] tracking-tight font-heading">
                Comprehensive Multi-Speciality Departments
              </h2>
              <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
                Equipped with 14 specialized clinical units including 24/7 Casualty & Trauma, Medical & Surgical ICUs, Cath Lab for emergency angioplasty, and an advanced cardiac ambulance fleet.
              </p>

              <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#F7FAFC] border border-[#E2E8F0]">
                  <Building2 className="w-4 h-4 text-[#1976D2]" />
                  <span className="font-semibold text-[#243447]">Emergency & Trauma (ED)</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#F7FAFC] border border-[#E2E8F0]">
                  <HeartPulse className="w-4 h-4 text-[#DC2626]" />
                  <span className="font-semibold text-[#243447]">Cardiac Care & Cath Lab</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#F7FAFC] border border-[#E2E8F0]">
                  <Server className="w-4 h-4 text-[#0F9D8A]" />
                  <span className="font-semibold text-[#243447]">Intensive Care Unit (ICU)</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#F7FAFC] border border-[#E2E8F0]">
                  <Ambulance className="w-4 h-4 text-[#F59E0B]" />
                  <span className="font-semibold text-[#243447]">ALS Ambulance Fleet</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="rounded-xl overflow-hidden border border-[#E2E8F0] shadow-2xs">
                <img
                  src={HOSPITAL_IMAGES.emergencyBay}
                  alt="Shantideep Multispeciality Hospital Emergency Response and Ambulance Bay"
                  className="w-full h-80 object-cover"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Hospital Staff Portal Access Callout */}
      <section className="py-12 px-4 sm:px-8 bg-[#EAF4FF] border-b border-[#E2E8F0]">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-[#243447] font-heading">
            Authorized Hospital Staff Portal
          </h2>
          <p className="text-xs sm:text-sm text-[#64748B] max-w-xl mx-auto">
            Access live emergency queues, bed allocations, diagnostic reviews, and operational analytics.
          </p>
          <div className="pt-2">
            <button
              id="cta-enter-portal-btn"
              onClick={onEnterPortal}
              className="px-6 py-3 rounded-lg bg-[#1976D2] hover:bg-[#1565C0] text-white text-sm font-semibold shadow-xs transition inline-flex items-center gap-2"
            >
              <span>Launch Hospital Operations Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="mt-auto bg-white border-t border-[#E2E8F0] py-10 px-4 sm:px-8 text-xs text-[#64748B]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-[#1976D2] flex items-center justify-center text-white">
                <HeartPulse className="w-4 h-4" />
              </div>
              <span className="font-bold text-sm text-[#243447]">MEDFLOW</span>
            </div>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Hospital Resource & Patient Prioritization Operating System. Engineered for clinical accuracy, staff safety, and rapid patient recovery.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-[#243447] uppercase tracking-wider mb-2">Facility Details</h4>
            <div className="space-y-1.5 text-xs text-[#64748B]">
              <p className="font-medium text-[#243447]">Shantideep Multispeciality Hospital</p>
              <p>Plot 48, Bannerghatta Main Road</p>
              <p>Bengaluru, Karnataka - 560076</p>
              <p>Emergency: +91 (080) 2841-0000</p>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-[#243447] uppercase tracking-wider mb-2">Hospital Operations</h4>
            <ul className="space-y-1 text-xs">
              <li><button onClick={onEnterPortal} className="hover:text-[#1976D2]">Emergency Triage Queue</button></li>
              <li><button onClick={onEnterPortal} className="hover:text-[#1976D2]">ICU & Bed Allocations</button></li>
              <li><button onClick={onEnterPortal} className="hover:text-[#1976D2]">Cath Lab & Surgery Scheduling</button></li>
              <li><button onClick={onEnterPortal} className="hover:text-[#1976D2]">Ambulance GPS Dispatch</button></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-[#243447] uppercase tracking-wider mb-2">Governance & Accreditation</h4>
            <div className="space-y-2 text-xs">
              <p className="text-emerald-700 font-medium">✓ NABH Accredited</p>
              <p className="text-emerald-700 font-medium">✓ NABL Certified Diagnostic Laboratories</p>
              <p className="text-slate-500">Continuous 24x7 Quality & Safety Monitoring</p>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-[#E2E8F0] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#94A3B8]">
          <p>© {new Date().getFullYear()} Shantideep Multispeciality Hospital • MEDFLOW Clinical OS. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span>NABH Tertiary Care Standards</span>
            <span>•</span>
            <span>Indian Clinical Governance</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
