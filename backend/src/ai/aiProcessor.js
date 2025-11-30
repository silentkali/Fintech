import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../../../data');
const QUEUE_FILE = path.join(DATA_DIR, 'queue_news.json');
const NEWS_FILE = path.join(DATA_DIR, 'news.json');
const BATCH_SIZE = 10; // 10 новостей за раз

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

// Улучшенная функция извлечения JSON
function extractJSON(content) {
    if (!content || content.trim() === '') {
        console.log('❌ Пустой ответ от AI');
        return null;
    }

    console.log('📨 Сырой ответ AI:', content);

    // Пробуем разные форматы JSON
    const patterns = [
        // JSON в markdown блоке с языком
        /```json\s*\n([\s\S]*?)\n```/,
        // JSON в markdown блоке без языка
        /```\s*\n([\s\S]*?)\n```/,
        // JSON в markdown блоке в одну строку
        /```json\s*([^`]+)```/,
        // Просто JSON объект
        /\{[\s\S]*\}/,
        // JSON с возможными пробелами и переносами
        /\{\s*[\s\S]*?\s*\}/
    ];

    for (const pattern of patterns) {
        const match = content.match(pattern);
        if (match) {
            try {
                let jsonStr = match[1] || match[0];
                // Чистим строку от лишних пробелов
                jsonStr = jsonStr.trim();
                console.log('🔍 Найден JSON:', jsonStr);
                return JSON.parse(jsonStr);
            } catch (e) {
                console.log('❌ Ошибка парсинга JSON:', e.message);
                console.log('📝 Строка для парсинга:', match[1] || match[0]);
            }
        }
    }

    // Пробуем парсить весь контент как JSON (на случай если AI вернул чистый JSON)
    try {
        console.log('🔍 Пробуем парсить весь контент как JSON');
        const cleanedContent = content.replace(/```/g, '').trim();
        return JSON.parse(cleanedContent);
    } catch (e) {
        console.log('❌ Не удалось извлечь JSON из ответа');
    }

    return null;
}

// Упрощенная функция предварительной фильтрации - почти все пропускаем
function preFilterNews(title, text) {
    const lowerText = (title + ' ' + text).toLowerCase();

    // ОЧЕНЬ МЯГКИЕ ИСКЛЮЧЕНИЯ - только самое очевидное не-бизнес
    const softExcludes = [
        'гороскоп', 'астролог', 'знак зодиак',
        'рецепт', 'кулинар', 'готовка',
        'мода', 'стиль', 'косметика',
        'личная жизнь', 'роман', 'любовь'
    ];

    for (const word of softExcludes) {
        if (lowerText.includes(word)) {
            console.log(`   🚫 Мягкое исключение: "${word}"`);
            return false;
        }
    }

    // БИЗНЕС-КЛЮЧЕВЫЕ СЛОВА - расширенный список
    const businessKeywords = [
        // Компании
        'сбербанк', 'газпром', 'лукойл', 'яндекс', 'роснефть', 'новатэк',
        'полюс', 'норникель', 'татнефть', 'волтайр', 'тиньков', 'втб',
        'альфа-банк', 'мтс', 'мегафон', 'билайн', 'ростсельмаш', 'камаз',
        // Финансы и экономика
        'акци', 'акционер', 'дивидент', 'прибыль', 'убыток', 'выручка',
        'доход', 'финанс', 'экономик', 'инвест', 'рынок', 'бирж',
        'котировк', 'капитал', 'баланс', 'отчетност', 'квартал', 'годовой',
        'рубл', 'доллар', 'евро', 'валюта', 'курс', 'инфляция', 'ввп',
        // Бизнес-операции
        'контракт', 'сделк', 'поглощен', 'слияни', 'партнерств',
        'руководитель', 'директор', 'совет директор', 'менеджмент', 'генеральный',
        'производств', 'завод', 'фабрик', 'мощност', 'оборудован', 'технологи',
        'нефть', 'газ', 'энергетик', 'банк', 'страхован', 'кредит', 'заем',
        'листинг', 'ipo', 'облигаци', 'фондовый', 'ценные бумаги',
        // Общие бизнес-термины
        'компания', 'корпорация', 'холдинг', 'предприятие', 'фирма',
        'бизнес', 'предприниматель', 'стартап', 'инноваци'
    ];

    const hasBusinessKeyword = businessKeywords.some(keyword =>
        lowerText.includes(keyword)
    );

    // Пропускаем ВСЕ новости для AI анализа, даже если нет бизнес-ключевых слов
    // Пусть AI сам решает, что пропускать
    if (!hasBusinessKeyword) {
        console.log(`   🤔 Нет явных бизнес-ключевых слов, но отправляем в AI`);
        return true;
    }

    console.log(`   ✅ Есть бизнес-ключевые слова`);
    return true;
}

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
  "relevance": "high/medium/low",
  "skip": false
}

