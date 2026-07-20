// ╔══════════════════════════════════════════════════════════╗
// ║        KrdDown Telegram Bot v2.0 - Vercel Ready        ║
// ║        Developed by Zanyar Al-Mzuri Al-Kurdi           ║
// ║        © 2026 KrdDown. All Rights Reserved.            ║
// ╚══════════════════════════════════════════════════════════╝

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');

// ==================== CONFIGURATION ====================
const BOT_TOKEN = process.env.BOT_TOKEN;
const PROXY_API_URL = process.env.PROXY_API_URL || 'https://krddown.vercel.app/api/proxy';
const SITE_URL = process.env.SITE_URL || 'https://krddown.vercel.app';

// Check token
if (!BOT_TOKEN) {
    console.error('❌ BOT_TOKEN is missing!');
    process.exit(1);
}

// ==================== INITIALIZE ====================
const app = express();
app.use(express.json());

// Use webhook for Vercel, polling for local
const isProduction = process.env.VERCEL || process.env.NODE_ENV === 'production';
const botOptions = isProduction ? { webHook: { port: process.env.PORT || 3000 } } : { polling: true };

let bot;

if (isProduction) {
    // Webhook mode for Vercel
    bot = new TelegramBot(BOT_TOKEN);
    const VERCEL_URL = process.env.VERCEL_URL || 'https://krddown.vercel.app';
    bot.setWebHook(`${VERCEL_URL}/api/bot`);
    console.log('🌐 Webhook mode activated for Vercel');
} else {
    // Polling mode for local development
    bot = new TelegramBot(BOT_TOKEN, { polling: true });
    console.log('📡 Polling mode activated for local');
}

// ==================== STATS ====================
const stats = {
    users: new Map(),
    totalDownloads: 0,
    todayDownloads: 0,
    lastReset: new Date().toDateString(),
    startTime: new Date()
};

setInterval(() => {
    const today = new Date().toDateString();
    if (stats.lastReset !== today) {
        stats.todayDownloads = 0;
        stats.lastReset = today;
    }
}, 60000);

// ==================== HELPERS ====================
function getUserStats(userId) {
    if (!stats.users.has(userId)) {
        stats.users.set(userId, { downloads: 0, firstSeen: new Date(), lastSeen: new Date() });
    }
    return stats.users.get(userId);
}

function updateStats(userId) {
    const user = getUserStats(userId);
    user.downloads++;
    user.lastSeen = new Date();
    stats.totalDownloads++;
    stats.todayDownloads++;
}

function detectPlatform(url) {
    if (!url) return '🌐 Social Media';
    const u = url.toLowerCase();
    if (u.includes('tiktok.com') || u.includes('vm.tiktok.com')) return '🎵 TikTok';
    if (u.includes('instagram.com')) return '📸 Instagram';
    if (u.includes('facebook.com') || u.includes('fb.watch')) return '📘 Facebook';
    if (u.includes('youtube.com') || u.includes('youtu.be')) return '▶️ YouTube';
    if (u.includes('pinterest.com') || u.includes('pin.it')) return '📌 Pinterest';
    if (u.includes('snapchat.com')) return '👻 Snapchat';
    if (u.includes('twitter.com') || u.includes('x.com')) return '🐦 Twitter/X';
    return '🌐 Social Media';
}

function getIcon(url) {
    const u = url.toLowerCase();
    if (u.includes('tiktok.com')) return '🎵';
    if (u.includes('instagram.com')) return '📸';
    if (u.includes('facebook.com')) return '📘';
    if (u.includes('youtube.com')) return '▶️';
    if (u.includes('pinterest.com')) return '📌';
    if (u.includes('snapchat.com')) return '👻';
    return '🌐';
}

function isValidUrl(s) {
    try { new URL(s); return true; } catch { return false; }
}

function extractUrls(text) {
    const r = /(https?:\/\/[^\s]+)/g;
    return text.match(r) || [];
}

function formatNum(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
}

function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'بەیانیت باش ☀️';
    if (h < 18) return 'ڕۆژت باش 🌤️';
    return 'ئێوارەت باش 🌙';
}

async function downloadMedia(url) {
    // Try Vercel proxy first
    try {
        const res = await axios.post(PROXY_API_URL, { url }, { timeout: 30000 });
        return res.data;
    } catch (e) {
        console.log('Proxy failed, trying direct...');
    }
    // Try Cobalt direct
    try {
        const res = await axios.post('https://api.cobalt.tools/api/json', {
            url, vQuality: '1080', filenamePattern: 'pretty', isNoTTWatermark: true
        }, { timeout: 30000 });
        return res.data;
    } catch (e) {
        console.log('Direct API failed');
    }
    throw new Error('Download failed');
}

// ==================== KEYBOARDS ====================
const mainKb = {
    reply_markup: {
        keyboard: [
            ['📥 داونلۆدی ڤیدیۆ', '💎 پلانەکان'],
            ['ℹ️ یارمەتی', '📊 ئامارەکان'],
            ['👤 دەربارە', '📞 پەیوەندی']
        ],
        resize_keyboard: true
    }
};

