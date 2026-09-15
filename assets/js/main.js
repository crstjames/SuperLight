// SūperLight Markdown Editor - Main JavaScript

// =================== Config ===================
const START = "MDHISTORY:v1";
const END = "END-MDHISTORY";

// =================== Utils ===================
const b64enc = (str) => {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
};
const b64dec = (b64) => {
  try {
    const bin = atob(b64);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return "";
  }
};

const b64urlFromBytes = (bytes) => {
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};
const bytesFromB64url = (b64u) => {
  let s = b64u.replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4;
  if (pad) s += "====".slice(pad);
  const bin = atob(s);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
};

async function gzipString(str) {
  const enc = new TextEncoder().encode(str);
  const cs = new CompressionStream("gzip");
  const stream = new Blob([enc]).stream().pipeThrough(cs);
  const buf = await new Response(stream).arrayBuffer();
  return new Uint8Array(buf);
}
async function gunzipBytes(bytes) {
  const ds = new DecompressionStream("gzip");
  const stream = new Blob([bytes]).stream().pipeThrough(ds);
  const buf = await new Response(stream).arrayBuffer();
  return new Uint8Array(buf);
}

// Enhanced GitHub-compatible Markdown renderer
function mdToHtml(md) {
  if (!md.trim()) return '<p style="color: #999; font-style: italic">Preview will appear here...</p>';

  let html = md.replace(/\r\n?/g, "\n");

  // Process in the correct order to avoid conflicts
  html = processCodeBlocks(html);
  html = processHorizontalRules(html);
  html = processTables(html);
  html = processHeaders(html);
  html = processBlockquotes(html);
  html = processLists(html);
  html = processImages(html);
  html = processLinks(html);
  html = processTextFormatting(html);
  html = processParagraphs(html);

  return html;
}

function processCodeBlocks(text) {
  // Handle fenced code blocks with language specification
  return text.replace(/```(\w*)\n?([\s\S]*?)```/g, (match, lang, code) => {
    if (lang.toLowerCase() === "mermaid" && isGanttDiagram(code)) {
      const rendered = renderMermaidGantt(code);
      if (rendered) return rendered;
    }
    const language = lang ? ` class="language-${esc(lang)}"` : "";
    return `<pre><code${language}>${esc(code.trim())}</code></pre>`;
  });
}

// =================== Mermaid Gantt Rendering ===================
// A tiny, dependency-free renderer for the subset of mermaid's gantt syntax
// (section/task/status/dates/durations/"after" dependencies). Other mermaid
// diagram types are left as plain code blocks.
const GANTT_STATUS_WORDS = ["done", "active", "crit", "milestone"];

function isGanttDiagram(code) {
  const firstLine = code
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l && !l.startsWith("%%"));
  return !!firstLine && /^gantt\b/i.test(firstLine);
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function makeDateParser(fmt) {
  const tokenOrder = [];
  let pattern = "";
  let lastIndex = 0;
  const re = /YYYY|YY|MM|DD|M|D/g;
  let m;
  while ((m = re.exec(fmt))) {
    pattern += escapeRegExp(fmt.slice(lastIndex, m.index));
    const tok = m[0];
    if (tok === "YYYY") {
      pattern += "(\\d{4})";
      tokenOrder.push("Y");
    } else if (tok === "YY") {
      pattern += "(\\d{2})";
      tokenOrder.push("y");
    } else if (tok === "MM" || tok === "M") {
      pattern += "(\\d{1,2})";
      tokenOrder.push("M");
    } else if (tok === "DD" || tok === "D") {
      pattern += "(\\d{1,2})";
      tokenOrder.push("D");
    }
    lastIndex = re.lastIndex;
  }
  pattern += escapeRegExp(fmt.slice(lastIndex));
  const regex = new RegExp(`^${pattern}$`);

  return function parseDate(str) {
    const trimmed = str.trim();
    const match = regex.exec(trimmed);
    if (!match) {
      const fallback = new Date(trimmed);
      return isNaN(fallback.getTime()) ? null : fallback;
    }
    let year = 1970,
      month = 0,
      day = 1;
    tokenOrder.forEach((t, i) => {
      const v = parseInt(match[i + 1], 10);
      if (t === "Y") year = v;
      else if (t === "y") year = 2000 + v;
      else if (t === "M") month = v - 1;
      else if (t === "D") day = v;
    });
    return new Date(year, month, day);
  };
}

function addGanttDuration(date, durStr) {
  const m = /^(\d+)([a-zA-Z]+)$/.exec(durStr.trim());
  if (!m) return new Date(date);
  const n = parseInt(m[1], 10);
  const unit = m[2];
  const d = new Date(date);
  if (unit === "w" || unit === "W") d.setDate(d.getDate() + n * 7);
  else if (unit === "M") d.setMonth(d.getMonth() + n);
  else if (unit === "y" || unit === "Y") d.setFullYear(d.getFullYear() + n);
  else if (unit === "h" || unit === "H") d.setHours(d.getHours() + n);
  else if (unit === "m") d.setMinutes(d.getMinutes() + n);
  else d.setDate(d.getDate() + n); // default: days ("d" and unrecognized units)
  return d;
}

