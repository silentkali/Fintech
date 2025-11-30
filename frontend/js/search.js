export function initializeSearch() {
    console.log('🔍 Инициализация модуля поиска');

    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchInput');

    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', performSearch);
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') performSearch();
        });
    }

    document.addEventListener('performSearch', performSearch);
}

export async function performSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    const query = searchInput.value.trim().toLowerCase();
    if (!query) {
        // Если запрос пустой, показываем все компании
        window.location.reload();
        return;
    }

    try {
        const response = await fetch(`/api/companies/search/${encodeURIComponent(query)}`);
        const results = await response.json();

        if (results.length > 0) {
            displaySearchResults(results);
        } else {
            alert('Компания не найдена');
        }
    } catch (error) {
        console.error('❌ Ошибка поиска:', error);
        alert('Ошибка при поиске');
    }
}

function displaySearchResults(results) {
    const cardsGrid = document.getElementById('cardsGrid');
    if (!cardsGrid) return;

    cardsGrid.innerHTML = '';

    results.forEach(company => {
        const card = createCompanyCard(company);
        cardsGrid.appendChild(card);
    });
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
        window.openCompany(company.symbol);
    });

    return card;
}