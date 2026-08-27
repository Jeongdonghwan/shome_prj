
(() => {
  "use strict";

  const KAKAO_URL = "https://pf.kakao.com/_qUgkn";
  const QUOTE_ANCHOR = "#quote"; // v3.91 견적 버튼은 사이트 내 견적 폼으로 이동 (구글폼 대체)
  const INSTAGRAM_URL = "https://www.instagram.com/sedam.home/?hl=ko";
  const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(v, b));
  const isInteractive = (t) => t?.closest?.("a,button,input,textarea,select,label");

  try {
    const header = document.querySelector(".site-header");
    const syncHeader = () => {
      const active = window.scrollY > 18;
      document.body.classList.toggle("is-scrolled", active);
      header?.classList.toggle("is-scrolled", active);
    };
    syncHeader();
    window.addEventListener("scroll", syncHeader, { passive: true });
  } catch {}

  try {
    document.querySelectorAll("[data-kakao-link]").forEach((a) => a.setAttribute("href", KAKAO_URL));
    document.querySelectorAll("[data-instagram-link]").forEach((a) => a.setAttribute("href", INSTAGRAM_URL));
    // v3.91 견적문의 버튼 → 페이지 내 견적 폼(#quote)으로. 새 탭 속성은 제거한다.
    // 하위 서비스 페이지에도 견적 섹션이 포함돼 있으므로 항상 같은 페이지 앵커면 된다.
    document.querySelectorAll("[data-google-form-link]").forEach((a) => {
      a.setAttribute("href", QUOTE_ANCHOR);
      a.removeAttribute("target");
      a.removeAttribute("rel");
    });
  } catch {}

  try {
    const y = document.getElementById("year");
    if (y) y.textContent = String(new Date().getFullYear());
  } catch {}

  try {
    const toggle = document.querySelector(".nav-toggle");
    const menu = document.querySelector(".nav-menu");
    if (toggle && menu) {
      toggle.addEventListener("click", () => {
        const isOpen = menu.classList.toggle("is-open");
        document.body.classList.toggle("nav-open", isOpen);
        toggle.setAttribute("aria-expanded", String(isOpen));
      });
      menu.querySelectorAll("a").forEach((a) => {
        a.addEventListener("click", () => {
          menu.classList.remove("is-open");
          document.body.classList.remove("nav-open");
          toggle.setAttribute("aria-expanded", "false");
        });
      });
    }
  } catch {}


  try {
    const root = document.querySelector("[data-hero-slider]");
    if (root) {
      const track = root.querySelector("[data-hero-track]");
      const slides = Array.from(root.querySelectorAll("[data-hero-slide]"));
      const dotsWrap = root.querySelector("[data-hero-dots]");
      if (track && slides.length) {
        let idx = 0;
        let timer = null;
        const intervalMs = 5200;

        // Fade mode: no horizontal translate / no drag.
        track.style.transform = "";

        const renderDots = () => {
          if (!dotsWrap) return;
          if (dotsWrap.children.length !== slides.length) {
            dotsWrap.innerHTML = "";
            slides.forEach((_, i) => {
              const b = document.createElement("button");
              b.type = "button";
              b.className = "hero-dot";
              b.setAttribute("aria-label", `${i + 1}번째 히어로 슬라이드`);
              b.addEventListener("click", () => go(i, true));
              dotsWrap.appendChild(b);
            });
          }
          Array.from(dotsWrap.children).forEach((b, i) => b.classList.toggle("active", i === idx));
        };

        const go = (i, userAction = false) => {
          const next = (i + slides.length) % slides.length;
          if (next === idx && slides[idx].classList.contains("is-active")) {
            renderDots();
            return;
          }
          idx = next;
          track.style.transform = "";
          slides.forEach((s, si) => s.classList.toggle("is-active", si === idx));
          // v3.45 restart hero zoom animation
          const bg = slides[idx]?.querySelector(".hero-slide-bg");
          if (bg) {
            bg.style.animation = "none";
            void bg.offsetHeight;
            bg.style.animation = "";
          }
          renderDots();
          if (userAction) start();
        };

        const stop = () => {
          if (timer) clearInterval(timer);
          timer = null;
        };

        const start = () => {
          stop();
          if (!prefersReduced) timer = setInterval(() => go(idx + 1), intervalMs);
        };


        slides.forEach((s, si) => s.classList.toggle("is-active", si === 0));
        renderDots();
        start();
      }
    }
  } catch {}

  try {
    const root = document.querySelector("[data-ba2]");
    if (root) {
      const track = root.querySelector("[data-ba2-track]");
      const slides = Array.from(root.querySelectorAll("[data-ba2-slide]"));
      const dotsWrap = root.querySelector("[data-ba2-dots]");
      const prev = root.querySelector("[data-ba2-prev]");
      const next = root.querySelector("[data-ba2-next]");
      const viewport = root.querySelector("[data-ba2-viewport]") || root;

      if (track && slides.length) {
        let idx = 0;
        let autoTimer = null;
        let blockClick = false;
        const autoMs = 4000;

        const renderDots = () => {
          if (!dotsWrap) return;
          if (dotsWrap.children.length !== slides.length) {
            dotsWrap.innerHTML = "";
            slides.forEach((_, i) => {
              const b = document.createElement("button");
              b.type = "button";
              b.className = "ba2-dot";
              b.setAttribute("aria-label", `${i + 1}번째 전후 슬라이드`);
              b.addEventListener("click", () => { go(i); restartAuto(); });
              dotsWrap.appendChild(b);
            });
          }
          Array.from(dotsWrap.children).forEach((b, i) => b.classList.toggle("active", i === idx));
        };

        const go = (i) => {
          idx = (i + slides.length) % slides.length;
          track.style.transform = `translateX(${-idx * 100}%)`;
          renderDots();
        };
        const stopAuto = () => { if (autoTimer) clearInterval(autoTimer); autoTimer = null; };
        const startAuto = () => { stopAuto(); if (!prefersReduced) autoTimer = setInterval(() => go(idx + 1), autoMs); };
        const restartAuto = () => startAuto();

        prev?.addEventListener("click", () => { go(idx - 1); restartAuto(); });
        next?.addEventListener("click", () => { go(idx + 1); restartAuto(); });
        root.addEventListener("mouseenter", stopAuto);
        root.addEventListener("mouseleave", startAuto);

        root.querySelectorAll("[data-ba2-click-next]").forEach((el) => {
          el.addEventListener("click", (e) => {
            if (blockClick) {
              e.preventDefault();
              e.stopPropagation();
              blockClick = false;
              return;
            }
            go(idx + 1);
            restartAuto();
          });
        });

        let isDown = false, moved = false, startX = 0, base = 0;
        const down = (x, target) => {
          if (target?.closest?.("button")) return;
          isDown = true;
          moved = false;
          startX = x;
          base = -idx * 100;
          track.style.transition = "none";
        };
        const move = (x) => {
          if (!isDown) return;
          const dx = x - startX;
          if (Math.abs(dx) > 6) moved = true;
          track.style.transform = `translateX(${base + (dx / viewport.clientWidth) * 100}%)`;
        };
        const up = (x) => {
          if (!isDown) return;
          isDown = false;
          track.style.transition = "";
          const dx = x - startX;
          const threshold = Math.max(60, viewport.clientWidth * 0.12);
          if (moved && Math.abs(dx) > threshold) {
            blockClick = true;
            go(dx < 0 ? idx + 1 : idx - 1);
          } else go(idx);
          restartAuto();
        };

        viewport.addEventListener("pointerdown", (e) => {
          if (e.pointerType === "mouse" && e.button !== 0) return;
          down(e.clientX, e.target);
        }, { passive: true });
        viewport.addEventListener("pointermove", (e) => move(e.clientX), { passive: true });
        viewport.addEventListener("pointerup", (e) => up(e.clientX), { passive: true });
        viewport.addEventListener("pointercancel", (e) => up(e.clientX), { passive: true });

        renderDots();
        go(0);
        startAuto();
      }
    }
  } catch {}

  try {
    const gallery = document.querySelector("[data-gallery]");
    const lightbox = document.querySelector("[data-lightbox]");
    if (gallery && lightbox) {
      const titleEl = lightbox.querySelector("[data-lightbox-title]");
      const imgEl = lightbox.querySelector("[data-lightbox-img]");
      const closeEls = lightbox.querySelectorAll("[data-lightbox-close]");
      const open = (title, src) => {
        if (titleEl) titleEl.textContent = title || "포트폴리오";
        if (imgEl) imgEl.style.backgroundImage = src ? `url('${src}')` : "";
        lightbox.hidden = false;
        document.body.style.overflow = "hidden";
      };
      const close = () => {
        lightbox.hidden = true;
        document.body.style.overflow = "";
      };
      gallery.addEventListener("click", (e) => {
        const btn = e.target.closest(".gallery-item");
        if (!btn) return;
        open(btn.getAttribute("data-title") || "포트폴리오", btn.getAttribute("data-src"));
      });
      closeEls.forEach((el) => el.addEventListener("click", close));
      window.addEventListener("keydown", (e) => {
        if (!lightbox.hidden && e.key === "Escape") close();
      });
    }
  } catch {}

  try {
    document.addEventListener("click", (e) => {
      const btn = e.target.closest?.("[data-faq-q]");
      if (!btn) return;
      const item = btn.closest(".faq-item");
      const panel = item?.querySelector("[data-faq-a]");
      if (!item || !panel) return;

      const isOpen = item.getAttribute("data-open") === "true";
      document.querySelectorAll(".faq-item[data-open='true']").forEach((x) => {
        if (x === item) return;
        x.setAttribute("data-open", "false");
        x.querySelector("[data-faq-a]")?.setAttribute("hidden", "");
        x.querySelector("[data-faq-q]")?.setAttribute("aria-expanded", "false");
      });

      item.setAttribute("data-open", String(!isOpen));
      btn.setAttribute("aria-expanded", String(!isOpen));
      if (isOpen) panel.setAttribute("hidden", "");
      else panel.removeAttribute("hidden");
    });
  } catch {}

  try {
    const marquee = document.querySelector(".review-marquee");
    const track = marquee?.querySelector(".review-marquee-track");
    if (marquee && track) {
      track.classList.remove("review-track");
      const groups = Array.from(track.querySelectorAll(".review-marquee-group"));
      if (groups.length === 1) {
        const clone = groups[0].cloneNode(true);
        clone.setAttribute("aria-hidden", "true");
        track.appendChild(clone);
      }

      let x = 0;
      let paused = false;
      const getLoopWidth = () => {
        const first = track.querySelector(".review-marquee-group");
        if (!first) return Math.max(1, track.scrollWidth / 2);
        const style = window.getComputedStyle(track);
        const gap = parseFloat(style.gap || style.columnGap || "0") || 0;
        return Math.max(1, first.getBoundingClientRect().width + gap);
      };
      const move = () => {
        if (!paused && !prefersReduced) {
          const width = getLoopWidth();
          x -= window.innerWidth < 760 ? 0.45 : 0.62;
          if (Math.abs(x) >= width) x += width;
          track.style.transform = `translate3d(${x}px,0,0)`;
        }
        requestAnimationFrame(move);
      };
      marquee.addEventListener("mouseenter", () => { paused = true; });
      marquee.addEventListener("mouseleave", () => { paused = false; });
      marquee.addEventListener("touchstart", () => { paused = true; }, { passive: true });
      marquee.addEventListener("touchend", () => { paused = false; }, { passive: true });
      requestAnimationFrame(move);
    }
  } catch {}

  try {
    const selectors = [
      ".hero-copy > *",".section-head",".about-copy",".about-side",".stat",".svc-tile",
      ".ba2-card",".ba2-right",".gallery-item",".work-card",".step",".review-card",
      ".contact-cta-copy",".contact-cta-actions",".service-hero-copy > *",
      ".service-section .section-head",".service-lead",".scope-card",".feature-card",".faq-item"
    ];
    const els = selectors.flatMap((sel) => Array.from(document.querySelectorAll(sel)));
    els.forEach((el, i) => {
      if (!el.classList.contains("reveal")) el.classList.add("reveal");
      el.style.setProperty("--reveal-delay", `${Math.min((i % 8) * 45, 300)}ms`);
    });
    if (prefersReduced) {
      els.forEach((el) => el.classList.add("is-revealed"));
    } else {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-revealed");
          io.unobserve(entry.target);
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
      els.forEach((el) => io.observe(el));
    }
  } catch {}

  try {
    if (!prefersReduced) {
      const els = Array.from(document.querySelectorAll(".stat-num"));
      const animate = (el) => {
        if (el.dataset.counted === "1") return;
        const original = (el.textContent || "").trim();
        const m = original.match(/-?[\d,]+(\.\d+)?/);
        if (!m) return;
        const target = Number(m[0].replace(/,/g, ""));
        if (!Number.isFinite(target)) return;
        const prefix = original.slice(0, m.index);
        const suffix = original.slice((m.index ?? 0) + m[0].length);
        const duration = 2600;
        const start = performance.now();
        el.dataset.counted = "1";
        const fmt = (v) => `${prefix}${Math.round(v).toLocaleString("ko-KR")}${suffix}`;
        const tick = (now) => {
          const p = clamp((now - start) / duration, 0, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = fmt(target * eased);
          if (p < 1) requestAnimationFrame(tick);
          else el.textContent = fmt(target);
        };
        requestAnimationFrame(tick);
      };
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animate(entry.target);
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.35 });
      els.forEach((el) => io.observe(el));
    }
  } catch {}

  // v3.41 Footer CTA reveal motion
  try {
    const footerCta = document.querySelector(".footer-cta");
    if (footerCta) {
      const showFooterCta = () => footerCta.classList.add("is-visible");
      if (prefersReduced || !("IntersectionObserver" in window)) {
        showFooterCta();
      } else {
        const footerObserver = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            showFooterCta();
            footerObserver.unobserve(entry.target);
          });
        }, { threshold: 0.22, rootMargin: "0px 0px -8% 0px" });
        footerObserver.observe(footerCta);
      }
    }
  } catch {}

})();