const inlineKb = {
    reply_markup: {
        inline_keyboard: [
            [{ text: '🌐 وێبسایت', url: SITE_URL }, { text: '💎 پرۆ', url: SITE_URL }],
            [{ text: '📞 پەیوەندی', url: 'https://t.me/z_14x' }]
        ]
    }
};

// ==================== COMMANDS ====================
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const name = msg.from.first_name || 'هاوڕێ';
    getUserStats(msg.from.id);

    await bot.sendMessage(chatId,
        `${getGreeting()} *${name}*! 🎉\n\n` +
        `بەخێربێیت بۆ *KrdDown Bot*! 🤖\n\n` +
        `📥 *تایبەتمەندییەکان:*\n` +
        `🎵 TikTok - بێ واتەرمارک\n` +
        `📸 Instagram - پۆست و ستۆری\n` +
        `📘 Facebook - ڤیدیۆ و ڕیڵز\n` +
        `▶️ YouTube - تا 1080p\n` +
        `📌 Pinterest - ڤیدیۆ و وێنە\n\n` +
        `🔗 تەنها لینکێک بنێرە بۆم!\n\n` +
        `💎 پرۆ: ${SITE_URL}\n` +
        `📞 پەیوەندی: @z_14x`,
        { parse_mode: 'Markdown', ...mainKb }
    );
});

bot.onText(/\/help|ℹ️ یارمەتی/, async (msg) => {
    await bot.sendMessage(msg.chat.id,
        `📚 *ڕێبەری بەکارهێنان*\n\n` +
        `1️⃣ لینکی ڤیدیۆکە بنێرە\n` +
        `2️⃣ چاوەڕێبە\n` +
        `3️⃣ ڤیدیۆکەت وەربگرە\n\n` +
        `🌐 *تۆڕەکان:*\n` +
        `🎵 TikTok\n📸 Instagram\n📘 Facebook\n▶️ YouTube\n📌 Pinterest\n👻 Snapchat\n🐦 Twitter/X\n\n` +
        `💡 *نمونە:*\n\`https://www.tiktok.com/@user/video/123\`\n\n` +
        `⚠️ پلانی بێبەرامبەر: 1080p\n` +
        `💎 پلانی پرۆ: 4K HDR\n${SITE_URL}`,
        { parse_mode: 'Markdown', disable_web_page_preview: true, ...mainKb }
    );
});

bot.onText(/\/plans|💎 پلانەکان/, async (msg) => {
    await bot.sendMessage(msg.chat.id,
        `💎 *پلانەکانی KrdDown*\n\n` +
        `🆓 *بێبەرامبەر*\n✅ 1080p Full HD\n✅ هەموو تۆڕەکان\n✅ MP3 دەنگ\n⚠️ ڕیکلام\n\n` +
        `💎 *پرۆ*\n✅ 4K Ultra HD + HDR\n✅ Dolby Vision\n✅ بێ ڕیکلام\n✅ بێسنوور\n\n` +
        `🔗 ${SITE_URL}`,
        { parse_mode: 'Markdown', ...mainKb }
    );
});

bot.onText(/\/about|👤 دەربارە/, async (msg) => {
    await bot.sendMessage(msg.chat.id,
        `👤 *دەربارەی KrdDown*\n\n` +
        `گەشەپێدەر: *Zanyar Al-Mzuri Al-Kurdi*\n\n` +
        `📊 *ئامار:*\n` +
        `👥 بەکارهێنەر: ${formatNum(stats.users.size)}\n` +
        `📥 داونلۆد: ${formatNum(stats.totalDownloads)}\n` +
        `📅 ئەمڕۆ: ${formatNum(stats.todayDownloads)}\n\n` +
        `🌐 ${SITE_URL}\n📞 @z_14x`,
        { parse_mode: 'Markdown', ...mainKb }
    );
});

bot.onText(/\/stats|📊 ئامارەکان/, async (msg) => {
    const userId = msg.from.id;
    const user = getUserStats(userId);
    await bot.sendMessage(msg.chat.id,
        `📊 *ئامارەکان*\n\n` +
        `👤 *تۆ:* ${msg.from.first_name || 'نادیار'}\n` +
        `📥 داونلۆد: ${formatNum(user.downloads)}\n\n` +
        `📈 *گشتی:*\n` +
        `👥 بەکارهێنەر: ${formatNum(stats.users.size)}\n` +
        `📥 داونلۆد: ${formatNum(stats.totalDownloads)}\n` +
        `📅 ئەمڕۆ: ${formatNum(stats.todayDownloads)}`,
        { parse_mode: 'Markdown', ...mainKb }
    );
});

