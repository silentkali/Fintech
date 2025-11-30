import { unifiedCrawl } from '../backend/src/crawlers/unifiedCrawler.js';
import { processBatch } from '../backend/src/ai/aiProcessor.js';

export async function unifiedNewsProcessing() {
    console.log('🔄 Запуск унифицированного обработчика новостей...');

    try {
        // 1. Парсим RSS
        console.log('📡 Этап 1: Сбор новостей...');
        const crawlResult = await unifiedCrawl();

        // 2. Обрабатываем нейросетью
        console.log('🧠 Этап 2: AI обработка...');
        const processResult = await processBatch();

        console.log('✅ Унифицированная обработка завершена!');
        console.log(`📊 Результаты: Собрано RSS: ${crawlResult.rss}, Обработано AI: ${processResult.processed}`);

        return {
            crawl: crawlResult,
            process: processResult,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.error('❌ Ошибка в unifiedNewsProcessing:', error);
        throw error;
    }
}

// Автоматический запуск каждые 10 минут
setInterval(unifiedNewsProcessing, 10 * 60 * 1000);

// Для прямого запуска
if (import.meta.url === `file://${process.argv[1]}`) {
    unifiedNewsProcessing();
}