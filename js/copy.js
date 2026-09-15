// copy.js — clipboard with terminal feedback
function copySnippet(elementId, btn) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const text = (el.innerText || el.textContent || "").trim();
  const showFeedback = () => {
    const original = btn.innerText;
    btn.innerText = "[ COPIED! ]";
    btn.style.borderColor = "var(--color-green)";
    btn.style.color = "var(--color-green)";
    setTimeout(() => {
      btn.innerText = original;
      btn.style.borderColor = "";
      btn.style.color = "";
    }, 1600);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(showFeedback).catch(() => {
      fallbackCopy(text, showFeedback);
    });
  } else {
    fallbackCopy(text, showFeedback);
  }
}

function fallbackCopy(text, onDone) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
  } catch (e) {}
  document.body.removeChild(ta);
  onDone();
}
