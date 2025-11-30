import express from "express";
import { processBatch } from "../ai/aiProcessor.js";
import { unifiedCrawl } from "../crawlers/unifiedCrawler.js";

const router = express.Router();

// Запуск обработки новостей
router.post("/process", async (req, res) => {
    try {
        const result = await processBatch();
        res.json({
            success: true,
            message: "AI processing completed",
            result
        });
    } catch (error) {
        console.error("❌ Ошибка обработки:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Запуск сбора новостей
router.post("/crawl", async (req, res) => {
    try {
        const result = await unifiedCrawl();
        res.json({
            success: true,
            message: "News crawling completed",
            result
        });
    } catch (error) {
        console.error("❌ Ошибка сбора:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Полная обработка (сбор + AI)
router.post("/full-process", async (req, res) => {
    try {
        const crawlResult = await unifiedCrawl();
        const processResult = await processBatch();

        res.json({
            success: true,
            message: "Full processing completed",
            results: {
                crawl: crawlResult,
                process: processResult
            }
        });
    } catch (error) {
        console.error("❌ Ошибка полной обработки:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

export default router;