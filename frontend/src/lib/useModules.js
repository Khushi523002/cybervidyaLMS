/**
 * useModules — manages module data from Excel uploads.
 * Data is stored in localStorage so it persists across reloads.
 * Static MODULES from modulesData.js are always included as the base.
 *
 * Supports TWO Excel formats automatically:
 *
 * FORMAT A — Advanced (e.g. Web_Application_Advanced.xlsx)
 *   Row 0 is the header: Sr No | Topics | Sub Topic | Status | Concept | Subtopic
 *   Sr No marks a new topic group (1.0, 2.0 …)
 *   Blank Sr No rows are sub-topics (chapters) under the current topic
 *
 * FORMAT B — Basics / Trainee sheet (e.g. Web_Application_Basics_Christian.xlsx)
 *   First few rows are meta info: Trainee Name, Department, Duration, Topic
 *   Actual header row has: Sr No | Topics | Status | reference links | Concept | Subtopic
 *   Every row has its own Sr No — flat list of topics, no sub-topic rows
 *   Has a "reference links" column (multi-line refs per cell)
 */

import { useState, useEffect, useCallback } from "react";
import { MODULES as STATIC_MODULES } from "./modulesData";

const STORAGE_KEY = "cyber-vidya-uploaded-modules";

/* ─── helpers ──────────────────────────────────────────── */

const clean = (v) => String(v ?? "").trim();
const isBlank = (v) => !v || clean(v) === "" || clean(v).toLowerCase() === "nan";

/**
 * Find the real data-header row index in a raw 2-D array.
 * The data header is the row that has BOTH an "sr" column AND a "topic" column.
 * Returns the row index, or 0 if not found (assumes row 0 is header).
 */
function findHeaderRowIndex(rows) {
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const vals = rows[i].map((v) => clean(v).toLowerCase());
    const hasSr    = vals.some((v) => v === "sr no" || v === "sr.no" || v === "sr");
    const hasTopic = vals.some((v) => v === "topics" || v === "topic");
    if (hasSr && hasTopic) return i;
  }
  return 0;
}

/**
 * Extract meta-info (trainee name, dept, etc.) from rows BEFORE the header.
 * Returns an object like { traineeName, department, duration, topic }.
 */
function extractMeta(rows, headerIdx) {
  const meta = {};
  for (let i = 0; i < headerIdx; i++) {
    const key = clean(rows[i][0]).toLowerCase();
    const val = clean(rows[i][1]);
    if (!isBlank(val)) {
      if (key.includes("trainee")) meta.traineeName = val;
      else if (key.includes("dept") || key.includes("department")) meta.department = val;
      else if (key.includes("duration")) meta.duration = val;
      else if (key === "topic") meta.topic = val;
    }
  }
  return meta;
}

/* ─── main parser ───────────────────────────────────────── */

/**
 * Parse a raw 2D array (from xlsx library) into our MODULES shape.
 * Auto-detects Format A (advanced) vs Format B (basics/trainee sheet).
 */
