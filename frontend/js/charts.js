export function initializeCharts() {
    console.log('📊 Инициализация модуля графиков');

    document.addEventListener('openCompany', (event) => {
        const symbol = event.detail.symbol;
        drawCompanyChart(symbol);
    });
}

export function drawCompanyChart(symbol) {
    // Загрузка данных компании и отрисовка графика
    fetch(`/api/companies/${symbol}`)
        .then(response => response.json())
        .then(company => {
            if (company.prices) {
                renderPriceChart(company.prices, company.name);
            }
        })
        .catch(error => {
            console.error('❌ Ошибка загрузки данных для графика:', error);
        });
}

export function renderPriceChart(prices, companyName) {
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
}