function parseGanttData(code) {
  let title = "";
  let dateFormat = "YYYY-MM-DD";
  let parseDate = makeDateParser(dateFormat);
  const sections = [];
  const tasksById = {};
  let currentSection = { name: "", tasks: [] };
  sections.push(currentSection);
  let autoId = 0;

  code.split("\n").forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line || line.startsWith("%%") || /^gantt$/i.test(line)) return;

    let m;
    if ((m = /^title\s+(.+)$/i.exec(line))) {
      title = m[1].trim();
      return;
    }
    if ((m = /^dateFormat\s+(.+)$/i.exec(line))) {
      dateFormat = m[1].trim();
      parseDate = makeDateParser(dateFormat);
      return;
    }
    if (/^(axisFormat|excludes|todayMarker)\s+/i.test(line)) {
      return; // not needed for rendering
    }
    if ((m = /^section\s+(.+)$/i.exec(line))) {
      currentSection = { name: m[1].trim(), tasks: [] };
      sections.push(currentSection);
      return;
    }

    // Task line: "<label> : <status,>* <id?, start, end>"
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) return;
    const label = line.slice(0, colonIdx).trim();
    if (!label) return;

    const tokens = line
      .slice(colonIdx + 1)
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t !== "");

    const status = new Set();
    while (tokens.length && GANTT_STATUS_WORDS.includes(tokens[0].toLowerCase())) {
      status.add(tokens.shift().toLowerCase());
    }
    if (!tokens.length) return;

    const isStartSpec = (tok) => /^after\s+/i.test(tok) || parseDate(tok) !== null;

    let id, startTok, endTok;
    if (isStartSpec(tokens[0])) {
      id = `ganttTask${++autoId}`;
      startTok = tokens[0];
      endTok = tokens[1];
    } else {
      id = tokens[0];
      startTok = tokens[1];
      endTok = tokens[2];
    }
    if (!startTok) return;

    let startDate = null;
    if (/^after\s+/i.test(startTok)) {
      const refIds = startTok.replace(/^after\s+/i, "").trim().split(/\s+/);
      const refDates = refIds.map((rid) => tasksById[rid] && tasksById[rid].end).filter(Boolean);
      if (refDates.length) startDate = new Date(Math.max(...refDates.map((d) => d.getTime())));
    } else {
      startDate = parseDate(startTok);
    }
    if (!startDate) return;

    const milestone = status.has("milestone");
    let endDate;
    if (!endTok) {
      endDate = new Date(startDate);
    } else if (/^\d+[a-zA-Z]+$/.test(endTok)) {
      endDate = addGanttDuration(startDate, endTok);
    } else {
      endDate = parseDate(endTok) || new Date(startDate);
    }

    const task = { id, label, status, milestone, start: startDate, end: endDate };
    currentSection.tasks.push(task);
    tasksById[id] = task;
  });

  return { title, sections: sections.filter((s) => s.tasks.length) };
}

function formatGanttDate(d) {
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function renderMermaidGantt(code) {
  let data;
  try {
    data = parseGanttData(code);
  } catch (e) {
    return null;
  }

  const allTasks = data.sections.flatMap((s) => s.tasks);
  if (!allTasks.length) return null;

  let minDate = allTasks[0].start;
  let maxDate = allTasks[0].end;
  allTasks.forEach((t) => {
    if (t.start < minDate) minDate = t.start;
    if (t.end > maxDate) maxDate = t.end;
  });

  const totalMs = Math.max(maxDate.getTime() - minDate.getTime(), 1);
  const padMs = totalMs * 0.02;
  const rangeStart = new Date(minDate.getTime() - padMs);
  const rangeEnd = new Date(maxDate.getTime() + padMs);
  const rangeMs = Math.max(rangeEnd.getTime() - rangeStart.getTime(), 1);
  const pct = (date) => ((date.getTime() - rangeStart.getTime()) / rangeMs) * 100;

  const ticks = [];
  const tickDate = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
  while (tickDate <= rangeEnd) {
    ticks.push(new Date(tickDate));
    tickDate.setMonth(tickDate.getMonth() + 1);
  }
  const monthLabel = (d) => d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });

  let html = '<div class="gantt-chart">';
  if (data.title) {
    html += `<div class="gantt-title">${esc(data.title)}</div>`;
  }

  html += '<div class="gantt-axis"><div class="gantt-axis-spacer"></div><div class="gantt-axis-track">';
  ticks.forEach((d) => {
    html += `<span class="gantt-tick" style="left:${pct(d).toFixed(3)}%">${esc(monthLabel(d))}</span>`;
  });
  html += "</div></div>";

  html += '<div class="gantt-body">';
  data.sections.forEach((section) => {
    html += '<div class="gantt-section">';
    if (section.name) {
      html += `<div class="gantt-section-label">${esc(section.name)}</div>`;
    }
    section.tasks.forEach((task) => {
      const statusClass = Array.from(task.status)
        .map((s) => ` gantt-bar--${s}`)
        .join("");
      const left = pct(task.start);
      const dateRange = `${formatGanttDate(task.start)} – ${formatGanttDate(task.end)}`;
      const tooltip = esc(`${task.label} — ${dateRange}`);

      html += '<div class="gantt-row">';
      html += `<div class="gantt-row-label" title="${esc(task.label)}">${esc(task.label)}</div>`;
      html += '<div class="gantt-row-track">';
      if (task.milestone) {
        html += `<div class="gantt-milestone" style="left:${left.toFixed(3)}%" title="${tooltip}"></div>`;
      } else {
        const width = Math.max(pct(task.end) - left, 0.6);
        html += `<div class="gantt-bar${statusClass}" style="left:${left.toFixed(3)}%;width:${width.toFixed(
          3
        )}%" title="${tooltip}"></div>`;
      }
      html += "</div></div>";
    });
    html += "</div>";
  });
  html += "</div></div>";

  return html;
}

function processHorizontalRules(text) {
  return text.replace(/^(\s*)(---+|___+|\*\*\*+)\s*$/gm, "<hr>");
}

