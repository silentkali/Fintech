import { processQueueFast } from './processQueueFast.js';

// Конфигурация
const CONFIG = {
    maxRetries: 3,
    retryDelay: 5000 // 5 секунд между попытками
};

async function runWithRetry() {
    let lastError = null;

    for (let attempt = 1; attempt <= CONFIG.maxRetries; attempt++) {
        try {
            console.log(`\n🔄 Попытка ${attempt} из ${CONFIG.maxRetries}...`);
            const result = await processQueueFast();

            // Проверяем, остались ли новости в очереди
            const fs = await import('fs-extra');
            const queue = await fs.readJson('../../../data/queue_news.json').catch(() => []);

            if (queue.length > 0) {
                console.log(`⚠️ В очереди осталось ${queue.length} новостей, повторяем...`);
                continue;
            }

            return result;

        } catch (error) {
            lastError = error;
            console.error(`❌ Ошибка на попытке ${attempt}:`, error.message);

            if (attempt < CONFIG.maxRetries) {
                console.log(`⏳ Повтор через ${CONFIG.retryDelay / 1000} секунд...`);
                await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelay));
            }
        }
    }

    throw new Error(`Не удалось обработать очередь после ${CONFIG.maxRetries} попыток: ${lastError?.message}`);
}

// Запуск
console.log('========================================');
console.log('🚀 FAST QUEUE PROCESSOR - МАКСИМАЛЬНАЯ СКОРОСТЬ');
console.log('========================================\n');

runWithRetry()
    .then(result => {
        console.log('\n' + '='.repeat(40));
        console.log('✅ ОБРАБОТКА УСПЕШНО ЗАВЕРШЕНА!');
        console.log('='.repeat(40));
        console.log(`📊 ИТОГИ:`);
        console.log(`   ▪️ Всего обработано: ${result.processed}`);
        console.log(`   ▪️ Пропущено: ${result.skipped}`);
        console.log(`   ▪️ Время: ${result.processingTime}`);
        console.log(`   ▪️ Скорость: ${result.newsPerMinute} нов/мин`);
        console.log(`   ▪️ Всего новостей в базе: ${result.totalInStore}`);
        console.log('='.repeat(40));
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ ФАТАЛЬНАЯ ОШИБКА:', error.message);
        process.exit(1);
    });