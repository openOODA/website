// # Theme cycle and mail
//
// Logline: Theme button, cookie, join form.
//
function setDomText(el, text) {
  if (el && el.textContent !== text) {
    el.textContent = text;
    return true;
  }
  return false;
}

(function () {
  var key = "ooda-theme";
  var THEMES = ["night", "paper", "magma", "flare", "solar", "cyber", "frost", "tokyo", "laser"];
  function apply(t) {
    if (THEMES.indexOf(t) === -1) t = "night";
    invalidateThemeCache();
    document.documentElement.setAttribute("data-theme", t);
    var b = document.getElementById("theme");
    if (b) {
      var nextIdx = (THEMES.indexOf(t) + 1) % THEMES.length;
      setDomText(b, THEMES[nextIdx]);
    }
    var badge = document.getElementById("hud-license");
    if (badge) {
      badge.classList.remove("theme-morph");
      void badge.offsetWidth;
      badge.classList.add("theme-morph");
    }
  }
  if (typeof document === "undefined") return;
  apply(document.documentElement.getAttribute("data-theme") || "night");
  var b = document.getElementById("theme");
  if (b) b.onclick = function () {
    var cur = document.documentElement.getAttribute("data-theme") || "night";
    var curIdx = THEMES.indexOf(cur);
    if (curIdx === -1) curIdx = 0;
    var nextIdx = (curIdx + 1) % THEMES.length;
    var n = THEMES[nextIdx];
    localStorage.setItem(key, n);
    document.cookie = key + "=" + n + ";path=/;domain=.openooda.org;max-age=31536000;SameSite=Lax";
    apply(n);
  };
  var mail = document.getElementById("mail");
  if (mail && typeof mail.addEventListener === "function") mail.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var btn = document.getElementById("join");
    var email = (mail.email && mail.email.value) || "";
    var website = (mail.website && mail.website.value) || "";
    function fail() { if (btn) { setDomText(btn, "join"); btn.className = ""; } }
    function ok() { if (btn) { setDomText(btn, "joined"); btn.className = "is-on"; } if (mail.email) mail.email.value = ""; }
    fetch("https://collect.openooda.org/v1/emails", {
      method: "POST", credentials: "omit",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email, website: website, source: "app" })
    }).then(function (r) { if (r.ok) ok(); else fail(); }).catch(fail);
  });
})();
