// rotate.js — hero headline typewriter rotation
const HEADLINES = [
  "Fail-Closed by Design",
  "Zero Ambient Authority",
  "Every Effect Needs a Token",
  "Subtract Until Drag is Gone",
  "Born With No Privileges",
  "A Comparison, Not a Rename",
];

let currentHeadlineIdx = 0;
const titleEl = document.getElementById("hero-title");

function rotateHeadline() {
  if (!titleEl) return;
  let nextIdx;
  do {
    nextIdx = Math.floor(Math.random() * HEADLINES.length);
  } while (nextIdx === currentHeadlineIdx && HEADLINES.length > 1);
  currentHeadlineIdx = nextIdx;
  const targetText = HEADLINES[nextIdx];

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    titleEl.textContent = targetText;
    setTimeout(rotateHeadline, 5000);
    return;
  }

  let currentText = titleEl.textContent;
  const backspaceInterval = setInterval(() => {
    if (currentText.length > 0) {
      currentText = currentText.slice(0, -1);
      titleEl.textContent = currentText;
    } else {
      clearInterval(backspaceInterval);
      let charIdx = 0;
      const typeInterval = setInterval(() => {
        if (charIdx < targetText.length) {
          currentText += targetText[charIdx];
          titleEl.textContent = currentText;
          charIdx++;
        } else {
          clearInterval(typeInterval);
          setTimeout(rotateHeadline, 5000);
        }
      }, 35);
    }
  }, 20);
}

setTimeout(rotateHeadline, 5000);

console.log(
  "%c[OPENOODA // TERMINAL ACTIVE]\n%cCapability-Secure Systems Substrate | 11 Product Nodes Mounted",
  "color: #34d399; font-weight: bold;",
  "color: #94a3b8;"
);
