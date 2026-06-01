/* FieldShore v4 styleguide — toolbar toggles + color section render.
   Minimal vanilla JS for the styleguide's OWN navigation only. This is not the
   app's architecture; the Phase H build does not inherit any of this. */
(function () {
  'use strict';
  var stage = document.getElementById('stage');

  /* ---- toolbar: theme + viewport toggles ---- */
  function wire(attr, apply) {
    var btns = document.querySelectorAll('[' + attr + ']');
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        btns.forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
        b.setAttribute('aria-pressed', 'true');
        apply(b.getAttribute(attr));
      });
    });
  }
  wire('data-theme-btn', function (v) { stage.setAttribute('data-theme', v); });
  wire('data-vp-btn', function (v) { stage.setAttribute('data-viewport', v); });

  /* ---- COLOR section: single source of truth for the palette reference ----
     Values mirror tokens.css / color.md exactly; ratios are from wcag-contrast.mjs. */
  var STATUS = ['pending', 'active', 'strutset', 'cutting', 'runner', 'secured', 'returned', 'danger'];
  var LABEL = { pending: 'Pending', active: 'Active', strutset: 'Strut Set', cutting: 'Cutting',
    runner: 'Runner', secured: 'Secured', returned: 'Returned', danger: 'Danger' };

  var PALETTE = {
    light: {
      name: 'Light', tag: 'preplan, office', bg: '#F7F6F3', card: '#FFFFFF', elev: '#FFFFFF',
      text: { primary: ['#1A1A1A', '16.10'], secondary: ['#5C5C5C', '6.19'], tertiary: ['#8A8A8A', '3.19 · large only'] },
      accent: ['#8C6700', '4.79'], mode: 'tint',
      status: { pending: ['#4B5563', '#F3F4F6', '6.87'], active: ['#1D4ED8', '#EFF6FF', '6.16'],
        strutset: ['#5B21B6', '#F5F3FF', '8.19'], cutting: ['#92400E', '#FEF3C7', '6.37'],
        runner: ['#9A3412', '#FFEDD5', '6.38'], secured: ['#065F46', '#ECFDF5', '7.29'],
        returned: ['#57534E', '#F5F5F4', '6.99'], danger: ['#B91C1C', '#FEF2F2', '5.91'] }
    },
    dark: {
      name: 'Dark', tag: 'incident operations · the differentiator', bg: '#1C1F23', card: '#252930', elev: '#2E333B',
      text: { primary: ['#F0EFEC', '12.70'], secondary: ['#9B9A97', '5.19'], tertiary: ['#8A8A86', '4.21'] },
      accent: ['#D4A017', '6.96'], mode: 'tint',
      status: { pending: ['#9CA3AF', '#2A2D31', '5.45'], active: ['#60A5FA', '#172033', '6.40'],
        strutset: ['#A78BFA', '#221A38', '6.06'], cutting: ['#FBBF24', '#2A2410', '9.26'],
        runner: ['#FB923C', '#2A1B0F', '7.35'], secured: ['#34D399', '#0F2620', '8.29'],
        returned: ['#A8A29E', '#26231F', '6.20'], danger: ['#F87171', '#2A1416', '6.27'] }
    },
    sunlight: {
      name: 'Sunlight', tag: 'direct sun · black-on-white · status = solid banner', bg: '#FFFFFF', card: '#FFFFFF', elev: '#FFFFFF',
      text: { primary: ['#000000', '21.0 · only text color'] },
      accent: ['#6E5000', '7.47'], mode: 'banner',
      status: { pending: ['#374151', '', '10.31'], active: ['#1D4ED8', '', '6.70'],
        strutset: ['#5B21B6', '', '8.98'], cutting: ['#92400E', '', '7.09'],
        runner: ['#9A3412', '', '7.31'], secured: ['#065F46', '', '7.68'],
        returned: ['#44403C', '', '10.27'], danger: ['#B91C1C', '', '6.47'] }
    },
    broadcast: {
      name: 'Broadcast', tag: 'TV at 8–12 ft · all ≥7:1 · left-border accent, no fill', bg: '#141618', card: '#141618', elev: '#1B1E20',
      text: { primary: ['#F4F4F4', '16.49'], secondary: ['#C0BFBC', '9.86'] },
      accent: ['#E5B53D', '9.51'], mode: 'accent',
      status: { pending: ['#9CA3AF', '', '7.14'], active: ['#60A5FA', '', '7.13'],
        strutset: ['#B9A7FC', '', '8.63'], cutting: ['#FBBF24', '', '10.87'],
        runner: ['#FB923C', '', '8.01'], secured: ['#34D399', '', '9.44'],
        returned: ['#A8A29E', '', '7.19'], danger: ['#FB8C8C', '', '7.97'] }
    }
  };

  function statusChip(mode, fg, bg) {
    if (mode === 'banner') return 'background:' + fg + ';color:#fff;border:none';
    if (mode === 'accent') return 'background:transparent;color:' + fg + ';border:none;border-left:4px solid ' + fg + ';border-radius:0;padding-left:10px';
    return 'background:' + bg + ';color:' + fg + ';border:1px solid ' + fg + '33';
  }
  function statusHex(mode, fg, bg) {
    if (mode === 'tint') return fg + ' on ' + bg;
    return fg;
  }

  function renderTheme(key) {
    var p = PALETTE[key];
    var onCard = (key === 'broadcast' || key === 'dark') ? p.text.primary[0] : '#1A1A1A';
    var sub = (key === 'broadcast') ? p.text.secondary[0] : (key === 'dark' ? p.text.secondary[0] : '#5C5C5C');

    var textRows = Object.keys(p.text).map(function (t) {
      return '<div style="display:flex;justify-content:space-between;gap:12px;align-items:baseline">' +
        '<span style="color:' + p.text[t][0] + ';font-weight:' + (t === 'primary' ? 600 : 400) + '">' +
        t[0].toUpperCase() + t.slice(1) + ' text</span>' +
        '<span style="font-family:var(--font-mono);font-size:11px;color:' + sub + '">' + p.text[t][0] + ' · ' + p.text[t][1] + '</span></div>';
    }).join('');

    var statusCells = STATUS.map(function (s) {
      var v = p.status[s];
      var chip = statusChip(p.mode, v[0], v[1]);
      var ratio = v[2];
      return '<div style="border:1px solid ' + (key === 'broadcast' ? '#ffffff1a' : (key === 'dark' ? '#ffffff14' : '#00000014')) +
        ';border-radius:8px;padding:8px;background:' + p.card + '">' +
        '<span class="sg-badge" style="' + chip + '">' + LABEL[s] + '</span>' +
        '<div style="font-family:var(--font-mono);font-size:10px;color:' + sub + ';margin-top:6px">' + statusHex(p.mode, v[0], v[1]) + '</div>' +
        '<div style="font-size:10px;color:' + sub + '">' + ratio + ':1</div></div>';
    }).join('');

    return '<div style="background:' + p.bg + ';border:1px solid #88888833;border-radius:14px;padding:18px;color:' + onCard + '">' +
      '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:14px">' +
        '<span style="font:var(--type-headline-2);color:' + onCard + '">' + p.name + '</span>' +
        '<span style="font-size:12px;color:' + sub + '">' + p.tag + '</span></div>' +
      '<div style="display:flex;gap:0;border-radius:8px;overflow:hidden;border:1px solid #88888833;margin-bottom:14px">' +
        '<div style="flex:1;background:' + p.bg + ';padding:14px 10px;font-size:10px;font-family:var(--font-mono);color:' + sub + '">bg ' + p.bg + '</div>' +
        '<div style="flex:1;background:' + p.card + ';padding:14px 10px;font-size:10px;font-family:var(--font-mono);color:' + sub + '">card ' + p.card + '</div>' +
        '<div style="flex:1;background:' + p.elev + ';padding:14px 10px;font-size:10px;font-family:var(--font-mono);color:' + sub + '">elev ' + p.elev + '</div></div>' +
      '<div style="background:' + p.card + ';border:1px solid #88888822;border-radius:8px;padding:12px 14px;margin-bottom:6px;display:grid;gap:6px">' + textRows +
        '<div style="display:flex;justify-content:space-between;gap:12px;align-items:baseline">' +
          '<span style="color:' + p.accent[0] + ';font-weight:500">Accent</span>' +
          '<span style="font-family:var(--font-mono);font-size:11px;color:' + sub + '">' + p.accent[0] + ' · ' + p.accent[1] + '</span></div></div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(132px,1fr));gap:8px;margin-top:12px">' + statusCells + '</div>' +
    '</div>';
  }

  var root = document.getElementById('color-root');
  if (root) {
    root.style.display = 'grid';
    root.style.gap = '18px';
    root.innerHTML = ['light', 'dark', 'sunlight', 'broadcast'].map(renderTheme).join('');
  }
})();
