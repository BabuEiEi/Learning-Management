const state = {
  models: [],
  groups: [],
  activeGroup: "all",
  search: "",
  chart: null,
  selectedModel: null,
  lastFocused: null
};

const dom = {
  searchInput: document.getElementById("searchInput"),
  sourceOverview: document.getElementById("sourceOverview"),
  totalCount: document.getElementById("totalCount"),
  groupCount: document.getElementById("groupCount"),
  groupStats: document.getElementById("groupStats"),
  groupChart: document.getElementById("groupChart"),
  tabs: document.getElementById("tabs"),
  sectionTitle: document.getElementById("sectionTitle"),
  sectionDescription: document.getElementById("sectionDescription"),
  resultCount: document.getElementById("resultCount"),
  cardsGrid: document.getElementById("cardsGrid"),
  emptyState: document.getElementById("emptyState"),
  modal: document.getElementById("detailModal"),
  modalContent: document.getElementById("modalContent"),
  closeModal: document.getElementById("closeModal")
};

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function truncateText(text, maxLength) {
  if (!text) return "ไม่มีข้อมูล";
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function getGroupById(groupId) {
  return state.groups.find((group) => String(group.id) === String(groupId));
}

function getGroupLabel(groupId) {
  const group = getGroupById(groupId);
  return group?.displayName || group?.name || `กลุ่มที่ ${groupId}`;
}

function normalizeSearchText(model) {
  const stepText = (model.steps || [])
    .map((step) => `${step.name} ${step.detail}`)
    .join(" ");
  return [
    model.name,
    model.groupName,
    model.concept,
    model.objective,
    stepText,
    model.source
  ].join(" ").toLowerCase();
}

function getFilteredModels() {
  const query = state.search.trim().toLowerCase();
  return state.models.filter((model) => {
    const matchGroup = state.activeGroup === "all" || String(model.group) === String(state.activeGroup);
    const matchSearch = !query || normalizeSearchText(model).includes(query);
    return matchGroup && matchSearch;
  });
}

function renderDashboard(data) {
  dom.sourceOverview.textContent = data.overview || "คลังความรู้สำหรับค้นหา เปรียบเทียบ และประยุกต์ใช้รูปแบบการจัดการเรียนรู้ในบริบทการศึกษาไทย";
  dom.totalCount.textContent = String(state.models.length);
  dom.groupCount.textContent = String(state.groups.length);

  dom.groupStats.replaceChildren();
  state.groups.forEach((group) => {
    const row = createElement("div", "stat-row");
    const label = createElement("strong", null, group.displayName || group.name);
    const count = createElement("span", null, `${group.count || 0} รายการ`);
    row.append(label, count);
    dom.groupStats.append(row);
  });

  if (window.Chart && dom.groupChart) {
    const labels = state.groups.map((group) => group.displayName || group.name);
    const values = state.groups.map((group) => group.count || 0);
    if (state.chart) state.chart.destroy();
    state.chart = new Chart(dom.groupChart, {
      type: "doughnut",
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: ["#7a4a24", "#d28a24", "#5f7f6f", "#2d6f73", "#9a6a40", "#48413a"],
            borderColor: "#fffdf8",
            borderWidth: 3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: "#27231f",
              font: { family: "Sarabun" }
            }
          }
        }
      }
    });
  }
}

function renderTabs() {
  dom.tabs.replaceChildren();

  const allButton = createTabButton("all", `ทั้งหมด (${state.models.length})`);
  dom.tabs.append(allButton);

  state.groups.forEach((group) => {
    const button = createTabButton(String(group.id), `${group.displayName || group.name} (${group.count || 0})`);
    dom.tabs.append(button);
  });
}

function createTabButton(value, label) {
  const button = createElement("button", "tab-button", label);
  button.type = "button";
  button.setAttribute("role", "tab");
  button.setAttribute("aria-selected", String(String(state.activeGroup) === String(value)));
  button.addEventListener("click", () => {
    state.activeGroup = value;
    renderTabs();
    renderCards();
  });
  return button;
}

function renderSectionHeader(filtered) {
  if (state.activeGroup === "all") {
    dom.sectionTitle.textContent = "รูปแบบทั้งหมด";
    dom.sectionDescription.textContent = "ค้นหาและเปรียบเทียบรูปแบบการจัดการเรียนรู้จากข้อมูลทั้งหมดในเอกสาร";
  } else {
    const group = getGroupById(state.activeGroup);
    dom.sectionTitle.textContent = group?.displayName || group?.name || "กลุ่มการเรียนรู้";
    dom.sectionDescription.textContent = group?.description || "รายการในกลุ่มการเรียนรู้นี้";
  }
  dom.resultCount.textContent = `${filtered.length} รายการ`;
}

