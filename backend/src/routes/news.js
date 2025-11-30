import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const NEWS_FILE = path.join(__dirname, '../../../data/news.json');
const QUEUE_FILE = path.join(__dirname, '../../../data/queue_news.json');

// Загрузка JSON данных
function loadJSON(file) {
    return fs.existsSync(file)
        ? JSON.parse(fs.readFileSync(file, "utf8"))
        : [];
}

// Все новости
router.get("/", (req, res) => {
    try {
        const news = loadJSON(NEWS_FILE);
        const { limit, offset, company } = req.query;

        let filteredNews = news;

        if (company) {
            filteredNews = filteredNews.filter(n =>
                n.company && n.company.toLowerCase() === company.toLowerCase()
            );
        }

        if (offset) {
            filteredNews = filteredNews.slice(parseInt(offset));
        }

        if (limit) {
            filteredNews = filteredNews.slice(0, parseInt(limit));
        }

        res.json(filteredNews);
    } catch (err) {
        console.error("❌ Ошибка /api/news:", err);
        res.status(500).json({ error: "server error" });
    }
});

// Статус обработки
router.get("/status", (req, res) => {
    try {
        const queue = loadJSON(QUEUE_FILE);
        const news = loadJSON(NEWS_FILE);

        res.json({
            queue_length: queue.length,
            processed_news: news.length,
            last_processed: news[0]?.processedAt || null
        });
    } catch (err) {
        console.error("❌ Ошибка /api/news/status:", err);
        res.status(500).json({ error: "server error" });
    }
});

// Новости по компании с фильтром по периоду
router.get("/company/:symbol", (req, res) => {
    try {
        const symbol = req.params.symbol.trim().toUpperCase();
        const period = req.query.period || "1y";

        const allNews = loadJSON(NEWS_FILE);

        // Фильтруем по компании
        const companyNews = allNews.filter(n => n.company === symbol);

        // Фильтрация по периоду
        const periodMap = {
            "1d": 1, "3d": 3, "1w": 7,
            "1m": 30, "3m": 90, "1y": 365
        };

        const maxDays = periodMap[period] || 365;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - maxDays);

        const filteredNews = companyNews.filter(n => {
            const newsDate = new Date(n.pubDate || n.processedAt);
            return newsDate >= cutoffDate;
        });

        // Сортировка по дате (новые сначала)
        filteredNews.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

        res.json(filteredNews);
    } catch (err) {
        console.error("❌ Ошибка /api/news/company:", err);
        res.status(500).json({ error: "server error" });
    }
});

export default router;