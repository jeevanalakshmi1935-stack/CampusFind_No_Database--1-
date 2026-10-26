const API = "/api/reports";
const $ = (selector) => document.querySelector(selector);
const reportGrid = $("#reportGrid");
const formMessage = $("#formMessage");

const fallbackImages = {
  Electronics: "https://placehold.co/640x400/e7effb/34567a?text=Electronics",
  Accessories: "https://placehold.co/640x400/f7e9df/855c3a?text=Accessories",
  Books: "https://placehold.co/640x400/f5efdb/827243?text=Books",
  "ID Cards": "https://placehold.co/640x400/e5f4ee/367761?text=ID+Card",
  Clothing: "https://placehold.co/640x400/f1e9f8/775b91?text=Clothing",
  Keys: "https://placehold.co/640x400/e9edf2/4d6175?text=Keys",
  Other: "https://placehold.co/640x400/e9eff3/526779?text=CampusFind"
};

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[c]);
}

function dateLabel(date) {
  if (!date) return "Date not specified";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "Date not specified";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

async function loadStats() {
  try {
    const response = await fetch(`${API}/stats`);
    if (!response.ok) throw new Error("Stats unavailable");
    const stats = await response.json();
    $("#totalCount").textContent = stats.total;
    $("#lostCount").textContent = stats.lost;
    $("#foundCount").textContent = stats.found;
    $("#resolvedCount").textContent = stats.resolved;
  } catch {
    $("#totalCount").textContent = "—";
    $("#lostCount").textContent = "—";
    $("#foundCount").textContent = "—";
    $("#resolvedCount").textContent = "—";
  }
}

function currentFilters() {
  const params = new URLSearchParams();
  const type = $("#typeFilter").value;
  const category = $("#categoryFilter").value;
  const status = $("#statusFilter").value;
  const search = $("#searchInput").value.trim();
  if (type !== "All") params.set("type", type);
  if (category !== "All") params.set("category", category);
  if (status !== "All") params.set("status", status);
  if (search) params.set("search", search);
  return params.toString();
}

async function loadReports() {
  reportGrid.innerHTML = '<div class="empty-state">Loading campus reports…</div>';
  try {
    const response = await fetch(`${API}?${currentFilters()}`);
    if (!response.ok) throw new Error("Could not load reports");
    const reports = await response.json();
    renderReports(reports);
  } catch {
    reportGrid.innerHTML = '<div class="empty-state">Could not connect to the server. Please check your backend and database setup.</div>';
  }
}

function renderReports(reports) {
  if (!reports.length) {
    reportGrid.innerHTML = '<div class="empty-state">No matching reports yet. Try another filter or post the first report!</div>';
    return;
  }

  reportGrid.innerHTML = reports.map(report => {
    const typeClass = report.type === "Lost" ? "lost" : "";
    const statusClass = report.status === "Resolved" ? "resolved" : "";
    const image = report.photoUrl || fallbackImages[report.category] || fallbackImages.Other;
    return `
      <article class="report-card">
        <img class="report-photo" src="${escapeHTML(image)}" alt="Photo for ${escapeHTML(report.name)}" loading="lazy">
        <div class="report-card-body">
          <div class="card-top">
            <span class="pill ${typeClass} ${statusClass}">${escapeHTML(report.type)} · ${escapeHTML(report.status)}</span>
            <span class="date-text">${escapeHTML(dateLabel(report.date || report.createdAt))}</span>
          </div>
          <h3>${escapeHTML(report.name)}</h3>
          <div class="location">⌖ ${escapeHTML(report.location)}</div>
          <p class="description">${escapeHTML(report.description)}</p>
          <span class="card-category">${escapeHTML(report.category)}</span>
          <div class="card-actions">
            <button class="small-btn primary-small" data-contact="${escapeHTML(report._id)}">Contact</button>
            ${report.status === "Open" ? `<button class="small-btn" data-resolve="${escapeHTML(report._id)}">Mark resolved</button>` : ""}
          </div>
        </div>
      </article>`;
  }).join("");
}

async function submitReport(event) {
  event.preventDefault();
  const form = $("#reportForm");
  const submitButton = $("#submitButton");
  const photo = $("#photo").files[0];

  if (photo && photo.size > 3 * 1024 * 1024) {
    showMessage("Please choose a photo smaller than 3 MB.", true);
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Publishing…";
  showMessage("");

  try {
    const formData = new FormData(form);
    if (!formData.get("date")) formData.delete("date");
    const response = await fetch(API, { method: "POST", body: formData });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Could not publish report.");

    form.reset();
    showMessage("Your report has been published and is now visible to the campus community.", false);
    $("#browse").scrollIntoView({ behavior: "smooth" });
    await Promise.all([loadReports(), loadStats()]);
  } catch (error) {
    showMessage(error.message || "Something went wrong. Please try again.", true);
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = 'Publish report <span>→</span>';
  }
}

function showMessage(message, isError = false) {
  formMessage.textContent = message;
  formMessage.className = "form-message" + (message ? (isError ? " error" : " success") : "");
}

reportGrid.addEventListener("click", async event => {
  const contactButton = event.target.closest("[data-contact]");
  const resolveButton = event.target.closest("[data-resolve]");

  if (contactButton) {
    try {
      const response = await fetch(`${API}?status=All`);
      const reports = await response.json();
      const report = reports.find(item => item._id === contactButton.dataset.contact);
      if (report) {
        alert(`Contact for ${report.name}\nEmail: ${report.contactEmail}\n\nPlease verify ownership before handing over valuable items.`);
      }
    } catch {
      alert("Could not load contact details. Please try again.");
    }
  }

  if (resolveButton) {
    if (!confirm("Mark this report as resolved?")) return;
    resolveButton.disabled = true;
    try {
      const response = await fetch(`${API}/${resolveButton.dataset.resolve}/resolve`, { method: "PATCH" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Could not update report.");
      await Promise.all([loadReports(), loadStats()]);
    } catch (error) {
      alert(error.message);
      resolveButton.disabled = false;
    }
  }
});

$("#reportForm").addEventListener("submit", submitReport);
["typeFilter", "categoryFilter", "statusFilter"].forEach(id => {
  $(`#${id}`).addEventListener("change", loadReports);
});
let searchTimer;
$("#searchInput").addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadReports, 250);
});

const today = new Date();
$("#date").max = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
Promise.all([loadReports(), loadStats()]);
