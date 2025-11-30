// Конфигурация приложения
export const CONFIG = {
    RSS_SOURCES: [
        'https://lenta.ru/rss',
        'https://www.rbc.ru/v10/rbcnews/rss/news.rss',
        'https://tass.ru/rss/v2.xml',
        'https://www.interfax.ru/rss.asp',
        'https://www.vedomosti.ru/rss/news',
        'https://www.kommersant.ru/RSS/news.xml',
        'https://ria.ru/export/rss2/index.xml',
        'https://www.gazeta.ru/export/rss.xml'
    ],

    COMPANY_KEYWORDS: {
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
    },

    AI_CONFIG: {
        url: process.env.AI_API_URL || 'http://localhost:1234/v1/chat/completions',
        model: 'local',
        temperature: 0.2,
        max_tokens: 500
    },

    PROCESSING: {
        batch_size: 6,
        crawl_interval: 10 * 60 * 1000, // 10 минут
        process_interval: 5 * 60 * 1000  // 5 минут
    }
};

export const PATHS = {
    DATA_DIR: path.join(process.cwd(), 'data'),
    QUEUE_FILE: path.join(process.cwd(), 'data', 'queue_news.json'),
    NEWS_FILE: path.join(process.cwd(), 'data', 'news.json'),
    COMPANIES_FILE: path.join(process.cwd(), 'data', 'companies.json')
};