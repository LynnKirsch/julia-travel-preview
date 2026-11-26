// Uses the same data-reveal states and IntersectionObserver approach as concept 04.
(() => {
  const motion = matchMedia('(prefers-reduced-motion: no-preference)');
  if (!('IntersectionObserver' in window) || !motion.matches) return;
  const textAndControls = ':is(h1,h2,h3,p,li,a,button,input,strong,summary,time,.media-badge,.lagoon-reading-time,.lagoon-offers-number)';
  const selector = `:is(main,.lagoon-footer,.preview-toolbar) ${textAndControls}, .hero [data-reveal], .preview-toolbar > span`;
  const elements = [...document.querySelectorAll(selector)].filter(element => {
    if (element.closest('.hero')) return element.hasAttribute('data-reveal');
    if (element.matches('li') && element.querySelector('a,button,h3')) return false;
    if (element.parentElement.closest('h1,h2,h3,p,a,button,summary,strong,time')) return false;
    return element.textContent.trim() || element.matches('button,input');
  });
  const groups = 'article,details,.lagoon-review-card,.lagoon-faq-intro,.lagoon-footer-intro,.lagoon-footer-brand,.lagoon-footer-nav,.lagoon-footer-contacts,.lagoon-reviews-controls,.section-action,.lagoon-materials-actions,form,.header-inner,header,section';
  const rows = '.offers-cards,.destination-cards,.mini,.lagoon-materials-grid,.lagoon-blog-grid,.lagoon-reviews-track,.lagoon-faq-questions,.lagoon-footer-content,.phu-planning-grid,.phu-routes-grid';
  const counts = new Map();
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.dataset.revealState = 'shown';
      observer.unobserve(entry.target);
    }
  });
  const revealFocused = element => {
    const target = element.closest('[data-reveal-state]');
    if (!target) return;
    delete target.dataset.revealState;
    observer.unobserve(target);
  };
  elements.forEach(element => {
    if (!element.closest('.hero')) {
      const group = element.closest(groups) || element.parentElement;
      const index = counts.get(group) || 0;
      const position = group.parentElement.matches(rows)
        ? [...group.parentElement.children].indexOf(group)
        : 0;
      const offset = group.matches('article,details,.lagoon-review-card,.lagoon-reviews-controls,.section-action,.lagoon-materials-actions') ? 110 : 0;
      counts.set(group, index + 1);
      element.classList.add('cascade-reveal');
      element.style.setProperty('--cascade-delay', `${Math.min(offset + position * 70 + index * 85, 460)}ms`);
      if (!element.dataset.reveal) element.dataset.reveal = 'cascade-item';
    }
    if (!element.contains(document.activeElement)) {
      element.dataset.revealState = 'pending';
      observer.observe(element);
    }
  });
  document.addEventListener('focusin', event => revealFocused(event.target));
  motion.addEventListener('change', () => {
    if (motion.matches) return;
    observer.disconnect();
    document.querySelectorAll('[data-reveal-state]').forEach(element => delete element.dataset.revealState);
  });
})();

// The reviews use the same scroll-snap layout and expandable quotes as concept 04.
(() => {
  const track = document.querySelector('.lagoon-reviews-track');
  if (!track) return;
  const previous = document.querySelector('[data-review-step="-1"]');
  const next = document.querySelector('[data-review-step="1"]');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  const updateControls = () => {
    const available = track.scrollWidth - track.clientWidth;
    previous.disabled = track.scrollLeft < 2;
    next.disabled = available - track.scrollLeft < 2;
    track.tabIndex = available > 1 ? 0 : -1;
  };
  for (const button of [previous, next]) {
    button.addEventListener('click', () => {
      const step = track.children[1].offsetLeft - track.children[0].offsetLeft;
      const position = Math.round(track.scrollLeft / step) + Number(button.dataset.reviewStep);
      track.scrollTo({ left: position * step, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
    });
  }
  for (const button of track.querySelectorAll('.lagoon-review-toggle')) {
    const quote = document.getElementById(button.getAttribute('aria-controls'));
    const full = quote.querySelector('.lagoon-review-full');
    button.addEventListener('click', () => {
      const expanded = full.hidden;
      full.hidden = !expanded;
      quote.scrollTop = 0;
      button.setAttribute('aria-expanded', String(expanded));
      button.textContent = expanded ? 'Свернуть отзыв' : 'Читать весь отзыв';
      if (expanded) {
        quote.tabIndex = 0;
        quote.focus({ preventScroll: true });
      } else {
        quote.removeAttribute('tabindex');
      }
    });
  }
  track.addEventListener('scroll', updateControls, { passive: true });
  new ResizeObserver(updateControls).observe(track);
  updateControls();
})();

document.querySelector('.lagoon-footer-form')?.addEventListener('submit', event => {
  event.preventDefault();
  event.currentTarget.querySelector('[role="status"]').textContent = 'Отправка пока недоступна.';
});
