const NAV = [
  ["总览", "/index.html", "home"],
  ["教师工作台", "/screens/01-teacher-dashboard.html", "dashboard"],
  ["课程配置", "/screens/02-course-setup.html", "settings"],
  ["实验包库", "/screens/03-experiment-library.html", "package"],
  ["课中监控", "/screens/04-class-monitor.html", "monitor"],
  ["学生项目", "/screens/05-student-project.html", "project"],
  ["需求访谈", "/screens/06-interview-lab.html", "chat"],
  ["方案定义", "/screens/07-solution-definition.html", "doc"],
  ["知识决策", "/screens/08-knowledge-decision.html", "branch"],
  ["实现导学", "/screens/09-agent-guide.html", "code"],
  ["交付验收", "/screens/10-delivery-acceptance.html", "check"],
  ["AI 评审", "/screens/11-ai-review-rubric.html", "review"],
  ["档案袋", "/screens/12-portfolio-report.html", "portfolio"],
  ["部署管理", "/screens/13-admin-deployment.html", "cloud"]
];

const icons = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-7h6v7"/>',
  dashboard: '<rect x="3" y="3" width="7" height="8" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="15" width="7" height="6" rx="1"/>',
  settings: '<path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2 3.4-.2-.1a1.8 1.8 0 0 0-2 .2 1.8 1.8 0 0 0-.9 1.6v.2H10v-.2a1.8 1.8 0 0 0-.9-1.6 1.8 1.8 0 0 0-2-.2l-.2.1-2-3.4.1-.1A1.7 1.7 0 0 0 5.3 15 1.8 1.8 0 0 0 4 13.6h-.2V10h.2a1.8 1.8 0 0 0 1.3-1.4 1.7 1.7 0 0 0-.3-1.9L4.9 6.6l2-3.4.2.1a1.8 1.8 0 0 0 2-.2A1.8 1.8 0 0 0 10 1.5v-.2h4v.2a1.8 1.8 0 0 0 .9 1.6 1.8 1.8 0 0 0 2 .2l.2-.1 2 3.4-.1.1a1.7 1.7 0 0 0-.3 1.9A1.8 1.8 0 0 0 20 10h.2v3.6H20a1.8 1.8 0 0 0-.6 1.4Z"/>',
  package: '<path d="m21 8-9-5-9 5 9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
  monitor: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8"/><path d="M12 16v4"/><path d="m7 12 3-3 2 2 4-5"/>',
  project: '<path d="M4 4h16v16H4z"/><path d="M8 8h8"/><path d="M8 12h5"/><path d="M8 16h8"/>',
  chat: '<path d="M21 12a8 8 0 0 1-8 8H7l-4 3 1.2-5.2A8 8 0 1 1 21 12Z"/>',
  doc: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6"/><path d="M8 13h8"/><path d="M8 17h5"/>',
  branch: '<path d="M6 3v7a4 4 0 0 0 4 4h8"/><path d="M18 10l4 4-4 4"/><path d="M6 21v-6"/><circle cx="6" cy="3" r="2"/><circle cx="6" cy="21" r="2"/>',
  code: '<path d="m8 9-4 3 4 3"/><path d="m16 9 4 3-4 3"/><path d="m14 4-4 16"/>',
  check: '<path d="M20 6 9 17l-5-5"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  review: '<path d="M12 3 3 7.5 12 12l9-4.5L12 3Z"/><path d="M3 12.5 12 17l9-4.5"/><path d="M3 17.5 12 22l9-4.5"/>',
  portfolio: '<path d="M4 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v10H4Z"/><path d="M4 11h16"/>',
  cloud: '<path d="M17.5 19H7a5 5 0 1 1 1-9.9A7 7 0 0 1 21 12a4 4 0 0 1-3.5 7Z"/>'
};

