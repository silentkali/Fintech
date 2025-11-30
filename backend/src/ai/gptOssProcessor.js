import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../../../data');
const QUEUE_FILE = path.join(DATA_DIR, 'queue_news.json');
const NEWS_FILE = path.join(DATA_DIR, 'news.json');
const BATCH_SIZE = 3; // Еще меньше для сложной модели

const AI_API_URL = 'http://127.0.0.1:1234/v1/chat/completions';
const AI_MODEL = 'openai/gpt-oss-20b';

const COMPANY_KEYWORDS = {
    GAZP: ['газпром', 'gazprom'],
    SBER: ['сбер', 'сбербанк', 'sber'],
    YNDX: ['яндекс', 'yandex'],
    LKOH: ['лукойл', 'lukoil'],
    ROSN: ['роснефть', 'rosneфть', 'rosneft'],
    NVTK: ['новатэк', 'novatek'],
    POLY: ['полюс', 'polyus'],
    NORN: ['норникель', 'nornickel', 'гмк'],
    TATN: ['татнефть', 'tatneft'],
    VOLP: ['волтайр', 'voltyre', 'волтайр-пром', 'titan tire']
};

async function analyzeWithAI(title, text, companyName) {
    const prompt = `АНАЛИЗ НОВОСТИ ДЛЯ КОМПАНИИ: ${companyName || 'НЕИЗВЕСТНАЯ'}

ЗАГОЛОВОК: ${title}
ТЕКСТ: ${text.slice(0, 2000)}

ПРОАНАЛИЗИРУЙ И ВЕРНИ JSON:
{
  "tone": "positive|negative|neutral",
  "impact_level": "high|medium|low",
  "impact_score": число_10_100,
  "summary": "краткое_резюме",
  "relevance": "high|medium|low"
}

ОТВЕТ ТОЛЬКО В JSON ФОРМАТЕ БЕЗ ЛИШНИХ СЛОВ!`;

    try {
        console.log(`🤖 Запрос к ${AI_MODEL}...`);

        const res = await fetch(AI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: AI_MODEL,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.1,
                max_tokens: 400,
                stop: ["```", "---"] // Стоп-символы для чистого JSON
            }),
            timeout: 45000
        });

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        }

        const data = await res.json();

        // Обрабатываем особый формат gpt-oss-20b
        let content = data.choices[0]?.message?.content ||
            data.choices[0]?.message?.reasoning ||
            '';

        console.log('📨 Сырой ответ:', content.substring(0, 300));

        // Пытаемся извлечь JSON разными способами
        let jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            // Если JSON не найден, пробуем найти в reasoning
            const reasoning = data.choices[0]?.message?.reasoning || '';
            jsonMatch = reasoning.match(/\{[\s\S]*\}/);
        }

        if (jsonMatch) {
            try {
                const result = JSON.parse(jsonMatch[0]);

                // Валидация и нормализация результата
                return {
                    tone: validateTone(result.tone),
                    impact_level: validateImpactLevel(result.impact_level),
                    impact_score: validateScore(result.impact_score),
                    summary: result.summary || title.substring(0, 100) + '...',
                    relevance: validateRelevance(result.relevance)
                };
            } catch (e) {
                console.warn('❌ Ошибка парсинга JSON:', e.message);
            }
        }

        throw new Error('Не удалось извлечь JSON из ответа');

    } catch (err) {
        console.warn(`⚠️ Ошибка AI (${err.message}) → fallback`);
        return getFallbackAnalysis(title, text);
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

function getFallbackAnalysis(title, text) {
    const lowerText = text.toLowerCase();

    if (lowerText.includes('штраф') || lowerText.includes('убыток') || lowerText.includes('снижение')) {
        return {
            tone: 'negative',
            impact_level: 'high',
            impact_score: 75,
            summary: `Негативная новость: ${title.substring(0, 80)}...`,
            relevance: 'high'
        };
    }
    if (lowerText.includes('рост') || lowerText.includes('прибыль') || lowerText.includes('контракт')) {
        return {
            tone: 'positive',
            impact_level: 'high',
            impact_score: 80,
            summary: `Позитивная новость: ${title.substring(0, 80)}...`,
            relevance: 'high'
        };
    }
    return {
        tone: 'neutral',
        impact_level: 'low',
        impact_score: 40,
        summary: title.substring(0, 100) + '...',
        relevance: 'low'
    };
}

export async function processBatch() {
    await fs.ensureDir(DATA_DIR);

    const queue = await fs.readJson(QUEUE_FILE).catch(() => []);
    if (!queue.length) {
        console.log('ℹ️ Очередь пуста');
        return { processed: 0, remaining: 0 };
    }

    const batch = queue.slice(0, BATCH_SIZE);
    let newsStore = await fs.readJson(NEWS_FILE).catch(() => []);

    console.log(`\n🧠 ЗАПУСК ${AI_MODEL}: ${batch.length} новостей...\n`);

    let processedCount = 0;

    for (const item of batch) {
        const fullText = (item.title + ' ' + (item.rawText || '')).trim();
        const textLower = fullText.toLowerCase();

        let company = null;
        for (const [ticker, keywords] of Object.entries(COMPANY_KEYWORDS)) {
            if (keywords.some(kw => textLower.includes(kw))) {
                company = ticker;
                break;
            }
        }

        console.log(`📰 ${company || '—'} → ${item.title.substring(0, 50)}...`);

        try {
            const ai = await analyzeWithAI(item.title, fullText, company || '');

            newsStore.unshift({
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
                processedAt: new Date().toISOString()
            });

            const emoji = ai.tone === 'positive' ? '✅' : ai.tone === 'negative' ? '❌' : '⚪';
            console.log(`   ${emoji} ${ai.impact_level} | Score: ${ai.impact_score} | ${ai.summary}\n`);

            processedCount++;

        } catch (error) {
            console.error(`❌ Ошибка:`, error.message);
            continue;
        }
    }

    // Сохраняем
    const remainingQueue = queue.slice(BATCH_SIZE);
    await fs.writeJson(QUEUE_FILE, remainingQueue, { spaces: 2 });
    await fs.writeJson(NEWS_FILE, newsStore, { spaces: 2 });

    console.log(`✅ Обработано: ${processedCount}/${batch.length} | Очередь: ${remainingQueue.length} | Всего: ${newsStore.length}\n`);

    return {
        processed: processedCount,
        remaining: remainingQueue.length,
        total: newsStore.length
    };
}

// Автозапуск
if (import.meta.url === `file://${process.argv[1]}`) {
    processBatch();
}

export { processBatch };