function processTables(text) {
  return text.replace(/(^|\n\n)(\s*\|.+\|(?:\s*\n\s*\|.+\|)*)/gm, (match, prefix, tableContent) => {
    const lines = tableContent
      .trim()
      .split("\n")
      .map((line) => line.trim());
    if (lines.length < 2) return match;

    const headerRow = lines[0];
    const separatorRow = lines[1];
    const dataRows = lines.slice(2);

    // Validate separator row
    if (!/^\|\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|$/.test(separatorRow)) return match;

    // Parse alignment from separator
    const alignments = separatorRow
      .split("|")
      .slice(1, -1)
      .map((cell) => {
        const trimmed = cell.trim();
        if (trimmed.startsWith(":") && trimmed.endsWith(":")) return "center";
        if (trimmed.endsWith(":")) return "right";
        return "left";
      });

    let table = "<table>\n<thead>\n<tr>";
    const headerCells = headerRow.split("|").slice(1, -1);
    headerCells.forEach((cell, i) => {
      const align = alignments[i] ? ` style="text-align: ${alignments[i]}"` : "";
      table += `<th${align}>${processInlineFormatting(cell.trim())}</th>`;
    });
    table += "</tr>\n</thead>\n<tbody>\n";

    dataRows.forEach((row) => {
      table += "<tr>";
      const cells = row.split("|").slice(1, -1);
      cells.forEach((cell, i) => {
        const align = alignments[i] ? ` style="text-align: ${alignments[i]}"` : "";
        table += `<td${align}>${processInlineFormatting(cell.trim())}</td>`;
      });
      table += "</tr>\n";
    });
    table += "</tbody>\n</table>";

    // Return with proper prefix (preserve paragraph breaks)
    return prefix + table;
  });
}

function processHeaders(text) {
  return text.replace(/^(#{1,6})\s+(.+)$/gm, (match, hashes, content) => {
    const level = hashes.length;
    const id = content
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-");
    return `<h${level} id="${id}">${processInlineFormatting(content.trim())}</h${level}>`;
  });
}

function processBlockquotes(text) {
  return text.replace(/(^|\n)(>\s*.+(?:\n>\s*.+)*)/gm, (match, prefix, quote) => {
    const lines = quote.split("\n").map((line) => line.replace(/^>\s?/, ""));
    const content = lines.join("\n");
    return `${prefix}<blockquote>\n${mdToHtml(content)}\n</blockquote>`;
  });
}

function processLists(text) {
  // Process task lists first
  text = text.replace(/(^|\n)((?:\s*[-*+]\s+\[[ x]\]\s+.+(?:\n|$))+)/gm, (match, prefix, listContent) => {
    const items = listContent.split("\n").filter((line) => line.trim());
    let html = `${prefix}<ul class="task-list">\n`;

    items.forEach((item) => {
      const taskMatch = item.match(/^\s*[-*+]\s+\[([x ])\]\s+(.+)$/);
      if (taskMatch) {
        const [, checked, content] = taskMatch;
        const isChecked = checked === "x" ? "checked" : "";
        html += `<li class="task-list-item"><input type="checkbox" ${isChecked} disabled> ${processInlineFormatting(
          content
        )}</li>\n`;
      }
    });

    html += "</ul>";
    return html;
  });

  // Process ordered lists
  text = text.replace(/(^|\n)((?:\s*\d+\.\s+.+(?:\n(?:\s*\d+\.\s+.+|\s*\n)*)*)+)/gm, (match, prefix, listContent) => {
    const lines = listContent.split("\n").filter((line) => line.trim());
    let html = `${prefix}<ol>\n`;

    lines.forEach((line) => {
      const itemMatch = line.match(/^\s*\d+\.\s+(.+)$/);
      if (itemMatch) {
        html += `<li>${processInlineFormatting(itemMatch[1])}</li>\n`;
      }
    });

    html += "</ol>";
    return html;
  });

  // Process unordered lists
  text = text.replace(/(^|\n)((?:\s*[-*+]\s+.+(?:\n(?:\s*[-*+]\s+.+|\s*\n)*)*)+)/gm, (match, prefix, listContent) => {
    const lines = listContent.split("\n").filter((line) => line.trim());
    let html = `${prefix}<ul>\n`;

    lines.forEach((line) => {
      const itemMatch = line.match(/^\s*[-*+]\s+(.+)$/);
      if (itemMatch) {
        html += `<li>${processInlineFormatting(itemMatch[1])}</li>\n`;
      }
    });

    html += "</ul>";
    return html;
  });

  return text;
}

function processImages(text) {
  return text.replace(/!\[([^\]]*)\]\(([^)]+)(?:\s+"([^"]*)")?\)/g, (match, alt, src, title) => {
    const titleAttr = title ? ` title="${esc(title)}"` : "";
    return `<img src="${esc(src)}" alt="${esc(alt)}"${titleAttr} />`;
  });
}

function processLinks(text) {
  // Handle reference-style links first
  const refLinks = {};
  text = text.replace(/^\[([^\]]+)\]:\s*(.+)$/gm, (match, label, url) => {
    refLinks[label.toLowerCase()] = url.trim();
    return "";
  });

  // Process reference links
  text = text.replace(/\[([^\]]+)\]\[([^\]]*)\]/g, (match, linkText, ref) => {
    const refKey = (ref || linkText).toLowerCase();
    const url = refLinks[refKey];
    if (url) {
      return `<a href="${esc(url)}" target="_blank" rel="noopener">${processInlineFormatting(linkText)}</a>`;
    }
    return match;
  });

  // Process inline links
  return text.replace(/\[([^\]]+)\]\(([^)]+)(?:\s+"([^"]*)")?\)/g, (match, linkText, url, title) => {
    const titleAttr = title ? ` title="${esc(title)}"` : "";
    return `<a href="${esc(url)}" target="_blank" rel="noopener"${titleAttr}>${processInlineFormatting(linkText)}</a>`;
  });
}

