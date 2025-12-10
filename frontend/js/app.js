// Главный файл приложения - объединяет все модули
import { initializeCharts } from './charts.js';
import { initializeSearch } from './search.js';
import { initializeNewsRenderer } from './newsRenderer.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 FinAnalytica Frontend запущен');

    // === Обработчик кнопки "Назад" ===
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            showHomeView();
        });
    }

    // === Обработчик кнопки "Назад" для непубличных компаний ===
    const backBtnPrivate = document.getElementById('backBtnPrivate');
    if (backBtnPrivate) {
        backBtnPrivate.addEventListener('click', () => {
            showHomeView();
        });
    }


    // Инициализация всех модулей
    initializeCharts();
    initializeSearch();
    initializeNewsRenderer();

    // Инициализация модального окна
    initializeModal();

    // Инициализация мировых новостей
    initializeWorldNews();

    // Инициализация переключения компаний
    initializeCompanyToggle();

    // Загрузка начальных данных
    loadInitialData();
});

function initializeModal() {
    const modal = document.getElementById('authModal');
    const modalBox = document.getElementById('modalBox');
    const closeModal = document.getElementById('closeModal');
    const modalTitle = document.getElementById('modalTitle');
    const authForm = document.getElementById('authForm');
    const switchMode = document.getElementById('switchMode');
    let isLogin = true;

    function openModal(type) {
        isLogin = type === 'login';
        modal.classList.remove('hidden');
        modalBox.classList.remove('opacity-0', 'scale-95');
        modalTitle.textContent = isLogin ? 'Вход' : 'Регистрация';
        switchMode.innerHTML = isLogin
            ? 'Нет аккаунта? <span class="underline">Зарегистрироваться</span>'
            : 'Уже есть аккаунт? <span class="underline">Войти</span>';
    }

    function hideModal() {
        modalBox.classList.add('opacity-0', 'scale-95');
        setTimeout(() => modal.classList.add('hidden'), 200);
    }

    closeModal.onclick = hideModal;
    modal.onclick = e => { if (e.target === modal) hideModal(); };
    switchMode.onclick = () => openModal(isLogin ? 'register' : 'login');
    authForm.onsubmit = e => { e.preventDefault(); alert('Демо-режим'); hideModal(); };

    document.querySelectorAll('header nav button').forEach(btn => {
        btn.onclick = () => openModal(btn.textContent.trim() === 'Войти' ? 'login' : 'register');
    });
}

// Переменные для фильтрации
let allWorldNews = [];
let currentFilters = {
    period: 365,
    tone: 'all',
    company: 'all'
};

// Данные компаний
let publicCompanies = [];
let privateCompanies = [
    {
        symbol: 'VOLP',
        name: 'Волтайр-Пром',
        sector: 'Промышленность, шинное производство',
        revenue: '₽150 млрд',
        price: '₽1,250',
        index: 85,
        turnover: '₽200 млрд',
        owner: 'Правительство РФ',
        // График удалён - нет массива prices
    }
];

function initializeWorldNews() {
    // Инициализация кнопок периода
    document.querySelectorAll('.worldPeriodBtn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.worldPeriodBtn').forEach(b =>
                b.classList.remove('bg-accent', 'text-bg', 'font-medium')
            );
            this.classList.add('bg-accent', 'text-bg', 'font-medium');

            currentFilters.period = parseInt(this.dataset.range);
            applyWorldNewsFilters();
        });
    });

    // Инициализация кнопок тональности
    document.querySelectorAll('.toneFilterBtn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.toneFilterBtn').forEach(b =>
                b.classList.remove('bg-accent', 'text-bg', 'font-medium')
            );
            this.classList.add('bg-accent', 'text-bg', 'font-medium');

            currentFilters.tone = this.dataset.tone;
            applyWorldNewsFilters();
        });
    });

    // Инициализация кнопок компаний
    document.querySelectorAll('.companyFilterBtn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.companyFilterBtn').forEach(b =>
                b.classList.remove('bg-accent', 'text-bg', 'font-medium')
            );
            this.classList.add('bg-accent', 'text-bg', 'font-medium');

            currentFilters.company = this.dataset.company;
            applyWorldNewsFilters();
        });
    });
}

