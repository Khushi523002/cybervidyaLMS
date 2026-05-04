import { Eye, EyeOff, Minus, Plus, UserPlus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../lib/api";

/* ── helpers ─────────────────────────────────────────── */
const EMPTY_EDU = {
  degree: "",
  specialization: "",
  institution: "",
  start_year: "",
  end_year: "",
  percentage: "",
};

const EMPTY_CERT = { name: "" };

function formatInternId(raw) {
  // Always prefix with I, strip non-digits, pad to at least 3 digits
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  const num = parseInt(digits, 10);
  if (num < 10) return `I00${num}`;
  if (num < 100) return `I0${num}`;
  return `I${num}`;
}

function serializeEducation(list) {
  return list
    .filter((e) => e.degree.trim())
    .map((e) => {
      const parts = [e.degree.trim()];
      if (e.specialization.trim()) parts.push(`(${e.specialization.trim()})`);
      if (e.institution.trim()) parts.push(`at ${e.institution.trim()}`);
      if (e.start_year || e.end_year)
        parts.push(`[${e.start_year || "?"}–${e.end_year || "present"}]`);
      if (e.percentage.trim()) parts.push(`${e.percentage.trim()}%`);
      return parts.join(" ");
    })
    .join("; ");
}

function serializeCerts(list) {
  return list
    .filter((c) => c.name.trim())
    .map((c) => c.name.trim())
    .join(", ");
}

/* ── Sub-components ─────────────────────────────────── */
function FieldGroup({ children, onRemove, index, canRemove }) {
  return (
    <div
      style={{
        padding: "18px",
        borderRadius: "16px",
        border: "1px solid var(--border)",
        background: "rgba(34,167,200,0.04)",
        display: "grid",
        gap: "12px",
        position: "relative",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--cerulean)" }}>
          Entry #{index + 1}
        </span>
        {canRemove && (
          <button
            type="button"
            className="ghost-button ghost-button--danger"
            style={{ padding: "6px 10px", fontSize: "0.8rem" }}
            onClick={onRemove}
          >
            <Minus size={13} /> Remove
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function TwoCol({ children }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
      {children}
    </div>
  );
}

/* ── Main page ───────────────────────────────────────── */
export function OnboardPage() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [internId, setInternId]   = useState("");
  const [name, setName]           = useState("");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [showPass, setShowPass]   = useState(false);
  const [contactNo, setContactNo] = useState("");
  const [education, setEducation] = useState([{ ...EMPTY_EDU }]);
  const [certs, setCerts]         = useState([{ ...EMPTY_CERT }]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");
  const [success, setSuccess]       = useState(null);

  /* education helpers */
  function setEdu(idx, field, val) {
    setEducation((prev) => prev.map((e, i) => (i === idx ? { ...e, [field]: val } : e)));
  }
  function addEdu() { setEducation((prev) => [...prev, { ...EMPTY_EDU }]); }
  function removeEdu(idx) { setEducation((prev) => prev.filter((_, i) => i !== idx)); }

  /* cert helpers */
  function setCert(idx, val) {
    setCerts((prev) => prev.map((c, i) => (i === idx ? { name: val } : c)));
  }
  function addCert() { setCerts((prev) => [...prev, { ...EMPTY_CERT }]); }
  function removeCert(idx) { setCerts((prev) => prev.filter((_, i) => i !== idx)); }

  /* intern id auto-format */
  function handleInternIdChange(e) {
    const raw = e.target.value;
    // Allow typing freely, format on blur
    setInternId(raw);
  }
  function handleInternIdBlur() {
    if (internId.trim()) setInternId(formatInternId(internId));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess(null);

    const formattedId = formatInternId(internId);
    if (!formattedId) { setError("Please enter a valid Intern ID number."); return; }

    const educationStr = serializeEducation(education);
    if (!educationStr) { setError("Please fill at least one education entry (Degree is required)."); return; }

    const certStr = serializeCerts(certs);
    if (!certStr) { setError("Please fill at least one certification."); return; }

    const body = {
      intern_id: formattedId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: password,
      education: educationStr,
      certification: certStr,
      contact_no: contactNo.trim(),
    };

    setSubmitting(true);
    try {
      const res = await apiRequest("/api/onboarding/interns/", {
        method: "POST",
        token,
        body,
      });
      setSuccess(res.data);
      // Reset form
      setInternId(""); setName(""); setEmail(""); setPassword("");
      setContactNo(""); setEducation([{ ...EMPTY_EDU }]); setCerts([{ ...EMPTY_CERT }]);
    } catch (err) {
      setError(err.message || "Failed to create intern.");
    } finally {
      setSubmitting(false);
    }
  }

  /* ── Success screen ── */
  if (success) {
    return (
      <div className="page-stack">
        <div className="panel" style={{ maxWidth: "520px" }}>
          <div className="panel__header">
            <div>
              <span className="eyebrow">Intern Onboarded</span>
              <h3 style={{ margin: "4px 0 0" }}>Account created successfully</h3>
            </div>
          </div>

          <div className="form-message is-success" style={{ marginBottom: "16px" }}>
            <p style={{ margin: 0 }}>
              <strong>{success.name}</strong> has been onboarded. Generate a temporary
              password from the Intern Profile page so they can log in.
            </p>
          </div>

          <div className="detail-grid" style={{ gridTemplateColumns: "1fr" }}>
            {[
              ["Intern ID", success.intern_id],
              ["Name", success.name],
              ["Email", success.email],
              ["Education", success.education],
              ["Certification", success.certification],
              ["Contact", success.contact_no],
            ].map(([label, val]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{val || "—"}</strong>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
            <button
              type="button"
              className="primary-button"
              onClick={() => setSuccess(null)}
            >
              Onboard another intern
            </button>
            <button
              type="button"
              className="ghost-button"
              onClick={() => navigate({ to: "/interns" })}
            >
              View intern directory
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Form ── */
  return (
    <div className="page-stack">
      <div className="hero-banner">
        <div>
          <span className="eyebrow">Onboarding</span>
          <h2 style={{ margin: "6px 0 4px" }}>Add New Intern</h2>
          <p>Fill in the details below to create an intern account.</p>
        </div>
        <UserPlus size={36} style={{ opacity: 0.3 }} />
      </div>

      <form onSubmit={handleSubmit} className="form-stack">

        {error && (
          <div className="form-message is-error">
            <p style={{ margin: 0 }}>{error}</p>
          </div>
        )}

        {/* ── Section 1: Basic Info ── */}
        <div className="panel">
          <div className="panel__header">
            <div>
              <h3>Basic Information</h3>
              <p>Intern ID, name, contact, and login credentials</p>
            </div>
          </div>

          <div className="form-stack">
            <TwoCol>
              {/* Intern ID */}
              <label className="field">
                <span>Intern ID *</span>
                <input
                  type="text"
                  placeholder="e.g. 1 → I001, 10 → I010, 100 → I100"
                  value={internId}
                  onChange={handleInternIdChange}
                  onBlur={handleInternIdBlur}
                  required
                />
              </label>

              {/* Name */}
              <label className="field">
                <span>Full Name *</span>
                <input
                  type="text"
                  placeholder="Aarav Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </label>
            </TwoCol>

            <TwoCol>
              {/* Email */}
              <label className="field">
                <span>Email *</span>
                <input
                  type="email"
                  placeholder="intern@cybervidya.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>

              {/* Contact */}
              <label className="field">
                <span>Contact Number *</span>
                <input
                  type="text"
                  placeholder="+91-9876543210"
                  value={contactNo}
                  onChange={(e) => setContactNo(e.target.value)}
                  required
                />
              </label>
            </TwoCol>

            {/* Password */}
            <label className="field">
              <span>Password *</span>
              <div style={{ position: "relative" }}>
                <input
                  type={showPass ? "text" : "password"}
                  placeholder="Set a strong password for the intern"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingRight: "48px", width: "100%" }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  style={{
                    position: "absolute",
                    right: "14px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-soft)",
                    padding: "4px",
                  }}
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              <span style={{ fontSize: "0.78rem", color: "var(--text-soft)", fontWeight: 400 }}>
                Intern will be prompted to change this on first login.
              </span>
            </label>
          </div>
        </div>

        {/* ── Section 2: Education ── */}
        <div className="panel">
          <div className="panel__header">
            <div>
              <h3>Education</h3>
              <p>Add one or more educational qualifications</p>
            </div>
            <button
              type="button"
              className="ghost-button"
              style={{ padding: "9px 14px", whiteSpace: "nowrap" }}
              onClick={addEdu}
            >
              <Plus size={14} /> Add more
            </button>
          </div>

          <div className="form-stack">
            {education.map((edu, idx) => (
              <FieldGroup
                key={idx}
                index={idx}
                canRemove={education.length > 1}
                onRemove={() => removeEdu(idx)}
              >
                <TwoCol>
                  <label className="field">
                    <span>Degree / Course *</span>
                    <input
                      type="text"
                      placeholder="B.Tech, MCA, BCA…"
                      value={edu.degree}
                      onChange={(e) => setEdu(idx, "degree", e.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span>Specialization</span>
                    <input
                      type="text"
                      placeholder="Computer Science, Cyber Security…"
                      value={edu.specialization}
                      onChange={(e) => setEdu(idx, "specialization", e.target.value)}
                    />
                  </label>
                </TwoCol>

                <label className="field">
                  <span>Institution Name</span>
                  <input
                    type="text"
                    placeholder="VIT University, Delhi University…"
                    value={edu.institution}
                    onChange={(e) => setEdu(idx, "institution", e.target.value)}
                  />
                </label>

                <TwoCol>
                  <label className="field">
                    <span>Start Year</span>
                    <input
                      type="number"
                      placeholder="2020"
                      min="1990"
                      max="2099"
                      value={edu.start_year}
                      onChange={(e) => setEdu(idx, "start_year", e.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span>End Year</span>
                    <input
                      type="number"
                      placeholder="2024 (or leave blank if ongoing)"
                      min="1990"
                      max="2099"
                      value={edu.end_year}
                      onChange={(e) => setEdu(idx, "end_year", e.target.value)}
                    />
                  </label>
                </TwoCol>

                <label className="field">
                  <span>Percentage / CGPA</span>
                  <input
                    type="text"
                    placeholder="85% or 8.5 CGPA"
                    value={edu.percentage}
                    onChange={(e) => setEdu(idx, "percentage", e.target.value)}
                  />
                </label>
              </FieldGroup>
            ))}
          </div>
        </div>

        {/* ── Section 3: Certifications ── */}
        <div className="panel">
          <div className="panel__header">
            <div>
              <h3>Certifications</h3>
              <p>Add one or more professional certifications</p>
            </div>
            <button
              type="button"
              className="ghost-button"
              style={{ padding: "9px 14px", whiteSpace: "nowrap" }}
              onClick={addCert}
            >
              <Plus size={14} /> Add more
            </button>
          </div>

          <div className="form-stack">
            {certs.map((cert, idx) => (
              <FieldGroup
                key={idx}
                index={idx}
                canRemove={certs.length > 1}
                onRemove={() => removeCert(idx)}
              >
                <label className="field">
                  <span>Certification Name *</span>
                  <input
                    type="text"
                    placeholder="e.g. CompTIA Security+, CEH, eJPT…"
                    value={cert.name}
                    onChange={(e) => setCert(idx, e.target.value)}
                  />
                </label>
              </FieldGroup>
            ))}
          </div>
        </div>

        {/* ── Submit ── */}
        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
          <button
            type="button"
            className="ghost-button"
            onClick={() => navigate({ to: "/interns" })}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="primary-button"
            disabled={submitting}
            style={{ minWidth: "160px" }}
          >
            {submitting ? "Creating account…" : "Onboard Intern"}
          </button>
        </div>

      </form>
    </div>
  );
}
