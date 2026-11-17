(() => {
    const $ = id => document.getElementById(id), api = window.JuliaTravelReview;
    const token = new URLSearchParams(location.hash.slice(1)).get('result');
    const safeURL = value => {
        const url = new URL(value);
        if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('Некорректные данные результата.');
        return url.href;
    };
    const load = async () => {
        $('saved-content').hidden = true; $('retry-result').hidden = true;
        if (!api.tokenPattern.test(token || '')) { $('result-status').textContent = 'Ссылка неполная или неверная. Попросите отправителя скопировать её ещё раз.'; return; }
        $('result-status').textContent = 'Загружаем сохранённый результат…';
        try {
            const data = await api.read(token), concept = api.palettes[data.choice];
            if (!concept || typeof data.comment !== 'string' || !Array.isArray(data.references) || !Array.isArray(data.images) || data.images.length > 3) throw new Error('Некорректные данные результата.');
            $('result-heading').textContent = 'Выбран дизайн: ' + concept.name;
            $('saved-comment').textContent = data.comment || 'Пожелания не указаны.';
            $('saved-palette').replaceChildren();
            concept.colors.forEach(color => {
                const item = document.createElement('span'), swatch = document.createElement('i');
                swatch.style.backgroundColor = color; swatch.setAttribute('aria-hidden', 'true');
                item.append(swatch, document.createTextNode(color)); $('saved-palette').append(item);
            });
            $('saved-references').replaceChildren();
            data.references.forEach(value => {
                const item = document.createElement('li'), link = document.createElement('a');
                link.href = safeURL(value); link.textContent = value; link.target = '_blank'; link.rel = 'noopener noreferrer';
                item.append(link); $('saved-references').append(item);
            });
            if (!data.references.length) { const item = document.createElement('li'); item.textContent = 'Ссылки не добавлены.'; $('saved-references').append(item); }
            $('saved-images').replaceChildren();
            data.images.forEach(file => {
                const card = document.createElement('article'), link = document.createElement('a'), image = document.createElement('img'), caption = document.createElement('p');
                card.className = 'image-item'; link.href = safeURL(file.url); link.target = '_blank'; link.rel = 'noopener noreferrer';
                image.src = link.href; image.alt = file.name; image.referrerPolicy = 'no-referrer';
                image.addEventListener('error', () => { $('result-status').textContent = 'Не удалось загрузить изображение. Повторите загрузку результата.'; $('retry-result').hidden = false; });
                caption.className = 'image-name'; caption.textContent = file.name;
                link.append(image); card.append(link, caption); $('saved-images').append(card);
            });
            if (!data.images.length) $('saved-images').textContent = 'Изображения не прикреплены.';
            $('saved-content').hidden = false; $('result-status').textContent = '';
        } catch (error) { $('result-status').textContent = error.message; $('retry-result').hidden = false; }
    };
    $('retry-result').addEventListener('click', load);
    window.addEventListener('hashchange', () => location.reload());
    load();
})();
