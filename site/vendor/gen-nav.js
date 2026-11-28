/* PRV · barra in cima a ogni generatore interno, con i link a tutti gli altri */
(function () {
  var L = [["bias.html", "Bias"], ["domanda.html", "Domanda"], ["edu.html", "Educativo"], ["crash.html", "La caduta"], ["meme.html", "Meme"], ["evidenza.html", "Storie in evidenza"]];
  var here = location.pathname.split("/").pop() || "index.html";
  var css = document.createElement("style");
  css.textContent = ".gnav{position:sticky;top:0;z-index:100;display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding:10px 24px;background:rgba(14,15,18,.92);backdrop-filter:blur(8px);border-bottom:1px solid var(--line,#26262b);font:500 13px Inter,system-ui,sans-serif}" +
    ".gnav b{color:var(--mute,#888);font-weight:600;letter-spacing:.08em;font-size:11px;margin-right:8px}" +
    ".gnav a{color:var(--ink2,#c9c9c9);text-decoration:none;padding:6px 11px;border-radius:999px;border:1px solid transparent}" +
    ".gnav a:hover{border-color:var(--line,#333);color:var(--ink,#fff)}" +
    ".gnav a.on{background:var(--soft,#22242a);color:var(--ink,#fff);border-color:var(--line,#333)}" +
    ".gnav .sp{flex:1}";
  document.head.appendChild(css);
  var nav = document.createElement("nav"); nav.className = "gnav"; nav.setAttribute("aria-label", "Generatori PRV");
  nav.innerHTML = "<b>GENERATORI</b>" + L.map(function (x) { return '<a href="' + x[0] + '"' + (x[0] === here ? ' class="on" aria-current="page"' : "") + ">" + x[1] + "</a>"; }).join("") +
    '<span class="sp"></span><a href="./">PRV Board →</a>';
  document.body.insertBefore(nav, document.body.firstChild);
})();
