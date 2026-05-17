// ── NUUR DOCUMENT WRITER ─────────────────────────────────────────
// Generates resumes, cover letters, bios, and any document
// Downloads as PDF (via print), DOCX-compatible RTF, or TXT

const DOC_TEMPLATES = {
  resume_grc: {
    label: "Resume — GRC Analyst",
    icon: "🛡",
    prompt: `Write a professional resume for Mohamud Mohamed targeting a Junior GRC Analyst role.

Profile:
- Name: Mohamud Mohamed
- Email: mohamedmohammud@gmail.com
- Phone: 612-523-7180
- Location: Columbus, OH
- LinkedIn: linkedin.com/in/mmohamud25
- Portfolio: mmohamud.me
- Certification: CompTIA Security+ SY0-701 (April 2026)
- Education: BS Business Administration, Franklin University (GPA 3.5) | AS Computer Science, Columbus State (GPA 3.4) | MS Business Analytics, Franklin University (in progress)
- Experience: Desktop Technician at Franklin University | Security Officer at Allied Universal | Founder & Executive Director, Kulan Group Ltd
- Skills: NIST CSF, ISO 27001, Risk Management, Policy Development, Python, JavaScript, IT Support, Active Directory, Supabase, Cloud Security

Format as a complete professional resume with: Contact Info, Professional Summary, Experience, Education, Certifications, Skills. Use plain text formatting with clear section headers (no markdown symbols). Keep it to one page equivalent.`
  },
  resume_soc: {
    label: "Resume — SOC Analyst",
    icon: "🔍",
    prompt: `Write a professional resume for Mohamud Mohamed targeting a SOC Analyst Tier 1 role.

Same profile as above but emphasize: threat detection, log analysis, incident response, endpoint security, SIEM, network monitoring, Active Directory exposure, Security+ certification.`
  },
  resume_itsec: {
    label: "Resume — IT Security Analyst",
    icon: "🔒",
    prompt: `Write a professional resume for Mohamud Mohamed targeting an IT Security Analyst role.

Same profile. Emphasize: Windows administration, vulnerability assessment, security policy, cloud security, IT support background, Security+ certification, Kulan Group security governance experience.`
  },
  cover_letter: {
    label: "Cover Letter",
    icon: "✉️",
    prompt: `Write a professional cover letter for Mohamud Mohamed. Leave [Company Name] and [Role Title] as placeholders. First person, no em dashes, no AI phrases, professional but conversational. Draw from: Security+ certified, GRC background, Kulan Group founder, IT support at Franklin University, Columbus OH. 3 paragraphs max.`
  },
  linkedin_bio: {
    label: "LinkedIn About Section",
    icon: "💼",
    prompt: `Write a LinkedIn About section for Mohamud Mohamed. First person, conversational, authentic. No hashtags, no em dashes, no AI phrases. 150-200 words. Cover: Security+ certified cybersecurity professional, founder of Kulan Group Ltd (bilingual English/Somali tech education), IT background, GRC focus, Somali community builder, Columbus OH. End with what you're looking for.`
  },
  bio_short: {
    label: "Professional Bio (Short)",
    icon: "👤",
    prompt: `Write a 75-word professional bio for Mohamud Mohamed. Third person. Security+ certified, founder of Kulan Group Ltd, targeting GRC and cybersecurity roles. No AI phrases, no em dashes.`
  },
  personal_statement: {
    label: "Personal Statement",
    icon: "📝",
    prompt: `Write a personal statement for Mohamud Mohamed for graduate school or job applications. 200-250 words. First person. Cover: journey from IT support to cybersecurity, founding Kulan Group to serve Somali diaspora with bilingual tech education, Security+ certification, passion for GRC and risk management, goals. No AI phrases, no em dashes.`
  },
  custom: {
    label: "Custom document",
    icon: "✦",
    prompt: null // user types their own
  }
};

