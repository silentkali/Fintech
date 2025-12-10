import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import net from "net"; // Импортируем модуль net

import newsRoutes from "./src/routes/news.js";
import companiesRoutes from "./src/routes/companies.js";
import analysisRoutes from "./src/routes/analysis.js";
import { unifiedNewsProcessing } from "../services/unifiedProcessor.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(express.json({ limit: "5mb" }));
app.use(cors());

// API Routes
app.use("/api/news", newsRoutes);
app.use("/api/companies", companiesRoutes);
app.use("/api/analysis", analysisRoutes);

// Serve frontend
app.use(express.static(path.join(__dirname, "../frontend")));

// Health check
app.get("/api/health", (req, res) => {
    res.json({
        status: "OK",
        timestamp: new Date().toISOString(),
        service: "FinAnalytica Backend",
        port: server.address().port
    });
});

// Start unified processing
unifiedNewsProcessing();

// Function to find available port
function findAvailablePort(startPort = 3000, maxPort = 4000) {
    return new Promise((resolve, reject) => {
        const server = net.createServer();

        server.once('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                if (startPort < maxPort) {
                    findAvailablePort(startPort + 1, maxPort).then(resolve).catch(reject);
                } else {
                    reject(new Error(`No available ports found between ${startPort} and ${maxPort}`));
                }
            } else {
                reject(err);
            }
        });

        server.once('listening', () => {
            server.close(() => {
                resolve(startPort);
            });
        });

        server.listen(startPort);
    });
}

// Start server with dynamic port
let server;

async function startServer() {
    try {
        const port = await findAvailablePort(3000, 4000);

        server = app.listen(port, () => {
            console.log(`🚀 Backend server running at http://localhost:${port}`);
            console.log(`📊 API endpoints available at http://localhost:${port}/api`);
            console.log(`🌐 Frontend: http://localhost:${port}`);
            console.log(`🔧 Using port: ${port}`);
        });

        return server;
    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server gracefully...');
    if (server) {
        server.close(() => {
            console.log('✅ Server closed');
            process.exit(0);
        });
    } else {
        process.exit(0);
    }
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down...');
    if (server) {
        server.close(() => {
            process.exit(0);
        });
    } else {
        process.exit(0);
    }
});

// Start the application
startServer().catch(console.error);