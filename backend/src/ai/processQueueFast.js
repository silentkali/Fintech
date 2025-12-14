import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../../../data');
const QUEUE_FILE = path.join(DATA_DIR, 'queue_news.json');
const NEWS_FILE = path.join(DATA_DIR, 'news.json');

const AI_API_URL = 'http://127.0.0.1:1234/v1/chat/completions';
const AI_MODEL = 'Qwen2.5-7B-Instruct-1M';

const COMPANY_KEYWORDS = {
    GAZP: ['газпром', 'gazprom', 'газпрома', 'gazproma'],
    SBER: ['сбер', 'сбербанк', 'sber', 'sberbank'],
    YNDX: ['яндекс', 'yandex', 'яндекса', 'yandexa'],
    LKOH: ['лукойл', 'lukoil', 'лукойла', 'lukoila'],
    ROSN: ['роснефть', 'rosneft', 'роснефти', 'rosnefti'],
    NVTK: ['новатэк', 'novatek', 'новатэка', 'novateka'],
    POLY: ['полюс', 'polyus', 'полюса', 'polyusa'],
    NORN: ['норникель', 'nornickel', 'норникеля', 'nornickela', 'гмк'],
    TATN: ['татнефть', 'tatneft', 'татнефти', 'tatnefti'],
    VOLP: ['волтайр', 'voltyre', 'волтайр-пром', 'titan tire']
};

