/* ------------------------------------------------------------------
   anyvm.org -- shared behaviour.

   Progressive enhancement only: every page is fully readable and
   navigable with this file blocked. No dependencies, pure ASCII.
   ------------------------------------------------------------------ */

(function () {
  "use strict";

  /* ---- Copy buttons on code blocks -------------------------------- */

  function addCopyButtons() {
    var blocks = document.querySelectorAll(".code");

    Array.prototype.forEach.call(blocks, function (block) {
      var pre = block.querySelector("pre");
      if (!pre || block.querySelector(".copy")) { return; }

      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "copy";
      btn.textContent = "copy";
      btn.setAttribute("aria-label", "Copy code to clipboard");

      btn.addEventListener("click", function () {
        // Comment lines are context, not something you want to paste.
        var text = pre.innerText
          .split("\n")
          .filter(function (line) { return line.trim().indexOf("#") !== 0; })
          .join("\n")
          .trim();

        copy(text, function (ok) {
          btn.textContent = ok ? "copied" : "failed";
          btn.classList.toggle("done", ok);
          setTimeout(function () {
            btn.textContent = "copy";
            btn.classList.remove("done");
          }, 1600);
        });
      });

      block.appendChild(btn);
    });
  }

  function copy(text, done) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(
        function () { done(true); },
        function () { done(fallbackCopy(text)); }
      );
      return;
    }
    done(fallbackCopy(text));
  }

  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();

    var ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }

  /* ---- Tab groups -------------------------------------------------- */

  function wireTabs() {
    var groups = document.querySelectorAll("[data-tabs]");

    Array.prototype.forEach.call(groups, function (group) {
      var tabs = group.querySelectorAll(".tab");

      function select(index) {
        Array.prototype.forEach.call(tabs, function (tab, i) {
          var on = i === index;
          tab.setAttribute("aria-selected", on ? "true" : "false");
          tab.tabIndex = on ? 0 : -1;
          var panel = document.getElementById(tab.getAttribute("aria-controls"));
          if (panel) { panel.hidden = !on; }
        });
      }

      Array.prototype.forEach.call(tabs, function (tab, i) {
        tab.addEventListener("click", function () { select(i); });

        tab.addEventListener("keydown", function (ev) {
          var next = null;
          if (ev.key === "ArrowRight") { next = (i + 1) % tabs.length; }
          if (ev.key === "ArrowLeft") { next = (i - 1 + tabs.length) % tabs.length; }
          if (next === null) { return; }
          ev.preventDefault();
          select(next);
          tabs[next].focus();
        });
      });
    });
  }

  /* ---- Highlight the current section in the docs sidebar ----------- */

  function wireScrollSpy() {
    var links = document.querySelectorAll(".side a[href^='#']");
    if (!links.length || !("IntersectionObserver" in window)) { return; }

    var byId = {};
    var targets = [];

    Array.prototype.forEach.call(links, function (link) {
      var id = link.getAttribute("href").slice(1);
      var el = document.getElementById(id);
      if (!el) { return; }
      byId[id] = link;
      targets.push(el);
    });

    if (!targets.length) { return; }

    var visible = {};

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        visible[entry.target.id] = entry.isIntersecting;
      });

      for (var i = 0; i < targets.length; i++) {
        if (visible[targets[i].id]) {
          Array.prototype.forEach.call(links, function (l) {
            l.classList.remove("on");
          });
          byId[targets[i].id].classList.add("on");
          return;
        }
      }
    }, { rootMargin: "-76px 0px -70% 0px" });

    targets.forEach(function (el) { observer.observe(el); });
  }

  /* ---- The headline types itself: any guest, on any host ----------- */

  // Ordered so consecutive entries come from different lineages -- someone
  // who only watches a few cycles still sees the range, not four BSDs.
  var GUESTS = [
    "FreeBSD", "Solaris", "Plan 9", "Ubuntu", "OpenBSD", "HaikuOS",
    "OmniOS", "OpenEuler", "NetBSD", "GNU Hurd", "Tribblix", "ReactOS",
    "BlissOS", "DragonFlyBSD", "OpenIndiana", "MidnightBSD", "GhostBSD",
    "NextBSD"
  ];
  // Canonical spellings only. The aliases (arm64, amd64, ppc64le) belong in
  // the background field, not in a headline that states what is supported.
  var ARCHES = [
    "aarch64", "x86_64", "riscv64", "sparc64", "i386", "s390x", "powerpc64",
    "loongarch64"
  ];
  var HOSTS = ["Linux", "macOS", "Windows", "WSL2"];
  // The hardware accelerators AnyVM picks up on its own, one per host family.
  var ACCEL = ["KVM", "HVF", "WHPX"];

  // Drawn once per page load. A fresh reload gets a fresh scatter; every
  // re-solve within the same load -- resize, orientation change, late reflow
  // -- reuses it, so a given width always lands on the same arrangement
  // rather than reshuffling every time the window moves a pixel.
  var SCATTER_SEED = Math.floor(Math.random() * 0x7ffffffe) + 1;

  var TYPE_MS = 78;     // per character while typing
  var ERASE_MS = 38;    // per character while erasing -- deleting reads faster
  var HOLD_MS = 2000;   // dwell on a finished pair
  var GAP_MS = 260;     // beat between erase and type
  var CALM_MS = 4200;   // dwell under reduced motion -- long enough to read,
                        // and slow enough that the swap is not itself motion

  // Park until the tab is actually being looked at. This waits on the EVENT,
  // never on a setTimeout poll. A hidden tab has its timers throttled to once
  // a second, and once it has been hidden for five minutes Chrome coalesces
  // them to roughly once a MINUTE -- so a poll leaves the headline visibly
  // frozen for up to a minute after the reader comes back. Measured here: with
  // the old 400ms poll the typer advanced one single character in 25 seconds.
  // visibilitychange fires the instant the tab is shown, so the resume is
  // immediate however long it was away.
  function whenVisible(fn) {
    if (!document.hidden) { fn(); return; }
    document.addEventListener("visibilitychange", function once() {
      if (document.hidden) { return; }
      document.removeEventListener("visibilitychange", once);
      fn();
    });
  }

  function retype(slot, done) {
    var from = slot.el.textContent;
    var to = slot.words[slot.at];
    var cut = from.length;
    var grown = 0;

    function erase() {
      if (document.hidden) { whenVisible(erase); return; }
      cut--;
      slot.el.textContent = from.slice(0, cut > 0 ? cut : 0);
      if (cut <= 0) { setTimeout(type, GAP_MS); return; }
      setTimeout(erase, ERASE_MS);
    }

    function type() {
      if (document.hidden) { whenVisible(type); return; }
      grown++;
      slot.el.textContent = to.slice(0, grown);
      if (grown >= to.length) { done(); return; }
      setTimeout(type, TYPE_MS);
    }

    erase();
  }

  function wireTyper() {
    var fields = [].slice.call(document.querySelectorAll(".hero h1 .typed"));
    if (!fields.length) { return; }

    // Reduced motion keeps the rotation and drops the motion, rather than
    // switching the headline off. The words ARE the claim -- that this runs
    // more than FreeBSD on aarch64 -- and a reader who asked for less movement
    // should still get to read it. What goes is the per-character typing and
    // the 1Hz caret, which are the actual motion; the caret is also the only
    // thing on the page that flashes. Whole words then swap in place, slowly.
    //
    // Worth knowing when testing: Windows 11 turns this preference ON in
    // several power and accessibility modes, so plenty of readers land here.
    var calm = !!(window.matchMedia &&
                  window.matchMedia("(prefers-reduced-motion: reduce)").matches);

    var lists = { guest: GUESTS, arch: ARCHES, host: HOSTS, accel: ACCEL };

    // Each line runs its own loop and never waits on the others. The starts
    // are staggered AND every line gets a different dwell, so the four cycle
    // lengths stay mutually prime-ish and the lines drift apart instead of
    // locking into one rhythm -- four slots typing in unison would read as a
    // single block animation rather than four independent terminals.
    fields.forEach(function (el, i) {
      var slot = {
        el: el,
        typer: el.parentNode,
        words: lists[el.getAttribute("data-slot")] || GUESTS,
        at: 0
      };

      // Marks the slot as JS-driven: that is what reveals its caret. Left off
      // with no JS at all, and off under reduced motion -- a blinking cursor
      // beside a word that is not being typed would be claiming something
      // untrue about what the page is doing.
      if (!calm) { slot.typer.classList.add("active"); }

      var dwell = calm ? CALM_MS + i * 700 : HOLD_MS + i * 320;

      function loop() {
        // whenVisible for both paths: a background tab should not be quietly
        // cycling words nobody can see, and the resume is instant either way.
        whenVisible(function () {
          slot.at = (slot.at + 1) % slot.words.length;
          if (calm) {
            slot.el.textContent = slot.words[slot.at];
            setTimeout(loop, dwell);
            return;
          }
          retype(slot, function () { setTimeout(loop, dwell); });
        });
      }

      // The calm path opens later and spreads wider, so the first swap does
      // not read as the page changing under the reader the moment it loads.
      setTimeout(loop, calm ? 2600 + i * 700 : 900 + i * 520);
    });
  }

  /* ---- Scatter the guest names across the hero background ---------- */

  // Solved here rather than in CSS on purpose. The foreground is a
  // fixed-width centred column while this layer spans the full bleed, so the
  // two drift apart as the viewport changes: a percentage layout that clears
  // the text at 1440px puts six names under it at 1280px. Measuring the real
  // boxes is the only way to hold "never overlaps" at every width.
  function layoutHeroNames() {
    var field = document.querySelector(".hero-names");
    var hero = document.querySelector(".hero");
    if (!field || !hero) { return; }

    var box = hero.getBoundingClientRect();
    var W = box.width;
    var H = box.height;
    if (!W || !H) { return; }

    var MARGIN = 16;             // clearance around foreground text
    var GAP_X = 14, GAP_Y = 8;   // clearance between two names
    // Floor on the shrink-to-fit fallback. Below this a name stops reading as
    // a word and turns into grain, which is worse than not being there.
    var MIN_FS = 9;

    var blockers = [];

    function block(r) {
      if (r.right - r.left <= 0 || r.bottom - r.top <= 0) { return; }
      blockers.push({ x: r.left - box.left - MARGIN, y: r.top - box.top - MARGIN,
                      r: r.right - box.left + MARGIN, b: r.bottom - box.top + MARGIN });
    }

    function union(a, b) {
      return { left: Math.min(a.left, b.left), right: Math.max(a.right, b.right),
               top: Math.min(a.top, b.top), bottom: Math.max(a.bottom, b.bottom) };
    }

    // Text: reserve where the GLYPHS actually are, not the element box. A
    // block-level heading reports the full column width even where its lines
    // fall short, which fences off the large empty region beside the text --
    // exactly the space this layer should be using. Walking to the text nodes
    // is what gets the real extents; ranging over an element that contains
    // block children just hands back the block width again.
    function glyphRects(el) {
      if (!el) { return; }
      var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
      var node, rects, k;
      while ((node = walker.nextNode())) {
        if (!node.nodeValue || !node.nodeValue.trim()) { continue; }
        var range = document.createRange();
        range.selectNodeContents(node);
        rects = range.getClientRects();
        for (k = 0; k < rects.length; k++) { block(rects[k]); }
      }
    }

    [".eyebrow", ".hero-foot"].forEach(function (sel) {
      glyphRects(document.querySelector(sel));
    });

    // Headline: reserve each line from the lead word to the end of its slot,
    // as one rectangle. Glyph boxes alone leave the gap between "on" and its
    // slot open, and a name landing in that gap sits inside the headline even
    // though it technically touches no letter. The slot is reserved in full
    // because it paints a rule across its whole width, not just under the
    // word currently in it. Everything to the RIGHT of the slot stays free.
    [].slice.call(document.querySelectorAll(".hero h1 .line")).forEach(function (line) {
      var lead = line.querySelector(".lead");
      var slot = line.querySelector(".typer");
      if (lead && slot) {
        block(union(lead.getBoundingClientRect(), slot.getBoundingClientRect()));
      } else {
        glyphRects(line);
      }
    });

    // Things that paint their own surface: reserve the whole element.
    [".hero-cmd", ".cov"].forEach(function (sel) {
      var el = document.querySelector(sel);
      if (el) { block(el.getBoundingClientRect()); }
    });

    // The buttons themselves, not the full-width row that lays them out.
    [].slice.call(document.querySelectorAll(".cta .btn")).forEach(function (el) {
      block(el.getBoundingClientRect());
    });

    var spans = [].slice.call(field.children);

    // Reset first: a name dropped on the previous pass has to be able to come
    // back when the viewport grows again, at its authored size.
    spans.forEach(function (el) {
      el.style.display = "";
      el.style.fontSize = "";
      el.style.left = "";
      el.style.top = "-9999px";
    });

    var items = spans.map(function (el) {
      var r = el.getBoundingClientRect();
      return { el: el, w: r.width, h: r.height,
               fs: parseFloat(window.getComputedStyle(el).fontSize) };
    });

    // Re-seeded from the per-load value on every solve, so the sequence is
    // reproducible within this page load: same width in, same scatter out.
    var seed = SCATTER_SEED;
    function rnd() {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    }

    function clash(a, b) {
      return a.x < b.r && a.r > b.x && a.y < b.b && a.b > b.y;
    }

    var placed = [];

    // Biggest first: they are hardest to fit, and a big name left till last
    // has nowhere to go once the small ones have taken the gaps.
    items.slice()
      .sort(function (a, b) { return (b.w * b.h) - (a.w * a.h); })
      .forEach(function (item) {
        var scale = 1;
        var put = null;
        var attempt, k, q;

        for (attempt = 0; attempt < 5 && !put; attempt++) {
          if (item.fs * scale < MIN_FS) { break; }

          var w = item.w * scale;
          var h = item.h * scale;

          if (w > W - 8 || h > H - 8) { scale *= 0.8; continue; }

          var best = null;

          for (k = 0; k < 320; k++) {
            var x = rnd() * (W - w - 8) + 4;
            var y = rnd() * (H - h - 8) + 4;
            var cand = { x: x, y: y, r: x + w, b: y + h };

            if (blockers.some(function (f) { return clash(cand, f); })) { continue; }

            var crowded = false;
            for (q = 0; q < placed.length; q++) {
              var o = placed[q];
              if (clash(cand, { x: o.x - GAP_X, y: o.y - GAP_Y,
                                r: o.r + GAP_X, b: o.b + GAP_Y })) {
                crowded = true;
                break;
              }
            }
            if (crowded) { continue; }

            // Best-candidate sampling: among the legal spots take the one
            // furthest from everything already placed, so the field spreads
            // evenly instead of clumping into whichever band clears first.
            var nearest = 1e9;
            for (q = 0; q < placed.length; q++) {
              var p = placed[q];
              var dx = (cand.x + w / 2) - (p.x + p.w / 2);
              var dy = (cand.y + h / 2) - (p.y + p.h / 2);
              var d = Math.sqrt(dx * dx + dy * dy);
              if (d < nearest) { nearest = d; }
            }

            if (!best || nearest > best.near) {
              best = { box: cand, near: nearest, w: w, h: h };
            }
          }

          if (best) { put = best; } else { scale *= 0.8; }
        }

        if (!put) {
          // No room at any size on this viewport. Drop it rather than print
          // it over the headline.
          item.el.style.display = "none";
          return;
        }

        item.el.style.left = ((put.box.x / W) * 100).toFixed(2) + "%";
        item.el.style.top = ((put.box.y / H) * 100).toFixed(2) + "%";
        if (scale < 0.999) {
          item.el.style.fontSize = (item.fs * scale).toFixed(1) + "px";
        }

        placed.push({ x: put.box.x, y: put.box.y, r: put.box.r, b: put.box.b,
                      w: put.w, h: put.h });
      });

    field.classList.add("ready");
  }

  /* ---- Theme switch ------------------------------------------------ */

  // The stored value is only written once the reader actually picks a side.
  // Until then no data-theme attribute exists at all and CSS keeps following
  // the system, so a machine that flips to dark in the evening takes the
  // page with it.
  var THEME_KEY = "anyvm-theme";

  function wireTheme() {
    var btn = document.querySelector(".theme-toggle");
    if (!btn) { return; }
    var root = document.documentElement;

    function effective() {
      var chosen = root.getAttribute("data-theme");
      if (chosen === "dark" || chosen === "light") { return chosen; }
      return (window.matchMedia &&
              window.matchMedia("(prefers-color-scheme: dark)").matches)
        ? "dark" : "light";
    }

    function relabel() {
      btn.setAttribute("aria-label", effective() === "dark"
        ? "Switch to light theme" : "Switch to dark theme");
    }

    relabel();

    btn.addEventListener("click", function () {
      var next = effective() === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* private mode */ }
      relabel();
    });

    if (window.matchMedia) {
      var q = window.matchMedia("(prefers-color-scheme: dark)");
      var onChange = function () { if (!root.hasAttribute("data-theme")) { relabel(); } };
      if (q.addEventListener) { q.addEventListener("change", onChange); }
      else if (q.addListener) { q.addListener(onChange); }
    }
  }

  /* ---- Language switch --------------------------------------------- */

  // Same three-state contract as the theme: nothing stored means "follow the
  // browser", and a stored value means the reader has decided.
  var LANG_KEY = "anyvm-lang";

  function wireLang() {
    var btn = document.querySelector(".lang-toggle");
    if (!btn) { return; }
    var root = document.documentElement;

    function effective() {
      return root.getAttribute("data-lang") === "zh" ? "zh" : "en";
    }

    function relabel() {
      var zh = effective() === "zh";
      // The label names the destination, not the current state. Escaped
      // rather than written literally: HTML content may carry Chinese, but
      // this file is code and stays pure 7-bit ASCII.
      btn.setAttribute("aria-label", zh
        ? "Switch to English"
        : "\u5207\u6362\u5230\u4e2d\u6587");
      // Keep the document language honest for screen readers and hyphenation.
      root.setAttribute("lang", zh ? "zh-Hans" : "en");
    }

    relabel();

    btn.addEventListener("click", function () {
      var next = effective() === "zh" ? "en" : "zh";
      if (next === "zh") { root.setAttribute("data-lang", "zh"); }
      else { root.removeAttribute("data-lang"); }
      try { localStorage.setItem(LANG_KEY, next); } catch (e) { /* private mode */ }
      relabel();
      // Hero geometry changes with the copy, so the scatter has to be resolved
      // again or names end up sitting on top of the new text.
      layoutHeroNames();
    });
  }

  /* ---- Go ---------------------------------------------------------- */

  // Each feature is independent, so one failing must not take the others with
  // it. This was not hypothetical: a null passed to ResizeObserver.observe()
  // threw partway down the old straight-line init() and silently killed
  // everything after it on five of the six pages. A bare chain also puts the
  // most visible feature -- the typing headline, called last -- first in line
  // to disappear whenever anything above it breaks.
  function step(name, fn) {
    try {
      fn();
    } catch (e) {
      // Log rather than swallow: a feature that quietly stops working is the
      // failure mode this wrapper exists to make loud.
      if (window.console && console.error) {
        console.error("anyvm: " + name + " failed to initialise", e);
      }
    }
  }

  function init() {
    step("lang", wireLang);
    step("theme", wireTheme);
    step("copy buttons", addCopyButtons);
    step("tabs", wireTabs);
    step("scroll spy", wireScrollSpy);
    step("hero names", layoutHeroNames);
    step("typer", wireTyper);

    var resizeTimer = null;
    function resolveLater() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(layoutHeroNames, 180);
    }

    // Watch the hero itself, not the window. The hero can change size without
    // a resize event ever firing -- a phone hiding its address bar, a late
    // reflow, the headline settling -- and a stale layout means names sitting
    // on top of the text. Placed names are absolutely positioned, so they
    // cannot feed their own size back in and loop.
    //
    // Only the landing page has a hero. Without the null check, observe()
    // throws on the docs pages and on 404, which kills the rest of init()
    // -- including the load handler below.
    var hero = document.querySelector(".hero");
    if (window.ResizeObserver && hero) {
      new ResizeObserver(resolveLater).observe(hero);
    } else if (hero) {
      window.addEventListener("resize", resolveLater);
    }

    window.addEventListener("load", function () {
      step("hero names (load)", layoutHeroNames);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
}());
