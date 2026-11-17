(() => {
  const gallery = document.querySelector('.ocean-arc');
  if (!gallery) return;
  const cards = [...gallery.querySelectorAll('.arc-card')];

  function layout() {
    const width = gallery.clientWidth;
    const mobile = width <= 600;
    const visible = cards.filter((card, index) => {
      card.hidden = mobile && index % 2 === 0;
      return !card.hidden;
    });
    const cardWidth = mobile ? Math.min(86, width * .215) : Math.min(118, width * .115);
    const cardHeight = cardWidth * 1.16;
    const angleLimit = mobile ? .55 : .50;
    const radius = Math.max(0, (width - cardWidth * 1.35) / (2 * Math.sin(angleLimit)));
    const arcHeight = radius * (1 - Math.cos(angleLimit));
    gallery.style.setProperty('--arc-height', `${Math.ceil(arcHeight + cardHeight + 54)}px`);
    visible.forEach((card, index) => {
      const angle = -angleLimit + 2 * angleLimit * index / Math.max(1, visible.length - 1);
      card.style.setProperty('--card-width', `${cardWidth}px`);
      card.style.setProperty('--card-height', `${cardHeight}px`);
      card.style.setProperty('--x', `${Math.sin(angle) * radius}px`);
      card.style.setProperty('--y', `${26 + (1 - Math.cos(angle)) * radius}px`);
      card.style.setProperty('--rotation', `${angle * 16}deg`);
      card.style.setProperty('--depth', `${10 + visible.length - Math.round(Math.abs(index - (visible.length - 1) / 2))}`);
      card.style.setProperty('--delay', `${index * 45}ms`);
    });
    gallery.dataset.ready = '';
  }

  layout();
  window.addEventListener('resize', layout, { passive: true });
})();
