import { unifiedNewsProcessing } from './unifiedProcessor.js';

class NewsScheduler {
    constructor() {
        this.intervals = [];
        this.isRunning = false;
    }

    start() {
        if (this.isRunning) return;

        console.log('⏰ Запуск планировщика задач...');

        // Запуск каждые 10 минут
        const crawlInterval = setInterval(() => {
            console.log('🕒 Запланированный запуск обработки...');
            unifiedNewsProcessing().catch(console.error);
        }, 10 * 60 * 1000);

        this.intervals.push(crawlInterval);
        this.isRunning = true;

        // Первый запуск
        setTimeout(() => {
            unifiedNewsProcessing().catch(console.error);
        }, 3000);

        console.log('✅ Планировщик запущен (интервал: 10 минут)');
    }

    stop() {
        this.intervals.forEach(interval => clearInterval(interval));
        this.intervals = [];
        this.isRunning = false;
        console.log('🛑 Планировщик остановлен');
    }

    getStatus() {
        return {
            isRunning: this.isRunning,
            intervals: this.intervals.length,
            nextRun: this.isRunning ? new Date(Date.now() + 10 * 60 * 1000) : null
        };
    }
}

const scheduler = new NewsScheduler();
export default scheduler;

// Автозапуск при импорте
scheduler.start();