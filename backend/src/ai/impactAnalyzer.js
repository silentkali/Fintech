import { classifyNews } from './newsClassifier.js';

export async function analyzeImpact(newsItem) {
    const text = `${newsItem.title}. ${newsItem.rawText || ''}`;

    try {
        const impactLevel = await classifyNews(text);

        // Преобразуем текстовую оценку в числовую
        const impactScores = {
            'High': 75,
            'Medium': 50,
            'Low': 25,
            'Unknown': 30
        };

        return {
            impact_level: impactLevel.toLowerCase(),
            impact_score: impactScores[impactLevel] || 30,
            analyzedAt: new Date().toISOString()
        };
    } catch (error) {
        console.error('❌ Ошибка анализа влияния:', error);
        return {
            impact_level: 'unknown',
            impact_score: 30,
            analyzedAt: new Date().toISOString()
        };
    }
}

export function calculateSentiment(text) {
    const positiveWords = ['рост', 'прибыль', 'успех', 'доход', 'контракт', 'инвестиции', 'развитие'];
    const negativeWords = ['убыток', 'падение', 'снижение', 'штраф', 'проблемы', 'сокращение'];

    const lowerText = text.toLowerCase();
    let positiveCount = 0;
    let negativeCount = 0;

    positiveWords.forEach(word => {
        if (lowerText.includes(word)) positiveCount++;
    });

    negativeWords.forEach(word => {
        if (lowerText.includes(word)) negativeCount++;
    });

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
}