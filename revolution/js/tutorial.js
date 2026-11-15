// A short guided tutorial for the first two months, given by an aide-de-camp.
// Each step either waits for the player to do something (an event from ui.js) or for a "Got it" tap.
// Progress lives in state.tutorial so it survives a reload; it's null when the tutorial is off or finished.

const STEPS = [
  {
    id: "select", wait: "select",
    text: "Your armies are the blue soldiers. Tap <b>Washington's army at New York City</b>, the one with his portrait above it.",
  },
  {
    id: "orders", wait: "act",
    text: "Gold dashed outlines show where this army can march. <b>Red</b> outlines are attacks, and you'll see your odds before you commit. Howe is still waiting for more ships, so this is a good month to tap <b>Dig in</b>. It makes the army much harder to attack.",
  },
  {
    id: "recruit", ok: true,
    text: "You can also <b>recruit</b> in any region you hold. Regulars cost more but stay for good. Militia are cheap and weaker, and they go home after 3 months.",
  },
  {
    id: "bar", ok: true, pulse: ["#btn-ledger", ".tb-stat:has(.cause)"],
    text: "Up top: your <b>Treasury</b> and the <b>Cause</b>, the country's belief in the Revolution. Victories raise it, and defeats and lost cities lower it. If it reaches zero, the war is lost.",
  },
  {
    id: "end", wait: "endTurn", pulse: ["#end-turn"],
    text: "When you've given your orders, tap <b>End July</b>. Then the British make their moves.",
  },
  {
    id: "navy", ok: true, minTurn: 1,
    text: "August 1776. More British ships are arriving. The <b>Royal Navy</b> can land Howe's army anywhere along the coast, so keep strong armies where he's likely to strike: Long Island, New York and New Jersey.",
  },
  {
    id: "ledger", wait: "ledger", pulse: ["#btn-ledger"],
    text: "Now tap the <b>Treasury</b> to open your books.",
  },
  {
    id: "money", ok: true,
    text: "Your army's pay comes due every month. If you can't pay, it's recorded as <b>back pay owed</b>, and unpaid soldiers start to desert. <b>Printing money</b> gives you cash now, but prices rise for the rest of the war.",
  },
  {
    id: "done", ok: true, last: true,
    text: "That's all you need to know. Keep Washington free, hold Philadelphia, and keep the Cause alive until June 1777. Good luck. Watch for <b>Did you know?</b> notes along the way.",
  },
];

export function createTutorial({ getState, save }) {
  const el = document.createElement("div");
  el.id = "coach";
  el.hidden = true;
  document.querySelector("#mapwrap").appendChild(el);

  const cur = () => {
    const s = getState();
    return s && s.tutorial ? STEPS[s.tutorial.step] : null;
  };

  function advance() {
    const s = getState();
    s.tutorial.step++;
    if (s.tutorial.step >= STEPS.length) s.tutorial = null;
    save();
    show();
  }

  function finish() {
    const s = getState();
    if (s) s.tutorial = null;
    save();
    show();
  }

  function show() {
    for (const p of document.querySelectorAll(".tut-pulse")) p.classList.remove("tut-pulse");
    const step = cur();
    const s = getState();
    if (!step || (step.minTurn && s.turn < step.minTurn)) {
      el.hidden = true;
      return;
    }
    el.hidden = false;
    const n = s.tutorial.step + 1;
    el.innerHTML = `<div class="coach-head"><span>Your aide-de-camp · ${n} of ${STEPS.length}</span><button class="coach-skip" type="button">Skip guide</button></div>
      <p>${step.text}</p>${step.ok ? `<div class="coach-actions"><button class="btn primary small" type="button" id="coach-ok">${step.last ? "Finish" : "Got it"}</button></div>` : ""}`;
    el.querySelector(".coach-skip").onclick = finish;
    const ok = el.querySelector("#coach-ok");
    if (ok) ok.onclick = advance;
    for (const sel of step.pulse || []) for (const t of document.querySelectorAll(sel)) t.classList.add("tut-pulse");
  }

  return {
    start() { const s = getState(); s.tutorial = { step: 0 }; save(); show(); },
    active: () => !!cur(),
    // Called by ui.js when the player does something the tutorial might be waiting for.
    event(name) {
      const step = cur();
      if (!step) return;
      if (step.wait === name) { advance(); return; }
      show();
    },
    // Re-apply highlights after the panel is redrawn.
    refresh: show,
  };
}