function initializeCompanyToggle() {
    const btnPublic = document.getElementById('btnPublic');
    const btnPrivate = document.getElementById('btnPrivate');

    if (btnPublic && btnPrivate) {
        btnPublic.addEventListener('click', () => showPublicCompanies());
        btnPrivate.addEventListener('click', () => showPrivateCompanies());

        // По умолчанию показываем публичные компании
        showPublicCompanies();
    }
}

function showPublicCompanies() {
    const btnPublic = document.getElementById('btnPublic');
    const btnPrivate = document.getElementById('btnPrivate');
    const cardsGrid = document.getElementById('cardsGrid');
    const privateContainer = document.getElementById('privateContainer');

    // Подсвечиваем кнопки
    btnPublic.classList.add('bg-accent', 'text-bg', 'font-medium');
    btnPrivate.classList.remove('bg-accent', 'text-bg', 'font-medium');
    btnPrivate.classList.add('bg-panel', 'border-custom');

    privateContainer.classList.add('hidden-section');
    cardsGrid.classList.remove('hidden-section');

    renderAllCompanies(publicCompanies);
}

function showPrivateCompanies() {
    const btnPublic = document.getElementById('btnPublic');
    const btnPrivate = document.getElementById('btnPrivate');
    const cardsGrid = document.getElementById('cardsGrid');
    const privateContainer = document.getElementById('privateContainer');

    // Подсвечиваем кнопки
    btnPrivate.classList.add('bg-accent', 'text-bg', 'font-medium');
    btnPublic.classList.remove('bg-accent', 'text-bg', 'font-medium');
    btnPublic.classList.add('bg-panel', 'border-custom');

    cardsGrid.classList.add('hidden-section');
    privateContainer.classList.remove('hidden-section');

    renderPrivateCompanies();
}

async function loadInitialData() {
    try {
        const response = await fetch('/api/health');
        const data = await response.json();
        console.log('✅ Backend статус:', data.status);

        // Загружаем компании для главной страницы
        await loadAllCompanies();
    } catch (error) {
        console.warn('⚠️ Backend недоступен');
    }
}