function renderCards() {
  const filtered = getFilteredModels();
  renderSectionHeader(filtered);
  dom.cardsGrid.replaceChildren();
  dom.emptyState.hidden = filtered.length > 0;

  filtered.forEach((model) => {
    const card = createElement("article", "model-card");
    const badge = createElement("span", "group-badge", getGroupLabel(model.group));
    const title = createElement("h3", null, model.name);
    const concept = createElement("p", null, truncateText(model.concept, 170));
    const button = createElement("button", "text-button", "ดูรายละเอียด");
    button.type = "button";
    button.setAttribute("aria-label", `ดูรายละเอียด ${model.name}`);
    button.addEventListener("click", () => openModal(model));
    card.append(badge, title, concept, button);
    dom.cardsGrid.append(card);
  });
}

function openModal(model) {
  state.selectedModel = model;
  state.lastFocused = document.activeElement;
  dom.modalContent.replaceChildren(buildModalContent(model));
  dom.modal.hidden = false;
  document.body.style.overflow = "hidden";
  const panel = dom.modal.querySelector(".modal-panel");
  panel?.focus();
}

function closeModal() {
  dom.modal.hidden = true;
  document.body.style.overflow = "";
  state.selectedModel = null;
  dom.modalContent.replaceChildren();
  if (state.lastFocused && typeof state.lastFocused.focus === "function") {
    state.lastFocused.focus();
  }
}

function buildModalContent(model) {
  const wrapper = createElement("div", "detail-grid");

  const title = createElement("h2", "modal-title", model.name);
  title.id = "modalTitle";
  const group = createElement("span", "group-badge", getGroupLabel(model.group));

  wrapper.append(title, group);
  wrapper.append(
    buildDetailSection("แนวคิดพื้นฐาน", model.concept),
    buildDetailSection("วัตถุประสงค์", model.objective),
    buildStepsTable(model.steps || []),
    buildDetailSection("แหล่งอ้างอิง", model.source),
    buildPlanner(model)
  );

  return wrapper;
}

function buildDetailSection(heading, text) {
  const section = createElement("section", "detail-section");
  const h3 = createElement("h3", null, heading);
  const p = createElement("p", null, text || "ไม่มีข้อมูล");
  section.append(h3, p);
  return section;
}

function buildStepsTable(steps) {
  const section = createElement("section", "detail-section");
  section.append(createElement("h3", null, "ขั้นตอนการจัดการเรียนรู้"));

  const tableWrap = createElement("div", "steps-table-wrap");
  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  ["ลำดับ", "ชื่อขั้นตอน", "รายละเอียดกิจกรรม"].forEach((label) => {
    headRow.append(createElement("th", null, label));
  });
  thead.append(headRow);

  const tbody = document.createElement("tbody");
  steps.forEach((step) => {
    const row = document.createElement("tr");
    row.append(
      createElement("td", null, String(step.step)),
      createElement("td", null, step.name),
      createElement("td", null, step.detail)
    );
    tbody.append(row);
  });

  table.append(thead, tbody);
  tableWrap.append(table);
  section.append(tableWrap);
  return section;
}