function processInlineFormatting(text) {
  // Handle inline code first to protect it from other formatting
  text = text.replace(/`([^`]+)`/g, (match, code) => {
    return `<code>${esc(code)}</code>`;
  });

  // Handle strong/bold (** or __)
  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/__([^_]+)__/g, "<strong>$1</strong>");

  // Handle emphasis/italic (* or _)
  text = text.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  text = text.replace(/_([^_]+)_/g, "<em>$1</em>");

  // Handle strikethrough
  text = text.replace(/~~([^~]+)~~/g, "<del>$1</del>");

  return text;
}

function processTextFormatting(text) {
  return processInlineFormatting(text);
}

function processParagraphs(text) {
  // Split by double newlines to identify paragraph breaks
  const blocks = text.split(/\n\s*\n/);

  return blocks
    .map((block) => {
      block = block.trim();
      if (!block) return "";

      // Skip if it's already an HTML element
      if (block.match(/^<(h[1-6]|ul|ol|blockquote|pre|table|hr|div)/)) {
        return block;
      }

      // Skip if it's a table (starts with |)
      if (block.match(/^\|/)) {
        return block;
      }

      // Handle single line breaks within paragraphs
      block = block.replace(/\n/g, "<br>");

      return `<p>${block}</p>`;
    })
    .filter((block) => block) // Remove empty blocks
    .join("\n\n");
}

const esc = (x) => {
  if (typeof x !== "string") return x;
  return x.replace(
    /[&<>"']/g,
    (m) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[m])
  );
};

// History functions (simplified for this example)
function extractHistoryBlock(md) {
  const re = new RegExp(`<!--\\s*${START}[\\s\\S]*?${END}\\s*-->\\s*$`);
  const m = md.match(re);
  return m ? m[0] : null;
}
function stripHistory(md) {
  const blk = extractHistoryBlock(md);
  return blk ? md.slice(0, md.lastIndexOf(blk)).trimEnd() : md.trimEnd?.() ?? md;
}

// =================== App State ===================
let currentMd = `# SūperLight ⚡

