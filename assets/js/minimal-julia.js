// Uses the same data-reveal states and IntersectionObserver approach as concept 04.
(() => {
  const motion = matchMedia('(prefers-reduced-motion: no-preference)');
  if (!('IntersectionObserver' in window) || !motion.matches) return;
  const selector = '.v5-section :is(h2,h3,p,li,a,button,strong), .lagoon-faq :is(h2,p,summary,a,button), .lagoon-footer :is(h2,h3,p,li,a,button), .site-header :is(a,button), .hero [data-reveal]';
  const candidates = [...document.querySelectorAll(selector)];
  const elements = candidates.filter(element => {
    if (element.closest('.hero')) return true;
    if (element.matches('li') && element.querySelector('a,button')) return false;
    if (element.parentElement.closest('h1,h2,h3,p,a,button,summary,strong')) return false;
    return element.textContent.trim() || element.matches('button');
  });
  const counts = new Map();
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.dataset.revealState = 'shown';
      observer.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px 80px' });
  elements.forEach(element => {
    if (!element.closest('.hero')) {
      const group = element.closest('.card,.product,.lagoon-footer-brand,.lagoon-footer-nav,.lagoon-footer-contacts,.lagoon-faq-questions,header,section') || element.parentElement;
      const index = counts.get(group) || 0;
      counts.set(group, index + 1);
      element.classList.add('cascade-reveal');
      element.style.setProperty('--cascade-delay', `${Math.min(index, 5) * 90}ms`);
      if (!element.dataset.reveal) element.dataset.reveal = 'cascade-item';
    }
    if (!element.contains(document.activeElement)) element.dataset.revealState = 'pending';
    observer.observe(element);
  });
  document.addEventListener('focusin', event => {
    const element = event.target.closest('[data-reveal-state]');
    if (element) delete element.dataset.revealState;
    if (element) observer.unobserve(element);
  });
  motion.addEventListener('change', () => {
    if (motion.matches) return;
    observer.disconnect();
    document.querySelectorAll('[data-reveal-state]').forEach(element => delete element.dataset.revealState);
  });
})();

// Desktop reveals scrolling inside a fixed card; smaller screens show complete reviews.
(() => {
  const compact = matchMedia('(max-width: 1024px)');
  const items = document.querySelectorAll('#traveler-reviews .card');
  items.forEach(item => {
    const button = item.querySelector('.review-toggle');
    button.addEventListener('click', () => {
      const expanded = button.getAttribute('aria-expanded') !== 'true';
      button.setAttribute('aria-expanded', String(expanded));
      button.textContent = expanded ? 'Свернуть' : 'Читать полностью';
      item.classList.toggle('is-expanded', expanded);
      if (!expanded) item.querySelector('.review-full').scrollTop = 0;
    });
  });
  compact.addEventListener('change', () => items.forEach(item => {
    item.classList.remove('is-expanded');
    const button = item.querySelector('.review-toggle');
    button.setAttribute('aria-expanded', 'false');
    button.textContent = 'Читать полностью';
    item.querySelector('.review-full').scrollTop = 0;
  }));
})();