Если новость НЕ о бизнесе/финансах/компаниях - верни {"skip": true}`;

    try {
        console.log(`🤖 Анализ новости: ${title.substring(0, 60)}...`);

        const res = await fetch(AI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: AI_MODEL,
                messages: [
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 500
            }),
            timeout: 20000 // Уменьшаем таймаут для скорости
        });

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        }

        const data = await res.json();
        const content = data.choices[0]?.message?.content || '';

        const result = extractJSON(content);

        if (!result) {
            throw new Error('Пустой или невалидный ответ от AI');
        }

        // Если AI говорит пропустить новость
        if (result.skip === true) {
            console.log('⏩ AI пропустил новость (не бизнес-тематика)');
            return { skip: true };
        }

        return {
            tone: validateTone(result.tone),
            impact_level: validateImpactLevel(result.impact_level),
            impact_score: validateScore(result.impact_score),
            summary: result.summary || `${title.substring(0, 80)}...`,
            relevance: validateRelevance(result.relevance),
            skip: false
        };

    } catch (err) {
        console.warn(`⚠️ Ошибка AI: ${err.message}`);
        return {
            skip: true,
            reason: err.message
        };
    }
}

// Валидаторы
function validateTone(tone) {
    const tones = ['positive', 'negative', 'neutral'];
    return tones.includes(tone?.toLowerCase()) ? tone.toLowerCase() : 'neutral';
}

function validateImpactLevel(level) {
    const levels = ['high', 'medium', 'low'];
    return levels.includes(level?.toLowerCase()) ? level.toLowerCase() : 'medium';
}

function validateScore(score) {
    const num = parseInt(score);
    return (num >= 10 && num <= 100) ? num : 50;
}

function validateRelevance(relevance) {
    const levels = ['high', 'medium', 'low'];
    return levels.includes(relevance?.toLowerCase()) ? relevance.toLowerCase() : 'medium';
}

export async function processBatch() {
    await fs.ensureDir(DATA_DIR);

    const queue = await fs.readJson(QUEUE_FILE).catch(() => []);
    if (!queue.length) {
        console.log('ℹ️ Очередь пуста');
        return { processed: 0, remaining: 0, skipped: 0 };
    }

    const batch = queue.slice(0, BATCH_SIZE);
    let newsStore = await fs.readJson(NEWS_FILE).catch(() => []);

    console.log(`\n🧠 ЗАПУСК AI ОБРАБОТКИ: ${batch.length} новостей...\n`);

    let processedCount = 0;
    let skippedCount = 0;
    let sentToAI = 0;

    for (const item of batch) {
        const fullText = (item.title + ' ' + (item.rawText || '')).trim();

        // 1. Очень мягкая предварительная фильтрация
        if (!preFilterNews(item.title, fullText)) {
            console.log(`⏩ Пропуск: ${item.title.substring(0, 60)}...`);
            skippedCount++;
            continue;
        }

        sentToAI++;

        // 2. Определение компании по ключевым словам
        const textLower = fullText.toLowerCase();
        let company = null;
        for (const [ticker, keywords] of Object.entries(COMPANY_KEYWORDS)) {
            if (keywords.some(kw => textLower.includes(kw))) {
                company = ticker;
                break;
            }
        }

        console.log(`📰 ${company || '—'} → ${item.title.substring(0, 70)}...`);

        // 3. AI анализ
        try {
            console.log(`   🤖 Отправляем в AI анализ...`);
            const startTime = Date.now();

            const ai = await analyzeWithAI(item.title, fullText, company || '');

            const processingTime = Date.now() - startTime;
            console.log(`   ⏱️ Время обработки AI: ${processingTime}ms`);

            // Если AI говорит пропустить
            if (ai.skip) {
                console.log(`   ⏩ AI пропустил: "${ai.reason || 'не бизнес-тематика'}"`);
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
                tone: ai.tone,
                impact_level: ai.impact_level,
                impact_score: ai.impact_score,
                summary: ai.summary,
                relevance: ai.relevance,
                processedAt: new Date().toISOString(),
                processingTime: processingTime
            };

            newsStore.unshift(newsItem);

            const emoji = ai.tone === 'positive' ? '✅' : ai.tone === 'negative' ? '❌' : '⚪';
            const impactEmoji = ai.impact_level === 'high' ? '🔴' : ai.impact_level === 'medium' ? '🟡' : '🟢';

            console.log(`   ${emoji} ${impactEmoji} Тон: ${ai.tone} | Влияние: ${ai.impact_level} | Оценка: ${ai.impact_score}`);
            console.log(`   📝 Резюме: ${ai.summary.substring(0, 100)}...\n`);

            processedCount++;

        } catch (error) {
            console.error(`   ❌ Ошибка обработки: ${error.message}`);
            skippedCount++;
        }

        // Минимальная задержка для скорости - 100ms вместо 500ms
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    const remainingQueue = queue.slice(BATCH_SIZE);
    await fs.writeJson(QUEUE_FILE, remainingQueue, { spaces: 2 });
    await fs.writeJson(NEWS_FILE, newsStore, { spaces: 2 });

    // Статистика обработки
    console.log(`✅ AI ОБРАБОТКА ЗАВЕРШЕНА!`);
    console.log(`   📊 Статистика:`);
    console.log(`   ├── Отправлено в AI: ${sentToAI}`);
    console.log(`   ├── Успешно обработано: ${processedCount}`);
    console.log(`   ├── Пропущено AI: ${skippedCount}`);
    console.log(`   ├── Осталось в очереди: ${remainingQueue.length}`);
    console.log(`   └── Всего в базе: ${newsStore.length}\n`);

    // Если есть обработанные новости, покажем сводку по тональности
    if (processedCount > 0) {
        const toneStats = newsStore.slice(0, processedCount).reduce((stats, item) => {
            stats[item.tone] = (stats[item.tone] || 0) + 1;
            return stats;
        }, {});

        console.log(`   🎭 Тональность обработанных новостей:`);
        Object.entries(toneStats).forEach(([tone, count]) => {
            const percentage = ((count / processedCount) * 100).toFixed(1);
            console.log(`      ${tone}: ${count} (${percentage}%)`);
        });
        console.log('');
    }

    return {
        processed: processedCount,
        skipped: skippedCount,
        sentToAI: sentToAI,
        remaining: remainingQueue.length,
        total: newsStore.length,
        stats: {
            positive: newsStore.filter(n => n.tone === 'positive').length,
            negative: newsStore.filter(n => n.tone === 'negative').length,
            neutral: newsStore.filter(n => n.tone === 'neutral').length
        }
    };
}

// Автозапуск
if (import.meta.url === `file://${process.argv[1]}`) {
    processBatch();
}