(() => {
    const palettes = Object.freeze({
        'coral-travel': { name: JuliaTravelConceptNames['coral-travel'], colors: ['#FF385C', '#222222', '#FFFFFF', '#F7F7F7', '#FFF3D4'] },
        'colorful-ocean': { name: JuliaTravelConceptNames['colorful-ocean'], colors: ['#397EF5', '#6646D9', '#00B8A9', '#50D9AC', '#F1F5FF'] },
        'tropical-glass': { name: 'Tropical Glass', colors: ['#007F80', '#00C6B5', '#FFB82E', '#17333D', '#FFF5E5'] },
        'stan-inspired': { name: JuliaTravelConceptNames['stan-inspired'], colors: ['#6255FF', '#EEECFF', '#FFFFFF', '#17172B', '#4258E8', '#F7F7FB'] },
        'minimal-julia': { name: JuliaTravelConceptNames['minimal-julia'], colors: ['#F5EFDF', '#FFF9EC', '#153B32', '#103F38', '#9CEBAF', '#CEE6C3', '#F3D477', '#A8C89A'] },
        'emerald-lagoon': { name: JuliaTravelConceptNames['emerald-lagoon'], colors: ['#103F38', '#FFF9EC', '#CEE6C3', '#153B32', '#DFC69D', '#F5EFDF', '#D4DED2'] }
    });
    const tokenPattern = /^[A-Za-z0-9_-]{43}$/;
    const endpoint = () => {
        const value = window.JuliaTravelReviewConfig?.apiBaseUrl;
        if (!value) throw new Error('Хранилище ещё не настроено. Ссылка не создана. Все поля и изображения остаются в форме; повторите попытку после подключения хранилища.');
        const url = new URL(value);
        if (url.protocol !== 'https:') throw new Error('Неверный адрес хранилища. Обратитесь к разработчику.');
        return url.href.replace(/\/$/, '');
    };
    const request = async (action, body) => {
        const base = endpoint();
        let response;
        try {
            response = await fetch(base + '/' + action, {
                method: 'POST', body, credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer',
                headers: typeof body === 'string' ? { 'Content-Type': 'application/json' } : {},
                signal: AbortSignal.timeout(90000)
            });
        } catch (cause) {
            const error = new Error(cause.name === 'TimeoutError'
                ? 'Сервер не ответил вовремя. Результат мог сохраниться; нажмите кнопку ещё раз для проверки. Поля и изображения остаются в форме.'
                : 'Не удалось получить ответ сервера. Проверьте интернет и адрес страницы; при повторной попытке результат будет проверен. Поля и изображения остаются в форме.');
            error.uncertain = action === 'save';
            throw error;
        }
        let data;
        try { data = await response.json(); } catch {
            const error = new Error(`Сервер вернул некорректный ответ (HTTP ${response.status}). Повторите попытку для проверки результата.`);
            error.status = response.status; error.uncertain = action === 'save'; throw error;
        }
        if (!response.ok) {
            const messages = {
                400: 'Проверьте выбранный дизайн, ссылки и изображения.',
                401: 'Сервер отклонил авторизацию. Обратитесь к разработчику.',
                403: 'Сервер запретил доступ с этого адреса. Обратитесь к разработчику.',
                404: 'Результат не найден. Проверьте, что ссылка скопирована полностью.',
                409: 'Данные изменились. Повторите сохранение.',
                413: 'Изображения слишком большие. Максимум — 3 файла по 5 МБ.',
                415: 'Допустимы только изображения PNG, JPG и WebP.',
                429: 'Слишком много запросов. Попробуйте немного позже.'
            };
            const error = new Error(messages[response.status] || `Сервер не выполнил запрос (HTTP ${response.status}). Повторите попытку; поля остаются заполненными.`);
            error.status = response.status; error.uncertain = action === 'save' && response.status >= 500; throw error;
        }
        return data;
    };
    window.JuliaTravelReview = Object.freeze({
        palettes, tokenPattern, endpoint,
        createToken: () => btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
        async save(draft, files, token) {
            const body = new FormData();
            body.append('metadata', JSON.stringify({ token, choice: draft.choice, comment: draft.comment, references: draft.references }));
            files.forEach(file => body.append('images', file, file.name));
            const result = await request('save', body);
            if (result.token !== token || !tokenPattern.test(result.token) || result.imageCount !== files.length || result.saved !== true) {
                const error = new Error('Сохранение полного результата не подтверждено. Повторите попытку для проверки.'); error.uncertain = true; throw error;
            }
            return result;
        },
        read: token => request('read', JSON.stringify({ token }))
    });
})();