// ── RTF GENERATOR (opens in Word/LibreOffice as .docx) ────────────
function generateRTF(title, content) {
  const escapeRTF = (str) => str
    .replace(/\\/g, "\\\\")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/[^\x00-\x7F]/g, c => `\\u${c.charCodeAt(0)}?`);

  const lines = content.split("\n");
  let rtfBody = "";

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) {
      rtfBody += "\\par\n";
      return;
    }

    // Detect section headers (ALL CAPS lines or lines ending with :)
    const isHeader = /^[A-Z][A-Z\s&]+$/.test(trimmed) || (trimmed.endsWith(":") && trimmed.length < 40);
    // Detect name at top (first line usually)
    const isName = rtfBody === "" && trimmed.split(" ").length <= 4;

    if (isName) {
      rtfBody += `\\pard\\qc\\sb240\\sa80{\\b\\fs36 ${escapeRTF(trimmed)}}\\par\n`;
    } else if (isHeader) {
      rtfBody += `\\pard\\sb200\\sa80{\\b\\fs22\\ul ${escapeRTF(trimmed)}}\\par\n`;
    } else if (trimmed.startsWith("•") || trimmed.startsWith("-")) {
      const bullet = trimmed.replace(/^[•\-]\s*/, "");
      rtfBody += `\\pard\\li360\\fi-360\\sb40{\\bullet  ${escapeRTF(bullet)}}\\par\n`;
    } else {
      rtfBody += `\\pard\\sb60{${escapeRTF(trimmed)}}\\par\n`;
    }
  });

  return `{\\rtf1\\ansi\\deff0
{\\fonttbl{\\f0\\froman\\fcharset0 Times New Roman;}{\\f1\\fswiss\\fcharset0 Calibri;}}
{\\colortbl;\\red11\\green37\\blue69;\\red13\\green148\\blue136;}
\\widowctrl\\wpaper15840\\wpapr12240\\margl1440\\margr1440\\margt1440\\margb1440
\\f1\\fs22\\cf0
${rtfBody}
}`;
}

