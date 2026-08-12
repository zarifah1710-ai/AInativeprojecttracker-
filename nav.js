/* ============================================================
   nav.js — the shared left sidebar
   ============================================================

   ONE file drives the sidebar on every page. To put the sidebar
   on a page, add this single line before </body>:

       <script src="nav.js" defer></script>

   Nothing else. No CSS to copy, no HTML to paste. Change a menu
   item here and it changes on all pages at once.

   Every class name starts with "ws-" so nothing here can collide
   with the styles already in tracker.html or swimlane-editor.html.
   ============================================================ */

(function () {
  "use strict";

  // Don't build it twice if the script gets included twice.
  if (document.getElementById("ws-nav")) return;

  /* ---- THE MENU ------------------------------------------------
     EDIT ME: this array IS the menu. Add, remove or reorder.
     ------------------------------------------------------------- */
  var ITEMS = [
    {
      href: "index.html",
      label: "Home",
      hint: "Back to both options",
      icon: '<path d="M3 8.5L10 3l7 5.5V16a1 1 0 01-1 1h-4v-5H8v5H4a1 1 0 01-1-1V8.5z"/>'
    },
    {
      href: "tracker.html",
      label: "Project Progress Tracker",
      hint: "Module progress across build, design and QA",
      icon: '<rect x="3" y="11" width="3.4" height="6" rx="1"/>' +
            '<rect x="8.3" y="7" width="3.4" height="10" rx="1"/>' +
            '<rect x="13.6" y="3" width="3.4" height="14" rx="1"/>'
    },
    {
      href: "swimlane-editor.html",
      label: "RBAC Swimlane Viewer and Editor",
      hint: "Draw and edit process flow diagrams",
      icon: '<rect x="2.5" y="2.5" width="6" height="3.6" rx="1.1"/>' +
            '<rect x="11.5" y="8.2" width="6" height="3.6" rx="1.1"/>' +
            '<rect x="2.5" y="13.9" width="6" height="3.6" rx="1.1"/>' +
            '<path d="M8.5 4.3h2v5.7M11.5 10h-2v5.7" fill="none" ' +
            'stroke="currentColor" stroke-width="1.2"/>'
    }
  ];

  var RAIL = 48;    // collapsed width, in px
  var OPEN = 236;   // expanded width, in px
  var KEY  = "ws-nav-open";

  /* ---- which page are we on? -----------------------------------
     On GitHub Pages the root URL ends in "/", which really means
     index.html — so treat an empty segment as index.html.        */
  var here = location.pathname.split("/").pop() || "index.html";

  /* ---- styles --------------------------------------------------
     Injected rather than kept in a .css file so that adding the
     sidebar to a page stays a one-line change.                   */
  var css = [
    ':root{--ws-rail:' + RAIL + 'px;--ws-open:' + OPEN + 'px}',

    /* Shift the page across so the rail never covers content.
       Using padding-left (not margin) keeps wide, horizontally
       scrolling tables inside the tracker working normally. */
    'body{padding-left:var(--ws-rail)!important}',

    '#ws-nav{position:fixed;top:0;left:0;bottom:0;width:var(--ws-rail);',
      'background:#1d1949;color:#cfcbe8;z-index:9000;display:flex;',
      'flex-direction:column;transition:width .18s ease;overflow:hidden;',
      'font-family:"DM Sans",Inter,system-ui,-apple-system,"Segoe UI",sans-serif;',
      'box-shadow:2px 0 12px -6px rgba(0,0,0,.45)}',
    '#ws-nav.ws-open{width:var(--ws-open)}',

    /* toggle */
    '#ws-toggle{all:unset;box-sizing:border-box;display:flex;align-items:center;',
      'gap:12px;height:52px;min-height:52px;padding:0 15px;cursor:pointer;',
      'color:#fff;flex-shrink:0;border-bottom:1px solid rgba(255,255,255,.1)}',
    '#ws-toggle:hover{background:rgba(255,255,255,.07)}',
    '#ws-toggle:focus-visible{outline:2px solid #AFA9EC;outline-offset:-2px}',
    '#ws-bars{flex:none;width:18px;height:18px}',
    '#ws-title{font-size:12.5px;font-weight:600;letter-spacing:.02em;',
      'white-space:nowrap;opacity:0;transition:opacity .14s}',
    '#ws-nav.ws-open #ws-title{opacity:1}',

    /* items */
    '#ws-list{list-style:none;margin:0;padding:8px 0;flex:1;overflow-y:auto;',
      'overflow-x:hidden}',
    '.ws-item{display:flex;align-items:center;gap:12px;min-height:44px;padding:9px 15px;',
      'color:#cfcbe8;text-decoration:none;position:relative;',
      'transition:background .13s,color .13s}',
    '.ws-item:hover{background:rgba(255,255,255,.09);color:#fff}',
    '.ws-item:focus-visible{outline:2px solid #AFA9EC;outline-offset:-2px}',
    '.ws-item.ws-active{background:rgba(175,169,236,.17);color:#fff}',
    '.ws-item.ws-active::before{content:"";position:absolute;left:0;top:8px;',
      'bottom:8px;width:3px;border-radius:0 3px 3px 0;background:#AFA9EC}',
    '.ws-ico{flex:none;width:20px;height:20px;display:flex;align-items:center;',
      'justify-content:center}',
    '.ws-ico svg{width:19px;height:19px;fill:currentColor}',
    /* Collapsed: nowrap, so a long label can't make the 48px rail tall.
       Expanded: allow wrapping, so long labels are never clipped. */
    '.ws-lbl{font-size:12.5px;line-height:1.3;white-space:nowrap;opacity:0;',
      'transition:opacity .14s}',
    '#ws-nav.ws-open .ws-lbl{opacity:1;white-space:normal}',

    /* footer hint, only visible when open */
    '#ws-foot{padding:12px 15px;border-top:1px solid rgba(255,255,255,.1);',
      'font-size:10.5px;line-height:1.45;color:#8d87b8;white-space:normal;',
      'opacity:0;transition:opacity .14s;flex-shrink:0}',
    '#ws-nav.ws-open #ws-foot{opacity:1}',

    /* sign out — sits below the menu items, same shape as an item so the
       rail stays a tidy column of icons when collapsed */
    '#ws-signout{all:unset;box-sizing:border-box;display:flex;align-items:center;',
      'gap:12px;min-height:44px;padding:9px 15px;cursor:pointer;color:#cfcbe8;',
      'flex-shrink:0;border-top:1px solid rgba(255,255,255,.1);',
      'transition:background .13s,color .13s}',
    '#ws-signout:hover{background:rgba(226,75,74,.22);color:#fff}',
    '#ws-signout:focus-visible{outline:2px solid #AFA9EC;outline-offset:-2px}',
    '#ws-signout[hidden]{display:none}',

    /* On narrow screens the expanded panel floats over the page
       instead of squeezing it. */
    '@media (max-width:640px){',
      '#ws-nav.ws-open{box-shadow:0 0 0 100vmax rgba(0,0,0,.45)}',
    '}',

    '@media (prefers-reduced-motion:reduce){',
      '#ws-nav,#ws-title,.ws-lbl,#ws-foot{transition:none}',
    '}'
  ].join("");

  var style = document.createElement("style");
  style.id = "ws-nav-style";
  style.textContent = css;
  document.head.appendChild(style);

  /* ---- build the markup ---------------------------------------- */
  var nav = document.createElement("nav");
  nav.id = "ws-nav";
  nav.setAttribute("aria-label", "Main navigation");

  var itemsHTML = ITEMS.map(function (it) {
    var active = it.href === here;
    return '<li>' +
      '<a class="ws-item' + (active ? ' ws-active' : '') + '" href="' + it.href + '"' +
        ' title="' + it.label + ' — ' + it.hint + '"' +
        (active ? ' aria-current="page"' : '') + '>' +
        '<span class="ws-ico">' +
          '<svg viewBox="0 0 20 20" aria-hidden="true">' + it.icon + '</svg>' +
        '</span>' +
        '<span class="ws-lbl">' + it.label + '</span>' +
      '</a></li>';
  }).join("");

  nav.innerHTML =
    '<button id="ws-toggle" type="button" aria-expanded="false" ' +
            'aria-controls="ws-list" title="Show / hide menu">' +
      '<svg id="ws-bars" viewBox="0 0 18 18" aria-hidden="true">' +
        '<rect y="2.5" width="18" height="1.8" rx=".9" fill="currentColor"/>' +
        '<rect y="8.1" width="18" height="1.8" rx=".9" fill="currentColor"/>' +
        '<rect y="13.7" width="18" height="1.8" rx=".9" fill="currentColor"/>' +
      '</svg>' +
      '<span id="ws-title">Menu</span>' +
    '</button>' +
    '<ul id="ws-list">' + itemsHTML + '</ul>' +
    '<button id="ws-signout" type="button" hidden title="Sign out">' +
      '<span class="ws-ico">' +
        '<svg viewBox="0 0 20 20" aria-hidden="true">' +
          '<path d="M8 3H5a1 1 0 00-1 1v12a1 1 0 001 1h3" fill="none" ' +
                'stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>' +
          '<path d="M12.5 6.5L16 10l-3.5 3.5M15.5 10H8" fill="none" ' +
                'stroke="currentColor" stroke-width="1.6" stroke-linecap="round" ' +
                'stroke-linejoin="round"/>' +
        '</svg>' +
      '</span>' +
      '<span class="ws-lbl">Sign out</span>' +
    '</button>' +
    '<div id="ws-foot">Pick a tool, or press <b>Home</b> to see both options.</div>';

  document.body.appendChild(nav);

  /* ---- sign out ------------------------------------------------
     Only shown on pages that actually have a signed-in session. The
     page publishes its own Supabase client as window.sb; we reuse it
     rather than creating a second one, because two clients on one page
     fight over the same stored session.

     The swimlane editor has no sign-in at all, so no client, so no
     button — which is correct, there is nothing to sign out of.     */
  (function initSignOut() {
    var btn = document.getElementById("ws-signout");

    function wire(sb) {
      sb.auth.getSession().then(function (res) {
        if (!(res && res.data && res.data.session)) return;   // signed out
        btn.hidden = false;
        btn.addEventListener("click", function () {
          btn.disabled = true;
          btn.querySelector(".ws-lbl").textContent = "Signing out…";
          sb.auth.signOut().then(function () {
            window.location.replace("login.html");
          });
        });
      }).catch(function () { /* leave hidden */ });
    }

    if (window.sb) { wire(window.sb); return; }

    /* window.sb is published by an async block, so it may not exist yet
       when this runs. Poll briefly, then give up rather than hang. */
    var tries = 0;
    var t = setInterval(function () {
      if (window.sb) { clearInterval(t); wire(window.sb); }
      else if (++tries > 40) { clearInterval(t); }   // ~4s
    }, 100);
  })();

  /* ---- open / close ------------------------------------------- */
  var toggle = document.getElementById("ws-toggle");

  /* `persist` is deliberately opt-in. Only a real click should be
     remembered — if the opening default also wrote to localStorage,
     then one first visit on a narrow phone would leave the sidebar
     collapsed forever, even on a wide desktop later. */
  function setOpen(open, persist) {
    nav.classList.toggle("ws-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    if (persist) {
      try { localStorage.setItem(KEY, open ? "1" : "0"); } catch (e) {}
    }
  }

  toggle.addEventListener("click", function () {
    setOpen(!nav.classList.contains("ws-open"), true);
  });

  /* Escape closes it — expected of any slide-out panel. */
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && nav.classList.contains("ws-open")) setOpen(false, true);
  });

  /* Remember the choice. Default: open on the landing page (where
     the menu IS the point), collapsed inside the tools so they get
     the full width. */
  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  if (saved === null) {
    setOpen(here === "index.html" && window.innerWidth > 640, false);
  } else {
    setOpen(saved === "1", false);
  }
})();