async function loadAllCompanies() {
    try {
        const response = await fetch('/api/companies');
        let companies = await response.json();

        // Фильтруем компании - убираем Волтайр-Пром из публичных
        publicCompanies = companies.filter(c => c.public === true);
        privateCompanies = companies.filter(c => c.public === false);

        const cardsGrid = document.getElementById('cardsGrid');
        if (cardsGrid && publicCompanies.length > 0) {
            renderAllCompanies(publicCompanies);
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки компаний:', error);
    }
}

function renderAllCompanies(companies) {
    const cardsGrid = document.getElementById('cardsGrid');
    if (!cardsGrid) return;

    // Сохраняем карточку мировых новостей
    const worldNewsCard = cardsGrid.querySelector('.bg-gradient-to-br');
    cardsGrid.innerHTML = '';

    // Добавляем карточки компаний
    companies.forEach(company => {
        const card = createCompanyCard(company);
        cardsGrid.appendChild(card);
    });

    // Добавляем карточку мировых новостей обратно
    if (worldNewsCard) {
        cardsGrid.appendChild(worldNewsCard);
    }
}

function renderPrivateCompanies() {
    const privateContainer = document.getElementById('privateContainer');
    if (!privateContainer) return;

    privateContainer.innerHTML = `
        <div class="mb-6">
            <h3 class="text-xl font-semibold">Непубличные компании</h3>
            <p class="text-sm text-muted">Компании, не торгующиеся на бирже</p>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            ${privateCompanies.map(company => createPrivateCompanyCard(company)).join('')}
        </div>
    `;
}

function createCompanyCard(company) {
    const card = document.createElement('div');
    card.className = 'card rounded-2xl p-5 bg-panel border border-custom cursor-pointer smooth hover:card-focus';
    card.dataset.symbol = company.symbol;

    card.innerHTML = `
        <div class="flex items-center justify-between">
            <div>
                <div class="text-lg font-semibold">${company.name}</div>
                <div class="text-xs mt-1 text-muted">${company.sector}</div>
            </div>
            <div class="text-right">
                <div class="text-sm text-muted">Индекс</div>
                <div class="text-xl font-bold text-accent">${company.index}</div>
            </div>
        </div>
        <div class="mt-4 flex items-center gap-3 text-sm">
            <div class="py-1 px-2 rounded bg-[rgba(58,134,255,0.08)] text-accent">${company.revenue}</div>
            <div class="py-1 px-2 rounded bg-[rgba(46,204,113,0.08)] text-success">${company.price}</div>
        </div>
    `;

    card.addEventListener('click', () => {
        showCompanyView(company.symbol);
    });

    return card;
}

function createPrivateCompanyCard(company) {
    return `
        <div class="card rounded-2xl p-5 bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/30 cursor-pointer smooth hover:card-focus" onclick="showCompanyView('${company.symbol}')">
            <div class="flex items-center justify-between">
                <div>
                    <div class="text-lg font-semibold">🛞 ${company.name}</div>
                    <div class="text-xs mt-1 text-muted">${company.sector}</div>
                </div>
                <div class="text-right">
                    <div class="text-sm text-muted">Приватная</div>
                    <div class="text-xl font-bold text-orange-400">${company.index}</div>
                </div>
            </div>
            <div class="mt-4 flex items-center gap-3 text-sm">
                <div class="py-1 px-2 rounded bg-[rgba(251,146,60,0.15)] text-orange-400">${company.revenue}</div>
                <div class="py-1 px-2 rounded bg-[rgba(46,204,113,0.08)] text-success">${company.price}</div>
            </div>
        </div>
    `;
}

function showCompanyView(symbol) {
    const homeView = document.getElementById('homeView');
    const companyView = document.getElementById('companyView');
    const worldNewsView = document.getElementById('worldNewsView');

    homeView.classList.add('hidden-section');
    companyView.classList.remove('hidden-section');
    worldNewsView.classList.add('hidden-section');

    // Загружаем данные компании
    loadCompanyData(symbol);
}

function showHomeView() {
    const homeView = document.getElementById('homeView');
    const companyView = document.getElementById('companyView');
    const privateView = document.getElementById('companyViewPrivate');
    const worldNewsView = document.getElementById('worldNewsView');

    // скрываем оба шаблона компаний
    companyView.classList.add('hidden-section');
    companyView.style.display = "none";

    privateView.classList.add('hidden-section');
    privateView.style.display = "none";

    // скрываем мировые новости
    worldNewsView.classList.add('hidden-section');

    // показываем домашнюю страницу
    homeView.classList.remove('hidden-section');
    homeView.style.display = "block";
}



function showWorldNews() {
    const homeView = document.getElementById('homeView');
    const companyView = document.getElementById('companyView');
    const worldNewsView = document.getElementById('worldNewsView');

    homeView.classList.add('hidden-section');
    companyView.classList.add('hidden-section');
    worldNewsView.classList.remove('hidden-section');

    // Загружаем мировые новости
    loadWorldNews();
}

async function loadWorldNews() {
    try {
        const worldNewsList = document.getElementById('worldNewsList');
        worldNewsList.innerHTML = `
            <div class="text-center py-8 text-muted">
                <div class="loading-spinner mx-auto mb-2"></div>
                <div>Загрузка всех новостей...</div>
            </div>
        `;

        const response = await fetch('/api/news');
        allWorldNews = await response.json();

        // Обновляем статистику
        updateWorldNewsStats(allWorldNews);

        // Применяем фильтры
        applyWorldNewsFilters();

    } catch (error) {
        console.error('❌ Ошибка загрузки мировых новостей:', error);
        const worldNewsList = document.getElementById('worldNewsList');
        worldNewsList.innerHTML = '<div class="text-center py-8 text-danger">Ошибка загрузки новостей</div>';
    }
}

function updateWorldNewsStats(news) {
    const total = news.length;
    const positive = news.filter(n => n.tone === 'positive').length;
    const negative = news.filter(n => n.tone === 'negative').length;
    const neutral = news.filter(n => n.tone === 'neutral').length;

    document.getElementById('totalNewsCount').textContent = total;
    document.getElementById('positiveNewsCount').textContent = positive;
    document.getElementById('negativeNewsCount').textContent = negative;
    document.getElementById('neutralNewsCount').textContent = neutral;
}

function applyWorldNewsFilters() {
    if (allWorldNews.length === 0) return;

    let filteredNews = [...allWorldNews];

    // Фильтр по периоду
    if (currentFilters.period !== 365) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - currentFilters.period);
        filteredNews = filteredNews.filter(item => {
            const newsDate = new Date(item.pubDate || item.processedAt);
            return newsDate >= cutoffDate;
        });
    }

    // Фильтр по тональности
    if (currentFilters.tone !== 'all') {
        filteredNews = filteredNews.filter(item => item.tone === currentFilters.tone);
    }

    // Фильтр по компании
    if (currentFilters.company !== 'all') {
        filteredNews = filteredNews.filter(item => item.company === currentFilters.company);
    }

    // Обновляем статистику фильтрованных данных
    document.getElementById('worldNewsStats').textContent = `Найдено: ${filteredNews.length} новостей`;

    // Отображаем отфильтрованные новости
    renderWorldNewsList(filteredNews);
}