_Loading README..._`;

let loadedFilename = "README.md";

// =================== DOM Elements ===================
const container = document.querySelector(".container");
const textarea = document.querySelector(".editor-textarea");
const preview = document.querySelector(".preview-panel");
const navButtons = document.querySelectorAll(".nav-btn");

// Mobile elements
const mobileContent = document.querySelector(".mobile-content");
const mobileContentWrapper = document.querySelector(".mobile-content-wrapper");
const mobileTabs = document.querySelectorAll(".mobile-tab");
const mobileTabIndicator = document.querySelector(".mobile-tab-indicator");
const mobileTextarea = document.querySelector(".mobile-content .editor-textarea");
const mobilePreview = document.querySelector(".mobile-content .preview-panel");

// Footer elements
const charCountEl = document.getElementById("char-count");
const wordCountEl = document.getElementById("word-count");
const lineCountEl = document.getElementById("line-count");
const datetimeEl = document.getElementById("datetime");
const importBtn = document.getElementById("import-btn");
const clearBtn = document.getElementById("clear-btn");
const shareBtn = document.getElementById("share-btn");
const themeToggle = document.getElementById("theme-toggle");

// Modal elements
const importModal = document.getElementById("import-modal");
const modalClose = document.getElementById("modal-close");
const modalTabs = document.querySelectorAll(".modal-tab");
const importTextarea = document.getElementById("import-textarea");
const importPasteBtn = document.getElementById("import-paste");
const cancelImportBtn = document.getElementById("cancel-import");
const fileDropZone = document.getElementById("file-drop-zone");
const modalFileInput = document.getElementById("modal-file-input");
const importFileBtn = document.getElementById("import-file");
const cancelFileBtn = document.getElementById("cancel-file");

// Share modal elements
const shareModal = document.getElementById("share-modal");
const shareModalClose = document.getElementById("share-modal-close");
const shareOptions = document.getElementById("share-options");

// =================== Functions ===================
function renderAll() {
  const visible = stripHistory(currentMd);

  // Debug: Check if preview element exists
  if (!preview) {
    console.error("Preview panel not found!");
    return;
  }

  const htmlContent = mdToHtml(visible);
  preview.innerHTML = htmlContent;

  // Always sync mobile elements regardless of current tab
  if (mobilePreview) {
    mobilePreview.innerHTML = htmlContent;
  }

  if (mobileTextarea && textarea) {
    mobileTextarea.value = textarea.value;
  }

  updateStats();
}

function updateStats() {
  const text = currentMd;
  const chars = text.length;
  const words = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
  const lines = text === "" ? 0 : text.split("\n").length;

  charCountEl.textContent = `Chars: ${chars}`;
  wordCountEl.textContent = `Words: ${words}`;
  lineCountEl.textContent = `Lines: ${lines}`;
}

function setLayout(layout) {
  container.dataset.layout = layout;
  navButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.layout === layout);
  });
}

// Modal functions
function showModal() {
  importModal.classList.add("active");
  document.body.style.overflow = "hidden";
}

function hideModal() {
  importModal.classList.remove("active");
  document.body.style.overflow = "";
  // Reset modal state
  importTextarea.value = "";
  modalFileInput.value = "";
  importFileBtn.disabled = true;
  setActiveTab("paste");
}

function setActiveTab(tabName) {
  modalTabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.tab === tabName);
  });
  document.getElementById("paste-tab").classList.toggle("active", tabName === "paste");
  document.getElementById("file-tab").classList.toggle("active", tabName === "file");
}

async function tryDecodeContent(content) {
  // Handle full URLs - extract the hash part
  if (content.includes("#MDLITE:")) {
    const hashPart = content.split("#")[1];
    if (hashPart && hashPart.startsWith("MDLITE:")) {
      return await tryDecodeContent(hashPart);
    }
  }

  // Try to decode if it looks like encoded content
  if (content.startsWith("MDLITE:")) {
    try {
      const [tag, rest] = content.split("|", 2);
      const restAll = content.slice(tag.length + 1);
      if (restAll.startsWith("b64|")) {
        const data = restAll.slice("b64|".length);
        return b64dec(data);
      } else if (restAll.startsWith("gz-b64url|")) {
        // Handle gzip decompression
        const data = restAll.slice("gz-b64url|".length);
        const bytes = bytesFromB64url(data);
        const decompressed = await gunzipBytes(bytes);
        return new TextDecoder().decode(decompressed);
      }
    } catch (e) {
      console.warn("Failed to decode content", e);
    }
  }
  return content;
}

// Share modal functions
function showShareModal() {
  shareModal.classList.add("active");
  document.body.style.overflow = "hidden";
  generateShareOptions();
}

function hideShareModal() {
  shareModal.classList.remove("active");
  document.body.style.overflow = "";
}

async function generateShareOptions() {
  const contentToShare = currentMd;
  const options = [];

  try {
    // Option 1: Direct URL (best case)
    let directUrl = "";
    let directPayload = "";

    if ("CompressionStream" in window && "DecompressionStream" in window) {
      const gz = await gzipString(contentToShare);
      directPayload = `MDLITE:v1|gz-b64url|` + b64urlFromBytes(gz);
    } else {
      directPayload = `MDLITE:v1|b64|` + b64enc(contentToShare);
    }

    directUrl = location.origin + location.pathname + "#" + directPayload;

    // Single unified sharing option - handles both URL and encoded content
    let title, description, status, statusClass, className;

    if (directUrl.length <= 2000) {
      title = "Share Link";
      description = "Perfect size for all messengers. Recipient can paste the full URL into Import.";
      status = "recommended";
      statusClass = "recommended";
      className = "success";
    } else if (directUrl.length <= 8000) {
      title = "Share Link";
      description = "May not work in some messengers (WhatsApp, SMS). Recipient can paste into Import.";
      status = "warning";
      statusClass = "warning";
      className = "warning";
    } else {
      title = "Share Content";
      description = "Content too large for URL. Copy this text for sharing. Recipient pastes into Import.";
      status = "recommended";
      statusClass = "recommended";
      className = "";
    }

    options.push({
      title,
      status,
      statusClass,
      description,
      type: "share",
      payload: directUrl.length <= 8000 ? directUrl : directPayload,
      className,
    });

    // Option 3: File download (always available) - more compact
    options.push({
      title: "Download File",
      status: "",
      statusClass: "",
      description: "Save as .md file for email or cloud sharing.",
      type: "file",
      payload: contentToShare,
      className: "",
    });
  } catch (e) {
    console.error("Error generating share options:", e);
  }

  renderShareOptions(options);
}

function renderShareOptions(options) {
  shareOptions.innerHTML = options
    .map(
      (option, index) => `
      <div class="share-option ${option.className}">
        <div class="share-option-header">
          <h4 class="share-option-title">${option.title}</h4>
          ${option.status ? `<span class="share-option-status ${option.statusClass}">${option.status}</span>` : ""}
        </div>
        <p class="share-option-description">${option.description}</p>
        ${
          option.type === "share" && option.payload.length > 200
            ? `
          <div class="encoded-text-preview">${option.payload.substring(0, 100)}${
                option.payload.length > 100 ? "..." : ""
              }</div>
        `
            : ""
        }
        <div class="share-option-actions">
          ${
            option.type === "share"
              ? `
            <button class="share-btn-small primary" onclick="copyToClipboardAndClose('${option.payload.replace(
              /'/g,
              "\\'"
            )}')">Copy & Share</button>
          `
              : ""
          }
          ${
            option.type === "file"
              ? `
            <button class="share-btn-small primary" onclick="downloadFile()">Download</button>
          `
              : ""
          }
        </div>
      </div>
    `
    )
    .join("");
}

async function copyToClipboard(text, successMessage) {
  try {
    await navigator.clipboard.writeText(text);
    // Show brief success feedback
    const originalContent = event.target.textContent;
    event.target.textContent = "Copied!";
    event.target.style.background = "#28a745";
    setTimeout(() => {
      event.target.textContent = originalContent;
      event.target.style.background = "";
    }, 1500);
  } catch (e) {
    // Fallback for older browsers
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
    alert(successMessage);
  }
}

async function copyToClipboardAndClose(text) {
  try {
    await navigator.clipboard.writeText(text);
    // Show brief success feedback
    const originalContent = event.target.textContent;
    event.target.textContent = "Copied!";
    event.target.style.background = "#28a745";
    setTimeout(() => {
      hideShareModal();
    }, 800);
  } catch (e) {
    // Fallback for older browsers
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
    hideShareModal();
  }
}

function downloadFile() {
  const blob = new Blob([currentMd], { type: "text/markdown" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = loadedFilename.endsWith(".md") ? loadedFilename : "document.md";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// Shortcuts help function
function showShortcutsHelp() {
  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const cmdKey = isMac ? "⌘" : "Ctrl";

  const shortcuts = [
    `${cmdKey} + S - Save/Download file`,
    `${cmdKey} + O - Open/Import file`,
    `${cmdKey} + N - New document (clear)`,
    `${cmdKey} + Shift + S - Share document`,
    `${cmdKey} + D - Toggle dark mode`,
    `${cmdKey} + 1 - Markdown view`,
    `${cmdKey} + 2 - Split view`,
    `${cmdKey} + 3 - Preview view`,
    `${cmdKey} + / - Show this help`,
    `Tab - Insert 2 spaces (in editor)`,
    `Esc - Close modals`,
  ];

  alert(`SūperLight Keyboard Shortcuts:\n\n${shortcuts.join("\n")}`);
}

// Theme functionality
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute("data-theme");
  const newTheme = currentTheme === "dark" ? "light" : "dark";

  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);

  // Update the theme icon
  const themeIcon = themeToggle.querySelector(".theme-icon");
  themeIcon.textContent = newTheme === "dark" ? "🌙" : "☀️";
  themeToggle.title = newTheme === "dark" ? "Switch to light mode" : "Switch to dark mode";
}

function initializeTheme() {
  // Check for saved theme preference or default to 'light'
  const savedTheme = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);

  // Update the theme icon
  const themeIcon = themeToggle.querySelector(".theme-icon");
  themeIcon.textContent = savedTheme === "dark" ? "🌙" : "☀️";
  themeToggle.title = savedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode";
}

// =================== Mobile Tab System ===================
let currentMobileTab = "code";
let touchStartX = 0;
let touchStartY = 0;
let isSwiping = false;

function updateMobileTab(tabName) {
  currentMobileTab = tabName;

  // Update tab indicators
  mobileTabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.tab === tabName);
  });

  // Update tab indicator position
  const activeTab = document.querySelector(`.mobile-tab[data-tab="${tabName}"]`);
  if (activeTab && mobileTabIndicator) {
    const tabRect = activeTab.getBoundingClientRect();
    const containerRect = activeTab.parentElement.getBoundingClientRect();
    const left = tabRect.left - containerRect.left;
    const width = tabRect.width;

    mobileTabIndicator.style.left = `${left}px`;
    mobileTabIndicator.style.width = `${width}px`;
  }

  // Update content position
  const translateX = tabName === "code" ? "0%" : "-33.333%";
  if (mobileContentWrapper) {
    mobileContentWrapper.style.transform = `translateX(${translateX})`;
  }

  // Always sync content between desktop and mobile
  if (tabName === "code") {
    // Switching to markdown tab - sync textarea
    if (mobileTextarea && textarea) {
      mobileTextarea.value = textarea.value;
      // Focus after a short delay to ensure the tab transition is complete
      setTimeout(() => mobileTextarea.focus(), 300);
    }
  } else if (tabName === "preview") {
    // Switching to preview tab - ensure preview is up to date
    if (mobilePreview) {
      // Force a re-render to make sure mobile preview has latest content
      const htmlContent = mdToHtml(stripHistory(currentMd));
      mobilePreview.innerHTML = htmlContent;
    }
  }
}

function initializeMobileTabs() {
  // Set initial tab indicator position
  setTimeout(() => {
    updateMobileTab("code");
  }, 100);

  // Mobile tab click handlers
  mobileTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      updateMobileTab(tab.dataset.tab);
    });
  });

  // Touch/swipe handlers for mobile content
  if (mobileContent) {
    mobileContent.addEventListener(
      "touchstart",
      (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        isSwiping = false;
      },
      { passive: true }
    );

    mobileContent.addEventListener(
      "touchmove",
      (e) => {
        if (!touchStartX) return;

        const touchX = e.touches[0].clientX;
        const touchY = e.touches[0].clientY;
        const deltaX = touchStartX - touchX;
        const deltaY = touchStartY - touchY;

        // Determine if this is a horizontal swipe
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
          isSwiping = true;
          e.preventDefault(); // Prevent scrolling while swiping
        }
      },
      { passive: false }
    );

    mobileContent.addEventListener(
      "touchend",
      (e) => {
        if (!touchStartX || !isSwiping) {
          touchStartX = 0;
          touchStartY = 0;
          isSwiping = false;
          return;
        }

        const touchEndX = e.changedTouches[0].clientX;
        const deltaX = touchStartX - touchEndX;
        const threshold = 50; // Minimum swipe distance

        if (Math.abs(deltaX) > threshold) {
          if (deltaX > 0 && currentMobileTab === "code") {
            // Swipe left: Markdown -> Preview
            updateMobileTab("preview");
          } else if (deltaX < 0 && currentMobileTab === "preview") {
            // Swipe right: Preview -> Markdown
            updateMobileTab("code");
          }
        }

        touchStartX = 0;
        touchStartY = 0;
        isSwiping = false;
      },
      { passive: true }
    );
  }

  // Sync mobile textarea changes with desktop
  if (mobileTextarea) {
    mobileTextarea.addEventListener("input", function () {
      if (textarea) {
        textarea.value = this.value;
        currentMd = this.value;
        renderAll();
      }
    });
  }
}

// =================== Event Listeners ===================
textarea.addEventListener("input", function () {
  currentMd = this.value;
  renderAll(); // renderAll now handles mobile syncing
});

// Layout switching
navButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    setLayout(btn.dataset.layout);
  });
});

// New button functionality
importBtn.addEventListener("click", () => {
  showModal();
});

// Clear button functionality with inline confirmation
const clearConfirm = document.getElementById("clear-confirm");
const clearYes = document.getElementById("clear-yes");
const clearNo = document.getElementById("clear-no");

clearBtn.addEventListener("click", () => {
  clearConfirm.classList.add("active");
});

clearYes.addEventListener("click", () => {
  loadedFilename = "document.md";
  currentMd = "";
  textarea.value = currentMd;
  renderAll();
  clearConfirm.classList.remove("active");
});

clearNo.addEventListener("click", () => {
  clearConfirm.classList.remove("active");
});

// Hide confirmation when clicking elsewhere
document.addEventListener("click", (e) => {
  if (!e.target.closest(".clear-group")) {
    clearConfirm.classList.remove("active");
  }
});

// Modal event listeners
modalClose.addEventListener("click", hideModal);
cancelImportBtn.addEventListener("click", hideModal);
cancelFileBtn.addEventListener("click", hideModal);

// Share modal event listeners
shareModalClose.addEventListener("click", hideShareModal);

// Close modal on overlay click
importModal.addEventListener("click", (e) => {
  if (e.target === importModal) {
    hideModal();
  }
});

shareModal.addEventListener("click", (e) => {
  if (e.target === shareModal) {
    hideShareModal();
  }
});

// Tab switching
modalTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    setActiveTab(tab.dataset.tab);
  });
});

// Paste import functionality
importPasteBtn.addEventListener("click", async () => {
  const content = importTextarea.value.trim();
  if (!content) return;

  try {
    const decodedContent = await tryDecodeContent(content);
    currentMd = decodedContent;
    textarea.value = currentMd;
    renderAll();
    hideModal();
  } catch (e) {
    console.error("Failed to decode content:", e);
    alert("Failed to decode the pasted content. Please check the format and try again.");
  }
});

// File drop zone functionality
fileDropZone.addEventListener("click", () => {
  modalFileInput.click();
});

fileDropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  fileDropZone.classList.add("drag-over");
});

fileDropZone.addEventListener("dragleave", () => {
  fileDropZone.classList.remove("drag-over");
});

fileDropZone.addEventListener("drop", async (e) => {
  e.preventDefault();
  fileDropZone.classList.remove("drag-over");

  const files = Array.from(e.dataTransfer.files);
  const file = files.find((f) => f.name.endsWith(".md") || f.name.endsWith(".txt"));

  if (file) {
    loadedFilename = file.name;
    const text = await file.text();
    currentMd = text;
    textarea.value = currentMd;
    renderAll();
    hideModal();
  }
});

modalFileInput.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) {
    importFileBtn.disabled = true;
    return;
  }
  importFileBtn.disabled = false;
});

importFileBtn.addEventListener("click", async () => {
  const file = modalFileInput.files?.[0];
  if (!file) return;

  loadedFilename = file.name;
  const text = await file.text();
  currentMd = text;
  textarea.value = currentMd;
  renderAll();
  hideModal();
});

// Share functionality
shareBtn.addEventListener("click", () => {
  showShareModal();
});

// Theme toggle functionality
themeToggle.addEventListener("click", toggleTheme);

// Enhanced keyboard shortcuts support
document.addEventListener("keydown", (e) => {
  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

  // Escape key - close modals
  if (e.key === "Escape") {
    if (shareModal.classList.contains("active")) {
      hideShareModal();
      e.preventDefault();
    } else if (importModal.classList.contains("active")) {
      hideModal();
      e.preventDefault();
    }
    return;
  }

  // Cmd/Ctrl + S - Download/Save file
  if (cmdOrCtrl && e.key.toLowerCase() === "s") {
    e.preventDefault();
    downloadFile();

    // Show brief feedback
    const originalTitle = document.title;
    document.title = "✓ Saved - SūperLight";
    setTimeout(() => {
      document.title = originalTitle;
    }, 1500);
    return;
  }

  // Cmd/Ctrl + O - Open/Import
  if (cmdOrCtrl && e.key.toLowerCase() === "o") {
    e.preventDefault();
    showModal();
    return;
  }

  // Cmd/Ctrl + N - New/Clear document
  if (cmdOrCtrl && e.key.toLowerCase() === "n") {
    e.preventDefault();
    // Trigger clear confirmation
    const clearConfirm = document.getElementById("clear-confirm");
    clearConfirm.classList.add("active");
    return;
  }

  // Cmd/Ctrl + Shift + S - Share
  if (cmdOrCtrl && e.shiftKey && e.key.toLowerCase() === "s") {
    e.preventDefault();
    showShareModal();
    return;
  }

  // Cmd/Ctrl + D - Toggle dark mode
  if (cmdOrCtrl && e.key.toLowerCase() === "d") {
    e.preventDefault();
    toggleTheme();
    return;
  }

  // Cmd/Ctrl + 1, 2, 3 - Switch layouts
  if (cmdOrCtrl && ["1", "2", "3"].includes(e.key)) {
    e.preventDefault();
    const layouts = ["code", "split", "preview"];
    const layoutIndex = parseInt(e.key) - 1;
    if (layouts[layoutIndex]) {
      setLayout(layouts[layoutIndex]);
    }
    return;
  }

  // Cmd/Ctrl + / - Show shortcuts help
  if (cmdOrCtrl && e.key === "/") {
    e.preventDefault();
    showShortcutsHelp();
    return;
  }

  // Tab in textarea - insert 2 spaces instead of losing focus
  if (e.key === "Tab" && e.target === textarea) {
    e.preventDefault();
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    // Insert 2 spaces
    const newValue = textarea.value.substring(0, start) + "  " + textarea.value.substring(end);
    textarea.value = newValue;
    textarea.selectionStart = textarea.selectionEnd = start + 2;

    // Trigger update
    currentMd = textarea.value;
    renderAll();
    return;
  }
});

// Button animations
document.querySelectorAll(".btn, .nav-btn").forEach((btn) => {
  btn.addEventListener("mousedown", function () {
    this.style.transform = "scale(0.98)";
  });

  btn.addEventListener("mouseup", function () {
    this.style.transform = "scale(1)";
  });
});

// Load README.md dynamically
async function loadReadme() {
  try {
    console.log("SūperLight: Loading README.md...");
    const response = await fetch("./README.md");
    if (response.ok) {
      const readmeContent = await response.text();
      console.log("SūperLight: README.md loaded successfully");
      currentMd = readmeContent;
      textarea.value = currentMd;
      renderAll();
    } else {
      console.warn("SūperLight: README.md response not ok:", response.status);
    }
  } catch (error) {
    console.warn("SūperLight: Could not load README.md, using fallback content:", error);
  }
}

// Calculate project size
async function calculateProjectSize() {
  const projectSizeEl = document.getElementById("project-size");
  const files = [
    "./index.html",
    "./sw.js",
    "./manifest.json",
    "./browserconfig.xml",
    "./README.md",
    "./assets/css/styles.css",
    "./assets/js/main.js",
  ];

  let totalSize = 0;
  let loadedFiles = 0;

  for (const file of files) {
    try {
      const response = await fetch(file, { method: "HEAD" });
      if (response.ok) {
        const size = response.headers.get("content-length");
        if (size) {
          totalSize += parseInt(size);
        }
      }
      loadedFiles++;
    } catch (error) {
      console.warn(`Could not get size for ${file}`);
      loadedFiles++;
    }
  }

  // Format size in human readable format
  const formatSize = (bytes) => {
    if (bytes === 0) return "0B";
    const k = 1000;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + sizes[i];
  };

  if (totalSize > 0) {
    projectSizeEl.textContent = `Project Size: ${formatSize(totalSize)}`;
    projectSizeEl.title = `Total project size: ${totalSize.toLocaleString()} bytes across ${files.length} files`;
  } else {
    projectSizeEl.textContent = "Project Size: ~85KB";
    projectSizeEl.title = "Estimated project size";
  }
}

// =================== Initialize ===================
function initializeApp() {
  textarea.value = currentMd;
  renderAll();

  // Load README content
  loadReadme();

  // Ensure preview is updated after a short delay
  setTimeout(() => {
    renderAll();
  }, 100);

  // Calculate and display project size
  calculateProjectSize();

  // Initialize theme
  initializeTheme();

  // Initialize mobile tabs
  initializeMobileTabs();
}

// PWA-friendly clock management
let clockInterval = null;
let isShuttingDown = false;

function updateDateTime() {
  // Don't update if we're shutting down
  if (isShuttingDown) return;

  const now = new Date();
  const timeString = now.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const dateString = now.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  datetimeEl.textContent = `${dateString} ${timeString}`;
}

function startClock() {
  // Clear any existing interval first
  if (clockInterval) {
    clearInterval(clockInterval);
  }

  updateDateTime();
  clockInterval = setInterval(() => {
    if (isShuttingDown) {
      clearInterval(clockInterval);
      clockInterval = null;
      return;
    }
    updateDateTime();
  }, 1000);
}

function stopClock() {
  if (clockInterval) {
    clearInterval(clockInterval);
    clockInterval = null;
  }
}

// PWA Lifecycle Management - Enhanced timer cleanup
function performCleanShutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;

  try {
    // Stop clock immediately and aggressively
    stopClock();

    // Double-check clock is stopped
    setTimeout(() => stopClock(), 10);

    // Clear any other potential intervals
    for (let i = 1; i < 99999; i++) {
      clearInterval(i);
    }

    // Signal service worker
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: "CLIENT_CLOSING",
        timestamp: Date.now(),
      });
    }

    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }
  } catch (e) {
    console.log("SūperLight: Cleanup completed");
  }
}

// Method 1: beforeunload (may be blocked in PWA)
window.addEventListener("beforeunload", (e) => {
  performCleanShutdown();
  // Don't prevent default - let the close happen
});

// Method 2: unload (more reliable for cleanup)
window.addEventListener("unload", performCleanShutdown);

// Method 3: pagehide (most reliable for PWAs)
window.addEventListener("pagehide", performCleanShutdown);

// Method 4: visibility change (for PWA minimize/hide)
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    // Stop clock when hidden to help with shutdown
    stopClock();

    // Signal service worker
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      try {
        navigator.serviceWorker.controller.postMessage({
          type: "CLIENT_HIDDEN",
          timestamp: Date.now(),
        });
      } catch (e) {
        console.log("SūperLight: SW message failed");
      }
    }
  } else if (document.visibilityState === "visible") {
    // Restart clock when visible again
    if (!isShuttingDown) {
      startClock();
    }
  }
});

// Method 5: focus loss detection (additional PWA support)
window.addEventListener("blur", () => {
  // Stop clock on blur to help with shutdown
  stopClock();

  // App lost focus - prepare for potential close
  setTimeout(() => {
    if (document.visibilityState === "hidden") {
      performCleanShutdown();
    }
  }, 100);
});

// Restart clock on focus if not shutting down
window.addEventListener("focus", () => {
  if (!isShuttingDown && document.visibilityState === "visible") {
    startClock();
  }
});

// Register service worker for PWA functionality
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .then((registration) => {
        console.log("SūperLight: Service worker registered successfully:", registration.scope);
      })
      .catch((error) => {
        console.log("SūperLight: Service worker registration failed:", error);
      });
  });
}

// Load from hash if present
(async function initFromHash() {
  const h = location.hash.slice(1);
  if (!h || !h.startsWith("MDLITE:")) return;

  try {
    const decodedContent = await tryDecodeContent(h);
    if (decodedContent && decodedContent !== h) {
      currentMd = decodedContent;
      textarea.value = currentMd;
      renderAll();
      setLayout("preview");
    }
    history.replaceState(null, "", location.pathname + location.search);
  } catch (e) {
    console.warn("Failed to parse shared payload", e);
  }
})();

// Start the application when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  console.log("SūperLight: DOM loaded, initializing app...");
  initializeApp();
  startClock();
});

// Fallback: If DOMContentLoaded already fired
if (document.readyState === "loading") {
  // Loading hasn't finished yet
} else {
  // DOMContentLoaded has already fired
  console.log("SūperLight: DOM already ready, initializing app...");
  initializeApp();
  startClock();
}

// Global functions needed by inline event handlers
window.copyToClipboardAndClose = copyToClipboardAndClose;
window.downloadFile = downloadFile;