// v3.60 About counter slower: numeric counters now animate over approximately 2600ms.


// v3.71 Counter duration fix: about stats animate over approximately 2600ms.


// v3.72 Mobile floating quickbar top action
(() => {
  try {
    document.querySelectorAll("[data-mobile-top]").forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    });
  } catch {}
})();


// v3.74 Mobile quickbar delegated top action
(() => {
  try {
    document.addEventListener("click", (event) => {
      const btn = event.target.closest?.("[data-mobile-top]");
      if (!btn) return;
      event.preventDefault();
      const root = document.scrollingElement || document.documentElement || document.body;
      try {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch {
        root.scrollTop = 0;
        document.body.scrollTop = 0;
      }
      setTimeout(() => {
        root.scrollTop = 0;
        document.body.scrollTop = 0;
      }, 80);
    });
  } catch {}
})();


// v3.82 Quickbar TOP refined smooth scroll (PC + Mobile)
(() => {
  try {
    const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;

    const smoothScrollToTop = () => {
      const root = document.scrollingElement || document.documentElement || document.body;
      const startY = window.scrollY || root.scrollTop || document.body.scrollTop || 0;
      const duration = 980;
      const start = performance.now();

      let lastY = startY;

      const step = (now) => {
        const p = Math.min((now - start) / duration, 1);
        const eased = easeInOutSine(p);
        const y = Math.max(0, startY * (1 - eased));

        /* sub-pixel 값을 유지해서 프레임 간 튐을 줄임 */
        window.scrollTo({ top: y, left: 0, behavior: "auto" });

        lastY = y;

        if (p < 1 && lastY > 0.5) {
          requestAnimationFrame(step);
        } else {
          window.scrollTo({ top: 0, left: 0, behavior: "auto" });
          root.scrollTop = 0;
          document.body.scrollTop = 0;
        }
      };

      requestAnimationFrame(step);
    };

    document.addEventListener("click", (event) => {
      const btn = event.target.closest?.("[data-mobile-top]");
      if (!btn) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();

      smoothScrollToTop();
    }, true);
  } catch {}
})();


// v3.91 Quote section — 장비 탭 전환 / 서비스 칩 / 견적 폼 제출
(() => {
  "use strict";

  const EQUIPMENT_INFO = {
    kirby: {
      name: "컬비 벽·천장 케어",
      desc: "벽지·천장에 쌓인 미세먼지까지 흡입하는 벽·천장 전용 청소 장비예요. 걸레가 닿지 않는 벽지 요철 사이 먼지까지 케어합니다.",
    },
    jetplus: {
      name: "제트플러스 바닥 케어",
      desc: "습식 브러시로 바닥을 세척하는 보행식 바닥 청소 장비예요. 걸레질로 지워지지 않는 바닥 눌은 때·잔여 오염까지 제거합니다.",
    },
  };

  // ── 1) 전문 장비 탭 전환 ────────────────────────────────
  try {
    const root = document.querySelector("[data-equipment]");
    if (root) {
      const tabs = root.querySelectorAll("[data-eq-tab]");
      const videos = root.querySelectorAll("[data-eq-video]");
      const icons = root.querySelectorAll("[data-eq-icon]");
      const nameEl = root.querySelector("[data-eq-name]");
      const descEl = root.querySelector("[data-eq-desc]");

      const switchTo = (key) => {
        // 탭 전환 시 재생 중이던 영상은 모두 정지
        videos.forEach((v) => {
          try { v.pause(); } catch {}
          v.hidden = v.dataset.eqVideo !== key;
        });
        tabs.forEach((t) => {
          const on = t.dataset.eqTab === key;
          t.classList.toggle("is-on", on);
          t.setAttribute("aria-pressed", on ? "true" : "false");
        });
        icons.forEach((i) => { i.hidden = i.dataset.eqIcon !== key; });

        const info = EQUIPMENT_INFO[key];
        if (info) {
          if (nameEl) nameEl.textContent = info.name;
          if (descEl) descEl.textContent = info.desc;
        }
      };

      tabs.forEach((t) => {
        t.addEventListener("click", () => switchTo(t.dataset.eqTab));
      });
    }
  } catch {}

  // ── 2) 원하는 서비스 칩 토글 ────────────────────────────
  try {
    const chipBox = document.querySelector("[data-quote-chips]");
    if (chipBox) {
      chipBox.addEventListener("click", (e) => {
        const chip = e.target.closest?.(".qf-chip");
        if (!chip || !chipBox.contains(chip)) return;
        const on = chip.classList.toggle("is-on");
        chip.setAttribute("aria-pressed", on ? "true" : "false");
      });
    }
  } catch {}

  // ── 3) 견적 폼 제출 ─────────────────────────────────────
  try {
    const form = document.getElementById("quote-form");
    const done = document.getElementById("quote-done");
    const msg = document.getElementById("qf-msg");

    const showError = (text) => {
      if (!msg) return;
      msg.textContent = text;
      msg.hidden = false;
    };

    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (msg) msg.hidden = true;

        // 선택된 칩을 hidden input에 직렬화
        // data-value가 있으면 우선 사용 (칩 안의 부연설명이 값에 섞이지 않도록)
        const picked = [...form.querySelectorAll(".qf-chip.is-on")]
          .map((c) => c.dataset.value || c.textContent.trim());
        const servicesInput = document.getElementById("qf-services");
        if (servicesInput) servicesInput.value = picked.join(", ");

        // 서버와 동일한 기준으로 미리 걸러 준다
        const name = form.querySelector("#qf-name")?.value.trim() || "";
        const phone = form.querySelector("#qf-phone")?.value.trim() || "";
        const agreed = form.querySelector('input[name="agree"]')?.checked;

        if (!name || !phone) return showError("이름과 연락처는 필수입니다.");
        if (!/^[0-9-]+$/.test(phone)) return showError("연락처는 숫자와 하이픈(-)만 입력해주세요.");
        if (!agreed) return showError("개인정보 수집·이용에 동의해주세요.");

        const btn = form.querySelector(".qf-submit");
        const label = btn ? btn.textContent : "";
        if (btn) { btn.disabled = true; btn.textContent = "전송 중..."; }

        try {
          const res = await fetch(form.action, {
            method: "POST",
            body: new FormData(form),
          });
          const data = await res.json();

          if (data.ok) {
            // 폼은 유지하고 완료 화면만 노출 — 다시 신청할 수 있어야 한다
            form.reset();
            form.querySelectorAll(".qf-chip.is-on").forEach((c) => {
              c.classList.remove("is-on");
              c.setAttribute("aria-pressed", "false");
            });
            form.hidden = true;
            if (done) done.hidden = false;
            done?.scrollIntoView({ behavior: "smooth", block: "center" });
          } else {
            showError(data.error || "접수에 실패했습니다. 잠시 후 다시 시도해주세요.");
          }
        } catch {
          showError("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
        } finally {
          if (btn) { btn.disabled = false; btn.textContent = label; }
        }
      });
    }

    document.addEventListener("click", (e) => {
      if (!e.target.closest?.("[data-quote-again]")) return;
      if (done) done.hidden = true;
      if (form) form.hidden = false;
    });
  } catch {}
})();
