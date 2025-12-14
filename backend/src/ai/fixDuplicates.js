import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../../../data');
const NEWS_FILE = path.join(DATA_DIR, 'news.json');
const BACKUP_FILE = path.join(DATA_DIR, `news_fix_backup_${Date.now()}.json`);

// Создаем ключ для группировки новостей
function createGroupKey(item) {
    if (!item || !item.title) return '';

    // Упрощаем заголовок для группировки
    const cleanTitle = item.title
        .toLowerCase()
        .replace(/[^\wа-яё\s]/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 100);

    // Добавляем дату (только день)
    const date = item.pubDate ?
        item.pubDate.substring(0, 10) :
        'nodate';

    return `${cleanTitle}|${date}`;
}

// Основная функция исправления дубликатов
async function fixDuplicates() {
    console.log('🔧 Исправление дубликатов новостей\n');

    // Создаем бэкап
    await fs.copy(NEWS_FILE, BACKUP_FILE);
    console.log(`💾 Создан бэкап: ${BACKUP_FILE}`);

    // Загружаем новости
    const news = await fs.readJson(NEWS_FILE).catch(() => []);
    console.log(`📊 Загружено новостей: ${news.length}`);

    if (news.length === 0) {
        console.log('❌ Новости не найдены');
        return;
    }

    // Добавляем индекс к каждой новости
    const newsWithIndex = news.map((item, index) => ({
        ...item,
        originalIndex: index,
        groupKey: createGroupKey(item)
    }));

    // Сортируем по дате (самые свежие сначала)
    newsWithIndex.sort((a, b) => {
        const dateA = a.pubDate ? new Date(a.pubDate) : new Date(0);
        const dateB = b.pubDate ? new Date(b.pubDate) : new Date(0);
        return dateB - dateA;
    });

    // Группируем новости
    const groups = new Map();

    for (const item of newsWithIndex) {
        if (!groups.has(item.groupKey)) {
            groups.set(item.groupKey, []);
        }
        groups.get(item.groupKey).push(item);
    }

    // Собираем статистику
    const groupsWithDuplicates = Array.from(groups.values())
        .filter(group => group.length > 1);

    console.log(`\n📊 Статистика:`);
    console.log(`   Всего групп: ${groups.size}`);
    console.log(`   Групп с дубликатами: ${groupsWithDuplicates.length}`);

    // Подсчитываем общее количество дубликатов для удаления
    let totalDuplicates = 0;
    groupsWithDuplicates.forEach(group => {
        totalDuplicates += group.length - 1; // Минус одна новость, которую оставляем
    });

    console.log(`   Всего дубликатов для удаления: ${totalDuplicates}`);
    console.log(`   Уникальных новостей останется: ${news.length - totalDuplicates}`);

    // Показываем примеры самых больших групп
    if (groupsWithDuplicates.length > 0) {
        console.log('\n📋 Топ-5 самых больших групп дубликатов:');

        groupsWithDuplicates
            .sort((a, b) => b.length - a.length)
            .slice(0, 5)
            .forEach((group, index) => {
                console.log(`\n${index + 1}. Группа из ${group.length} новостей:`);

                // Оставляем самую свежую новость
                const keep = group[0]; // Уже отсортированы по дате
                const removeCount = group.length - 1;

                console.log(`   ✅ ОСТАВИТЬ: "${keep.title.substring(0, 60)}..."`);
                console.log(`      📅 ${keep.pubDate?.substring(0, 10) || 'без даты'} | 📰 ${keep.source || 'нет источника'}`);
                console.log(`   ❌ УДАЛИТЬ: ${removeCount} дубликат(ов)`);

                // Показываем первые 2 удаляемых
                group.slice(1, 3).forEach((item, i) => {
                    console.log(`      ${i + 1}. "${item.title.substring(0, 50)}..."`);
                });

                if (removeCount > 2) {
                    console.log(`      ... и еще ${removeCount - 2}`);
                }
            });
    }

    // Спрашиваем подтверждение
    console.log('\n' + '='.repeat(60));
    console.log('⚠️  ВНИМАНИЕ: Это действие удалит дубликаты!');
    console.log('='.repeat(60));

    // Создаем массивы для сохранения и удаления
    const idsToKeep = new Set();
    const idsToRemove = new Set();

    // Для каждой группы оставляем самую свежую новость
    groups.forEach(group => {
        if (group.length === 1) {
            // Одиночные новости - оставляем
            idsToKeep.add(group[0].originalIndex);
        } else {
            // Группы с дубликатами - оставляем первую (самую свежую)
            const keep = group[0];
            idsToKeep.add(keep.originalIndex);

            // Остальные удаляем
            group.slice(1).forEach(item => {
                idsToRemove.add(item.originalIndex);
            });
        }
    });

    console.log(`\n📋 Итоговые цифры:`);
    console.log(`   Оставить новостей: ${idsToKeep.size}`);
    console.log(`   Удалить новостей: ${idsToRemove.size}`);

    // Проверяем, нет ли пересечений
    const intersection = Array.from(idsToKeep).filter(index => idsToRemove.has(index));
    if (intersection.length > 0) {
        console.log(`\n❌ КРИТИЧЕСКАЯ ОШИБКА: ${intersection.length} новостей в обоих списках!`);
        console.log('   Прерываем выполнение...');
        return;
    }

    // Проверяем, что сумма совпадает
    if (idsToKeep.size + idsToRemove.size !== news.length) {
        console.log(`\n⚠️  Предупреждение: Не все новости учтены!`);
        console.log(`   Оставить: ${idsToKeep.size}, Удалить: ${idsToRemove.size}, Всего: ${news.length}`);
        console.log(`   Разница: ${news.length - (idsToKeep.size + idsToRemove.size)}`);
    }

    // Создаем новый массив без дубликатов
    const filteredNews = [];
    for (let i = 0; i < news.length; i++) {
        if (idsToKeep.has(i)) {
            filteredNews.push(news[i]);
        }
    }

    console.log(`\n✅ Фильтрация завершена:`);
    console.log(`   Оригинальный массив: ${news.length} новостей`);
    console.log(`   Отфильтрованный массив: ${filteredNews.length} новостей`);

    // Сохраняем результат
    await fs.writeJson(NEWS_FILE, filteredNews, { spaces: 2 });

    console.log('\n' + '='.repeat(60));
    console.log('✅ ИСПРАВЛЕНИЕ ДУБЛИКАТОВ ЗАВЕРШЕНО!');
    console.log('='.repeat(60));
    console.log(`📊 ИТОГИ:`);
    console.log(`   Было новостей: ${news.length}`);
    console.log(`   Стало новостей: ${filteredNews.length}`);
    console.log(`   Удалено дубликатов: ${idsToRemove.size}`);
    console.log(`   Сохранено уникальных: ${idsToKeep.size}`);
    console.log('='.repeat(60));

    // Сохраняем отчет
    const reportFile = path.join(DATA_DIR, `duplicates_fix_report_${Date.now()}.json`);
    const report = {
        fixedAt: new Date().toISOString(),
        originalCount: news.length,
        finalCount: filteredNews.length,
        removedCount: idsToRemove.size,
        keptCount: idsToKeep.size,
        groupsCount: groups.size,
        duplicateGroupsCount: groupsWithDuplicates.length,
        largestGroups: groupsWithDuplicates
            .sort((a, b) => b.length - a.length)
            .slice(0, 10)
            .map(group => ({
                count: group.length,
                sampleTitle: group[0].title.substring(0, 80),
                sampleDate: group[0].pubDate,
                sampleSource: group[0].source
            }))
    };

    await fs.writeJson(reportFile, report, { spaces: 2 });
    console.log(`\n📄 Отчет сохранен: ${reportFile}`);
    console.log(`💾 Бэкап сохранен: ${BACKUP_FILE}`);

    return {
        originalCount: news.length,
        finalCount: filteredNews.length,
        removedCount: idsToRemove.size,
        keptCount: idsToKeep.size,
        backupFile: BACKUP_FILE,
        reportFile: reportFile
    };
}

// Запуск
console.log('🚀 Запуск исправления дубликатов...\n');
console.log('Алгоритм:');
console.log('1. Группирует новости по заголовку и дате');
console.log('2. В каждой группе оставляет ОДНУ новость (самую свежую)');
console.log('3. Удаляет все остальные новости из группы');
console.log('4. Сохраняет результат\n');

fixDuplicates()
    .then(result => {
        console.log('\n🎉 Исправление завершено успешно!');
        console.log(`\n💾 Бэкап: ${result.backupFile}`);
        console.log(`📄 Отчет: ${result.reportFile}`);
        console.log('\n⚠️  Если что-то пошло не так, восстановите файл командой:');
        console.log(`   cp "${result.backupFile}" "${NEWS_FILE}"`);
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ ОШИБКА:', error.message);
        console.error(error.stack);
        process.exit(1);
    });