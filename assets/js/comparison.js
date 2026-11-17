/* Review drafts stay local; sharing requires confirmed server persistence. */
(() => {
    const names = window.JuliaTravelConceptNames;
    const draftKey = 'julia-travel:design-review:v2';
    const legacyKey = 'julia-travel:palette-choice:v1';
    const MAX_IMAGES = 3, MAX_BYTES = 5 * 1024 * 1024;
    const $ = id => document.getElementById(id);
    const options = [...document.querySelectorAll('[data-variant]')];
    const frame = $('live-preview');
    const wishes = $('wishes'), references = $('reference-fields');
    const copyMessage = $('copy-message'), copyField = $('copy-field');
    const imageInput = $('image-input'), replaceInput = $('replace-image-input');
    const images = [];
    let viewing = 'coral-travel', revision = 0, nextImageId = 0, replaceId = null;
    let imageQueue = Promise.resolve();
    let saving = false, saved = null, attempt = null;
    const validChoice = value => typeof value === 'string' && Object.hasOwn(names, value);
    const normalizeReferences = values => {
        const result = (Array.isArray(values) ? values : []).slice(0, 5).map(value => typeof value === 'string' ? value.slice(0, 2048) : '');
        while (result.length < 3) result.push('');
        return result;
    };
    const restoreDraft = () => {
        let saved = {}, legacy = null;
        try { saved = JSON.parse(localStorage.getItem(draftKey) || '{}') || {}; legacy = localStorage.getItem(legacyKey); } catch { /* Empty draft when storage is unavailable. */ }
        const params = new URLSearchParams(location.search);
        const hashChoice = location.hash.slice(1);
        const incoming = params.has('choice') ? params.get('choice') : (validChoice(hashChoice) || hashChoice === 'tropical-glass' ? hashChoice : (Object.hasOwn(saved, 'choice') ? saved.choice : legacy));
        // Existing form drafts/links select the replacement; immutable saved
        // results keep Tropical Glass's original name and colors in review-api.
        const candidate = incoming === 'tropical-glass' ? 'stan-inspired' : incoming;
        const comment = params.has('comment') ? params.get('comment') : saved.comment;
        return {
            choice: validChoice(candidate) ? candidate : null,
            comment: typeof comment === 'string' ? comment.slice(0, 1000) : '',
            references: normalizeReferences(params.has('ref') ? params.getAll('ref') : saved.references)
        };
    };
    const draft = restoreDraft();
    // Clear the previously confirmed third concept once for the new review round.
    // Keep wishes and references, and never touch already saved review results.
    try {
        const resetKey = 'julia-travel:coral-review-reset:v1';
        if (!localStorage.getItem(resetKey)) {
            if (draft.choice === 'stan-inspired') {
                draft.choice = null;
                localStorage.setItem(draftKey, JSON.stringify(draft));
                localStorage.removeItem(legacyKey);
                const url = new URL(location.href);
                if (url.searchParams.get('choice') === 'stan-inspired' || url.searchParams.get('choice') === 'tropical-glass') url.searchParams.delete('choice');
                if (url.hash === '#stan-inspired' || url.hash === '#tropical-glass') url.hash = '';
                try { history.replaceState(null, '', url.href); } catch { /* Some browsers restrict history updates. */ }
            }
            localStorage.setItem(resetKey, '1');
        }
    } catch { /* The review remains usable without browser storage. */ }
    const referenceURL = value => {
        const text = value.trim();
        if (!text || !/^https?:\/\//i.test(text)) return null;
        try { const url = new URL(text); return ['http:', 'https:'].includes(url.protocol) && url.hostname && !url.username && !url.password ? url : null; } catch { return null; }
    };
    const validReferences = () => draft.references.map(value => value.trim()).filter(value => referenceURL(value));
    const resetFeedback = () => {
        revision++;
        copyMessage.textContent = '';
        copyField.hidden = true;
        copyField.value = '';
        $('copy-field-label').hidden = true;
    };
    const updateAddress = () => {
        if (!draft.choice) return;
        const url = new URL(location.href);
        url.searchParams.set('choice', draft.choice);
        // Remove legacy text parameters; durable sharing uses result.html and an opaque token.
        url.searchParams.delete('comment'); url.searchParams.delete('ref');
        try { if (url.href !== location.href) history.replaceState(null, '', url.href); }
        catch { /* Some browsers restrict history updates. */ }
    };
    const persist = () => {
        // Only text and the final choice are saved. Files, names and Object URLs never enter storage.
        try {
            localStorage.setItem(draftKey, JSON.stringify(draft));
            if (draft.choice) localStorage.setItem(legacyKey, draft.choice);
            $('draft-status').textContent = '';
        } catch { $('draft-status').textContent = 'Браузер не позволяет сохранить черновик. Перед закрытием страницы скопируйте результат.'; }
    };
    const updateSummary = () => {
        document.querySelector('#choice-status strong').textContent = draft.choice ? names[draft.choice] : 'не выбран';
        $('choice-check').hidden = !draft.choice;
        $('summary-choice').textContent = draft.choice ? names[draft.choice] : 'Не выбран';
        $('summary-comment').textContent = draft.comment.trim() ? 'заполнен' : 'не заполнен';
        $('summary-references').textContent = String(validReferences().length);
        $('summary-images').textContent = String(images.length);
        $('copy-choice').disabled = saving;
        $('confirm-choice').disabled = viewing === draft.choice;
        options.forEach(button => {
            const selected = button.dataset.variant === draft.choice;
            button.classList.toggle('is-selected', selected);
            button.setAttribute('aria-label', 'Просмотреть ' + names[button.dataset.variant] + (selected ? '. Выбрано' : ''));
        });
    };
    const changed = () => { resetFeedback(); persist(); updateSummary(); updateAddress(); };
    const view = value => {
        if (!validChoice(value)) return;
        viewing = value;
        options.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.variant === value)));
        const page = options.find(button => button.dataset.variant === value).dataset.preview;
        if (frame.getAttribute('src') !== page + '?embed=1') frame.src = page + '?embed=1';
        frame.title = 'Julia Travel: ' + names[value];
        $('full-preview').href = page;
        updateSummary();
    };
    options.forEach(button => button.addEventListener('click', () => view(button.dataset.variant)));
    $('confirm-choice').addEventListener('click', () => { draft.choice = viewing; changed(); });
    const resizeComment = () => {
        wishes.style.height = 'auto';
        wishes.style.height = Math.min(260, Math.max(120, wishes.scrollHeight)) + 'px';
        $('comment-count').textContent = wishes.value.length + ' / 1000';
    };
    wishes.value = draft.comment;
    wishes.addEventListener('input', () => { draft.comment = wishes.value.slice(0, 1000); wishes.value = draft.comment; resizeComment(); changed(); });
    resizeComment();

    const validateRow = (row, showError) => {
        const index = Number(row.dataset.index), value = draft.references[index];
        const input = row.querySelector('input'), link = row.querySelector('a'), error = row.querySelector('.field-error');
        const url = referenceURL(value), invalid = !!value.trim() && !url;
        const text = invalid ? 'Укажите полный адрес с http:// или https://.' : '';
        input.setCustomValidity(text);
        input.setAttribute('aria-invalid', String(invalid && showError));
        error.textContent = showError ? text : '';
        link.hidden = !url;
        if (url) link.href = url.href; else link.removeAttribute('href');
        row.querySelector('[data-clear]').disabled = !value;
        return !invalid;
    };
    const renderReferences = () => {
        references.replaceChildren();
        draft.references.forEach((value, index) => {
            const row = document.createElement('div'); row.className = 'reference-row'; row.dataset.index = index;
            // Static markup only; reference values are assigned through DOM properties below.
            row.innerHTML = `<label for="reference-${index + 1}">Ссылка ${index + 1}</label><div class="reference-input"><input id="reference-${index + 1}" type="url" maxlength="2048" inputmode="url" autocomplete="url" spellcheck="false" placeholder="https://example.com" aria-describedby="reference-error-${index + 1}"><button type="button" data-clear aria-label="Очистить ссылку ${index + 1}">×</button></div><p id="reference-error-${index + 1}" class="field-error"></p><div class="reference-actions"><a target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer" hidden>Открыть ↗</a>${index >= 3 ? '<button type="button" data-remove class="text-button">Удалить поле</button>' : ''}</div>`;
            const input = row.querySelector('input'); input.value = value;
            input.addEventListener('input', () => { draft.references[index] = input.value.slice(0, 2048); validateRow(row, input.getAttribute('aria-invalid') === 'true'); changed(); });
            input.addEventListener('blur', () => validateRow(row, true));
            row.querySelector('[data-clear]').addEventListener('click', () => { draft.references[index] = ''; input.value = ''; validateRow(row, false); changed(); input.focus(); });
            row.querySelector('[data-remove]')?.addEventListener('click', () => { draft.references.splice(index, 1); renderReferences(); changed(); $('add-reference').focus(); });
            references.append(row); validateRow(row, true);
        });
        $('add-reference').disabled = draft.references.length >= 5;
    };
    $('add-reference').addEventListener('click', () => {
        if (draft.references.length >= 5) return;
        draft.references.push(''); renderReferences(); changed(); references.lastElementChild.querySelector('input').focus();
    });
    const validateReferences = () => {
        let firstInvalid = null;
        references.querySelectorAll('.reference-row').forEach(row => { if (!validateRow(row, true) && !firstInvalid) firstInvalid = row.querySelector('input'); });
        if (firstInvalid) { copyMessage.textContent = 'Проверьте ссылки: допустимы только адреса с http:// или https://.'; firstInvalid.focus(); return false; }
        return true;
    };
    renderReferences();

    const formatSize = bytes => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(bytes / (bytes >= 1024 * 1024 ? 1024 * 1024 : 1024)) + (bytes >= 1024 * 1024 ? ' МБ' : ' КБ');
    const renderImages = () => {
        $('image-previews').replaceChildren();
        images.forEach(item => {
            const card = document.createElement('article'); card.className = 'image-item';
            const image = document.createElement('img'); image.src = item.url; image.alt = item.file.name;
            const name = document.createElement('p'); name.className = 'image-name'; name.textContent = item.file.name;
            const size = document.createElement('p'); size.className = 'field-note'; size.textContent = formatSize(item.file.size);
            const actions = document.createElement('div'); actions.className = 'image-actions';
            const replace = document.createElement('button'); replace.type = 'button'; replace.className = 'text-button'; replace.textContent = 'Заменить'; replace.setAttribute('aria-label', 'Заменить ' + item.file.name);
            const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'text-button'; remove.textContent = 'Удалить'; remove.setAttribute('aria-label', 'Удалить ' + item.file.name);
            replace.addEventListener('click', () => { replaceId = item.id; replaceInput.click(); });
            remove.addEventListener('click', () => { const index = images.findIndex(image => image.id === item.id); if (index < 0) return; URL.revokeObjectURL(images[index].url); images.splice(index, 1); $('image-error').textContent = ''; renderImages(); resetFeedback(); updateSummary(); });
            actions.append(replace, remove); card.append(image, name, size, actions); $('image-previews').append(card);
        });
        $('add-images').disabled = images.length >= MAX_IMAGES;
    };
    const prepareImage = async file => {
        if (!file.name || file.name.length > 180 || /[\x00-\x1f\x7f]/.test(file.name)) throw new Error('Сократите имя файла до 180 символов и уберите управляющие символы.');
        if (file.size > MAX_BYTES) throw new Error(file.name + ': размер должен быть не больше 5 МБ.');
        if (file.type && !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error(file.name + ': выберите PNG, JPG или WebP.');
        const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
        const png = [137,80,78,71,13,10,26,10].every((value, index) => bytes[index] === value);
        const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
        const webp = String.fromCharCode(...bytes.slice(0,4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8,12)) === 'WEBP';
        if (!png && !jpeg && !webp) throw new Error(file.name + ': выберите PNG, JPG или WebP.');
        const url = URL.createObjectURL(file);
        try { const image = new Image(); image.src = url; await image.decode(); }
        catch { URL.revokeObjectURL(url); throw new Error(file.name + ': не удалось открыть изображение. Выберите другой файл.'); }
        return { id: ++nextImageId, file, url };
    };
    const queueImages = (files, replacing = null) => {
        imageQueue = imageQueue.then(async () => {
            const errors = [];
            for (const file of files) {
                if (replacing === null && images.length >= MAX_IMAGES) { errors.push('Можно прикрепить не больше трёх изображений.'); break; }
                try {
                    const item = await prepareImage(file);
                    if (replacing !== null) {
                        const index = images.findIndex(image => image.id === replacing);
                        if (index < 0) { URL.revokeObjectURL(item.url); break; }
                        URL.revokeObjectURL(images[index].url); images[index] = item;
                    } else images.push(item);
                } catch (error) { errors.push(error.message); }
                if (replacing !== null) break;
            }
            $('image-error').textContent = errors.join(' ');
            renderImages(); resetFeedback(); updateSummary();
        }).catch(() => { $('image-error').textContent = 'Не удалось добавить изображение. Попробуйте выбрать файл ещё раз.'; });
    };
    $('add-images').addEventListener('click', () => imageInput.click());
    imageInput.addEventListener('change', () => { const files = [...imageInput.files]; imageInput.value = ''; queueImages(files); });
    replaceInput.addEventListener('change', () => { const files = [...replaceInput.files]; replaceInput.value = ''; if (files.length && replaceId !== null) queueImages(files, replaceId); replaceId = null; });
    const zone = $('image-dropzone'); let dragDepth = 0;
    zone.addEventListener('dragenter', event => { event.preventDefault(); dragDepth++; zone.classList.add('is-dragging'); });
    zone.addEventListener('dragover', event => { event.preventDefault(); if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'; });
    zone.addEventListener('dragleave', event => { event.preventDefault(); if (--dragDepth <= 0) { dragDepth = 0; zone.classList.remove('is-dragging'); } });
    zone.addEventListener('drop', event => { event.preventDefault(); dragDepth = 0; zone.classList.remove('is-dragging'); queueImages([...(event.dataTransfer?.files || [])]); });
    window.addEventListener('pagehide', event => { if (!event.persisted) images.forEach(image => URL.revokeObjectURL(image.url)); });

    const api = window.JuliaTravelReview;
    const copySavedLink = async (url, version) => {
        try {
            if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
            await navigator.clipboard.writeText(url);
            if (version !== revision) return;
            copyMessage.textContent = 'Ссылка скопирована. Отправьте её разработчику';
            copyField.hidden = true; $('copy-field-label').hidden = true;
        } catch {
            if (version !== revision) return;
            copyMessage.textContent = 'Результат сохранён. Браузер не разрешил копирование — скопируйте ссылку из поля ниже.';
            copyField.value = url; copyField.rows = 3; copyField.hidden = false; $('copy-field-label').hidden = false;
            copyField.focus(); copyField.select();
        }
    };
    $('copy-choice').addEventListener('click', async () => {
        if (saving) return;
        if (!draft.choice) { copyMessage.textContent = 'Сначала выберите дизайн кнопкой «Выбрать этот вариант».'; $('confirm-choice').focus(); return; }
        if (!validateReferences()) return;
        saving = true; updateSummary();
        try {
            await imageQueue;
            if ($('image-error').textContent) throw new Error('Проверьте прикреплённые изображения: ' + $('image-error').textContent);
            const version = revision;
            if (saved?.version === version) { await copySavedLink(saved.url, version); return; }
            api.endpoint(); // Fail clearly before creating a token when storage is unconfigured.
            if (!attempt || attempt.version !== version) attempt = { version, token: api.createToken() };
            const snapshot = { choice: draft.choice, comment: draft.comment, references: validReferences() };
            const files = images.map(item => item.file);
            copyMessage.textContent = 'Сохраняем выбор и изображения…';
            $('copy-choice').textContent = 'Сохранение…';
            let result;
            if (attempt.uncertain) {
                copyMessage.textContent = 'Проверяем результат предыдущей попытки…';
                try {
                    const previous = await api.read(attempt.token);
                    const matches = previous.choice === snapshot.choice && previous.comment === snapshot.comment &&
                        JSON.stringify(previous.references) === JSON.stringify(snapshot.references) &&
                        Array.isArray(previous.images) && previous.images.length === files.length &&
                        previous.images.every((image, index) => image.name === files[index].name && image.size === files[index].size && typeof image.url === 'string');
                    if (!matches) throw new Error('Найденный результат не совпадает с формой. Обратитесь к разработчику.');
                    result = { token: attempt.token };
                } catch (error) {
                    if (error.status !== 404) throw error;
                }
            }
            if (!result) {
                try { result = await api.save(snapshot, files, attempt.token); }
                catch (error) { if (error.uncertain) attempt.uncertain = true; throw error; }
            }
            const url = new URL('result.html', location.href);
            // The capability lives in the fragment: it is not sent to GitHub Pages or in referrers.
            url.hash = 'result=' + result.token;
            if (version !== revision) {
                copyMessage.textContent = 'Форма изменилась во время сохранения. Нажмите «Скопировать ссылку», чтобы сохранить актуальный результат.';
                return;
            }
            saved = { version, url: url.href };
            await copySavedLink(saved.url, version);
        } catch (error) {
            copyMessage.textContent = error.message || 'Не удалось сохранить результат. Повторите попытку; форма остаётся заполненной.';
        } finally {
            saving = false; $('copy-choice').textContent = 'Скопировать ссылку'; updateSummary();
        }
    });
    window.addEventListener('popstate', () => {
        Object.assign(draft, restoreDraft()); wishes.value = draft.comment; resizeComment(); renderReferences(); resetFeedback(); persist(); view(draft.choice || 'coral-travel');
    });
    persist();
    view(draft.choice || 'coral-travel');
})();