function renderWorldNewsList(news) {
    const worldNewsList = document.getElementById('worldNewsList');
    if (!worldNewsList) return;

    if (!news || news.length === 0) {
        worldNewsList.innerHTML = '<div class="text-center py-8 text-muted">Новостей по выбранным фильтрам не найдено</div>';
        return;
    }

    worldNewsList.innerHTML = '';

    // Сортируем по дате (новые сначала)
    const sortedNews = news.sort((a, b) => new Date(b.pubDate || b.processedAt) - new Date(a.pubDate || a.processedAt));

    sortedNews.forEach(item => {
        const newsItem = createWorldNewsItem(item);
        worldNewsList.appendChild(newsItem);
    });
}

function createWorldNewsItem(item) {
    const div = document.createElement('div');
    div.className = 'p-4 rounded-lg bg-[rgba(255,255,255,0.02)] border border-custom';

    const tone = item.tone || 'neutral';
    const impactLevel = item.impact_level || 'medium';
    const toneColor = getToneColor(tone);
    const impactClass = getImpactClass(impactLevel);
    const companyBadge = item.company ? `<span class="px-2 py-1 rounded text-xs bg-[rgba(58,134,255,0.1)] text-accent">${item.company}</span>` : '';

    div.innerHTML = `
        <div class="flex justify-between items-start mb-2">
            <a href="${item.link}" target="_blank" 
               class="text-sm font-semibold hover:underline flex-1 mr-2">
               ${item.title}
            </a>
            <div class="flex gap-2 flex-shrink-0">
                ${companyBadge}
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
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return '—';
    }
}

async function loadCompanyData(symbol) {
    try {
        // Находим компанию
        let company = publicCompanies.find(c => c.symbol === symbol);
        if (!company) {
            company = privateCompanies.find(c => c.symbol === symbol);
        }

        const homeView = document.getElementById('homeView');
        const companyView = document.getElementById('companyView');
        const privateView = document.getElementById('companyViewPrivate');
        const chart = document.getElementById('chartContainer');

        // --- Всегда скрываем оба шаблона перед показом нужного ---
        companyView.classList.add("hidden-section");
        privateView.classList.add("hidden-section");

        companyView.style.display = "none";
        privateView.style.display = "none";

        homeView.classList.add("hidden-section");

        if (!company) {
            console.error("Компания не найдена:", symbol);
            return;
        }

        // ============ ШАБЛОН ДЛЯ НЕПУБЛИЧНЫХ КОМПАНИЙ ============
        if (company.public === false) {

            chart.style.display = "none";

            privateView.classList.remove("hidden-section");
            privateView.style.display = "block";

            document.getElementById('pName').textContent = company.name;
            document.getElementById('pSector').textContent = `Сектор: ${company.sector}`;
            document.getElementById('pRevenue').textContent = company.revenue;
            document.getElementById('pTurnover').textContent = company.turnover || '—';
            document.getElementById('pLocation').textContent = company.location || '—';
            document.getElementById('pIndex').textContent = company.index;

            // Сообщаем остальным модулям, что открыт приватный (непубличный) профиль
            document.dispatchEvent(new CustomEvent('openCompany', {
                detail: { symbol: company.symbol, isPrivate: true }
            }));


            return;
        }

        // ============ ШАБЛОН ДЛЯ ПУБЛИЧНЫХ КОМПАНИЙ ============
        companyView.classList.remove("hidden-section");
        companyView.style.display = "block";
        chart.style.display = "block";

        document.getElementById('cName').textContent = company.name;
        document.getElementById('cSector').textContent = `Сектор: ${company.sector}`;
        document.getElementById('cRevenue').textContent = company.revenue;
        document.getElementById('cTurnover').textContent = company.turnover || '—';
        document.getElementById('cOwner').textContent = company.owner || '—';
        document.getElementById('cIndex').textContent = company.index;
        document.getElementById('cTicker').textContent = company.symbol;
        document.getElementById('cPrice').textContent = company.price;

        if (company.prices && company.prices.length > 0) {
            renderPriceChart(company.prices, company.name);
        }

        document.dispatchEvent(new CustomEvent('openCompany', {
            detail: { symbol: symbol }
        }));

    } catch (error) {
        console.error('Ошибка загрузки компании:', error);
    }
}


// Глобальные функции для доступа из HTML
window.openCompany = (symbol) => {
    showCompanyView(symbol);
};

window.performSearch = () => {
    const event = new CustomEvent('performSearch');
    document.dispatchEvent(event);
};

window.showHomeView = showHomeView;
window.showWorldNews = showWorldNews;


// Экспорт функции renderPriceChart для использования в charts.js
window.renderPriceChart = function(prices, companyName) {
    const svg = document.getElementById('priceChart');
    const chartPath = document.getElementById('chartPath');
    const chartDots = document.getElementById('chartDots');

    if (!svg || !chartPath || !chartDots) return;

    const w = 800, h = 200, pad = 20;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;

    let d = `M ${pad} ${h - pad}`;
    chartDots.innerHTML = '';

    prices.forEach((p, i) => {
        const x = pad + (i / (prices.length - 1)) * (w - pad * 2);
        const y = h - pad - ((p - min) / range) * (h - pad * 2);
        d += ` L ${x} ${y}`;

        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', x);
        circle.setAttribute('cy', y);
        circle.setAttribute('r', 4);
        circle.setAttribute('fill', 'var(--accent)');
        chartDots.appendChild(circle);
    });

    chartPath.setAttribute('d', d);

    // Обновляем заголовок
    const chartTitle = document.querySelector('#priceChart + .text-sm') ||
        document.createElement('div');
    if (!chartTitle.textContent) {
        chartTitle.className = 'text-sm mt-2 text-muted';
        chartTitle.textContent = `График акций ${companyName}`;
        svg.parentNode.appendChild(chartTitle);
    }
};

window.showCompanyView = showCompanyView;