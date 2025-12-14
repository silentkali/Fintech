import Parser from 'rss-parser';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const parser = new Parser();
const DATA_DIR = path.join(__dirname, '../../../data');
const QUEUE_FILE = path.join(DATA_DIR, 'queue_news.json');

// ОБНОВЛЕННЫЙ СПИСОК RSS ИСТОЧНИКОВ С ПРАВИЛЬНЫМИ НАЗВАНИЯМИ
const RSS_SOURCES = [
    'https://lenta.ru/rss',
    'https://tass.ru/rss/v2.xml',
    'https://www.interfax.ru/rss.asp',
    'https://www.vedomosti.ru/rss/news',
    'https://ria.ru/export/rss2/index.xml',
    'https://rss.app/feeds/JzWqsJHoo9CParPp.xml', //master_pera
    'https://www.forbes.com/business/feed/',
    'https://www.forbes.com/innovation/feed/',
    'https://rss.app/feeds/PXo3gaNHqIDi4Jzb.xml', //markettwits
    'https://rss.app/feeds/rQz6Ti0y5CUn4T8s.xml' //trumpolit
];

// Маппинг URL к понятным названиям
const SOURCE_NAMES = {
    'https://lenta.ru/rss': 'Lenta.ru',
    'https://tass.ru/rss/v2.xml': 'ТАСС',
    'https://www.interfax.ru/rss.asp': 'Интерфакс',
    'https://www.vedomosti.ru/rss/news': 'Ведомости',
    'https://ria.ru/export/rss2/index.xml': 'РИА Новости',
    'https://rss.app/feeds/JzWqsJHoo9CParPp.xml': 'Telegram: @master_pera',
    'https://www.forbes.com/business/feed/': 'Forbes Business',
    'https://www.forbes.com/innovation/feed/': 'Forbes Innovation',
    'https://rss.app/feeds/PXo3gaNHqIDi4Jzb.xml': 'Telegram: @markettwits',
    'https://rss.app/feeds/rQz6Ti0y5CUn4T8s.xml': 'Telegram: @trumpolit'
};

export async function crawlRSS() {
    await fs.ensureDir(DATA_DIR);
    let queue = await fs.readJson(QUEUE_FILE).catch(() => []);

    console.log('📡 Собираем новости из RSS...');

    for (const url of RSS_SOURCES) {
        try {
            const feed = await parser.parseURL(url);

            // Используем маппинг для определения имени источника
            let sourceName = SOURCE_NAMES[url] || feed.title || url;

            console.log(`✅ Обработан: ${sourceName} (${feed.items.length} новостей)`);

            for (const item of feed.items) {
                if (!item.link || !item.title) continue;

                // Пропускаем дубликаты
                if (queue.some(q => q.link === item.link)) continue;

                // Для телеграм-каналов из rss.app проверяем реальный канал
                if (url.includes('rss.app')) {
                    // Если ссылка ведет на телеграм, определяем реальный канал
                    if (item.link.includes('t.me/')) {
                        const match = item.link.match(/t\.me\/([^\/]+)/);
                        if (match && match[1]) {
                            // Обновляем название источника на реальный канал
                            sourceName = `Telegram: @${match[1]}`;
                        }
                    }
                }

                queue.push({
                    id: Date.now() + Math.random(),
                    source: sourceName,
                    title: item.title,
                    link: item.link,
                    pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
                    rawText: item.contentSnippet || item.content || item.summary || '',
                    fetchedAt: new Date().toISOString(),
                    type: url.includes('rss.app') ? 'telegram' : 'rss'
                });
            }
        } catch (err) {
            console.warn(`❌ Ошибка при парсинге ${url}:`, err.message);
        }
    }

    await fs.writeJson(QUEUE_FILE, queue, { spaces: 2 });
    console.log(`✅ RSS сбор завершен! Новостей в очереди: ${queue.length}`);

    return queue.length;
}

// Функция для получения статистики по источникам
export async function getRSSStats() {
    const queue = await fs.readJson(QUEUE_FILE).catch(() => []);

    const stats = {};
    queue.forEach(item => {
        stats[item.source] = (stats[item.source] || 0) + 1;
    });

    // Выводим статистику
    console.log('\n📊 Статистика по источникам:');
    Object.entries(stats)
        .sort((a, b) => b[1] - a[1])
        .forEach(([source, count]) => {
            console.log(`   ${source}: ${count} новостей`);
        });

    return {
        total: queue.length,
        bySource: stats
    };
}