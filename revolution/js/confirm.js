// An in-game "Are you sure?" box. The browser's own confirm() is blocked or hidden in some
// embedded browsers and app wrappers, which made buttons like Restart silently do nothing.

export function askConfirm(message, { ok = "Yes", cancel = "Cancel", danger = false } = {}) {
  return new Promise((resolve) => {
    const el = document.createElement("div");
    el.className = "confirm-backdrop";
    el.innerHTML = `<div class="confirm-card" role="alertdialog" aria-modal="true">
      <p></p>
      <div class="confirm-actions"><button class="btn" data-a="no"></button><button class="btn ${danger ? "danger" : "primary"}" data-a="yes"></button></div>
    </div>`;
    el.querySelector("p").textContent = message;
    el.querySelector('[data-a="no"]').textContent = cancel;
    el.querySelector('[data-a="yes"]').textContent = ok;
    const done = (v) => { el.remove(); resolve(v); };
    el.addEventListener("click", (e) => {
      const a = e.target.closest("[data-a]");
      if (a) done(a.dataset.a === "yes");
      else if (e.target === el) done(false);
    });
    document.body.appendChild(el);
    el.querySelector('[data-a="yes"]').focus();
  });
}
