import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState, useCallback } from "react";
import {
  Upload, FileSpreadsheet, CheckCircle2, AlertCircle,
  Trash2, ChevronDown, ChevronRight, BookOpen, Calendar,
  RefreshCw, X,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../lib/api";
import { queryKeys } from "../../lib/queryKeys";

export const Route = createFileRoute("/_authenticated/upload-module")({
  component: UploadModulePage,
});

/* ─── Drag-and-drop upload zone ─── */
function DropZone({ onFile, uploading }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) onFile(file);
    },
    [onFile]
  );

  return (
    <div
      onClick={() => !uploading && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      style={{
        border: `2px dashed ${dragging ? "var(--accent)" : "var(--border)"}`,
        borderRadius: "16px",
        padding: "48px 24px",
        textAlign: "center",
        cursor: uploading ? "not-allowed" : "pointer",
        background: dragging ? "rgba(34,167,200,0.06)" : "var(--surface)",
        transition: "all 0.2s ease",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "12px",
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        style={{ display: "none" }}
        onChange={(e) => { if (e.target.files[0]) onFile(e.target.files[0]); e.target.value = ""; }}
        disabled={uploading}
      />
      <div style={{
        width: 56, height: 56, borderRadius: "14px",
        background: "var(--accent-gradient)",
        display: "grid", placeItems: "center",
        color: "var(--midnight)",
      }}>
        {uploading
          ? <RefreshCw size={24} style={{ animation: "spin 1s linear infinite" }} />
          : <Upload size={24} />
        }
      </div>
      <div>
        <p style={{ margin: "0 0 4px", fontWeight: 600 }}>
          {uploading ? "Uploading to server…" : "Drop your Excel file here"}
        </p>
        <p style={{ margin: 0, fontSize: "0.83rem", color: "var(--text-soft)" }}>
          .xlsx or .xls · Any number of uploads
        </p>
      </div>
      {!uploading && (
        <span className="status-pill status-pill--pending" style={{ marginTop: 4 }}>
          <FileSpreadsheet size={13} />&nbsp;Browse file
        </span>
      )}
    </div>
  );
}

/* ─── Uploaded module card ─── */
function ModuleCard({ mod, onRemove }) {
  const [open, setOpen] = useState(false);
  const date = mod.uploadedAt
    ? new Date(mod.uploadedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "";

  return (
    <div className="panel" style={{ marginBottom: 0 }}>
      <div
        className="panel__header"
        style={{ cursor: "pointer" }}
        onClick={() => setOpen((v) => !v)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: 36, height: 36, borderRadius: "10px",
            background: "var(--accent-gradient)",
            display: "grid", placeItems: "center",
            color: "var(--midnight)", flexShrink: 0,
          }}>
            <BookOpen size={17} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "0.97rem" }}>{mod.label}</h3>
            <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-soft)", display: "flex", alignItems: "center", gap: 5 }}>
              <Calendar size={11} /> {date} &nbsp;·&nbsp; {mod.topics.length} topics
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            type="button"
            className="ghost-button"
            style={{ padding: "8px 10px", color: "var(--danger, #ef4444)" }}
            onClick={(e) => { e.stopPropagation(); onRemove(mod.id); }}
            title="Remove module"
          >
            <Trash2 size={15} />
          </button>
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>
      </div>

      {open && (
        <div className="list-stack" style={{ borderTop: "1px solid var(--border)", paddingTop: 12, marginTop: 0 }}>
          {mod.topics.map((topic, i) => (
            <div key={topic.id || i} className="entity-card" style={{ padding: "12px 16px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <span style={{
                  width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                  background: "var(--accent-gradient)",
                  display: "grid", placeItems: "center",
                  color: "var(--midnight)", fontSize: "0.72rem", fontWeight: 800,
                }}>
                  {i + 1}
                </span>
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: "0.88rem", display: "block" }}>{topic.label}</strong>
                  {topic.chapters?.length > 0 && (
                    <p style={{ margin: "3px 0 0", fontSize: "0.77rem", color: "var(--text-soft)" }}>
                      {topic.chapters.length} sub-topics
                    </p>
                  )}
                </div>
                {topic.concept && (
                  <span className={`status-pill ${topic.concept.toLowerCase().includes("practical") ? "status-pill--approved" : "status-pill--pending"}`}
                    style={{ fontSize: "0.7rem", padding: "3px 8px", flexShrink: 0 }}>
                    {topic.concept}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Page ─── */
export function UploadModulePage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState(null);
  const [uploading, setUploading] = useState(false);

  const { data: modules = [] } = useQuery({
    queryKey: queryKeys.modules(token),
    queryFn: () => apiRequest("/api/modules/", { token }).then((r) => r.data),
    enabled: !!token,
  });

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    setUploading(true);
    setStatus(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/modules/upload/", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const json = await response.json();
      if (!response.ok) throw new Error(json.message || "Upload failed.");

      queryClient.invalidateQueries({ queryKey: queryKeys.modules(token) });
      const count = json.data?.length || 1;
      setStatus({ type: "success", message: json.message || `${count} module(s) uploaded successfully.` });
    } catch (err) {
      setStatus({ type: "error", message: err.message || "Failed to upload Excel file." });
    } finally {
      setUploading(false);
    }
  }, [token, queryClient]);

  const handleRemove = useCallback(async (moduleId) => {
    try {
      await apiRequest(`/api/modules/${moduleId}/`, { method: "DELETE", token });
      queryClient.invalidateQueries({ queryKey: queryKeys.modules(token) });
    } catch (err) {
      setStatus({ type: "error", message: err.message || "Failed to remove module." });
    }
  }, [token, queryClient]);

  return (
    <div className="page-stack">
      {/* Hero */}
      <div className="hero-banner" style={{ flexDirection: "column", alignItems: "flex-start", gap: 8 }}>
        <span className="eyebrow">Manager Tools</span>
        <h2 style={{ margin: "4px 0 4px" }}>Upload Module</h2>
        <p style={{ margin: 0, color: "var(--text-soft)" }}>
          Upload an Excel sheet to add a new learning module. It will be saved to the database and visible to all interns.
        </p>
      </div>

      {/* Format guide */}
      <div className="panel">
        <div className="panel__header">
          <div>
            <h3>Expected Excel Format</h3>
            <p>Make sure your sheet has these columns (header row required)</p>
          </div>
        </div>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
          gap: 8,
          padding: "4px 0 8px",
        }}>
          {["Sr No", "Topics", "Sub Topic", "Status", "Concept", "Subtopic"].map((col) => (
            <div key={col} className="entity-card" style={{ padding: "8px 14px", fontSize: "0.82rem" }}>
              <code style={{ fontWeight: 600 }}>{col}</code>
            </div>
          ))}
        </div>
        <p style={{ margin: "8px 0 0", fontSize: "0.8rem", color: "var(--text-soft)" }}>
          <strong>Sr No</strong> marks each new topic (e.g. 1.0, 2.0). Sub-rows with blank Sr No become sub-topics (chapters) under it.
        </p>
      </div>

      {/* Upload zone */}
      <div className="panel">
        <div className="panel__header">
          <div><h3>Upload Excel Sheet</h3><p>Each upload saves to the database and is visible to all users</p></div>
        </div>
        <DropZone onFile={handleFile} uploading={uploading} />

        {status && (
          <div style={{
            marginTop: 16,
            padding: "14px 16px",
            borderRadius: 12,
            display: "flex", alignItems: "flex-start", gap: 10,
            background: status.type === "success" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
            border: `1px solid ${status.type === "success" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
            color: status.type === "success" ? "#16a34a" : "#dc2626",
          }}>
            {status.type === "success"
              ? <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: 1 }} />
              : <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
            }
            <p style={{ margin: 0, fontSize: "0.87rem" }}>{status.message}</p>
            <button type="button" style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0 }} onClick={() => setStatus(null)}>
              <X size={15} />
            </button>
          </div>
        )}
      </div>

      {/* Modules list from DB */}
      {modules.length > 0 && (
        <div className="panel">
          <div className="panel__header">
            <div>
              <h3>Modules in Database ({modules.length})</h3>
              <p>Click a module to preview its topics. Remove to delete from database.</p>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {modules.map((mod) => (
              <ModuleCard key={mod.id} mod={mod} onRemove={handleRemove} />
            ))}
          </div>
        </div>
      )}

      {modules.length === 0 && !uploading && (
        <div className="state-block" style={{ background: "rgba(34,167,200,0.04)", borderStyle: "dashed" }}>
          <FileSpreadsheet size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
          <p style={{ margin: 0 }}>No modules in database yet. Upload an Excel sheet above to get started.</p>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
