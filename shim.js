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
})();