function buildPlanner(model) {
  const section = createElement("section", "planner-box");
  section.append(createElement("h3", null, "✨ ทดลองสร้างแนวคิดแผนการสอนด้วย Gemini AI"));

  const form = createElement("form", "planner-form");
  const topic = createField("หัวข้อ/เนื้อหาที่ต้องการสอน", "topic", "เช่น การสังเคราะห์ด้วยแสง");
  const grade = createField("ระดับชั้น", "gradeLevel", "เช่น มัธยมศึกษาปีที่ 2");
  const subject = createField("รายวิชา", "subject", "เช่น วิทยาศาสตร์");
  const duration = createField("เวลาเรียนโดยประมาณ", "duration", "เช่น 50 นาที");
  const outcome = createField("ผลลัพธ์การเรียนรู้หรือสมรรถนะที่ต้องการ", "learningOutcome", "ระบุผลลัพธ์ที่ต้องการให้ผู้เรียนทำได้", true);
  const status = createElement("p", "ai-status");
  status.setAttribute("aria-live", "polite");
  const result = createElement("div", "ai-result");

  const actions = createElement("div", "form-actions full-row");
  const submit = createElement("button", "primary-button", "สร้างแนวคิดแผนการสอน");
  submit.type = "submit";
  const regenerate = createElement("button", "secondary-button", "สร้างใหม่");
  regenerate.type = "button";
  const copy = createElement("button", "copy-button", "คัดลอกผลลัพธ์");
  copy.type = "button";
  copy.disabled = true;
  actions.append(submit, regenerate, copy);

  form.append(topic.label, grade.label, subject.label, duration.label, outcome.label, actions, status, result);
  section.append(form);

  const requestPlan = () => generateLessonPlan({
    model,
    fields: { topic, grade, subject, duration, outcome },
    submit,
    regenerate,
    copy,
    status,
    result
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    requestPlan();
  });
  regenerate.addEventListener("click", requestPlan);
  copy.addEventListener("click", async () => {
    if (!result.textContent.trim()) return;
    await navigator.clipboard.writeText(result.textContent);
    status.textContent = "คัดลอกผลลัพธ์แล้ว";
  });

  return section;
}

function createField(labelText, name, placeholder, textarea = false) {
  const label = document.createElement("label");
  label.textContent = labelText;
  const input = textarea ? document.createElement("textarea") : document.createElement("input");
  input.name = name;
  input.placeholder = placeholder;
  input.required = true;
  input.maxLength = textarea ? 700 : 180;
  if (textarea) input.rows = 4;
  label.append(input);
  if (textarea) label.classList.add("full-row");
  return { label, input };
}

async function generateLessonPlan(context) {
  const { model, fields, submit, regenerate, copy, status, result } = context;
  const payload = {
    topic: fields.topic.input.value,
    gradeLevel: fields.grade.input.value,
    subject: fields.subject.input.value,
    duration: fields.duration.input.value,
    learningOutcome: fields.outcome.input.value,
    learningModel: {
      name: model.name,
      concept: model.concept,
      objective: model.objective,
      steps: model.steps
    }
  };

  submit.disabled = true;
  regenerate.disabled = true;
  copy.disabled = true;
  status.textContent = "กำลังสร้างแนวคิดแผนการสอน...";
  result.textContent = "";
  result.classList.remove("is-visible");

  try {
    const response = await fetch("/api/generate-lesson-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || "ไม่สามารถสร้างแนวคิดแผนการสอนได้ในขณะนี้");
    }
    result.textContent = data.result;
    result.classList.add("is-visible");
    copy.disabled = false;
    status.textContent = "สร้างแนวคิดแผนการสอนเรียบร้อย";
  } catch (error) {
    status.textContent = error.message || "ไม่สามารถสร้างแนวคิดแผนการสอนได้ในขณะนี้";
  } finally {
    submit.disabled = false;
    regenerate.disabled = false;
  }
}

async function loadData() {
  try {
    const response = await fetch("/api/learning-models");
    if (!response.ok) throw new Error("โหลดข้อมูลไม่สำเร็จ");
    const data = await response.json();
    state.models = Array.isArray(data) ? data : data.models || [];
    state.groups = Array.isArray(data.groupMetadata) ? data.groupMetadata : buildGroupsFromModels(state.models);
    renderDashboard(data);
    renderTabs();
    renderCards();
  } catch (error) {
    dom.sourceOverview.textContent = "ไม่สามารถโหลดข้อมูลได้ กรุณาตรวจสอบไฟล์ data/learningData.json";
    dom.emptyState.hidden = false;
  }
}

function buildGroupsFromModels(models) {
  const map = new Map();
  models.forEach((model) => {
    const existing = map.get(model.group) || {
      id: model.group,
      name: model.groupName || `กลุ่มที่ ${model.group}`,
      displayName: model.groupName || `กลุ่มที่ ${model.group}`,
      description: "",
      count: 0
    };
    existing.count += 1;
    map.set(model.group, existing);
  });
  return [...map.values()].sort((a, b) => Number(a.id) - Number(b.id));
}

dom.searchInput.addEventListener("input", (event) => {
  state.search = event.target.value;
  renderCards();
});

dom.closeModal.addEventListener("click", closeModal);
dom.modal.addEventListener("click", (event) => {
  if (event.target === dom.modal) closeModal();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !dom.modal.hidden) closeModal();
});

loadData();
