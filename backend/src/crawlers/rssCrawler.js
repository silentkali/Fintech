import Parser from 'rss-parser';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const parser = new Parser();
const DATA_DIR = path.join(__dirname, '../../../data');
const QUEUE_FILE = path.join(DATA_DIR, 'queue_news.json');

// ОБНОВЛЕННЫЙ СПИСОК RSS ИСТОЧНИКОВ С TELEGRAM КАНАЛОМ
const RSS_SOURCES = [
    'https://rss.app/feeds/IQ0PQy3CTHnEtxPz.xml' ,
    'https://rss.app/feeds/58xUYjfTTTVjx8p3.xml',
    'https://lenta.ru/rss',
    'https://tass.ru/rss/v2.xml',
    'https://www.interfax.ru/rss.asp',
    'https://www.vedomosti.ru/rss/news',
    'https://ria.ru/export/rss2/index.xml',
    'https://rss.app/feeds/FuXm0qv4dbAHoE0T.xml',
    'https://www.forbes.com/business/feed/',
    'https://www.forbes.com/innovation/feed/',
    'https://rss.app/feeds/A1n5pIkCH0a5IEur.xml']

export async function crawlRSS() {
    await fs.ensureDir(DATA_DIR);
    let queue = await fs.readJson(QUEUE_FILE).catch(() => []);

    console.log('📡 Собираем новости из RSS...');

    for (const url of RSS_SOURCES) {
        try {
            const feed = await parser.parseURL(url);

            // Определяем тип источника для лучшего отображения
            let sourceName = feed.title || url;
            if (url.includes('rss.app')) {
                sourceName = 'Telegram: @master_pera';
            }

            console.log(`✅ Обработан: ${sourceName} (${feed.items.length} новостей)`);

            for (const item of feed.items) {
                if (!item.link || !item.title) continue;

                // Пропускаем дубли
                if (queue.some(q => q.link === item.link)) continue;

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