export function parseExcelData(rows, fileName) {
  if (!rows || rows.length < 2) throw new Error("File has no data rows.");

  // Step 1: find real header row
  const headerIdx = findHeaderRowIndex(rows);
  const headerRow = rows[headerIdx].map((h) => clean(h).toLowerCase());

  // Step 2: extract optional meta rows before the header
  const meta = extractMeta(rows, headerIdx);

  // Step 3: map column indices
  const col = (keywords) => headerRow.findIndex((h) => keywords.some((k) => h.includes(k)));

  const srNoIdx     = col(["sr no", "sr.no", "sr"]);
  const topicIdx    = col(["topics", "topic"]);
  const conceptIdx  = col(["concept"]);
  const refsIdx     = col(["reference", "refs", "ref link", "refrence"]); // typo-tolerant

  // Sub Topic column: match "sub topic", "subtopics", "subtopic" WITH a space variant
  // Must come BEFORE the lone "subtopic" (no space) column
  const subTopicIdx = col(["sub topic", "subtopics"]);

  // Last col that is exactly "subtopic" (no space) — these are the subtopic tags like AAA, CCC
  const subtopicTagIdx = (() => {
    for (let i = headerRow.length - 1; i >= 0; i--) {
      if (headerRow[i] === "subtopic") return i;
    }
    return -1;
  })();

  if (topicIdx === -1) throw new Error('Could not find a "Topics" column. Check column headers.');

  const dataRows = rows.slice(headerIdx + 1);

  // Step 4: detect format
  // Format A: has a sub-topic/subtopics column OR has blank-Sr-No rows (chapters under topics)
  // Format B: every row has its own Sr No — flat list
  const hasSubTopicCol = subTopicIdx !== -1;

  // Also check data rows: if any row has blank Sr No but has content → Format A
  const hasBlankSrRows = dataRows.some((row) => {
    const sr = row[srNoIdx];
    const hasContent = row.some((cell) => !isBlank(cell));
    return isBlank(sr) && hasContent;
  });

  const isFormatA = hasSubTopicCol || hasBlankSrRows;
  const hasRefsCol = refsIdx !== -1;

  const topics = [];
  let currentTopic = null;

  dataRows.forEach((row, rowI) => {
    const srRaw      = row[srNoIdx];
    const topicLabel = clean(row[topicIdx]).replace(/\n/g, " ").trim();
    const concept    = clean(row[conceptIdx]).replace(/\s+/g, " ").trim();

    // Is this a real Sr No (a number or decimal like "1", "2.0")?
    const srNum   = parseFloat(srRaw);
    const hasSrNo = !isBlank(srRaw) && !isNaN(srNum);

    if (isFormatA) {
      /* ── FORMAT A ─────────────────────────────────────────
         Sr No row → new topic
         Blank Sr No row → sub-topic (chapter) of current topic
         Sub Topic col OR "Subtopics" col contains the chapter label  */

      // Chapter label: from subTopicIdx if present, else from topicIdx on blank-sr rows
      const chapterLabel = subTopicIdx !== -1
        ? clean(row[subTopicIdx])
        : (!hasSrNo && !isBlank(topicLabel) ? topicLabel : "");

      // Subtopic tags (e.g. AAA, CCC) from the last "subtopic" col
      const subtopicTag = subtopicTagIdx >= 0 ? clean(row[subtopicTagIdx]) : "";

      // Refs per row
      const refsRaw = hasRefsCol ? clean(row[refsIdx]) : "";
      const rowRefs = isBlank(refsRaw)
        ? []
        : refsRaw.split(/\n/).map((r) => r.trim()).filter((r) => r.startsWith("http"));

      if (hasSrNo && topicLabel) {
        // New top-level topic
        currentTopic = {
          id: `topic-${String(srNum).replace(".", "-")}-${rowI}`,
          label: topicLabel,
          concept: concept || "Theory",
          subtopics: !isBlank(subtopicTag)
            ? subtopicTag.split(/\n|,/).map((s) => s.trim()).filter(Boolean)
            : [],
          chapters: [],
          refs: [...rowRefs],
        };
        if (!isBlank(chapterLabel)) currentTopic.chapters.push(chapterLabel);
        topics.push(currentTopic);

      } else if (currentTopic && !isBlank(chapterLabel)) {
        // Sub-row: chapter under current topic
        currentTopic.chapters.push(chapterLabel);

        // Merge concept upward (e.g. if sub-row says Practical, parent becomes Theory+Practical)
        if (concept && concept.toLowerCase().includes("practical") &&
            !currentTopic.concept.toLowerCase().includes("practical")) {
          currentTopic.concept = "Theory + Practical";
        }

        // Merge subtopic tags
        if (!isBlank(subtopicTag)) {
          subtopicTag.split(/\n|,/).map((s) => s.trim()).filter(Boolean).forEach((s) => {
            if (s && !currentTopic.subtopics.includes(s)) currentTopic.subtopics.push(s);
          });
        }

        // Merge refs
        rowRefs.forEach((r) => {
          if (!currentTopic.refs.includes(r)) currentTopic.refs.push(r);
        });
      }

    } else {
      /* ── FORMAT B ─────────────────────────────────────────
         Every row is a standalone topic (flat list).
         May have a "reference links" column (multi-line URLs in one cell). */
      if (!topicLabel || isBlank(topicLabel)) return;

      const refsRaw = hasRefsCol ? clean(row[refsIdx]) : "";
      const refs = isBlank(refsRaw)
        ? []
        : refsRaw.split(/\n/).map((r) => r.trim()).filter((r) => r.startsWith("http"));

      const subtopicsRaw = subtopicTagIdx >= 0 ? clean(row[subtopicTagIdx]) : "";
      const subtopics = isBlank(subtopicsRaw)
        ? []
        : subtopicsRaw.split(/\n|,/).map((s) => s.trim()).filter(Boolean);

      const topicId = hasSrNo
        ? `topic-${String(srNum).replace(".", "-")}`
        : `topic-r${rowI}`;

      topics.push({
        id: topicId,
        label: topicLabel,
        concept: concept || "Theory",
        subtopics,
        chapters: [],
        refs,
      });
    }
  });

  if (topics.length === 0) {
    throw new Error(
      'No topics could be parsed. Check that columns are named "Sr No", "Topics", "Concept".'
    );
  }

  // Build module label: prefer meta.topic, else filename
  const baseName  = fileName.replace(/\.[^/.]+$/, "");
  const moduleLabel = meta.topic || baseName;
  const moduleId  = moduleLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  return {
    id: moduleId,
    label: moduleLabel,
    uploadedAt: new Date().toISOString(),
    meta: Object.keys(meta).length ? meta : undefined,
    topics,
  };
}


/** Load uploaded modules from localStorage */
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Save uploaded modules to localStorage */
function saveToStorage(modules) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(modules));
  } catch (e) {
    console.error("Failed to save modules to localStorage", e);
  }
}

/**
 * Hook: useModules
 * Returns:
 *   allModules      — static + uploaded modules combined
 *   uploadedModules — only the uploaded ones (for manager UI)
 *   addModule(mod)  — add a parsed module
 *   removeModule(id)— remove an uploaded module
 */
export function useModules() {
  const [uploadedModules, setUploadedModules] = useState(() => loadFromStorage());

  useEffect(() => {
    saveToStorage(uploadedModules);
  }, [uploadedModules]);

  const addModule = useCallback((mod) => {
    setUploadedModules((prev) => {
      // Replace if same id (re-upload)
      const filtered = prev.filter((m) => m.id !== mod.id);
      return [...filtered, mod];
    });
  }, []);

  const removeModule = useCallback((id) => {
    setUploadedModules((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const allModules = [...STATIC_MODULES, ...uploadedModules];

  return { allModules, uploadedModules, addModule, removeModule };
}
