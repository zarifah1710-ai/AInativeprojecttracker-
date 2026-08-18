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
      href: "trackers.html",
      label: "Project Progress Tracker",
      hint: "Module progress across build, design and QA",
      /* Pages that count as "inside" this item, for highlighting. */
      alsoActiveOn: ["tracker.html"],
      /* Children are loaded from the database at runtime — see
         loadTrackerChildren() below. */
      children: "trackers",
      icon: '<rect x="3" y="11" width="3.4" height="6" rx="1"/>' +
            '<rect x="8.3" y="7" width="3.4" height="10" rx="1"/>' +
            '<rect x="13.6" y="3" width="3.4" height="14" rx="1"/>'
    },
    {
      href: "diagrams.html",
      label: "RBAC Swimlane Viewer and Editor",
      hint: "Draw and edit process flow diagrams",
      alsoActiveOn: ["swimlane-editor.html"],
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

    /* ---- child submenu (the list of trackers) ----
       Hidden entirely while collapsed: 48px is too narrow to tell a
       child apart from a parent, so the rail stays one flat icon list. */
    '.ws-sub{list-style:none;margin:0;padding:0;display:none}',
    '#ws-nav.ws-open .ws-sub{display:block}',
    '.ws-child{display:flex;align-items:center;gap:9px;min-height:34px;',
      'padding:6px 14px 6px 30px;color:#a9a3d0;text-decoration:none;',
      'font-size:11.5px;line-height:1.3;position:relative;',
      'transition:background .13s,color .13s}',
    '.ws-child::before{content:"";position:absolute;left:22px;top:0;bottom:0;',
      'width:1px;background:rgba(255,255,255,.13)}',
    '.ws-child:hover{background:rgba(255,255,255,.07);color:#fff}',
    '.ws-child:focus-visible{outline:2px solid #AFA9EC;outline-offset:-2px}',
    '.ws-child.ws-active{color:#fff;background:rgba(175,169,236,.13)}',
    '.ws-child.ws-active::before{background:#AFA9EC;width:2px}',
    '.ws-child .ws-dot{flex:none;width:5px;height:5px;border-radius:50%;',
      'background:currentColor;opacity:.55}',
    '.ws-child span.t{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',

    /* the "+ New tracker" row at the end of the children */
    '.ws-add{all:unset;box-sizing:border-box;display:flex;align-items:center;gap:9px;',
      'min-height:34px;padding:6px 14px 6px 30px;cursor:pointer;color:#8d87b8;',
      'font-size:11.5px;position:relative;width:100%;',
      'transition:background .13s,color .13s}',
    '.ws-add::before{content:"";position:absolute;left:22px;top:0;bottom:0;',
      'width:1px;background:rgba(255,255,255,.13)}',
    '.ws-add:hover{background:rgba(255,255,255,.09);color:#fff}',
    '.ws-add:focus-visible{outline:2px solid #AFA9EC;outline-offset:-2px}',
    '.ws-add .ws-plus{flex:none;width:14px;height:14px;border-radius:50%;',
      'border:1px solid currentColor;display:flex;align-items:center;',
      'justify-content:center;font-size:11px;line-height:1}',
    '.ws-sub .ws-empty{padding:6px 14px 6px 30px;font-size:11px;color:#7d77a8;',
      'position:relative}',
    '.ws-sub .ws-empty::before{content:"";position:absolute;left:22px;top:0;bottom:0;',
      'width:1px;background:rgba(255,255,255,.13)}',

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

    /* feedback — same row shape as sign out, sitting just above it, so
       the rail stays one tidy column of icons when collapsed */
    '#ws-feedback{all:unset;box-sizing:border-box;display:flex;align-items:center;',
      'gap:12px;min-height:44px;padding:9px 15px;cursor:pointer;color:#cfcbe8;',
      'flex-shrink:0;border-top:1px solid rgba(255,255,255,.1);',
      'transition:background .13s,color .13s}',
    '#ws-feedback:hover{background:rgba(175,169,236,.2);color:#fff}',
    '#ws-feedback:focus-visible{outline:2px solid #AFA9EC;outline-offset:-2px}',
    '#ws-feedback[hidden]{display:none}',

    /* ---- the panel the feedback button opens ----
       Anchored beside the rail rather than over it, and it follows the
       rail outwards when the menu is expanded. */
    '#ws-fb{position:fixed;left:calc(var(--ws-rail) + 12px);bottom:16px;z-index:9001;',
      'width:360px;max-width:calc(100vw - var(--ws-rail) - 24px);',
      'max-height:calc(100vh - 32px);background:#fff;color:#0F172A;',
      'border:1px solid #CBD5E1;border-radius:14px;',
      'box-shadow:0 20px 50px rgba(15,31,61,.25);display:none;',
      'flex-direction:column;overflow:hidden;transition:left .18s ease;',
      'font-family:"DM Sans",Inter,system-ui,-apple-system,"Segoe UI",sans-serif}',
    '#ws-nav.ws-open ~ #ws-fb{left:calc(var(--ws-open) + 12px);',
      'max-width:calc(100vw - var(--ws-open) - 24px)}',
    '#ws-fb.ws-fb-on{display:flex}',
    '.ws-fb-head{display:flex;align-items:center;justify-content:space-between;',
      'padding:14px 18px;border-bottom:1px solid #E2E8F0}',
    '.ws-fb-head b{font-size:15px;font-weight:700}',
    '#ws-fb-close{all:unset;cursor:pointer;font-size:20px;line-height:1;color:#94A3B8}',
    '#ws-fb-close:hover{color:#0F172A}',
    '.ws-fb-tabs{display:flex;border-bottom:1px solid #E2E8F0}',
    '.ws-fb-tab{all:unset;box-sizing:border-box;flex:1;text-align:center;padding:10px;',
      'font-size:13px;font-weight:600;color:#64748B;cursor:pointer;',
      'border-bottom:2px solid transparent}',
    '.ws-fb-tab.on{color:#6366F1;border-bottom-color:#6366F1}',
    '.ws-fb-body{flex:1;overflow-y:auto;padding:16px 18px;font-size:13px}',
    '.ws-fb-body p{margin:0 0 6px}',
    '.ws-fb-hint{font-size:11px;color:#64748B;margin-bottom:12px!important}',
    '#ws-fb-scores{display:flex;gap:3px;flex-wrap:wrap;margin-bottom:12px}',
    '#ws-fb-scores button{all:unset;box-sizing:border-box;flex:1;min-width:26px;',
      'text-align:center;padding:8px 0;border-radius:5px;font-size:12px;',
      'font-weight:700;cursor:pointer;border:2px solid transparent}',
    '.ws-fb-body textarea{width:100%;box-sizing:border-box;padding:8px 10px;',
      'border:1px solid #CBD5E1;border-radius:6px;font-size:12px;',
      'font-family:inherit;resize:vertical;margin-bottom:10px}',
    '.ws-fb-send{all:unset;box-sizing:border-box;padding:8px 14px;background:#6366F1;',
      'color:#fff;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer}',
    '.ws-fb-send[disabled]{opacity:.5;cursor:default}',
    '.ws-fb-row{display:flex;align-items:center;gap:10px}',
    '.ws-fb-status{font-size:11px;color:#64748B}',
    '#ws-fb-list{border-top:1px solid #F1F5F9;padding-top:10px;margin-top:12px;',
      'max-height:220px;overflow-y:auto}',
    '.ws-fb-c{padding:8px 0;border-bottom:1px solid #F1F5F9}',
    '.ws-fb-c b{display:block;font-size:12px}',
    '.ws-fb-c .m{font-size:12px;color:#334155;margin:3px 0;white-space:pre-wrap}',
    '.ws-fb-c .d{font-size:10px;color:#94A3B8}',
    '.ws-fb-none{font-size:11px;color:#94A3B8}',

    /* On narrow screens the panel spans the page rather than hanging
       off the side of it. */
    '@media (max-width:640px){',
      '#ws-fb,#ws-nav.ws-open ~ #ws-fb{left:calc(var(--ws-rail) + 8px);',
        'right:8px;width:auto;max-width:none}',
    '}',

    /* On narrow screens the expanded panel floats over the page
       instead of squeezing it. */
    '@media (max-width:640px){',
      '#ws-nav.ws-open{box-shadow:0 0 0 100vmax rgba(0,0,0,.45)}',
    '}',

    '@media (prefers-reduced-motion:reduce){',
      '#ws-nav,#ws-title,.ws-lbl,#ws-foot,#ws-fb{transition:none}',
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
    /* A parent stays highlighted while you are on one of its inner
       pages — otherwise opening a tracker would leave nothing lit. */
    var active = it.href === here ||
                 (it.alsoActiveOn || []).indexOf(here) !== -1;

    return '<li>' +
      '<a class="ws-item' + (active ? ' ws-active' : '') + '" href="' + it.href + '"' +
        ' title="' + it.label + ' — ' + it.hint + '"' +
        (active ? ' aria-current="page"' : '') + '>' +
        '<span class="ws-ico">' +
          '<svg viewBox="0 0 20 20" aria-hidden="true">' + it.icon + '</svg>' +
        '</span>' +
        '<span class="ws-lbl">' + it.label + '</span>' +
      '</a>' +
      (it.children
        ? '<ul class="ws-sub" id="ws-sub-' + it.children + '"></ul>'
        : '') +
      '</li>';
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
    '<button id="ws-feedback" type="button" hidden ' +
            'title="Feedback — rate this and leave a comment" aria-expanded="false">' +
      '<span class="ws-ico">' +
        '<svg viewBox="0 0 20 20" aria-hidden="true">' +
          '<path d="M4 3.5h12a1.5 1.5 0 011.5 1.5v7a1.5 1.5 0 01-1.5 1.5H8.6L5 17v-3.5H4A1.5 1.5 0 012.5 12V5A1.5 1.5 0 014 3.5z"/>' +
        '</svg>' +
      '</span>' +
      '<span class="ws-lbl">Feedback</span>' +
    '</button>' +
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


  /* ---- tracker submenu -----------------------------------------
     Lists your trackers underneath "Project Progress Tracker", with a
     row at the end to create another.

     Same rules as sign-out: reuse the page's own Supabase client, stay
     silent on pages that have none, and never let a failure here break
     the menu itself — navigation matters more than the sub-list.     */
  function escText(s) {
    return String(s == null ? "" : s)
      .replace(/[&<>"']/g, function (m) {
        return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m];
      });
  }

  /* ---- feedback -------------------------------------------------
     The same "rate us / comments" panel the tracker has in its corner,
     but reachable from the sidebar, so feedback can be given from any
     page rather than only from inside a tracker.

     The tracker keeps its own floating button as well: two buttons,
     two panels, one pair of tables behind them. Everything here is
     prefixed ws-fb- so the two can never collide.

     Same rules as sign-out: reuse the page's Supabase client, and stay
     hidden on pages that have none (the swimlane editor), because both
     tables are per-account and there is nobody to attribute a rating
     to without a session.                                            */
  (function initFeedback() {
    var btn = document.getElementById("ws-feedback");
    if (!btn) return;

    var panel = document.createElement("div");
    panel.id = "ws-fb";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Share your thoughts");
    panel.innerHTML =
      '<div class="ws-fb-head">' +
        '<b>Share your thoughts</b>' +
        '<button id="ws-fb-close" type="button" aria-label="Close">&times;</button>' +
      '</div>' +
      '<div class="ws-fb-tabs">' +
        '<button class="ws-fb-tab on" type="button" id="ws-fb-t-nps">Rate us</button>' +
        '<button class="ws-fb-tab" type="button" id="ws-fb-t-com">Comments</button>' +
      '</div>' +
      '<div class="ws-fb-body">' +
        '<div id="ws-fb-p-nps">' +
          '<p><b>How likely are you to recommend this?</b></p>' +
          '<p class="ws-fb-hint">0 = not at all &middot; 10 = extremely likely</p>' +
          '<div id="ws-fb-scores"></div>' +
          '<textarea id="ws-fb-why" rows="2" placeholder="Optional: tell us why"></textarea>' +
          '<div class="ws-fb-row">' +
            '<button class="ws-fb-send" type="button" id="ws-fb-send-nps" disabled>' +
              'Submit rating</button>' +
            '<span class="ws-fb-status" id="ws-fb-nps-status"></span>' +
          '</div>' +
        '</div>' +
        '<div id="ws-fb-p-com" style="display:none">' +
          '<p class="ws-fb-hint" id="ws-fb-as">Posting as your signed-in account</p>' +
          '<textarea id="ws-fb-msg" rows="3" placeholder="Your comment..."></textarea>' +
          '<div class="ws-fb-row">' +
            '<button class="ws-fb-send" type="button" id="ws-fb-send-com">' +
              'Post comment</button>' +
            '<span class="ws-fb-status" id="ws-fb-com-status"></span>' +
          '</div>' +
          '<div id="ws-fb-list"><p class="ws-fb-none">Loading&hellip;</p></div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(panel);

    var closeBtn = document.getElementById("ws-fb-close");
    var tabNps   = document.getElementById("ws-fb-t-nps");
    var tabCom   = document.getElementById("ws-fb-t-com");
    var paneNps  = document.getElementById("ws-fb-p-nps");
    var paneCom  = document.getElementById("ws-fb-p-com");
    var scoresEl = document.getElementById("ws-fb-scores");
    var whyEl    = document.getElementById("ws-fb-why");
    var sendNps  = document.getElementById("ws-fb-send-nps");
    var npsStat  = document.getElementById("ws-fb-nps-status");
    var asEl     = document.getElementById("ws-fb-as");
    var msgEl    = document.getElementById("ws-fb-msg");
    var sendCom  = document.getElementById("ws-fb-send-com");
    var comStat  = document.getElementById("ws-fb-com-status");
    var listEl   = document.getElementById("ws-fb-list");

    var client = null;      // the page's Supabase client, once found
    var user   = null;      // who is signed in
    var score  = null;      // the rating currently picked
    var loaded = false;     // comments fetched at least once

    function show(on) {
      panel.classList.toggle("ws-fb-on", on);
      btn.setAttribute("aria-expanded", on ? "true" : "false");
    }
    function isOpen() { return panel.classList.contains("ws-fb-on"); }

    btn.addEventListener("click", function () { show(!isOpen()); });
    closeBtn.addEventListener("click", function () { show(false); });

    /* Escape closes the panel before it closes the menu, so one press
       undoes one thing. */
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && isOpen()) {
        e.stopPropagation();
        show(false);
        btn.focus();
      }
    }, true);

    /* ---- tabs ---- */
    function tab(which) {
      var nps = which === "nps";
      tabNps.classList.toggle("on", nps);
      tabCom.classList.toggle("on", !nps);
      paneNps.style.display = nps ? "block" : "none";
      paneCom.style.display = nps ? "none" : "block";
      if (!nps && !loaded) { loaded = true; loadComments(); }
    }
    tabNps.addEventListener("click", function () { tab("nps"); });
    tabCom.addEventListener("click", function () { tab("com"); });

    /* ---- the 0-10 scale ---- */
    for (var i = 0; i <= 10; i++) {
      (function (n) {
        var b = document.createElement("button");
        b.type = "button";
        b.textContent = n;
        var bg = "#FEE2E2", fg = "#7F1D1D";
        if (n >= 7 && n <= 8) { bg = "#FEF3C7"; fg = "#78350F"; }
        if (n >= 9) { bg = "#D1FAE5"; fg = "#065F46"; }
        b.style.background = bg;
        b.style.color = fg;
        b.addEventListener("click", function () {
          score = n;
          Array.prototype.forEach.call(scoresEl.children, function (o) {
            o.style.borderColor = "transparent";
          });
          b.style.borderColor = "#0F172A";
          sendNps.disabled = false;
          npsStat.textContent = "";
        });
        scoresEl.appendChild(b);
      })(i);
    }

    function clearScore() {
      score = null;
      sendNps.disabled = true;
      Array.prototype.forEach.call(scoresEl.children, function (o) {
        o.style.borderColor = "transparent";
      });
    }

    sendNps.addEventListener("click", function () {
      if (score === null || !client) return;
      sendNps.disabled = true;
      npsStat.style.color = "#64748B";
      npsStat.textContent = "Submitting…";

      client.from("nps_responses").insert([{
        user_id: user && user.id,
        score: score,
        comment: whyEl.value.trim() || null
      }]).then(function (res) {
        if (res.error) throw res.error;
        npsStat.style.color = "#16A34A";
        npsStat.textContent = "✅ Thank you!";
        whyEl.value = "";
        clearScore();
      }).catch(function (err) {
        npsStat.style.color = "#DC2626";
        npsStat.textContent = "Error: " + (err.message || err);
        sendNps.disabled = false;
      });
    });

    /* ---- comments ---- */
    function loadComments() {
      if (!client) return;
      if (user && user.email) asEl.textContent = "Posting as " + user.email;

      client.from("comments").select("*")
        .order("created_at", { ascending: false }).limit(20)
        .then(function (res) {
          if (res.error) throw res.error;
          var rows = res.data || [];
          if (!rows.length) {
            listEl.innerHTML =
              '<p class="ws-fb-none">You haven\'t posted any comments yet.</p>';
            return;
          }
          listEl.innerHTML = rows.map(function (c) {
            return '<div class="ws-fb-c">' +
              '<b>' + escText(c.name || "Anonymous") + '</b>' +
              '<div class="m">' + escText(c.message) + '</div>' +
              '<div class="d">' +
                escText(new Date(c.created_at).toLocaleString("en-MY")) +
              '</div></div>';
          }).join("");
        }).catch(function (err) {
          listEl.innerHTML = '<p class="ws-fb-none" style="color:#DC2626">Error: ' +
            escText(err.message || err) + '</p>';
        });
    }

    sendCom.addEventListener("click", function () {
      if (!client) return;
      var message = msgEl.value.trim();
      if (!message) {
        comStat.style.color = "#DC2626";
        comStat.textContent = "Write a comment first.";
        return;
      }
      sendCom.disabled = true;
      comStat.style.color = "#64748B";
      comStat.textContent = "Posting…";

      /* The name comes from the signed-in account, not a free-text box,
         so a comment can't be posted under someone else's name. */
      client.from("comments").insert([{
        user_id: user && user.id,
        name: (user && user.email) || "Unknown",
        message: message
      }]).then(function (res) {
        if (res.error) throw res.error;
        comStat.style.color = "#16A34A";
        comStat.textContent = "✅ Posted!";
        msgEl.value = "";
        loadComments();
      }).catch(function (err) {
        comStat.style.color = "#DC2626";
        comStat.textContent = "Error: " + (err.message || err);
      }).then(function () { sendCom.disabled = false; });
    });

    /* ---- only offer it to a signed-in visitor ---- */
    function wire(sb) {
      sb.auth.getSession().then(function (res) {
        var session = res && res.data && res.data.session;
        if (!session) return;                 // signed out: stay hidden
        client = sb;
        user = session.user;
        btn.hidden = false;
      }).catch(function () { /* leave hidden */ });
    }

    if (window.sb) { wire(window.sb); return; }
    var tries = 0;
    var t = setInterval(function () {
      if (window.sb) { clearInterval(t); wire(window.sb); }
      else if (++tries > 40) { clearInterval(t); }   // ~4s
    }, 100);
  })();


  (function initTrackerChildren() {
    var box = document.getElementById("ws-sub-trackers");
    if (!box) return;

    /* Which tracker is open right now, so it can be highlighted. */
    var openId = null;
    try { openId = new URLSearchParams(location.search).get("id"); } catch (e) {}

    function addRow() {
      return '<li><button class="ws-add" type="button" id="ws-add-tracker">' +
               '<span class="ws-plus">+</span>' +
               '<span class="t">New tracker</span>' +
             '</button></li>';
    }

    function wireAdd(sb) {
      var btn = document.getElementById("ws-add-tracker");
      if (!btn) return;
      btn.addEventListener("click", function () {
        var name = prompt("Name for the new tracker:", "New tracker");
        if (name === null) return;
        var clean = name.trim() || "New tracker";
        btn.disabled = true;
        btn.querySelector(".t").textContent = "Creating…";

        sb.from("trackers").select("position")
          .order("position", { ascending: false }).limit(1)
          .then(function (res) {
            var rows = (res && res.data) || [];
            var pos = rows.length ? rows[0].position + 1 : 0;
            return sb.from("trackers").insert([{
              name: clean, title: clean,
              subtitle: "Create your own progress tracker",
              position: pos
            }]).select().single();
          })
          .then(function (res) {
            if (res.error) throw res.error;
            /* tracker.html furnishes a brand new tracker on first open,
               so going straight there is what completes the creation. */
            window.location.href = "tracker.html?id=" +
              encodeURIComponent(res.data.id);
          })
          .catch(function (err) {
            alert("Could not create the tracker:\n\n" + (err.message || err));
            btn.disabled = false;
            btn.querySelector(".t").textContent = "New tracker";
          });
      });
    }

    function load(sb) {
      sb.auth.getSession().then(function (s) {
        if (!(s && s.data && s.data.session)) return;   // signed out: no list

        return sb.from("trackers").select("id,title,name")
          .order("position").order("created_at")
          .then(function (res) {
            if (res.error) throw res.error;
            var list = res.data || [];

            var html = list.map(function (t) {
              var label = t.title || t.name || "Untitled";
              var on = openId && t.id === openId;
              return '<li><a class="ws-child' + (on ? " ws-active" : "") + '" ' +
                     'href="tracker.html?id=' + encodeURIComponent(t.id) + '" ' +
                     'title="' + escText(label) + '">' +
                     '<span class="ws-dot"></span>' +
                     '<span class="t">' + escText(label) + '</span></a></li>';
            }).join("");

            if (!list.length) {
              html = '<li class="ws-empty">No trackers yet</li>';
            }

            box.innerHTML = html + addRow();
            wireAdd(sb);
          });
      }).catch(function (err) {
        /* Most likely cause: signed out, or offline. The parent menu
           item still works, so leave the sub-list empty and quiet. */
        console.warn("Tracker submenu unavailable:", err && err.message);
      });
    }

    if (window.sb) { load(window.sb); return; }
    var n = 0;
    var timer = setInterval(function () {
      if (window.sb) { clearInterval(timer); load(window.sb); }
      else if (++n > 40) { clearInterval(timer); }
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