function svgIcon(name) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.project}</svg>`;
}

function status(label, tone = "info") {
  return `<span class="status ${tone}">${label}</span>`;
}

function renderNav(current) {
  return NAV.map(([label, href, icon]) => `<a class="nav-link ${current === label ? "active" : ""}" href="${href}" title="${label}">${svgIcon(icon)}<span>${label}</span></a>`).join("");
}

function metricCard(item) {
  return `<article class="metric ${item.tone || ""}"><div class="metric-label">${item.label}</div><div class="metric-value">${item.value}</div><div class="metric-note">${item.note}</div></article>`;
}

function stageRail(active = 1) {
  const stages = [
    ["01", "需求访谈", "AI 客户多轮访谈与隐藏约束确认"],
    ["02", "方案定义", "需求文档、可行性、红黄灯边界"],
    ["03", "知识决策", "数据、分块、向量、召回策略判断"],
    ["04", "智能体实现", "角色、知识库、边界与标准测试"],
    ["05", "交付验收", "验收记录、说明文档、演示脚本"]
  ];
  return `<div class="stage-rail">${stages.map((s, i) => `<article class="stage ${i + 1 === active ? "active" : ""}"><div class="stage-num">${s[0]}</div><h3>${s[1]}</h3><p>${s[2]}</p></article>`).join("")}</div>`;
}

function table(rows, columns) {
  return `<div class="table-wrap"><table><thead><tr>${columns.map(c => `<th>${c[0]}</th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr>${columns.map(c => `<td>${r[c[1]]}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}

function workflow(items) {
  return `<div class="workflow">${items.map((item, i) => `<div class="step-row ${item.state || ""}"><div class="step-dot">${i + 1}</div><div><h4>${item.title}</h4><p>${item.text}</p></div>${status(item.label, item.tone || "info")}</div>`).join("")}</div>`;
}

function evidence(items) {
  return `<div class="evidence-list">${items.map(item => `<div class="evidence"><strong>${item.title}</strong><span>${item.text}</span></div>`).join("")}</div>`;
}

function renderPage(page) {
  document.title = `${page.title} · EduFDE`;
  const root = document.getElementById("app");
  root.innerHTML = `
    <div class="shell">
      <aside class="sidebar">
        <a class="brand" href="/index.html">
          <div class="brand-mark">FDE</div>
          <div class="brand-copy"><div class="brand-title">EduFDE</div><div class="brand-subtitle">AI 智能体项目交付实训</div></div>
        </a>
        <div class="nav-group">Platform</div>
        ${renderNav(page.nav)}
        <div class="sidebar-footer"><strong>证据链状态</strong><p>${page.footer || "课程、阶段产物、AI 评审与教师确认统一进入项目档案袋。"}</p></div>
      </aside>
      <main class="main">
        <div class="topbar">
          <div>
            <div class="crumb">${page.crumb || "EduFDE / 实训平台"}</div>
            <h1>${page.title}</h1>
            <p class="lead">${page.lead}</p>
          </div>
          <div class="actions">${(page.actions || []).map(a => `<button class="btn ${a.primary ? "primary" : ""}" ${a.modal ? `data-modal="${a.modal}"` : ""}>${svgIcon(a.icon || "check")}${a.label}</button>`).join("")}</div>
        </div>
        ${page.metrics ? `<section class="grid cols-4" style="margin-bottom:18px">${page.metrics.map(metricCard).join("")}</section>` : ""}
        ${page.stage ? `<section class="panel" style="margin-bottom:18px"><div class="panel-body">${stageRail(page.stage)}</div></section>` : ""}
        <section class="layout">
          <div class="grid">${page.main}</div>
          <aside class="grid">${page.side}</aside>
        </section>
      </main>
    </div>
    <div class="modal-backdrop" id="modal"><div class="modal"><header><h2 id="modal-title">操作确认</h2><button class="close" data-close>×</button></header><main id="modal-body">已进入当前工作流的下一步。</main></div></div>`;
  bindInteractions(page);
}

function bindInteractions(page) {
  document.querySelectorAll(".tab").forEach(btn => {
    btn.addEventListener("click", () => {
      const group = btn.closest("[data-tabs]");
      group.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
      group.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      group.querySelector(`#${btn.dataset.target}`).classList.add("active");
    });
  });
  document.querySelectorAll("[data-search]").forEach(input => {
    input.addEventListener("input", () => {
      const q = input.value.trim().toLowerCase();
      document.querySelectorAll("[data-row]").forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(q) ? "" : "none";
      });
    });
  });
  document.querySelectorAll("[data-check]").forEach(box => {
    box.addEventListener("change", () => {
      const scope = box.closest("[data-checklist]");
      const all = scope.querySelectorAll("[data-check]").length;
      const done = scope.querySelectorAll("[data-check]:checked").length;
      const bar = scope.querySelector(".progress span");
      if (bar) bar.style.setProperty("--value", `${Math.round(done / all * 100)}%`);
    });
  });
  const modal = document.getElementById("modal");
  document.querySelectorAll("[data-modal]").forEach(btn => btn.addEventListener("click", () => {
    const content = (page.modals && page.modals[btn.dataset.modal]) || { title: btn.textContent.trim(), body: "已记录当前操作，并写入课程审计日志。" };
    document.getElementById("modal-title").textContent = content.title;
    document.getElementById("modal-body").innerHTML = content.body;
    modal.classList.add("open");
  }));
  document.querySelectorAll("[data-close]").forEach(btn => btn.addEventListener("click", () => modal.classList.remove("open")));
  modal.addEventListener("click", e => { if (e.target === modal) modal.classList.remove("open"); });
  document.querySelectorAll("[data-copy]").forEach(btn => btn.addEventListener("click", () => {
    btn.textContent = "已复制";
    setTimeout(() => { btn.textContent = "复制"; }, 1200);
  }));
}

if (window.EduFDEPage) renderPage(window.EduFDEPage);