// Функция извлечения JSON из ответа AI (упрощенная)
function extractJSON(content) {
    if (!content || content.trim() === '') return null;

    // Ищем JSON в ответе
    const patterns = [
        /```json\s*\n([\s\S]*?)\n```/,
        /```\s*\n([\s\S]*?)\n```/,
        /\{[\s\S]*\}/
    ];

    for (const pattern of patterns) {
        const match = content.match(pattern);
        if (match) {
            try {
                let jsonStr = match[1] || match[0];
                jsonStr = jsonStr.trim();
                return JSON.parse(jsonStr);
            } catch (e) {
                // Продолжаем пробовать другие паттерны
            }
        }
    }

    // Пробуем парсить весь контент как JSON
    try {
        const cleanedContent = content.replace(/```/g, '').trim();
        return JSON.parse(cleanedContent);
    } catch (e) {
        return null;
    }
}

// Упрощенная предварительная фильтрация - почти все пропускаем
function preFilterNews(title, text) {
    const lowerText = (title + ' ' + text).toLowerCase();

    // Только очень явные исключения
    const excludes = [
        'гороскоп', 'астролог', 'знак зодиак',
        'рецепт', 'кулинар', 'готовка',
        'мода', 'стиль', 'косметика'
    ];

    for (const word of excludes) {
        if (lowerText.includes(word)) {
            console.log(`   🚫 Исключение: "${word}"`);
            return false;
        }
    }

    return true;
}

// Упрощенная функция анализа с AI
async function analyzeWithAI(title, text, companyName) {
    const prompt = `АНАЛИЗ НОВОСТИ: ${title}

ТЕКСТ: ${text.slice(0, 1500)}

${companyName ? `СВЯЗАННАЯ КОМПАНИЯ: ${companyName}` : ''}

Проанализируй и верни ТОЛЬКО JSON без лишнего текста:
{
  "tone": "positive/negative/neutral",
  "impact_level": "high/medium/low",
  "impact_score": 10-100,
  "summary": "краткое описание на русском",
  "skip": false
}`;

    try {
        const res = await fetch(AI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: AI_MODEL,
                messages: [{ role: "user", content: prompt }],
                temperature: 0.3,
                max_tokens: 500
            }),
            timeout: 30000 // 30 секунд на запрос
        });

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();
        const content = data.choices[0]?.message?.content || '';

        const result = extractJSON(content);

        if (!result) {
            return { skip: true, reason: 'Невалидный ответ от AI' };
        }

        if (result.skip === true) {
            return { skip: true, reason: result.reason || 'AI пропустил' };
        }

        // Валидация и нормализация
        const tone = ['positive', 'negative', 'neutral'].includes(result.tone?.toLowerCase())
            ? result.tone.toLowerCase()
            : 'neutral';

        const impact_level = ['high', 'medium', 'low'].includes(result.impact_level?.toLowerCase())
            ? result.impact_level.toLowerCase()
            : 'medium';

        let impact_score = parseInt(result.impact_score);
        impact_score = (impact_score >= 10 && impact_score <= 100) ? impact_score : 50;

        return {
            tone,
            impact_level,
            impact_score,
            summary: result.summary || `${title.substring(0, 100)}...`,
            skip: false
        };

    } catch (err) {
        console.warn(`⚠️ Ошибка AI: ${err.message}`);
        return { skip: true, reason: err.message };
    }
}

// Основная функция обработки всей очереди
async function processQueueFast() {
    await fs.ensureDir(DATA_DIR);

    const queue = await fs.readJson(QUEUE_FILE).catch(() => []);
    if (!queue.length) {
        console.log('ℹ️ Очередь пуста');
        return { processed: 0, remaining: 0 };
    }

    let newsStore = await fs.readJson(NEWS_FILE).catch(() => []);

    console.log(`\n🚀 ЗАПУСК БЫСТРОЙ ОБРАБОТКИ: ${queue.length} новостей...\n`);

    let processedCount = 0;
    let skippedCount = 0;
    const totalToProcess = queue.length;
    const startTime = Date.now();

    // Обрабатываем все новости в очереди
    for (let i = 0; i < queue.length; i++) {
        const item = queue[i];
        const progress = ((i + 1) / totalToProcess * 100).toFixed(1);

        console.log(`📊 Прогресс: ${progress}% (${i + 1}/${totalToProcess})`);

        const fullText = (item.title + ' ' + (item.rawText || '')).trim();

        // Быстрая предфильтрация
        if (!preFilterNews(item.title, fullText)) {
            console.log(`   ⏩ Пропуск: ${item.title.substring(0, 70)}...`);
            skippedCount++;
            continue;
        }

        // Определяем компанию
        const textLower = fullText.toLowerCase();
        let company = null;
        for (const [ticker, keywords] of Object.entries(COMPANY_KEYWORDS)) {
            if (keywords.some(kw => textLower.includes(kw))) {
                company = ticker;
                break;
            }
        }

        console.log(`📰 ${company || '—'} → ${item.title.substring(0, 70)}...`);

        try {
            const aiResult = await analyzeWithAI(item.title, fullText, company || '');

            if (aiResult.skip) {
                console.log(`   ⏩ AI пропустил: ${aiResult.reason}`);
                skippedCount++;
                continue;
            }

            // Сохраняем обработанную новость
            const newsItem = {
                id: item.id || Date.now(),
                source: item.source,
                title: item.title,
                link: item.link,
                pubDate: item.pubDate,
                company,
                tone: aiResult.tone,
                impact_level: aiResult.impact_level,
                impact_score: aiResult.impact_score,
                summary: aiResult.summary,
                processedAt: new Date().toISOString()
            };

            newsStore.unshift(newsItem);
            processedCount++;

            const emoji = aiResult.tone === 'positive' ? '✅' : aiResult.tone === 'negative' ? '❌' : '⚪';
            console.log(`   ${emoji} Тон: ${aiResult.tone} | Влияние: ${aiResult.impact_level} | Оценка: ${aiResult.impact_score}`);

            // Сохраняем прогресс каждые 10 обработанных новостей
            if (processedCount % 10 === 0) {
                await fs.writeJson(NEWS_FILE, newsStore, { spaces: 2 });
                console.log(`   💾 Автосохранение...`);
            }

        } catch (error) {
            console.error(`   ❌ Ошибка обработки: ${error.message}`);
            skippedCount++;
        }

        // Без задержек для максимальной скорости
    }

    // Финальное сохранение
    await fs.writeJson(NEWS_FILE, newsStore, { spaces: 2 });

    // Очищаем очередь (все обработаны или пропущены)
    await fs.writeJson(QUEUE_FILE, [], { spaces: 2 });

    const endTime = Date.now();
    const processingTime = ((endTime - startTime) / 1000).toFixed(1);
    const newsPerMinute = processedCount > 0 ? Math.round((processedCount / (endTime - startTime)) * 60000) : 0;

    // Подробная статистика
    console.log(`\n✅ БЫСТРАЯ ОБРАБОТКА ЗАВЕРШЕНА!`);
    console.log(`⏱️  Время обработки: ${processingTime} секунд`);
    console.log(`📊 Статистика:`);
    console.log(`   ├── Всего в очереди было: ${totalToProcess}`);
    console.log(`   ├── Успешно обработано: ${processedCount}`);
    console.log(`   ├── Пропущено/ошибок: ${skippedCount}`);
    console.log(`   ├── Скорость: ${newsPerMinute} новостей/минуту`);
    console.log(`   └── Всего в базе: ${newsStore.length}\n`);

    // Статистика по тональности
    if (processedCount > 0) {
        const recentNews = newsStore.slice(0, processedCount);
        const toneStats = recentNews.reduce((stats, item) => {
            stats[item.tone] = (stats[item.tone] || 0) + 1;
            return stats;
        }, {});

        console.log(`🎭 Тональность обработанных новостей:`);
        Object.entries(toneStats).forEach(([tone, count]) => {
            const percentage = ((count / processedCount) * 100).toFixed(1);
            console.log(`   ${tone}: ${count} (${percentage}%)`);
        });
    }

    return {
        total: totalToProcess,
        processed: processedCount,
        skipped: skippedCount,
        processingTime: `${processingTime} секунд`,
        newsPerMinute,
        totalInStore: newsStore.length
    };
}

// Экспортируем функцию
export { processQueueFast };

// Для запуска из командной строки
if (import.meta.url === `file://${process.argv[1]}`) {
    console.log('🚀 Запуск быстрой обработки очереди новостей...');
    console.log('⚡ Режим: без ограничений скорости и лимитов');
    console.log('⏳ Ожидайте завершения...\n');

    processQueueFast()
        .then(() => {
            console.log('🎉 Обработка завершена успешно!');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Критическая ошибка:', error);
            process.exit(1);
        });
}