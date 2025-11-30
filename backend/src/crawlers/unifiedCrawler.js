import { crawlRSS } from './rssCrawler.js';

export async function unifiedCrawl() {
    console.log('🚀 Запуск унифицированного сбора новостей...');

    try {
        const rssCount = await crawlRSS();
        // Telegram работает в реальном времени отдельно

        console.log(`✅ Унифицированный сбор завершен! Обработано RSS: ${rssCount}`);
        return { rss: rssCount };
    } catch (error) {
        console.error('❌ Ошибка в unifiedCrawl:', error);
        throw error;
    }
}

// Для прямого запуска
if (import.meta.url === `file://${process.argv[1]}`) {
    unifiedCrawl();
}