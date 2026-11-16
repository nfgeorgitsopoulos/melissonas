/* ---------------------------------------------------------------
   Τοπική αποθήκευση για το δημόσιο demo.
   Μέσα στο claude.ai δεν ενεργοποιείται: εκεί υπάρχει το window.claude
   και η εφαρμογή χρησιμοποιεί τη βάση του λογαριασμού.
   Εδώ υλοποιεί το ίδιο API πάνω στο localStorage του φυλλομετρητή,
   ώστε το demo να δουλεύει αυτοτελώς.
   --------------------------------------------------------------- */
(function () {
  if (window.claude && window.claude.use) return;
  var KEY = 'melissonas-demo-v1';
  var store = null;
  try { store = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { store = null; }
  if (!store) { store = JSON.parse(JSON.stringify(window.__DEMO__ || {})); persist(); }
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  var subs = [];
  function snapCol(name) {
    var o = store[name] || {};
    return { docs: Object.keys(o).map(function (id) {
      return { id: id, exists: true, data: function () { return clone(o[id]); } }; }) };
  }
  function snapDoc(col, id) {
    var d = (store[col] || {})[id];
    return { exists: !!d, id: id, data: function () { return d ? clone(d) : null; } };
  }
  function fire(s) {
    try { s.cb(s.type === 'col' ? snapCol(s.col) : snapDoc(s.col, s.id)); } catch (e) {}
  }
  function notify(col) { subs.forEach(function (s) { if (s.col === col) fire(s); }); }
  function later(fn) { return new Promise(function (res) { setTimeout(function () { fn(); res(); }, 30); }); }
  function split(path) { var i = path.indexOf('/'); return [path.slice(0, i), path.slice(i + 1)]; }

  var db = {
    collection: function (col) {
      return { onSnapshot: function (cb, err) {
        var s = { type: 'col', col: col, cb: cb }; subs.push(s); setTimeout(function () { fire(s); }, 0);
        return function () { subs = subs.filter(function (x) { return x !== s; }); }; } };
    },
    doc: function (path) {
      var p = split(path), col = p[0], id = p[1];
      return {
        onSnapshot: function (cb, err) {
          var s = { type: 'doc', col: col, id: id, cb: cb }; subs.push(s); setTimeout(function () { fire(s); }, 0);
          return function () { subs = subs.filter(function (x) { return x !== s; }); };
        },
        set: function (data) { return later(function () {
          store[col] = store[col] || {}; store[col][id] = clone(data); persist(); notify(col); }); },
        update: function (data) { return later(function () {
          store[col] = store[col] || {}; var cur = store[col][id] || {};
          Object.keys(data).forEach(function (k) { cur[k] = clone(data[k]); });
          store[col][id] = cur; persist(); notify(col); }); },
        delete: function () { return later(function () {
          if (store[col]) delete store[col][id]; persist(); notify(col); }); }
      };
    }
  };
  var downloads = {
    save: function (o) {
      return new Promise(function (res) {
        var b = new Blob([o.data], { type: 'application/octet-stream' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(b); a.download = o.filename;
        document.body.appendChild(a); a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); res(); }, 100);
      });
    }
  };
  window.claude = { use: function (what) {
    return Promise.resolve(what === 'db' ? db : what === 'downloads' ? downloads : null); } };
  window.melissonasResetDemo = function () { localStorage.removeItem(KEY); location.reload(); };

  /* Οθόνη καλωσορίσματος: μόνο στην πρώτη επίσκεψη. */
  var SEEN = KEY + '-welcome';
  function welcome() {
    try { if (localStorage.getItem(SEEN)) return; } catch (e) { return; }
    var w = document.createElement('div');
    w.setAttribute('role', 'dialog');
    w.setAttribute('aria-modal', 'true');
    w.setAttribute('aria-labelledby', 'dw-h');
    w.style.cssText = 'position:fixed;inset:0;z-index:9999;background:var(--scrim,rgba(0,0,0,.45));display:flex;align-items:center;justify-content:center;padding:16px;overflow:auto';
    w.innerHTML =
      '<div style="background:var(--surface,#fff);color:var(--fg,#1C1B17);border-radius:18px;padding:22px;max-width:420px;width:100%;font-family:var(--f-ui,system-ui,sans-serif);box-shadow:0 18px 48px rgba(0,0,0,.28);max-height:92vh;overflow:auto">' +
        '<h2 id="dw-h" style="margin:0 0 10px;font-size:20px;line-height:1.3">Πριν ξεκινήσεις</h2>' +
        '<p style="margin:0 0 12px;font-size:15px;line-height:1.5">Αυτή είναι η δημόσια έκδοση της εφαρμογής. Αυτή τη στιγμή βλέπεις ένα <b>φανταστικό μελισσοκομείο</b>, για να περιηγηθείς ελεύθερα.</p>' +
        '<p style="margin:0 0 12px;font-size:15px;line-height:1.5">Για να την κάνεις δική σου, πάτα «Ξεκίνα καθαρά». Τα δοκιμαστικά δεδομένα σβήνονται και καταχωρίζεις τα δικά σου μελισσοκομεία και κυψέλες.</p>' +
        '<div style="background:var(--sunk,#ECEAE3);border-radius:12px;padding:12px 14px;margin:0 0 14px;font-size:14px;line-height:1.5">' +
          '<b>Πού πάνε τα δεδομένα σου</b><br>Μένουν αποθηκευμένα μόνο σε αυτόν τον φυλλομετρητή, σε αυτή τη συσκευή. Δεν τα βλέπει κανένας άλλος, ούτε ο δημιουργός της εφαρμογής. Δεν συγχρονίζονται με άλλες συσκευές και χάνονται αν καθαρίσεις τα δεδομένα περιήγησης, γι’ αυτό <b>κράτα τακτικά αντίγραφο</b>: μενού (≡) → Ρυθμίσεις &amp; αντίγραφα.' +
        '</div>' +
        '<p style="margin:0 0 16px;font-size:14px;line-height:1.5;opacity:.8">Σε κινητό: από το μενού του φυλλομετρητή διάλεξε «Προσθήκη στην αρχική οθόνη» και θα ανοίγει σαν κανονική εφαρμογή.</p>' +
        '<div style="display:grid;gap:8px">' +
          '<button id="dw-clean" style="min-height:46px;border:none;border-radius:12px;background:var(--accent,#A35F00);color:var(--on-accent,#fff);font-size:15px;font-weight:600;font-family:inherit;cursor:pointer">Ξεκίνα καθαρά</button>' +
          '<button id="dw-keep" style="min-height:46px;border:1px solid var(--line,#E4E2DA);border-radius:12px;background:var(--surface,#fff);color:inherit;font-size:15px;font-family:inherit;cursor:pointer">Περιήγηση με τα δοκιμαστικά δεδομένα</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(w);
    var close = function () { try { localStorage.setItem(SEEN, '1'); } catch (e) {} w.remove(); };
    w.querySelector('#dw-keep').onclick = close;
    w.querySelector('#dw-clean').onclick = function () {
      if (!confirm('Θα σβηστούν τα δοκιμαστικά δεδομένα και η εφαρμογή θα ξεκινήσει άδεια. Συνέχεια;')) return;
      try { localStorage.setItem(KEY, '{}'); localStorage.setItem(SEEN, '1'); } catch (e) {}
      location.reload();
    };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', welcome);
  else welcome();
})();
