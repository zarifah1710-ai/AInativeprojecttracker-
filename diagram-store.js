/* ============================================================
   diagram-store.js — where swimlane diagrams are kept
   ============================================================

   Included by BOTH diagrams.html and swimlane-editor.html, so the
   storage rules are written once. Add it with:

       <script src="diagram-store.js"></script>

   (no defer — the editor reads from it during start-up).

   WHERE THE DATA LIVES
   Browser localStorage, not Supabase. That means diagrams stay on
   this machine, in this browser: they will not appear on your phone,
   and clearing site data deletes them. Export SVG is how a diagram
   leaves the machine. Moving this to Supabase later means changing
   only this file plus adding an auth guard to the editor.

   THE SHAPE
     rbac_sw_index      a list: [{ id, name, updated }, ...]
     rbac_sw_doc_<id>   one diagram set: { MD, MOD_NAMES }

   The editor originally kept a single unnamed set under "rbac_sw_v2".
   migrateLegacy() below lifts that into the list on first run so
   nothing drawn before this change is lost. The old key is left in
   place, untouched, as a safety net.
   ============================================================ */

window.DiagramStore = (function () {
  "use strict";

  var INDEX_KEY  = "rbac_sw_index";
  var DOC_PREFIX = "rbac_sw_doc_";
  var LEGACY_KEY = "rbac_sw_v2";
  var MIGRATED   = "rbac_sw_migrated";

  function newId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "d" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function readIndex() {
    try {
      var raw = localStorage.getItem(INDEX_KEY);
      var list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) { return []; }
  }

  function writeIndex(list) {
    try { localStorage.setItem(INDEX_KEY, JSON.stringify(list)); return true; }
    catch (e) { return false; }
  }

  /* Lift the old single-diagram save into the list. Runs at most once —
     after that a marker key stops it, so a diagram the user has since
     deleted does not keep coming back from the dead. */
  function migrateLegacy() {
    if (localStorage.getItem(MIGRATED)) return;

    var legacy = null;
    try { legacy = localStorage.getItem(LEGACY_KEY); } catch (e) {}

    if (legacy) {
      try {
        var parsed = JSON.parse(legacy);
        if (parsed && parsed.MD) {
          var id = newId();
          localStorage.setItem(DOC_PREFIX + id, legacy);
          var list = readIndex();
          list.unshift({ id: id, name: "My swimlanes", updated: Date.now() });
          writeIndex(list);
        }
      } catch (e) { /* unreadable: leave it alone rather than guess */ }
    }

    try { localStorage.setItem(MIGRATED, "1"); } catch (e) {}
  }

  migrateLegacy();

  return {
    /* Newest first. */
    list: function () {
      return readIndex().slice().sort(function (a, b) {
        return (b.updated || 0) - (a.updated || 0);
      });
    },

    get: function (id) {
      try {
        var raw = localStorage.getItem(DOC_PREFIX + id);
        return raw ? JSON.parse(raw) : null;
      } catch (e) { return null; }
    },

    /* Returns true on success. localStorage throws when full, and the
       caller needs to know rather than silently lose the drawing. */
    save: function (id, doc) {
      try {
        localStorage.setItem(DOC_PREFIX + id, JSON.stringify(doc));
      } catch (e) { return false; }

      var list = readIndex();
      var found = false;
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === id) { list[i].updated = Date.now(); found = true; break; }
      }
      if (!found) list.unshift({ id: id, name: "Untitled", updated: Date.now() });
      return writeIndex(list);
    },

    create: function (name) {
      var id = newId();
      var list = readIndex();
      list.unshift({ id: id, name: name || "Untitled", updated: Date.now() });
      writeIndex(list);
      return id;
    },

    rename: function (id, name) {
      var list = readIndex();
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === id) { list[i].name = name; break; }
      }
      return writeIndex(list);
    },

    remove: function (id) {
      try { localStorage.removeItem(DOC_PREFIX + id); } catch (e) {}
      return writeIndex(readIndex().filter(function (d) { return d.id !== id; }));
    },

    nameOf: function (id) {
      var list = readIndex();
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === id) return list[i].name;
      }
      return null;
    },

    /* Used by the editor when opened with no ?id= — keeps a plain link
       to swimlane-editor.html working instead of dead-ending. */
    ensureDefault: function () {
      var list = readIndex();
      if (list.length) return list[0].id;
      return this.create("My swimlanes");
    }
  };
})();
