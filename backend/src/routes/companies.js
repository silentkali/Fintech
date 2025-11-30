import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const COMPANIES_FILE = path.join(__dirname, '../../../data/companies.json');
const NEWS_FILE = path.join(__dirname, '../../../data/news.json');

function loadJSON(file) {
    if (!fs.existsSync(file)) {
        return {};
    }
    try {
        const content = fs.readFileSync(file, "utf8");
        return JSON.parse(content);
    } catch (err) {
        console.error(`❌ Ошибка загрузки ${file}:`, err);
        return {};
    }
}

function loadNewsArray() {
    if (!fs.existsSync(NEWS_FILE)) {
        return [];
    }
    try {
        const content = fs.readFileSync(NEWS_FILE, "utf8");
        return JSON.parse(content);
    } catch (err) {
        console.error(`❌ Ошибка загрузки ${NEWS_FILE}:`, err);
        return [];
    }
}

// Все компании
router.get("/", (req, res) => {
    try {
        const companies = loadJSON(COMPANIES_FILE);
        // Преобразуем объект в массив
        const companiesArray = Object.values(companies);
        res.json(companiesArray);
    } catch (err) {
        console.error("❌ Ошибка /api/companies:", err);
        res.status(500).json({ error: "server error" });
    }
});

// Конкретная компания
router.get("/:symbol", (req, res) => {
    try {
        const symbol = req.params.symbol.toUpperCase();
        const companies = loadJSON(COMPANIES_FILE);
        const news = loadNewsArray();

        const company = companies[symbol];
        if (!company) {
            return res.status(404).json({ error: "Company not found" });
        }

        // Добавляем статистику по новостям
        const companyNews = news.filter(n => n.company === symbol);
        const newsStats = {
            total: companyNews.length,
            positive: companyNews.filter(n => n.tone === 'positive').length,
            negative: companyNews.filter(n => n.tone === 'negative').length,
            neutral: companyNews.filter(n => n.tone === 'neutral').length,
            lastUpdate: companyNews[0]?.processedAt || null
        };

        res.json({
            ...company,
            newsStats
        });
    } catch (err) {
        console.error("❌ Ошибка /api/companies/:symbol:", err);
        res.status(500).json({ error: "server error" });
    }
});

// Поиск компаний
router.get("/search/:query", (req, res) => {
    try {
        const query = req.params.query.toLowerCase();
        const companies = loadJSON(COMPANIES_FILE);

        // Преобразуем объект в массив для поиска
        const companiesArray = Object.values(companies);

        const results = companiesArray.filter(company =>
            company.name.toLowerCase().includes(query) ||
            (company.symbol && company.symbol.toLowerCase().includes(query)) ||
            (company.sector && company.sector.toLowerCase().includes(query))
        );

        res.json(results);
    } catch (err) {
        console.error("❌ Ошибка /api/companies/search:", err);
        res.status(500).json({ error: "server error" });
    }
});

export default router;