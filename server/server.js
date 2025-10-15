"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dayjs_1 = __importDefault(require("dayjs"));
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const PORT = process.env.PORT || 3003;
const CNB_DAILY_URL = process.env.CNB_DAILY_URL;
if (!CNB_DAILY_URL) {
    console.error('Error: CNB_DAILY_URL environment variable is not set.');
    process.exit(1);
}
class CNBServer {
    constructor({ port, cnbUrl }) {
        this.port = typeof port === 'string' ? parseInt(port) : (port || 3003);
        this.cnbUrl = cnbUrl;
        this.app = (0, express_1.default)();
        this.setupMiddleware();
        this.setupRoutes();
    }
    setupMiddleware() {
        this.app.use((req, res, next) => {
            res.setHeader('X-Frame-Options', 'DENY');
            res.setHeader('X-XSS-Protection', '1; mode=block');
            res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.setHeader('Cache-Control', 'public, max-age=300');
            res.setHeader('Access-Control-Allow-Origin', '*');
            next();
        });
    }
    static parseHeaderDateToISO(firstLine) {
        const datePart = firstLine.split('#')[0]?.trim();
        const parsed = (0, dayjs_1.default)(datePart, 'D MMM YYYY', true);
        // Validate that the date is valid
        if (!parsed.isValid()) {
            throw new Error(`Invalid date format in CNB data: ${datePart}`);
        }
        return parsed;
    }
    static getHeaderIndexes(headerLine) {
        const headerParts = headerLine.split('|').map(s => s.trim().toLowerCase());
        const indexes = {
            country: headerParts.indexOf('country'),
            currency: headerParts.indexOf('currency'),
            amount: headerParts.indexOf('amount'),
            code: headerParts.indexOf('code'),
            rate: headerParts.indexOf('rate'),
        };
        // Validate that required headers are present
        const missingHeaders = Object.entries(indexes)
            .filter(([_, index]) => index === -1)
            .map(([name]) => name);
        if (missingHeaders.length > 0) {
            throw new Error(`Missing required headers in CNB data: ${missingHeaders.join(', ')}`);
        }
        return indexes;
    }
    static parseCurrencyRateData(parts, idx) {
        if (!Array.isArray(parts)) {
            return null;
        }
        const amountStr = parts[idx.amount] || '1';
        const code = parts[idx.code] || '';
        const rateStr = parts[idx.rate] || '';
        const amount = Number(amountStr);
        const rate = Number(rateStr);
        if (!code || !isFinite(amount) || !isFinite(rate) || amount <= 0 || rate <= 0)
            return null;
        return {
            country: (parts[idx.country] || ''),
            currency: (parts[idx.currency] || ''),
            amount,
            currencyCode: code,
            rate
        };
    }
    static parseDailyTxtToJson(text) {
        const lines = text.split(/\r?\n/).filter(Boolean);
        if (lines.length < 3) {
            return { date: '', rates: [] };
        }
        try {
            // Process date and get header indexes
            const currencyDate = CNBServer.parseHeaderDateToISO(lines[0] ?? '');
            const idx = CNBServer.getHeaderIndexes(lines[1] ?? '');
            // Process rate lines (skip header and date lines)
            const rates = lines.slice(2)
                .map(line => line.trim())
                .filter(line => line.length > 0)
                .map(line => {
                const parts = line.split('|').map(s => s.trim());
                return CNBServer.parseCurrencyRateData(parts, idx);
            })
                .filter(Boolean);
            return { date: currencyDate.format('YYYY-MM-DD'), rates };
        }
        catch (error) {
            console.error('Error parsing CNB data:', error);
            return { date: '', rates: [] };
        }
    }
    async fetchCNBData() {
        const cnbResponse = await fetch(this.cnbUrl);
        if (!cnbResponse.ok) {
            throw new Error(`CNB response HTTP ${cnbResponse.status}`);
        }
        const contentType = cnbResponse.headers.get('content-type') || '';
        if (!contentType.includes('text/plain') && !contentType.includes('text/html')) {
            throw new Error(`Unexpected content type: ${contentType}`);
        }
        const json = CNBServer.parseDailyTxtToJson(await cnbResponse.text());
        return json;
    }
    setupRoutes() {
        this.app.get('/api/cnb/daily', async (_req, res) => {
            try {
                const data = await this.fetchCNBData();
                res.json(data);
            }
            catch (e) {
                console.error('CNB API error:', e);
                // Don't expose detailed error messages to clients
                res.status(500).json({
                    error: 'Server error processing exchange rate data',
                    timestamp: new Date().toISOString()
                });
            }
        });
        this.app.get('/health', (_req, res) => {
            res.json({ status: 'ok', timestamp: new Date().toISOString() });
        });
    }
    start() {
        process.on('uncaughtException', (error) => {
            console.error('Uncaught exception:', error);
        });
        this.app.listen(this.port, () => {
            console.log(`CNB Exchange rates: Server running on http://localhost:${this.port}`);
        });
    }
}
const server = new CNBServer({ port: PORT, cnbUrl: CNB_DAILY_URL });
server.start();
