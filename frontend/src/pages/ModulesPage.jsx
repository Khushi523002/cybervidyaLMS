import { useState, useRef } from "react";
import { Link, useParams } from "@tanstack/react-router";
import {
  BookOpen, ChevronRight, FlaskConical, BookMarked,
  CheckCircle, Lock, Send, Clock, Upload, FileText,
  ArrowLeft, XCircle,
} from "lucide-react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";

import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../lib/api";
import { queryKeys } from "../lib/queryKeys";

/* ─── API helpers ─── */
async function fetchProgress(token) {
  const r = await apiRequest("/api/intern/progress/", { token });
  return r.data;
}
async function fetchUnlocks(token) {
  const r = await apiRequest("/api/intern/unlocks/", { token });
  return r.data;
}
async function fetchPocFiles(token, moduleId, topicId) {
  const params = new URLSearchParams();
  if (moduleId) params.set("module_id", moduleId);
  if (topicId) params.set("topic_id", topicId);
  const r = await apiRequest(`/api/intern/progress/poc/?${params}`, { token });
  return r.data;
}

/* ─── Concept helpers ─── */
function getConceptTags(concept) {
  const c = (concept || "").toLowerCase();
  const tags = [];
  if (c.includes("theory") || c === "both") tags.push("theory");
  if (c.includes("practical") || c === "both") tags.push("practical");
  return tags.length ? tags : ["theory"];
}
function getTopicProgress(progressList, moduleId, topicId) {
  return progressList?.find((p) => p.module_id === moduleId && p.topic_id === topicId) || null;
}
function isTopicFullyApproved(progress, concept) {
  if (!progress) return false;
  const tags = getConceptTags(concept);
  if (tags.includes("theory") && !progress.theory_approved) return false;
  if (tags.includes("practical") && !progress.practical_approved) return false;
  return true;
}
function isTopicFullyCompleted(progress, concept) {
  if (!progress) return false;
  const tags = getConceptTags(concept);
  if (tags.includes("theory") && !progress.theory_submitted) return false;
  if (tags.includes("practical") && !progress.practical_submitted) return false;
  return true;
}
function isModuleComplete(mod, progressList) {
  if (!mod.topics?.length) return false;
  return mod.topics.every((t) => {
    const p = getTopicProgress(progressList, mod.id, t.id);
    return isTopicFullyApproved(p, t.concept);
  });
}
function isModuleAllSubmitted(mod, progressList) {
  if (!mod.topics?.length) return false;
  return mod.topics.every((t) => {
    const p = getTopicProgress(progressList, mod.id, t.id);
    return isTopicFullyCompleted(p, t.concept);
  });
}
function getModuleLockStatus(mod, modIndex, unlocks) {
  if (modIndex === 0) return "unlocked";
  const u = unlocks?.find((u) => u.module_id === mod.id);
  if (u?.status === "unlocked") return "unlocked";
  if (u?.status === "pending") return "pending";
  return "locked";
}

/* ─── Breadcrumb ─── */
function Breadcrumb({ items }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.84rem", color: "var(--text-soft)", flexWrap: "wrap", marginBottom: "4px" }}>
      {items.map((item, i) => (
        <span key={i} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {i > 0 && <ChevronRight size={13} />}
          {item.to ? (
            <Link to={item.to} style={{ color: "var(--text-soft)", textDecoration: "none" }}>{item.label}</Link>
          ) : (
            <span style={{ color: "var(--text)" }}>{item.label}</span>
          )}
        </span>
      ))}
    </div>
  );
}

