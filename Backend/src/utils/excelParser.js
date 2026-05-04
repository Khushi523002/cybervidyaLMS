import XLSX from "xlsx";

const clean = (value) => String(value ?? "").trim();
const isBlank = (value) => !value || clean(value) === "" || clean(value).toLowerCase() === "nan";
const slugify = (value) => clean(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function findHeaderRowIndex(rows) {
  for (let i = 0; i < Math.min(rows.length, 20); i += 1) {
    const vals = rows[i].map((value) => clean(value).toLowerCase());
    const hasSr = vals.some((value) => ["sr no", "sr.no", "sr"].includes(value));
    const hasTopic = vals.some((value) => value === "topics" || value === "topic");
    if (hasSr && hasTopic) return i;
  }
  return -1;
}

function extractMeta(rows, headerIdx) {
  const meta = {};
  for (let i = 0; i < headerIdx; i += 1) {
    const key = clean(rows[i][0]).toLowerCase();
    const value = clean(rows[i][1]);
    if (isBlank(value)) continue;
    if (key.includes("trainee")) meta.traineeName = value;
    else if (key.includes("dept") || key.includes("department")) meta.department = value;
    else if (key.includes("duration")) meta.duration = value;
    else if (key === "topic") meta.topic = value;
  }
  return meta;
}

export function parseSheet(rows, sheetName) {
  const headerIdx = findHeaderRowIndex(rows);
  const blankModule = {
    moduleId: slugify(sheetName),
    label: sheetName,
    meta: undefined,
    topics: [],
  };
  if (headerIdx === -1) return blankModule;

  const headerRow = rows[headerIdx].map((header) => clean(header).toLowerCase());
  const meta = extractMeta(rows, headerIdx);
  const col = (keywords) => headerRow.findIndex((header) => keywords.some((keyword) => header.includes(keyword)));

  const srNoIdx = col(["sr no", "sr.no", "sr"]);
  const topicIdx = col(["topics", "topic"]);
  const conceptIdx = col(["concept"]);
  const refsIdx = col(["reference", "refs", "ref link", "refrence"]);
  const subTopicIdx = col(["sub topic", "subtopics"]);
  const subtopicTagIdx = (() => {
    for (let i = headerRow.length - 1; i >= 0; i -= 1) {
      if (headerRow[i] === "subtopic") return i;
    }
    return -1;
  })();

  if (topicIdx === -1) return blankModule;

  const dataRows = rows.slice(headerIdx + 1);
  const hasSubTopicCol = subTopicIdx !== -1;
  const hasBlankSrRows = dataRows.some((row) => isBlank(row[srNoIdx]) && row.some((cell) => !isBlank(cell)));
  const isAdvancedFormat = hasSubTopicCol || hasBlankSrRows;
  const topics = [];
  let currentTopic = null;

  dataRows.forEach((row, rowIndex) => {
    const srRaw = row[srNoIdx];
    const topicLabel = clean(row[topicIdx]).replace(/\n/g, " ");
    const concept = clean(row[conceptIdx]).replace(/\s+/g, " ") || "Theory";
    const srNum = parseFloat(srRaw);
    const hasSrNo = !isBlank(srRaw) && !Number.isNaN(srNum);
    const refsRaw = refsIdx >= 0 ? clean(row[refsIdx]) : "";
    const rowRefs = isBlank(refsRaw) ? [] : refsRaw.split(/\n/).map((ref) => ref.trim()).filter((ref) => ref.startsWith("http"));
    const subtopicTag = subtopicTagIdx >= 0 ? clean(row[subtopicTagIdx]) : "";

    if (isAdvancedFormat) {
      const chapterLabel = subTopicIdx !== -1 ? clean(row[subTopicIdx]) : (!hasSrNo && !isBlank(topicLabel) ? topicLabel : "");

      if (hasSrNo && topicLabel) {
        currentTopic = {
          id: `topic-${String(srNum).replace(".", "-")}-${rowIndex}`,
          label: topicLabel,
          concept,
          subtopics: isBlank(subtopicTag) ? [] : subtopicTag.split(/\n|,/).map((item) => item.trim()).filter(Boolean),
          chapters: [],
          refs: [...rowRefs],
        };
        if (!isBlank(chapterLabel)) currentTopic.chapters.push(chapterLabel);
        topics.push(currentTopic);
      } else if (currentTopic && !isBlank(chapterLabel)) {
        currentTopic.chapters.push(chapterLabel);
        if (concept.toLowerCase().includes("practical") && !currentTopic.concept.toLowerCase().includes("practical")) {
          currentTopic.concept = "Theory + Practical";
        }
        if (!isBlank(subtopicTag)) {
          subtopicTag.split(/\n|,/).map((item) => item.trim()).filter(Boolean).forEach((item) => {
            if (!currentTopic.subtopics.includes(item)) currentTopic.subtopics.push(item);
          });
        }
        rowRefs.forEach((ref) => {
          if (!currentTopic.refs.includes(ref)) currentTopic.refs.push(ref);
        });
      }
      return;
    }

    if (!topicLabel || isBlank(topicLabel)) return;
    const subtopicsRaw = subtopicTagIdx >= 0 ? clean(row[subtopicTagIdx]) : "";
    topics.push({
      id: hasSrNo ? `topic-${String(srNum).replace(".", "-")}` : `topic-r${rowIndex}`,
      label: topicLabel,
      concept,
      subtopics: isBlank(subtopicsRaw) ? [] : subtopicsRaw.split(/\n|,/).map((item) => item.trim()).filter(Boolean),
      chapters: [],
      refs: rowRefs,
    });
  });

  return {
    ...blankModule,
    meta: Object.keys(meta).length ? meta : undefined,
    topics,
  };
}

export function parseWorkbook(buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  return workbook.SheetNames.map((sheetName) => {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: null });
    return parseSheet(rows, sheetName);
  }).filter((module) => module.moduleId);
}