// ── HTML GENERATOR (for PDF via print) ───────────────────────────
function generateHTML(title, content) {
  const lines = content.split("\n");
  let bodyHTML = "";

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) {
      bodyHTML += "<div style='height:6px'></div>";
      return;
    }
    const isHeader = /^[A-Z][A-Z\s&]+$/.test(trimmed) || (trimmed.endsWith(":") && trimmed.length < 40);
    const isName = i < 3 && trimmed.split(" ").length <= 4 && !trimmed.includes("@");
    const isContact = i < 6 && (trimmed.includes("@") || trimmed.includes("|") || trimmed.includes("linkedin"));
    const isBullet = trimmed.startsWith("•") || trimmed.startsWith("-");

    if (isName) {
      bodyHTML += `<h1 style="font-size:22px;font-weight:700;color:#0B2545;text-align:center;margin:0 0 4px;letter-spacing:-.02em">${trimmed}</h1>`;
    } else if (isContact) {
      bodyHTML += `<p style="font-size:10px;color:#475569;text-align:center;margin:0 0 2px">${trimmed}</p>`;
    } else if (isHeader) {
      bodyHTML += `<div style="margin-top:14px;padding-bottom:3px;border-bottom:1.5px solid #0D9488;font-size:11px;font-weight:600;color:#0B2545;letter-spacing:.06em;text-transform:uppercase">${trimmed}</div>`;
    } else if (isBullet) {
      const bullet = trimmed.replace(/^[•\-]\s*/, "");
      bodyHTML += `<div style="padding-left:14px;position:relative;font-size:11px;color:#1e293b;line-height:1.5;margin:2px 0"><span style="position:absolute;left:2px">•</span>${bullet}</div>`;
    } else {
      bodyHTML += `<p style="font-size:11px;color:#1e293b;line-height:1.5;margin:3px 0">${trimmed}</p>`;
    }
  });

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Calibri', 'Arial', sans-serif; margin: 0; padding: 32px 40px; max-width: 780px; color: #1e293b; background: #fff; }
  @media print {
    body { padding: 20px 28px; }
    @page { margin: 0.6in; size: letter; }
  }
  .nuur-watermark { text-align: center; font-size: 9px; color: #cbd5e1; margin-top: 20px; padding-top: 10px; border-top: 1px solid #f1f5f9; }
</style>
</head>
<body>
${bodyHTML}
<div class="nuur-watermark">Generated by Nuur · mmohamud.me · Kulan Group Ltd</div>
<script>
  // Auto-trigger print dialog for PDF save
  window.onload = function() {
    setTimeout(() => {
      if (window.location.hash === '#print') window.print();
    }, 500);
  };
</script>
</body>
</html>`;
}

// ── MAIN DOCUMENT WRITER UI ───────────────────────────────────────
function showDocumentWriter(container, onClose) {
  const panel = document.createElement("div");
  panel.id = "nuur-doc-writer";
  panel.style.cssText = `
    position:fixed;inset:0;z-index:9998;
    background:var(--bg0);
    display:flex;flex-direction:column;
    font-family:var(--font);
    overflow:hidden;
  `;

  // ── HEADER ────────────────────────────────────────────────────
  const header = document.createElement("div");
  header.style.cssText = "display:flex;align-items:center;gap:12px;padding:14px 20px;background:var(--bg1);border-bottom:1px solid var(--border);flex-shrink:0";

  const logoEl = document.createElement("div");
  logoEl.style.cssText = "font-size:14px;font-weight:600;color:var(--text0);display:flex;align-items:center;gap:6px;flex:1";
  logoEl.innerHTML = "✦ Nuur <span style='font-weight:400;color:var(--text3)'>Document Writer</span>";

  const closeBtn = document.createElement("button");
  closeBtn.style.cssText = "background:none;border:none;color:var(--text3);cursor:pointer;font-size:18px;padding:0;line-height:1";
  closeBtn.textContent = "×";
  closeBtn.addEventListener("click", () => { panel.remove(); if (onClose) onClose(); });

  header.appendChild(logoEl);
  header.appendChild(closeBtn);
  panel.appendChild(header);

  // ── BODY ──────────────────────────────────────────────────────
  const body = document.createElement("div");
  body.style.cssText = "flex:1;display:flex;overflow:hidden";

  // Left: template picker
  const sidebar = document.createElement("div");
  sidebar.style.cssText = "width:240px;flex-shrink:0;border-right:1px solid var(--border);background:var(--bg1);overflow-y:auto;padding:12px";

  const sideTitle = document.createElement("div");
  sideTitle.style.cssText = "font-size:10px;color:var(--text3);letter-spacing:.08em;font-weight:500;margin-bottom:10px;text-transform:uppercase";
  sideTitle.textContent = "Document type";
  sidebar.appendChild(sideTitle);

  let selectedTemplate = "resume_grc";
  const templateBtns = {};

  Object.entries(DOC_TEMPLATES).forEach(([key, tmpl]) => {
    const btn = document.createElement("div");
    btn.style.cssText = `display:flex;align-items:center;gap:9px;padding:8px 10px;border-radius:8px;cursor:pointer;margin-bottom:2px;transition:all .12s;border:1px solid transparent`;
    const icon = document.createElement("span");
    icon.style.cssText = "font-size:16px;flex-shrink:0";
    icon.textContent = tmpl.icon;
    const lbl = document.createElement("span");
    lbl.style.cssText = "font-size:12px;color:var(--text1)";
    lbl.textContent = tmpl.label;
    btn.appendChild(icon);
    btn.appendChild(lbl);
    templateBtns[key] = btn;

    btn.addEventListener("click", () => {
      selectedTemplate = key;
      Object.entries(templateBtns).forEach(([k, b]) => {
        const active = k === key;
        b.style.background = active ? "var(--teal3)" : "transparent";
        b.style.borderColor = active ? "rgba(13,148,136,0.2)" : "transparent";
        b.querySelector("span:last-child").style.color = active ? "var(--teal)" : "var(--text1)";
      });
      if (key === "custom") {
        customPromptRow.style.display = "flex";
        generateBtn.textContent = "Generate document";
      } else {
        customPromptRow.style.display = "none";
        generateBtn.textContent = `Generate ${tmpl.label}`;
      }
    });

    sidebar.appendChild(btn);
  });

  // Select first by default
  templateBtns["resume_grc"].style.background = "var(--teal3)";
  templateBtns["resume_grc"].style.borderColor = "rgba(13,148,136,0.2)";
  templateBtns["resume_grc"].querySelector("span:last-child").style.color = "var(--teal)";

  body.appendChild(sidebar);

  // Right: editor + preview
  const main = document.createElement("div");
  main.style.cssText = "flex:1;display:flex;flex-direction:column;overflow:hidden";

  // Toolbar
  const toolbar = document.createElement("div");
  toolbar.style.cssText = "display:flex;align-items:center;gap:8px;padding:10px 16px;border-bottom:1px solid var(--border);background:var(--bg1);flex-shrink:0;flex-wrap:wrap";

  // Custom prompt row (hidden by default)
  const customPromptRow = document.createElement("div");
  customPromptRow.style.cssText = "display:none;width:100%;gap:8px;margin-bottom:8px";
  const customInput = document.createElement("textarea");
  customInput.placeholder = "Describe the document you want Nuur to write... e.g. 'Write a 1-page business proposal for Kulan Institute'";
  customInput.style.cssText = "flex:1;background:var(--bg0);border:1px solid var(--border);border-radius:8px;padding:8px 12px;font-family:var(--font);font-size:12px;color:var(--text0);outline:none;resize:none;height:60px;width:100%";
  customPromptRow.appendChild(customInput);
  toolbar.appendChild(customPromptRow);

  const generateBtn = document.createElement("button");
  generateBtn.style.cssText = "padding:7px 16px;border-radius:8px;background:var(--teal);border:none;color:#fff;font-size:12px;font-weight:500;cursor:pointer;font-family:var(--font);display:flex;align-items:center;gap:6px";
  generateBtn.innerHTML = `<svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83"/></svg> Generate Resume — GRC Analyst`;

  const divider = document.createElement("div");
  divider.style.cssText = "width:1px;height:20px;background:var(--border);margin:0 4px";

  const downloadLabel = document.createElement("div");
  downloadLabel.style.cssText = "font-size:11px;color:var(--text3);margin-right:2px";
  downloadLabel.textContent = "Download:";

  const pdfBtn = makeToolBtn("PDF", "📄");
  const rtfBtn = makeToolBtn("Word (DOCX)", "📝");
  const txtBtn = makeToolBtn("TXT", "💾");

  toolbar.appendChild(generateBtn);
  toolbar.appendChild(divider);
  toolbar.appendChild(downloadLabel);
  toolbar.appendChild(pdfBtn);
  toolbar.appendChild(rtfBtn);
  toolbar.appendChild(txtBtn);
  main.appendChild(toolbar);

  function makeToolBtn(label, icon) {
    const btn = document.createElement("button");
    btn.style.cssText = "padding:6px 12px;border-radius:7px;background:transparent;border:1px solid var(--border);color:var(--text2);font-size:11px;cursor:pointer;font-family:var(--font);display:flex;align-items:center;gap:4px;transition:all .12s";
    const ic = document.createElement("span");
    ic.textContent = icon;
    const lb = document.createElement("span");
    lb.textContent = label;
    btn.appendChild(ic);
    btn.appendChild(lb);
    btn.addEventListener("mouseenter", () => { btn.style.background = "var(--teal3)"; btn.style.color = "var(--teal)"; btn.style.borderColor = "rgba(13,148,136,0.25)"; });
    btn.addEventListener("mouseleave", () => { btn.style.background = "transparent"; btn.style.color = "var(--text2)"; btn.style.borderColor = "var(--border)"; });
    btn.disabled = true;
    btn.style.opacity = "0.4";
    return btn;
  }

  // Editor area
  const editorWrap = document.createElement("div");
  editorWrap.style.cssText = "flex:1;display:flex;overflow:hidden";

  const editor = document.createElement("textarea");
  editor.style.cssText = "flex:1;background:#fff;border:none;outline:none;padding:24px 32px;font-family:'Calibri',sans-serif;font-size:13px;color:#1e293b;line-height:1.7;resize:none;tab-size:2;border-right:1px solid var(--border)";
  editor.placeholder = "Click 'Generate' to create your document, or type directly here...";

  // Live preview panel
  const preview = document.createElement("div");
  preview.style.cssText = "width:380px;flex-shrink:0;overflow-y:auto;padding:24px;background:#fafbff;font-size:11px;color:var(--text2)";
  preview.innerHTML = `<div style="text-align:center;color:var(--text3);padding-top:60px">
    <div style="font-size:24px;margin-bottom:8px">📄</div>
    <div style="font-size:12px">Document preview will appear here</div>
  </div>`;

  editorWrap.appendChild(editor);
  editorWrap.appendChild(preview);
  main.appendChild(editorWrap);

  // Status bar
  const statusBar = document.createElement("div");
  statusBar.style.cssText = "padding:6px 16px;border-top:1px solid var(--border);background:var(--bg1);font-size:11px;color:var(--text3);display:flex;align-items:center;justify-content:space-between;flex-shrink:0";
  const wordCount = document.createElement("span");
  wordCount.textContent = "0 words";
  const statusMsg = document.createElement("span");
  statusMsg.textContent = "Ready";
  statusBar.appendChild(wordCount);
  statusBar.appendChild(statusMsg);
  main.appendChild(statusBar);

  body.appendChild(main);
  panel.appendChild(body);
  container.appendChild(panel);

  // ── GENERATE ──────────────────────────────────────────────────
  let docTitle = "Nuur Document";

  generateBtn.addEventListener("click", async () => {
    const tmpl = DOC_TEMPLATES[selectedTemplate];
    const prompt = selectedTemplate === "custom"
      ? customInput.value.trim()
      : tmpl.prompt;

    if (!prompt) { customInput.focus(); return; }

    docTitle = tmpl.label;
    generateBtn.disabled = true;
    generateBtn.textContent = "Generating…";
    statusMsg.textContent = "Writing document...";
    editor.value = "";
    preview.innerHTML = `<div style="text-align:center;color:var(--text3);padding-top:60px"><div style="font-size:20px;margin-bottom:8px">✦</div><div>Writing your document...</div></div>`;

    try {
      const res = await fetch(PROXY, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` },
        body: JSON.stringify({
          model: "sonnet",
          system: `You are a professional document writer for Mohamud Mohamed. Write high-quality, authentic documents. No markdown symbols (no **, no ##, no ---). Use PLAIN TEXT ONLY with clear section headers in ALL CAPS. Use • for bullet points. Never use em dashes. Never use AI phrases like "proven track record", "results-driven", "dynamic professional", "passionate about", "leverage", "I'm excited". Write like a real human wrote it.`,
          prompt
        })
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || "Could not generate document.";

      editor.value = text;
      updatePreview(text);
      updateWordCount(text);

      // Enable download buttons
      [pdfBtn, rtfBtn, txtBtn].forEach(b => {
        b.disabled = false;
        b.style.opacity = "1";
      });

      statusMsg.textContent = "Document ready — edit or download";
      generateBtn.disabled = false;
      generateBtn.textContent = `Regenerate ${tmpl.label}`;

    } catch (e) {
      statusMsg.textContent = "Error: " + e.message;
      generateBtn.disabled = false;
      generateBtn.textContent = `Generate ${tmpl.label}`;
    }
  });

  // Live edit updates preview + word count
  editor.addEventListener("input", () => {
    updatePreview(editor.value);
    updateWordCount(editor.value);
    if (editor.value.trim()) {
      [pdfBtn, rtfBtn, txtBtn].forEach(b => { b.disabled = false; b.style.opacity = "1"; });
    }
  });

  function updatePreview(text) {
    // Strip scripts then set via innerHTML - content is generated by us, not user input
    const html = generateHTML(docTitle, text);
    const bodyMatch = html.match(/<body>([\s\S]*?)<\/body>/);
    if (bodyMatch) {
      // Use DOMParser to safely render AI-generated HTML preview
      const parser = new DOMParser();
      const doc = parser.parseFromString(bodyMatch[1], "text/html");
      // Remove dangerous elements
      doc.querySelectorAll("script,iframe,object,embed,form,input,button,link[rel=import],meta,base").forEach(el => el.remove());
      // Remove dangerous attributes from remaining elements
      doc.querySelectorAll("*").forEach(el => {
        [...el.attributes].forEach(attr => {
          if (/^on/i.test(attr.name) || /^(href|src|action|formaction|data)$/i.test(attr.name) && /javascript:/i.test(attr.value)) {
            el.removeAttribute(attr.name);
          }
        });
      });
      const wrapper = document.createElement("div");
      wrapper.style.cssText = "background:#fff;border:1px solid var(--border);border-radius:8px;padding:20px 24px;min-height:400px;box-shadow:0 2px 12px rgba(0,0,0,0.06)";
      wrapper.appendChild(doc.body ? doc.body : doc.documentElement);
      preview.replaceChildren(wrapper);
    }
  }

  function updateWordCount(text) {
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    wordCount.textContent = `${words} word${words !== 1 ? "s" : ""}`;
  }

  // ── DOWNLOAD HANDLERS ─────────────────────────────────────────
  pdfBtn.addEventListener("click", () => {
    const text = editor.value.trim();
    if (!text) return;
    const html = generateHTML(docTitle, text);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url + "#print", "_blank");
    statusMsg.textContent = "Print dialog opened — select 'Save as PDF'";
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  });

  rtfBtn.addEventListener("click", () => {
    const text = editor.value.trim();
    if (!text) return;
    const rtf = generateRTF(docTitle, text);
    const blob = new Blob([rtf], { type: "application/rtf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${docTitle.replace(/\s+/g, "-").toLowerCase()}.rtf`;
    a.click();
    URL.revokeObjectURL(url);
    statusMsg.textContent = "Downloaded as RTF — opens in Word, LibreOffice, and Google Docs";
  });

  txtBtn.addEventListener("click", () => {
    const text = editor.value.trim();
    if (!text) return;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${docTitle.replace(/\s+/g, "-").toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    statusMsg.textContent = "Downloaded as TXT";
  });
}

// ── REGISTER AS GLOBAL ────────────────────────────────────────────
window.nuurShowDocWriter = showDocumentWriter;
