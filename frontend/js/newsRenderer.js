export function initializeNewsRenderer() {
    console.log('📰 Инициализация модуля новостей');

    document.addEventListener('openCompany', (event) => {
        const symbol = event.detail.symbol;
        loadCompanyNews(symbol);
    });

    // Инициализация кнопок периода
    initializePeriodButtons();
}

export function initializePeriodButtons() {
    document.querySelectorAll('.periodBtn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.periodBtn').forEach(b =>
                b.classList.remove('bg-accent', 'text-bg', 'font-medium')
            );
            btn.classList.add('bg-accent', 'text-bg', 'font-medium');

            const days = parseInt(btn.dataset.range);
            const currentCompany = document.getElementById('companyView')?.dataset.current;
            if (currentCompany) {
                loadCompanyNews(currentCompany, days);
            }
        });
    });
}

export async function loadCompanyNews(symbol, maxDays = 365) {
    // Ищем список новостей: сначала приватный, потом публичный
    let newsList = null;

    const privateView = document.getElementById("companyViewPrivate");

    if (privateView && privateView.style.display === "block") {
        newsList = document.getElementById("pNews");
    }

    if (!newsList) {
        newsList = document.getElementById("newsList");
    }


    if (!newsList) return;

    newsList.innerHTML = '<div class="text-sm text-muted">Загрузка новостей...</div>';

    try {
        const period = convertDaysToPeriod(maxDays);
        const response = await fetch(`/api/news/company/${symbol}?period=${period}`);
        const news = await response.json();

        renderNewsList(news, symbol);
    } catch (error) {
        console.error('❌ Ошибка загрузки новостей:', error);
        newsList.innerHTML = '<div class="text-sm text-danger">Ошибка загрузки новостей</div>';
    }
}

export function renderNewsList(news, symbol) {
    let newsList = null;

// Проверяем, открыт ли приватный шаблон
    const privateView = document.getElementById("companyViewPrivate");

    if (privateView && privateView.style.display === "block") {
        newsList = document.getElementById("pNews");   // для приватной компании
    }

// Если приватная не активна — значит публичная
    if (!newsList) {
        newsList = document.getElementById("newsList"); // общий список новостей
    }

    if (!newsList) return;


    if (!news || news.length === 0) {
        newsList.innerHTML = '<div class="text-sm text-muted">Новостей за период нет</div>';
        return;
    }

    newsList.innerHTML = '';

    news.forEach(item => {
        const newsItem = createNewsItem(item, symbol);
        newsList.appendChild(newsItem);
    });
}

export function createNewsItem(item, symbol) {
    const div = document.createElement('div');
    div.className = 'p-4 rounded-lg bg-[rgba(255,255,255,0.02)] border border-custom';

    const tone = item.tone || 'neutral';
    const impactLevel = item.impact_level || 'medium';
    const toneColor = getToneColor(tone);
    const impactClass = getImpactClass(impactLevel);

    div.innerHTML = `
        <div class="flex justify-between items-start mb-2">
            <a href="${item.link}" target="_blank" 
               class="text-sm font-semibold hover:underline flex-1 mr-2">
               ${item.title}
            </a>
            <div class="flex gap-2 flex-shrink-0">
                <span class="px-2 py-1 rounded text-xs" 
                      style="color:${toneColor}; border:1px solid ${toneColor}">
                    ${tone}
                </span>
                <span class="px-2 py-1 rounded text-xs ${impactClass}">
                    ${impactLevel}
                </span>
            </div>
        </div>
        <div class="text-xs mt-1 text-muted">
            ${item.source || '—'} · ${formatDate(item.pubDate)}
        </div>
        <p class="mt-2 text-sm">${item.summary || ''}</p>
        <div class="mt-3 text-xs flex gap-4 flex-wrap">
            <span style="color:${toneColor}">Тон: ${tone}</span>
            <span>Уровень влияния: <strong>${impactLevel}</strong></span>
            <span>Важность: <strong>${item.impact_score || '—'}</strong></span>
        </div>
    `;

    return div;
}

// Вспомогательные функции
function convertDaysToPeriod(days) {
    const periods = {
        1: '1d', 3: '3d', 7: '1w',
        30: '1m', 90: '3m', 365: '1y'
    };
    return periods[days] || '1y';
}

function getToneColor(tone) {
    const colors = {
        positive: 'var(--success)',
        negative: 'var(--danger)',
        neutral: 'var(--muted)'
    };
    return colors[tone] || 'var(--muted)';
}

function getImpactClass(impactLevel) {
    const classes = {
        high: 'impact-high',
        medium: 'impact-medium',
        low: 'impact-low'
    };
    return classes[impactLevel] || 'impact-low';
}

function formatDate(dateString) {
    if (!dateString) return '—';

    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch {
        return '—';
    }
}