bot.onText(/\/contact|📞 پەیوەندی/, async (msg) => {
    await bot.sendMessage(msg.chat.id,
        `📞 *پەیوەندی*\n\n` +
        `👤 Zanyar Al-Mzuri\n` +
        `📱 @z_14x\n` +
        `📸 @z44nko\n` +
        `🎵 @z44nko\n\n` +
        `🌐 ${SITE_URL}`,
        { parse_mode: 'Markdown', ...mainKb }
    );
});

// ==================== MAIN HANDLER ====================
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const username = msg.from.username || msg.from.first_name || 'User';
    const text = msg.text;
    
    if (!text) return;
    
    // Skip commands and buttons
    if (text.startsWith('/') || ['📥', '💎', 'ℹ️', '📊', '👤', '📞'].some(p => text.startsWith(p))) return;
    
    const urls = extractUrls(text);
    
    if (urls.length === 0) {
        if (text.length < 30) {
            await bot.sendMessage(chatId,
                '❌ *لینکی دروست بنێرە!*\n\n' +
                '💡 نمونە:\n`https://www.tiktok.com/@user/video/123`\n\n' +
                'ℹ️ یارمەتی: /help',
                { parse_mode: 'Markdown', disable_web_page_preview: true, ...mainKb }
            );
        }
        return;
    }
    
    const url = urls[0];
    if (!isValidUrl(url)) {
        await bot.sendMessage(chatId, '❌ لینکەکە نادروستە!', { ...mainKb });
        return;
    }
    
    updateStats(userId);
    const platform = detectPlatform(url);
    const icon = getIcon(url);
    
    const procMsg = await bot.sendMessage(chatId,
        `${icon} *پرۆسێسکردن...*\n\n⏳ چاوەڕێبە...`,
        { parse_mode: 'Markdown' }
    );
    
    try {
        const result = await downloadMedia(url);
        await bot.deleteMessage(chatId, procMsg.message_id).catch(() => {});
        
        if (result.status === 'redirect' || result.status === 'stream') {
            await bot.sendMessage(chatId,
                `✅ *داونلۆد ئامادەیە!*\n${icon} ${platform}\n\n⬇️ ڤیدیۆکەت دەنێردرێت...`,
                { parse_mode: 'Markdown', ...mainKb }
            );
            
            try {
                await bot.sendVideo(chatId, result.url, {
                    caption: `${icon} داونلۆدکراو لە ${platform}\n🤖 @KrdDown_Bot\n💎 ${SITE_URL}`,
                    supports_streaming: true
                });
            } catch (e) {
                try {
                    await bot.sendDocument(chatId, result.url, {
                        caption: `📁 ڤیدیۆ - ${platform}\n🤖 @KrdDown_Bot`
                    });
                } catch (e2) {
                    await bot.sendMessage(chatId,
                        `🔗 *لینکی ڕاستەوخۆ:*\n\`${result.url}\`\n\n⚠️ بۆ ماوەی سنووردار چالاکە`,
                        { parse_mode: 'Markdown', ...mainKb }
                    );
                }
            }
        } else if (result.status === 'picker' && result.picker?.length > 0) {
            const count = result.picker.length;
            const max = Math.min(count, 10);
            await bot.sendMessage(chatId, `✅ *${count} وێنە دۆزرانەوە!*\n\n📸 ${max} وێنە دەنێردرێن...`, { parse_mode: 'Markdown', ...mainKb });
            
            for (let i = 0; i < max; i++) {
                try {
                    await bot.sendPhoto(chatId, result.picker[i].url || result.picker[i], {
                        caption: `📸 ${i + 1}/${count}\n🤖 @KrdDown_Bot`
                    });
                    await new Promise(r => setTimeout(r, 300));
                } catch (e) {
                    await bot.sendMessage(chatId, `📸 وێنەی ${i + 1}: ${result.picker[i].url || result.picker[i]}`);
                }
            }
        } else {
            await bot.sendMessage(chatId,
                '❌ *نەتوانرا داونلۆد بکرێت!*\n\n🚫 لینکەکە پشتگیری ناکرێت یان پڕایڤەتە\n📞 @z_14x',
                { parse_mode: 'Markdown', ...mainKb }
            );
        }
    } catch (e) {
        await bot.deleteMessage(chatId, procMsg.message_id).catch(() => {});
        await bot.sendMessage(chatId, '❌ *کێشەیەک ڕوویدا!*\n\n🔄 تکایە دووبارە هەوڵبدەرەوە\n📞 @z_14x', { parse_mode: 'Markdown', ...mainKb });
    }
});

// ==================== HEALTH CHECK ====================
app.get('/', (req, res) => {
    res.json({
        status: 'online',
        bot: 'KrdDown Bot',
        version: '2.0.0',
        users: stats.users.size,
        downloads: stats.totalDownloads,
        today: stats.todayDownloads,
        uptime: Math.floor((Date.now() - stats.startTime) / 1000)
    });
});

// Webhook endpoint for Vercel
app.post('/api/bot', (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n✅ KrdDown Bot v2.0 Online!\n🔌 Port: ${PORT}\n🕐 ${new Date().toLocaleString()}\n`);
});
