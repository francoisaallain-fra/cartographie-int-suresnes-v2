import { runtime } from "./state.js";

const preferenceKey = "suresnes-v2-sidebar";
export function setupSidebar() {
  const workspace = document.querySelector(".workspace");
  const sidebar = document.getElementById("sidebar");
  const handle = document.getElementById("sidebar-resize");
  const toggle = document.getElementById("sidebar-toggle");
  const mobile = window.matchMedia("(max-width: 720px)");
  let width =
    window.innerWidth >= 1600 ? 340 : window.innerWidth <= 1050 ? 280 : 316;
  let collapsed = false;
  try {
    const saved = JSON.parse(localStorage.getItem(preferenceKey));
    if (Number.isFinite(saved?.width)) width = saved.width;
    collapsed = saved?.collapsed === true;
  } catch {}
  const maxWidth = () => Math.max(240, Math.min(560, window.innerWidth - 360));
  const save = () => {
    try {
      localStorage.setItem(preferenceKey, JSON.stringify({ width, collapsed }));
    } catch {}
  };
  const render = () => {
    const visibleWidth = Math.max(240, Math.min(maxWidth(), width));
    const closed = collapsed && !mobile.matches;
    workspace.style.setProperty(
      "--sidebar-width",
      `${closed ? 0 : visibleWidth}px`,
    );
    workspace.classList.toggle("sidebar-collapsed", closed);
    sidebar.hidden = closed;
    handle.tabIndex = closed || mobile.matches ? -1 : 0;
    handle.setAttribute("aria-valuemax", String(maxWidth()));
    handle.setAttribute("aria-valuenow", String(Math.round(visibleWidth)));
    handle.setAttribute("aria-valuetext", `${Math.round(visibleWidth)} pixels`);
    toggle.textContent = closed ? "›" : "‹";
    toggle.setAttribute("aria-expanded", String(!closed));
    const label = `${closed ? "Agrandir" : "Réduire"} le panneau des couches`;
    toggle.setAttribute("aria-label", label);
    toggle.title = label;
    window.requestAnimationFrame(() =>
      runtime.map.invalidateSize({ pan: false }),
    );
  };
  toggle.addEventListener("click", () => {
    collapsed = !collapsed;
    render();
    save();
  });
  handle.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || collapsed || mobile.matches) return;
    event.preventDefault();
    handle.focus();
    handle.setPointerCapture(event.pointerId);
    workspace.classList.add("sidebar-resizing");
  });
  handle.addEventListener("pointermove", (event) => {
    if (!handle.hasPointerCapture(event.pointerId)) return;
    width = Math.max(
      240,
      Math.min(
        maxWidth(),
        event.clientX - workspace.getBoundingClientRect().left,
      ),
    );
    render();
  });
  const finish = () => {
    workspace.classList.remove("sidebar-resizing");
    save();
  };
  handle.addEventListener("pointerup", (event) => {
    if (handle.hasPointerCapture(event.pointerId))
      handle.releasePointerCapture(event.pointerId);
    finish();
  });
  handle.addEventListener("lostpointercapture", finish);
  handle.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    width =
      event.key === "Home"
        ? 240
        : event.key === "End"
          ? maxWidth()
          : width + (event.key === "ArrowLeft" ? -20 : 20);
    width = Math.max(240, Math.min(maxWidth(), width));
    render();
    save();
  });
  handle.addEventListener("dblclick", () => {
    width = 316;
    render();
    save();
  });
  window.addEventListener("resize", render);
  render();
}
