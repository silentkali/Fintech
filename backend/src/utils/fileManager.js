import fs from 'fs-extra';
import path from 'path';

export async function ensureDirectory(dirPath) {
    await fs.ensureDir(dirPath);
}

export async function readJSON(filePath, defaultValue = []) {
    try {
        return await fs.readJson(filePath);
    } catch (error) {
        return defaultValue;
    }
}

export async function writeJSON(filePath, data) {
    await fs.writeJson(filePath, data, { spaces: 2 });
}

export async function appendToJSON(filePath, newData) {
    const existingData = await readJSON(filePath);
    const updatedData = Array.isArray(existingData)
        ? [...existingData, ...newData]
        : { ...existingData, ...newData };

    await writeJSON(filePath, updatedData);
    return updatedData;
}

export function fileExists(filePath) {
    return fs.existsSync(filePath);
}