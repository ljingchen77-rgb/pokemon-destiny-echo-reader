const chapters = window.__CHAPTERS__;
const reader = document.querySelector("#reader");
let current = 0;
let fontSize = 19;
let theme = "paper";

if (!Array.isArray(chapters) || chapters.length === 0) {
  document.querySelector("#chapter-title").textContent = "章节加载失败";
  document.querySelector("#chapter-body").innerHTML = "<p>章节数据没有正确载入，请刷新页面后重试。</p>";
  throw new Error("Chapter data is unavailable.");
}

const escapeHtml = (text) =>
  text.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);

function inline(text) {
  return escapeHtml(text).replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
}

function markdown(content) {
  return content.split(/\n{2,}/).map((block) => {
    const value = block.trim();
    if (!value) return "";
    if (value === "---") return "<hr>";
    if (value.startsWith("> ")) return `<blockquote>${inline(value.slice(2))}</blockquote>`;
    const lines = value.split("\n");
    if (lines.every((line) => line.startsWith("- "))) {
      return `<ul>${lines.map((line) => `<li>${inline(line.slice(2))}</li>`).join("")}</ul>`;
    }
    return `<p>${inline(value.replace(/\n/g, " "))}</p>`;
  }).join("");
}

function save() {
  localStorage.setItem("white-elm-reader", JSON.stringify({ current, fontSize, theme, scrollY: window.scrollY }));
}

function render(scrollTop = true) {
  const chapter = chapters[current];
  document.querySelector("#chapter-title").textContent = chapter.title;
  document.querySelector("#word-count").textContent = `约 ${chapter.characterCount.toLocaleString("zh-CN")} 字`;
  document.querySelector("#chapter-body").innerHTML = markdown(chapter.body);
  document.querySelector("#chapter-illustration").hidden = current !== 19;
  document.querySelector("#open-progress").textContent = `${current + 1}/${chapters.length}`;
  document.querySelector("#progress").style.width = `${Math.round(((current + 1) / chapters.length) * 100)}%`;

  const previous = document.querySelector("#previous");
  previous.disabled = current === 0;
  previous.querySelector("span").textContent = current === 0 ? "已经是开篇" : chapters[current - 1].shortTitle;
  const next = document.querySelector("#next");
  next.disabled = current === chapters.length - 1;
  next.querySelector("span").textContent = current === chapters.length - 1 ? "未完待续" : chapters[current + 1].shortTitle;

  document.querySelectorAll("#chapter-list button").forEach((button, index) => button.classList.toggle("active", index === current));
  if (scrollTop) window.scrollTo({ top: 0, behavior: "smooth" });
  save();
}

function choose(index) {
  current = Math.max(0, Math.min(chapters.length - 1, index));
  closeMenu();
  render();
}

function openMenu() {
  document.querySelector("#drawer").classList.add("open");
  document.querySelector("#backdrop").classList.add("open");
}

function closeMenu() {
  document.querySelector("#drawer").classList.remove("open");
  document.querySelector("#backdrop").classList.remove("open");
}

document.querySelector("#chapter-list").innerHTML = chapters.map((chapter, index) => `
  <button data-index="${index}">
    <span>${String(index + 1).padStart(2, "0")}</span>
    <div><strong>${escapeHtml(chapter.shortTitle)}</strong><small>${chapter.characterCount.toLocaleString("zh-CN")} 字</small></div>
  </button>`).join("");

document.querySelectorAll("#chapter-list button").forEach((button) => button.addEventListener("click", () => choose(Number(button.dataset.index))));
document.querySelector("#previous").addEventListener("click", () => choose(current - 1));
document.querySelector("#next").addEventListener("click", () => choose(current + 1));
document.querySelector("#open-menu").addEventListener("click", openMenu);
document.querySelector("#open-progress").addEventListener("click", openMenu);
document.querySelector("#close-menu").addEventListener("click", closeMenu);
document.querySelector("#backdrop").addEventListener("click", closeMenu);

document.querySelectorAll("[data-theme]").forEach((button) => button.addEventListener("click", () => {
  theme = button.dataset.theme;
  reader.className = `reader theme-${theme}`;
  document.querySelectorAll("[data-theme]").forEach((item) => item.classList.toggle("active", item.dataset.theme === theme));
  save();
}));

document.querySelector("#font-down").addEventListener("click", () => {
  fontSize = Math.max(16, fontSize - 1);
  reader.style.setProperty("--reader-size", `${fontSize}px`);
  document.querySelector("#font-size").textContent = fontSize;
  save();
});

document.querySelector("#font-up").addEventListener("click", () => {
  fontSize = Math.min(26, fontSize + 1);
  reader.style.setProperty("--reader-size", `${fontSize}px`);
  document.querySelector("#font-size").textContent = fontSize;
  save();
});

window.addEventListener("scroll", save, { passive: true });

try {
  const state = JSON.parse(localStorage.getItem("white-elm-reader") || "{}");
  current = Number.isInteger(state.current) ? Math.min(state.current, chapters.length - 1) : 0;
  fontSize = typeof state.fontSize === "number" ? state.fontSize : 19;
  theme = ["paper", "green", "night"].includes(state.theme) ? state.theme : "paper";
  reader.className = `reader theme-${theme}`;
  reader.style.setProperty("--reader-size", `${fontSize}px`);
  document.querySelector("#font-size").textContent = fontSize;
  document.querySelectorAll("[data-theme]").forEach((item) => item.classList.toggle("active", item.dataset.theme === theme));
  render(false);
  requestAnimationFrame(() => window.scrollTo(0, state.scrollY || 0));
} catch {
  render(false);
}