/* ─── POC Upload Page (practical topics only) ─── */
function PocUploadPage({ mod, topic, role }) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef();
  const [feedback, setFeedback] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  const progressQuery = useQuery({
    queryKey: queryKeys.topicProgress(token),
    queryFn: () => fetchProgress(token),
    enabled: !!token,
  });

  const pocQuery = useQuery({
    queryKey: ["pocFiles", token, mod.id, topic.id],
    queryFn: () => fetchPocFiles(token, mod.id, topic.id),
    enabled: !!token,
  });

  const topicProgress = getTopicProgress(progressQuery.data || [], mod.id, topic.id);
  const practicalApproved = topicProgress?.practical_approved;
  const practicalSubmitted = topicProgress?.practical_submitted;
  const tags = getConceptTags(topic.concept);
  const hasTheory = tags.includes("theory");
  const theoryApproved = topicProgress?.theory_approved;
  const theorySubmitted = topicProgress?.theory_submitted;

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append("poc_file", file);
      formData.append("module_id", mod.id);
      formData.append("topic_id", topic.id);
      const response = await fetch("/api/intern/progress/poc/upload/", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Upload failed");
      return data;
    },
    onSuccess: () => {
      setFeedback("File uploaded successfully!");
      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: ["pocFiles", token, mod.id, topic.id] });
      setTimeout(() => setFeedback(""), 3000);
    },
    onError: (err) => {
      setFeedback(err.message || "Upload failed.");
      setTimeout(() => setFeedback(""), 4000);
    },
  });

  const markTheoryMutation = useMutation({
    mutationFn: () => apiRequest("/api/intern/progress/submit/", {
      method: "POST", token,
      body: { module_id: mod.id, topic_id: topic.id, completion_type: "theory" },
    }),
    onSuccess: () => {
      setFeedback("Theory marked as complete!");
      queryClient.invalidateQueries({ queryKey: queryKeys.topicProgress(token) });
      setTimeout(() => setFeedback(""), 3000);
    },
    onError: (err) => {
      setFeedback(err.message || "Failed.");
      setTimeout(() => setFeedback(""), 4000);
    },
  });

  const markPracticalMutation = useMutation({
    mutationFn: () => apiRequest("/api/intern/progress/submit/", {
      method: "POST", token,
      body: { module_id: mod.id, topic_id: topic.id, completion_type: "practical" },
    }),
    onSuccess: () => {
      setFeedback("Practical marked complete! Submit the full module once all topics are done.");
      queryClient.invalidateQueries({ queryKey: queryKeys.topicProgress(token) });
      setTimeout(() => setFeedback(""), 4000);
    },
    onError: (err) => {
      setFeedback(err.message || "Failed.");
      setTimeout(() => setFeedback(""), 4000);
    },
  });

  const pocFiles = pocQuery.data || [];

  return (
    <div className="page-stack">
      <Breadcrumb items={[
        { label: "Modules", to: "/modules" },
        { label: mod.label, to: `/modules/${mod.id}` },
        { label: topic.label },
      ]} />

      <div className="hero-banner" style={{ flexDirection: "column", alignItems: "flex-start", gap: "12px" }}>
        <div>
          <span className="eyebrow">Practical · {mod.label}</span>
          <h2 style={{ margin: "6px 0 8px" }}>{topic.label}</h2>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <span className="status-pill status-pill--approved">
            <FlaskConical size={13} />&nbsp;Practical
          </span>
          {practicalApproved && <span className="status-pill status-pill--approved"><CheckCircle size={13} />&nbsp;Approved</span>}
          {!practicalApproved && practicalSubmitted && <span className="status-pill status-pill--pending"><CheckCircle size={13} />&nbsp;Marked Complete</span>}
        </div>
      </div>

      {feedback && (
        <div className={`form-message ${feedback.toLowerCase().includes("fail") || feedback.toLowerCase().includes("error") ? "is-error" : "is-success"}`}>
          {feedback}
        </div>
      )}

      {/* Theory part */}
      {hasTheory && role === "intern" && (
        <div className="panel">
          <div className="panel__header"><div><h3>Theory</h3></div></div>
          {theoryApproved ? (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#21b554" }}>
              <CheckCircle size={16} /><span>Theory Approved</span>
            </div>
          ) : theorySubmitted ? (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--accent)" }}>
              <CheckCircle size={16} /><span>Theory marked complete</span>
            </div>
          ) : (
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "0.88rem", padding: "8px 16px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--surface)", width: "fit-content" }}>
              <input type="radio" name={`theory-${topic.id}`} style={{ accentColor: "#21b554" }} onChange={() => markTheoryMutation.mutate()} disabled={markTheoryMutation.isPending} />
              Mark Theory Complete
            </label>
          )}
        </div>
      )}

      {/* Uploaded POC files */}
      {pocFiles.length > 0 && (
        <div className="panel">
          <div className="panel__header">
            <div><h3>Uploaded POC Files</h3><p>{pocFiles.length} file{pocFiles.length > 1 ? "s" : ""} uploaded</p></div>
          </div>
          <div className="list-stack">
            {pocFiles.map((f) => (
              <div key={f.id} className="entity-card" style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: "12px" }}>
                <FileText size={18} style={{ color: "var(--accent)", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{f.original_name}</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-soft)" }}>
                    {(f.size_bytes / 1024).toFixed(1)} KB · {new Date(f.uploaded_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload POC — intern only */}
      {role === "intern" && !practicalApproved && (
        <div className="panel">
          <div className="panel__header">
            <div>
              <h3>Upload POC</h3>
              <p>Upload your Proof of Concept file, then mark practical as complete.</p>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <input type="file" ref={fileInputRef} style={{ display: "none" }} onChange={(e) => setSelectedFile(e.target.files[0] || null)} />
            <button type="button" className="ghost-button" style={{ justifyContent: "flex-start", gap: "10px" }} onClick={() => fileInputRef.current?.click()}>
              <Upload size={16} />
              {selectedFile ? selectedFile.name : "Choose File"}
            </button>
            {selectedFile && (
              <button type="button" className="primary-button" disabled={uploadMutation.isPending} onClick={() => uploadMutation.mutate(selectedFile)} style={{ gap: "10px" }}>
                <Upload size={15} />
                {uploadMutation.isPending ? "Uploading..." : "Upload POC File"}
              </button>
            )}
            {!practicalSubmitted && pocFiles.length > 0 && (
              <button type="button" className="primary-button" disabled={markPracticalMutation.isPending} onClick={() => markPracticalMutation.mutate()} style={{ gap: "10px" }}>
                <CheckCircle size={15} />
                {markPracticalMutation.isPending ? "Saving..." : "Mark Practical Complete"}
              </button>
            )}
            {practicalSubmitted && !practicalApproved && (
              <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", borderRadius: "10px", background: "rgba(34,167,200,0.06)", border: "1px solid rgba(34,167,200,0.2)" }}>
                <CheckCircle size={15} style={{ color: "var(--accent)" }} />
                <span style={{ fontSize: "0.9rem", color: "var(--accent)" }}>Practical marked complete — submit the full module when all topics are done.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {practicalApproved && (
        <div className="panel">
          <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "4px 0" }}>
            <CheckCircle size={22} style={{ color: "#21b554" }} />
            <div>
              <strong>Practical Approved!</strong>
              <p style={{ margin: "2px 0 0", fontSize: "0.85rem", color: "var(--text-soft)" }}>Approved by your manager.</p>
            </div>
          </div>
        </div>
      )}

      {/* Manager status view */}
      {role !== "intern" && (
        <div className="panel">
          <div className="panel__header"><div><h3>Submission Status</h3></div></div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", borderRadius: "10px", border: "1px solid var(--border)", background: "var(--surface)" }}>
            <FlaskConical size={15} />
            <span style={{ fontWeight: 600 }}>Practical</span>
            <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "6px" }}>
              {practicalApproved
                ? <><CheckCircle size={15} style={{ color: "#21b554" }} /><span style={{ color: "#21b554", fontSize: "0.84rem" }}>Approved</span></>
                : practicalSubmitted
                  ? <><Clock size={15} style={{ color: "var(--accent)" }} /><span style={{ color: "var(--accent)", fontSize: "0.84rem" }}>Marked complete by intern</span></>
                  : <><XCircle size={15} style={{ opacity: 0.35 }} /><span style={{ opacity: 0.5, fontSize: "0.84rem" }}>Not submitted yet</span></>}
            </span>
          </div>
          {pocFiles.length > 0 && (
            <div style={{ marginTop: "12px" }}>
              <div style={{ fontSize: "0.85rem", color: "var(--text-soft)", marginBottom: "8px" }}>Uploaded files:</div>
              {pocFiles.map((f) => (
                <div key={f.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 0", borderBottom: "1px solid var(--border-subtle, var(--border))" }}>
                  <FileText size={15} style={{ opacity: 0.6 }} />
                  <span style={{ fontSize: "0.88rem" }}>{f.original_name}</span>
                  <span style={{ fontSize: "0.78rem", color: "var(--text-soft)", marginLeft: "auto" }}>{new Date(f.uploaded_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Manager: Simple read-only module topics view ─── */
function ManagerModuleTopicsPage({ mod, progressList }) {
  const approvedCount = (mod.topics || []).filter((t) => {
    const p = getTopicProgress(progressList, mod.id, t.id);
    return isTopicFullyApproved(p, t.concept);
  }).length;

  const completedCount = (mod.topics || []).filter((t) => {
    const p = getTopicProgress(progressList, mod.id, t.id);
    return isTopicFullyCompleted(p, t.concept);
  }).length;

  const pct = mod.topics.length > 0 ? Math.round((approvedCount / mod.topics.length) * 100) : 0;
  const pendingCount = completedCount - approvedCount;

  return (
    <div className="page-stack">
      <Breadcrumb items={[{ label: "Modules", to: "/modules" }, { label: mod.label }]} />

      <div className="hero-banner" style={{ flexDirection: "column", alignItems: "flex-start", gap: "12px" }}>
        <div>
          <span className="eyebrow">Module</span>
          <h2 style={{ margin: "6px 0 4px" }}>{mod.label}</h2>
          <p style={{ margin: 0, color: "var(--text-soft)" }}>{mod.topics.length} topics · {approvedCount} approved</p>
        </div>
        {mod.topics.length > 0 && (
          <div className="module-progress" style={{ width: "100%", maxWidth: "340px" }}>
            <div className="module-progress__bar module-progress__bar--large">
              <div className="module-progress__fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="module-progress__label">{approvedCount}/{mod.topics.length} topics approved</span>
          </div>
        )}
      </div>

      {/* Summary pills */}
      {/* <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <span className="status-pill status-pill--approved" style={{ fontSize: "0.8rem", padding: "5px 14px" }}>
          <CheckCircle size={12} />&nbsp;{approvedCount} approved
        </span>
        {pendingCount > 0 && (
          <span className="status-pill status-pill--pending" style={{ fontSize: "0.8rem", padding: "5px 14px" }}>
            <Clock size={12} />&nbsp;{pendingCount} completed by intern
          </span>
        )}
        <span className="status-pill status-pill--neutral" style={{ fontSize: "0.8rem", padding: "5px 14px" }}>
          <BookOpen size={12} />&nbsp;{mod.topics.length - completedCount} not started
        </span>
      </div> */}

      {/* Read-only topic list */}
      <div className="panel">
        <div className="panel__header">
          <div><h3>Topics Progress</h3></div>
        </div>
        <div className="list-stack">
          {mod.topics.map((topic) => {
            const tags = getConceptTags(topic.concept);
            const progress = getTopicProgress(progressList, mod.id, topic.id);
            const approved = isTopicFullyApproved(progress, topic.concept);
            const completed = isTopicFullyCompleted(progress, topic.concept);

            return (
              <div
                key={topic.id}
                className="entity-card"
                style={{
                  padding: "14px 18px",
                  background: approved ? "rgba(33,181,84,0.04)" : undefined,
                  borderColor: approved ? "rgba(33,181,84,0.2)" : undefined,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  {/* <div style={{
                    width: "20px", height: "20px", borderRadius: "50%", flexShrink: 0,
                    border: `2px solid ${approved ? "#21b554" : completed ? "var(--accent)" : "var(--border)"}`,
                    background: approved ? "#21b554" : "transparent",
                    display: "grid", placeItems: "center",
                  }}>
                    {approved && <CheckCircle size={12} color="white" />}
                    {!approved && completed && <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--accent)" }} />}
                  </div> */}

                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <strong style={{ fontSize: "0.92rem" }}>{topic.label}</strong>
                      {tags.map((t) => (
                        <span key={t} className={`status-pill ${t === "practical" ? "status-pill--approved" : "status-pill--pending"}`} style={{ fontSize: "0.7rem", padding: "2px 7px" }}>
                          {t === "practical" ? <FlaskConical size={10} /> : <BookMarked size={10} />}&nbsp;{t === "theory" ? "Theory" : "Practical"}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* <div style={{ flexShrink: 0, fontSize: "0.82rem" }}>
                    {approved
                      ? <span style={{ color: "#21b554", display: "flex", alignItems: "center", gap: "4px" }}><CheckCircle size={13} /> Approved</span>
                      : completed
                        ? <span style={{ color: "var(--accent)", display: "flex", alignItems: "center", gap: "4px" }}><Clock size={13} /> Completed</span>
                        : <span style={{ color: "var(--text-soft)", opacity: 0.6 }}></span>
                    }
                  </div> */}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── Intern: Module Topics Checklist ─── */
function ModuleTopicsPage({ mod, modIndex, progressList, unlocks, allModules, role, approvals }) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState("");

  const lockStatus = role === "intern"
    ? getModuleLockStatus(mod, modIndex, unlocks)
    : "unlocked";

  const modComplete = isModuleComplete(mod, progressList);
  const allTopicsCompleted = isModuleAllSubmitted(mod, progressList);

  // Check if module is already pending approval
  const modulePendingApproval = (approvals || []).some(
    (a) => a.module_id === mod.id && a.request_type === "module_complete" && a.status === "pending"
  );

  const submitMutation = useMutation({
    mutationFn: ({ topicId, completionType }) =>
      apiRequest("/api/intern/progress/submit/", {
        method: "POST", token,
        body: { module_id: mod.id, topic_id: topicId, completion_type: completionType },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.topicProgress(token) });
    },
    onError: (err) => {
      setFeedback(err.message || "Failed.");
      setTimeout(() => setFeedback(""), 4000);
    },
  });

  // Submit the ENTIRE MODULE for approval — only after all topics done
  const submitModuleMutation = useMutation({
    mutationFn: () =>
      apiRequest("/api/intern/progress/submit/", {
        method: "POST", token,
        body: { module_id: mod.id, completion_type: "module_complete" },
      }),
    onSuccess: () => {
      setFeedback("Module submitted to manager for approval!");
      queryClient.invalidateQueries({ queryKey: queryKeys.topicProgress(token) });
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals(token) });
      setTimeout(() => setFeedback(""), 4000);
    },
    onError: (err) => {
      setFeedback(err.message || "Submission failed.");
      setTimeout(() => setFeedback(""), 4000);
    },
  });

  const unlockMutation = useMutation({
    mutationFn: () =>
      apiRequest("/api/intern/unlocks/request/", {
        method: "POST", token,
        body: { module_id: allModules[modIndex + 1]?.id },
      }),
    onSuccess: () => {
      setFeedback("Unlock request sent to manager!");
      queryClient.invalidateQueries({ queryKey: queryKeys.moduleUnlocks(token) });
      setTimeout(() => setFeedback(""), 3000);
    },
    onError: (err) => {
      setFeedback(err.message || "Request failed.");
      setTimeout(() => setFeedback(""), 4000);
    },
  });

  const approvedCount = (mod.topics || []).filter((t) => {
    const p = getTopicProgress(progressList, mod.id, t.id);
    return isTopicFullyApproved(p, t.concept);
  }).length;

  const completedCount = (mod.topics || []).filter((t) => {
    const p = getTopicProgress(progressList, mod.id, t.id);
    return isTopicFullyCompleted(p, t.concept);
  }).length;

  if (lockStatus === "locked") {
    return (
      <div className="page-stack">
        <Breadcrumb items={[{ label: "Modules", to: "/modules" }, { label: mod.label }]} />
        <div className="hero-banner" style={{ flexDirection: "column", alignItems: "flex-start", gap: "10px" }}>
          <div><span className="eyebrow">Module</span><h2 style={{ margin: "6px 0 4px" }}>{mod.label}</h2></div>
          <span className="status-pill status-pill--neutral"><Lock size={13} />&nbsp;Locked</span>
        </div>
        <div className="state-block">
          <Lock size={32} style={{ opacity: 0.3, marginBottom: "12px" }} />
          <p>This module is locked. Complete and get all topics in the previous module approved to unlock it.</p>
        </div>
      </div>
    );
  }

  if (lockStatus === "pending") {
    return (
      <div className="page-stack">
        <Breadcrumb items={[{ label: "Modules", to: "/modules" }, { label: mod.label }]} />
        <div className="hero-banner" style={{ flexDirection: "column", alignItems: "flex-start", gap: "10px" }}>
          <div><span className="eyebrow">Module</span><h2 style={{ margin: "6px 0 4px" }}>{mod.label}</h2></div>
          <span className="status-pill status-pill--pending"><Clock size={13} />&nbsp;Unlock Pending Approval</span>
        </div>
        <div className="state-block">
          <Clock size={32} style={{ opacity: 0.3, marginBottom: "12px" }} />
          <p>Your unlock request is waiting for manager approval.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <Breadcrumb items={[{ label: "Modules", to: "/modules" }, { label: mod.label }]} />

      <div className="hero-banner" style={{ flexDirection: "column", alignItems: "flex-start", gap: "12px" }}>
        <div>
          <span className="eyebrow">Module</span>
          <h2 style={{ margin: "6px 0 4px" }}>{mod.label}</h2>
          <p style={{ margin: 0, color: "var(--text-soft)" }}>{mod.topics.length} topics · {approvedCount} approved</p>
        </div>
        {modComplete && (
          <span className="status-pill status-pill--approved" style={{ fontSize: "0.84rem" }}>
            <CheckCircle size={14} />&nbsp;Module Complete
          </span>
        )}
        {mod.topics.length > 0 && (
          <div className="module-progress" style={{ width: "100%", maxWidth: "340px" }}>
            <div className="module-progress__bar module-progress__bar--large">
              <div className="module-progress__fill" style={{ width: `${Math.round((approvedCount / mod.topics.length) * 100)}%` }} />
            </div>
            <span className="module-progress__label">{approvedCount}/{mod.topics.length} topics approved</span>
          </div>
        )}
      </div>

      {feedback && (
        <div className={`form-message ${feedback.toLowerCase().includes("fail") || feedback.toLowerCase().includes("error") ? "is-error" : "is-success"}`}>
          {feedback}
        </div>
      )}

      {/* Topics Checklist */}
      <div className="panel">
        <div className="panel__header">
          <div>
            <h3>Topics Checklist</h3>
            <p style={{ fontSize: "0.83rem", color: "var(--text-soft)", margin: "4px 0 0" }}>
              Mark each topic complete — then submit the full module to your manager for approval.
            </p>
          </div>
        </div>
        <div className="list-stack">
          {mod.topics.map((topic) => {
            const tags = getConceptTags(topic.concept);
            const progress = getTopicProgress(progressList, mod.id, topic.id);
            const topicDone = isTopicFullyApproved(progress, topic.concept);
            const topicCompleted = isTopicFullyCompleted(progress, topic.concept);
            const isPractical = tags.includes("practical");
            const isTheoryOnly = !isPractical;

            return (
              <div
                key={topic.id}
                className="entity-card"
                style={{
                  padding: "16px 18px",
                  background: topicDone ? "rgba(33,181,84,0.04)" : topicCompleted ? "rgba(34,167,200,0.03)" : undefined,
                  borderColor: topicDone ? "rgba(33,181,84,0.25)" : topicCompleted ? "rgba(34,167,200,0.18)" : undefined,
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
                  <div style={{
                    width: "22px", height: "22px", borderRadius: "50%", flexShrink: 0, marginTop: "2px",
                    border: `2px solid ${topicDone ? "#21b554" : topicCompleted ? "#21b554" : "var(--border)"}`,
                    background: topicDone ? "#21b554" : "transparent",
                    display: "grid", placeItems: "center",
                  }}>
                    {topicDone && <CheckCircle size={13} color="white" />}
                    {!topicDone && topicCompleted && <CheckCircle size={13} color="#21b554" />}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", flexWrap: "wrap" }}>
                      <strong style={{ fontSize: "0.95rem" }}>{topic.label}</strong>
                      {tags.map((t) => (
                        <span key={t} className={`status-pill ${t === "practical" ? "status-pill--approved" : "status-pill--pending"}`} style={{ fontSize: "0.72rem", padding: "3px 8px" }}>
                          {t === "practical" ? <FlaskConical size={11} /> : <BookMarked size={11} />}&nbsp;{t === "theory" ? "Theory" : "Practical"}
                        </span>
                      ))}
                      {topicDone && <span className="status-pill status-pill--approved" style={{ fontSize: "0.72rem" }}>✓ Approved</span>}
                      {!topicDone && topicCompleted && <span className="status-pill status-pill--pending" style={{ fontSize: "0.72rem" }}>✓ Done</span>}
                    </div>

                    {/* Theory-only: mark complete */}
                    {isTheoryOnly && !topicDone && (
                      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                        {progress?.theory_submitted ? (
                          <span style={{ fontSize: "0.85rem", color: "var(--accent)", display: "flex", alignItems: "center", gap: "6px" }}>
                            <CheckCircle size={13} /> Marked complete
                          </span>
                        ) : (
                          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "0.88rem", padding: "6px 14px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--surface)" }}>
                            <input
                              type="radio"
                              name={`topic-${topic.id}`}
                              style={{ accentColor: "#21b554" }}
                              onChange={() => submitMutation.mutate({ topicId: topic.id, completionType: "theory" })}
                              disabled={submitMutation.isPending}
                            />
                            Mark Complete
                          </label>
                        )}
                      </div>
                    )}

                    {/* Practical: theory mark (if both) + upload POC link */}
                    {isPractical && (
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                        {tags.includes("theory") && (
                          progress?.theory_approved ? (
                            <span style={{ fontSize: "0.82rem", color: "#21b554", display: "flex", alignItems: "center", gap: "4px" }}><CheckCircle size={12} /> Theory approved</span>
                          ) : progress?.theory_submitted ? (
                            <span style={{ fontSize: "0.82rem", color: "var(--accent)", display: "flex", alignItems: "center", gap: "4px" }}><CheckCircle size={12} /> Theory done</span>
                          ) : (
                            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "0.85rem", padding: "5px 12px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--surface)" }}>
                              <input
                                type="radio"
                                name={`theory-part-${topic.id}`}
                                style={{ accentColor: "#21b554" }}
                                onChange={() => submitMutation.mutate({ topicId: topic.id, completionType: "theory" })}
                                disabled={submitMutation.isPending}
                              />
                              Mark Theory Done
                            </label>
                          )
                        )}
                        <Link
                          to={`/modules/${mod.id}/${topic.id}`}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: "6px",
                            fontSize: "0.85rem", padding: "5px 14px", borderRadius: "8px",
                            border: `1px solid ${progress?.practical_submitted ? "rgba(33,181,84,0.4)" : "var(--accent)"}`,
                            color: progress?.practical_submitted ? "#21b554" : "var(--accent)",
                            textDecoration: "none", fontWeight: 600,
                          }}
                        >
                          {progress?.practical_submitted ? <CheckCircle size={13} /> : <Upload size={13} />}
                          {progress?.practical_submitted ? "POC Uploaded ✓" : "Upload POC"}
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Submit full module to manager — shown always, enabled only when all done */}
      {role === "intern" && !modComplete && (
        <div className="panel" style={{
          border: allTopicsCompleted ? "1px solid rgba(34,167,200,0.4)" : "1px solid var(--border)",
          background: allTopicsCompleted ? "rgba(34,167,200,0.04)" : undefined,
        }}>
          <div className="panel__header">
            <div>
              <h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Send size={16} style={{ color: allTopicsCompleted ? "var(--accent)" : "var(--text-soft)" }} />
                Submit Module for Approval
              </h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-soft)", margin: "4px 0 0" }}>
                {allTopicsCompleted
                  ? "All topics done! Submit this module to your manager for approval."
                  : `Finish all topics first — ${completedCount}/${mod.topics.length} done.`}
              </p>
            </div>
          </div>

          {!allTopicsCompleted && (
            <div className="module-progress" style={{ width: "100%", maxWidth: "280px", marginBottom: "8px" }}>
              <div className="module-progress__bar">
                <div className="module-progress__fill" style={{ width: `${mod.topics.length > 0 ? Math.round((completedCount / mod.topics.length) * 100) : 0}%`, background: "var(--accent)" }} />
              </div>
              <span className="module-progress__label">{completedCount}/{mod.topics.length} topics done</span>
            </div>
          )}

          {modulePendingApproval ? (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", borderRadius: "10px", background: "rgba(34,167,200,0.06)", border: "1px solid rgba(34,167,200,0.2)" }}>
              <Clock size={15} style={{ color: "var(--accent)" }} />
              <span style={{ fontSize: "0.9rem", color: "var(--accent)" }}>Module submitted — awaiting manager approval.</span>
            </div>
          ) : (
            <button
              type="button"
              className="primary-button"
              style={{ width: "fit-content", gap: "8px", opacity: allTopicsCompleted ? 1 : 0.4 }}
              disabled={!allTopicsCompleted || submitModuleMutation.isPending}
              onClick={() => submitModuleMutation.mutate()}
            >
              <Send size={14} />
              {submitModuleMutation.isPending ? "Submitting..." : "Submit Module for Approval"}
            </button>
          )}
        </div>
      )}

      {/* Module approved — request next unlock */}
      {role === "intern" && modComplete && modIndex < allModules.length - 1 && (() => {
        const nextMod = allModules[modIndex + 1];
        const nextUnlock = unlocks?.find((u) => u.module_id === nextMod.id);
        if (!nextUnlock || nextUnlock.status === "locked") {
          return (
            <div className="panel">
              <div className="panel__header"><div><h3>Module Complete 🎉</h3><p>All topics approved! Request the next module to be unlocked.</p></div></div>
              <button type="button" className="primary-button" style={{ width: "fit-content" }} disabled={unlockMutation.isPending} onClick={() => unlockMutation.mutate()}>
                <Send size={14} />&nbsp;
                {unlockMutation.isPending ? "Requesting..." : `Request unlock: ${nextMod.label}`}
              </button>
            </div>
          );
        }
        if (nextUnlock.status === "pending") {
          return (
            <div className="panel">
              <div className="panel__header"><div><h3>Module Complete 🎉</h3><p>Unlock request for next module is pending manager approval.</p></div></div>
              <span className="status-pill status-pill--pending"><Clock size={13} />&nbsp;Unlock Pending Approval</span>
            </div>
          );
        }
        return null;
      })()}
    </div>
  );
}

/* ─── Modules Landing ─── */
function ModulesLanding({ allModules, progressList, unlocks, role }) {
  const totalTopics = allModules.reduce((s, m) => s + (m.topics?.length || 0), 0);
  const approvedTopics = allModules.reduce((s, m) => {
    return s + (m.topics || []).filter((t) => {
      const p = getTopicProgress(progressList, m.id, t.id);
      return isTopicFullyApproved(p, t.concept);
    }).length;
  }, 0);
  const completedTopics = allModules.reduce((s, m) => {
    return s + (m.topics || []).filter((t) => {
      const p = getTopicProgress(progressList, m.id, t.id);
      return isTopicFullyCompleted(p, t.concept);
    }).length;
  }, 0);
  const pct = totalTopics === 0 ? 0 : Math.round((approvedTopics / totalTopics) * 100);

  return (
    <div className="page-stack">
      <div className="hero-banner" style={{ flexDirection: "column", alignItems: "flex-start", gap: "14px" }}>
        <div>
          <span className="eyebrow">Learning Modules</span>
          <h2 style={{ margin: "6px 0 4px" }}>Modules</h2>
          <p style={{ margin: 0, color: "var(--text-soft)" }}>
            {role === "intern"
              ? "Complete all topics in a module, then submit it to your manager for approval."
              : "Track intern progress across all modules."}
          </p>
        </div>
        {allModules.length > 0 && (
          <>
            <div className="module-progress" style={{ width: "100%", maxWidth: "340px" }}>
              <div className="module-progress__bar module-progress__bar--large">
                <div className="module-progress__fill" style={{ width: `${pct}%` }} />
              </div>
              <span className="module-progress__label">{approvedTopics}/{totalTopics} topics approved</span>
            </div>
            {role === "intern" && completedTopics > approvedTopics && (
              <span className="status-pill status-pill--pending" style={{ fontSize: "0.8rem" }}>
                <Clock size={12} />&nbsp;{completedTopics - approvedTopics} topics completed, awaiting approval
              </span>
            )}
          </>
        )}
      </div>

      <div className="list-stack">
        {allModules.map((mod, idx) => {
          const lockStatus = role === "intern"
            ? getModuleLockStatus(mod, idx, unlocks)
            : "unlocked";
          const complete = isModuleComplete(mod, progressList);
          const approvedCount = (mod.topics || []).filter((t) => {
            const p = getTopicProgress(progressList, mod.id, t.id);
            return isTopicFullyApproved(p, t.concept);
          }).length;
          const isLocked = lockStatus === "locked";
          const isPending = lockStatus === "pending";

          const content = (
            <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: isLocked ? "var(--border)" : "var(--accent-gradient)", display: "grid", placeItems: "center", color: isLocked ? "var(--text-soft)" : "var(--midnight)", fontWeight: 800, fontSize: "1rem", flexShrink: 0 }}>
                {isLocked ? <Lock size={16} /> : idx + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <strong style={{ fontSize: "1rem" }}>{mod.label}</strong>
                  {complete && <CheckCircle size={15} style={{ color: "#21b554", flexShrink: 0 }} />}
                  {isPending && <Clock size={14} style={{ color: "var(--accent)", flexShrink: 0 }} />}
                </div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  <span className="status-pill status-pill--neutral" style={{ fontSize: "0.75rem" }}>
                    <BookOpen size={11} />&nbsp;{mod.topics.length} topics
                  </span>
                  {complete && <span className="status-pill status-pill--approved" style={{ fontSize: "0.75rem" }}>Complete</span>}
                  {isPending && <span className="status-pill status-pill--pending" style={{ fontSize: "0.75rem" }}>Unlock pending</span>}
                  {isLocked && <span className="status-pill status-pill--neutral" style={{ fontSize: "0.75rem" }}>Locked</span>}
                  {!isLocked && !isPending && mod.topics.length > 0 && (
                    <span className="status-pill status-pill--neutral" style={{ fontSize: "0.75rem" }}>
                      {approvedCount}/{mod.topics.length} approved
                    </span>
                  )}
                </div>
              </div>
              {!isLocked && <ChevronRight size={16} style={{ color: "var(--text-soft)", flexShrink: 0, marginTop: "4px" }} />}
            </div>
          );

          if (isLocked) {
            return <div key={mod.id} className="entity-card" style={{ opacity: 0.55 }}>{content}</div>;
          }
          return (
            <Link key={mod.id} to={`/modules/${mod.id}`} className="entity-card" style={{ textDecoration: "none", color: "inherit", display: "block" }}>
              {content}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Main ─── */
export function ModulesPage() {
  const { token, user } = useAuth();
  const params = useParams({ strict: false });
  const { moduleId, topicId } = params;

  const { data: allModules = [] } = useQuery({
    queryKey: queryKeys.modules(token),
    queryFn: () => apiRequest("/api/modules/", { token }).then((r) => r.data),
    enabled: !!token,
  });

  const { data: progressList = [] } = useQuery({
    queryKey: queryKeys.topicProgress(token),
    queryFn: () => fetchProgress(token),
    enabled: !!token,
  });

  const { data: unlocks = [] } = useQuery({
    queryKey: queryKeys.moduleUnlocks(token),
    queryFn: () => fetchUnlocks(token),
    enabled: !!token,
  });

  const { data: approvals = [] } = useQuery({
    queryKey: queryKeys.approvals(token),
    queryFn: () => apiRequest("/api/approvals/", { token }).then((r) => r.data),
    enabled: !!token,
  });

  const role = user?.role;
  const mod = allModules.find((m) => m.id === moduleId);

  if (!mod) {
    return <ModulesLanding allModules={allModules} progressList={progressList} unlocks={unlocks} role={role} />;
  }

  const modIndex = allModules.findIndex((m) => m.id === moduleId);
  const topic = mod.topics.find((t) => t.id === topicId);

  if (topic) {
    const tags = getConceptTags(topic.concept);
    if (tags.includes("practical")) {
      return <PocUploadPage mod={mod} topic={topic} role={role} />;
    }
    return (
      <div className="page-stack">
        <Breadcrumb items={[{ label: "Modules", to: "/modules" }, { label: mod.label, to: `/modules/${mod.id}` }, { label: topic.label }]} />
        <div className="hero-banner" style={{ flexDirection: "column", alignItems: "flex-start", gap: "10px" }}>
          <span className="eyebrow">Theory Topic · {mod.label}</span>
          <h2 style={{ margin: "6px 0 4px" }}>{topic.label}</h2>
          <span className="status-pill status-pill--pending"><BookMarked size={13} />&nbsp;Theory Only</span>
        </div>
        <div className="panel">
          <p style={{ margin: 0, color: "var(--text-soft)" }}>This is a theory topic. Mark it complete directly from the module checklist.</p>
        </div>
        <Link to={`/modules/${mod.id}`} style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.9rem", color: "var(--accent)", textDecoration: "none" }}>
          <ArrowLeft size={15} /> Back to {mod.label} checklist
        </Link>
      </div>
    );
  }

  // Manager gets simple read-only view; intern gets full checklist
  if (role !== "intern") {
    return <ManagerModuleTopicsPage mod={mod} progressList={progressList} />;
  }

  return (
    <ModuleTopicsPage
      mod={mod}
      modIndex={modIndex}
      progressList={progressList}
      unlocks={unlocks}
      allModules={allModules}
      role={role}
      approvals={approvals}
    />
  );
}
