import fetch from 'node-fetch';

const AI_API_URL = process.env.AI_API_URL || 'http://127.0.0.1:1234/v1/chat/completions';
const AI_MODEL = process.env.AI_MODEL || 'openai/gpt-oss-20b';

export async function classifyNews(text) {
    try {
        const response = await fetch(AI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: AI_MODEL,
                messages: [
                    {
                        role: "system",
                        content: "Оцени влияние новости на компанию. Верни одно слово: High, Medium, Low."
                    },
                    {
                        role: "user",
                        content: text.substring(0, 2000)
                    }
                ],
                temperature: 0.1,
                max_tokens: 10
            })
        });

        const data = await response.json();
        return data.choices[0].message.content.trim();
    } catch (error) {
        console.error("❌ AI error:", error.message);
        return "Unknown";
    }
}

export async function detectCompany(text, companyList) {
    try {
        const response = await fetch(AI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: AI_MODEL,
                messages: [
                    {
                        role: "system",
                        content: "Определи компанию из списка. Верни ТОЛЬКО тикер или NONE."
                    },
                    {
                        role: "user",
                        content: `Текст: "${text.substring(0, 1500)}"\n\nКомпании: ${companyList.join(", ")}`
                    }
                ],
                temperature: 0.1,
                max_tokens: 10
            })
        });

        const data = await response.json();
        return data.choices[0].message.content.trim();
    } catch (err) {
        console.error("❌ AI detectCompany error:", err.message);
        return "NONE";
    }
}