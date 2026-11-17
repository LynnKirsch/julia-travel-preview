(() => {
 if(new URLSearchParams(location.search).has('embed')) document.body.classList.add('is-embedded');
 document.querySelectorAll('[data-concept-name]').forEach(element => {
  element.textContent = JuliaTravelConceptNames[element.dataset.conceptName];
 });
})();
