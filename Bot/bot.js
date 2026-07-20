// ╔══════════════════════════════════════════════════════════╗
// ║           KrdDown Telegram Bot v2.0.0                  ║
// ║           Developed by Zanyar Al-Mzuri Al-Kurdi        ║
// ║           © 2026 KrdDown. All Rights Reserved.         ║
// ╚══════════════════════════════════════════════════════════╝

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');

// ==================== CONFIGURATION ====================
const BOT_TOKEN = process.env.BOT_TOKEN || 'AAFk0huUXrMTccIDY33p1sx1ioXQ8hMk92k';
const PROXY_API_URL = process.env.PROXY_API_URL || 'https://krddown.vercel.app/api/proxy';
const SITE_URL = process.env.SITE_URL || 'https://krddown.vercel.app';
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

// ==================== INITIALIZE BOT & SERVER ====================
const bot = new TelegramBot(BOT_TOKEN, { polling: true });
const app = express();
app.use(express.json());

// ==================== USER STATS ====================
const userStats = new Map();
const downloadCount = { total: 0, today: 0, lastReset: new Date().toDateString() };
const blockedUsers = new Set();
const VIP_USERS = new Set(['YOUR_USER_ID']); // ئایدی بەکارهێنەرانی ڤایپ

// Reset daily counter
setInterval(() => {
    const today = new Date().toDateString();
    if (downloadCount.lastReset !== today) {
        downloadCount.today = 0;
        downloadCount.lastReset = today;
    }
}, 60000);

// ==================== HELPER FUNCTIONS ====================
function getUserStats(userId) {
    if (!userStats.has(userId)) {
        userStats.set(userId, {
            downloads: 0,
            firstSeen: new Date(),
            lastSeen: new Date(),
            username: '',
            isVIP: VIP_USERS.has(userId.toString())
        });
    }
    return userStats.get(userId);
}

function updateUserStats(userId, username) {
    const stats = getUserStats(userId);
    stats.downloads++;
    stats.lastSeen = new Date();
    if (username) stats.username = username;
    downloadCount.total++;
    downloadCount.today++;
}

function detectPlatform(url) {
    if (!url) return '🌐 Social Media';
    
    const urlLower = url.toLowerCase();
    
    if (urlLower.includes('tiktok.com') || urlLower.includes('vm.tiktok.com')) return '🎵 TikTok';
    if (urlLower.includes('instagram.com') || urlLower.includes('instagr.am')) return '📸 Instagram';
    if (urlLower.includes('facebook.com') || urlLower.includes('fb.watch') || urlLower.includes('fb.com')) return '📘 Facebook';
    if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) return '▶️ YouTube';
    if (urlLower.includes('pinterest.com') || urlLower.includes('pin.it')) return '📌 Pinterest';
    if (urlLower.includes('snapchat.com')) return '👻 Snapchat';
    if (urlLower.includes('twitter.com') || urlLower.includes('x.com')) return '🐦 Twitter/X';
    
    return '🌐 Social Media';
}

function getPlatformIcon(url) {
    const urlLower = url.toLowerCase();
    if (urlLower.includes('tiktok.com')) return '🎵';
    if (urlLower.includes('instagram.com')) return '📸';
    if (urlLower.includes('facebook.com')) return '📘';
    if (urlLower.includes('youtube.com')) return '▶️';
    if (urlLower.includes('pinterest.com')) return '📌';
    if (urlLower.includes('snapchat.com')) return '👻';
    return '🌐';
}

function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

function extractUrls(text) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
}

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'بەیانیت باش ☀️';
    if (hour < 18) return 'ڕۆژت باش 🌤️';
    return 'ئێوارەت باش 🌙';
}

async function downloadMedia(url) {
    // هەوڵدان بۆ APIـی ناوخۆیی
    try {
        const response = await axios.post(PROXY_API_URL, {
            url: url,
            platform: detectPlatform(url)
        }, {
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'KrdDown-Bot/2.0'
            }
        });
        return response.data;
    } catch (proxyError) {
        console.log('Proxy failed, trying direct API...');
    }
    
    // هەوڵدان بۆ Cobalt API ڕاستەوخۆ
    try {
        const directResponse = await axios.post('https://api.cobalt.tools/api/json', {
            url: url,
            vQuality: '1080',
            filenamePattern: 'pretty',
            isNoTTWatermark: true,
            twitterGif: true,
            tiktokFullAudio: true
        }, {
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        return directResponse.data;
    } catch (directError) {
        console.log('Direct API failed, trying backup...');
    }
    
    // هەوڵدان بۆ APIـی یەدەگ
    try {
        const backupResponse = await axios.post('https://api.allorigins.win/raw', {
            url: 'https://api.cobalt.tools/api/json',
            method: 'POST',
            data: {
                url: url,
                vQuality: '720',
                filenamePattern: 'basic'
            }
        }, {
            timeout: 30000
        });
        return backupResponse.data;
    } catch (backupError) {
        throw new Error('هەموو ڕێگاکان شکستیان هێنا! تکایە دواتر هەوڵبدەرەوە.');
    }
}

async function sendFileSafely(chatId, url, caption = '', type = 'video') {
    try {
        if (type === 'video') {
            await bot.sendVideo(chatId, url, {
                caption: caption,
                supports_streaming: true,
                disable_notification: false
            });
        } else if (type === 'photo') {
            await bot.sendPhoto(chatId, url, {
                caption: caption
            });
        } else if (type === 'document') {
            await bot.sendDocument(chatId, url, {
                caption: caption
            });
        }
        return true;
    } catch (error) {
        // ئەگەر فایلەکە زۆر گەورە بوو
        if (error.message.includes('too large') || error.message.includes('413')) {
            return false;
        }
        throw error;
    }
}

// ==================== KEYBOARDS ====================
const mainKeyboard = {
    reply_markup: {
        keyboard: [
            ['📥 داونلۆدی ڤیدیۆ', '💎 پلانەکان'],
            ['ℹ️ یارمەتی', '📊 ئامارەکان'],
            ['👤 دەربارە', '📞 پەیوەندی']
        ],
        resize_keyboard: true,
        persistent: true
    }
};

const inlineKeyboard = {
    reply_markup: {
        inline_keyboard: [
            [
                { text: '🌐 وێبسایت', url: SITE_URL },
                { text: '💎 پلانی پرۆ', url: SITE_URL }
            ],
            [
                { text: '📞 پەیوەندی', url: 'https://t.me/z_14x' },
                { text: '⭐ ڕەیت بدە', callback_data: 'rate' }
            ]
        ]
    }
};

// ==================== COMMANDS ====================

// /start Command
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const firstName = msg.from.first_name || 'هاوڕێ';
    const username = msg.from.username ? `@${msg.from.username}` : firstName;
    
    // Initialize user stats
    getUserStats(userId);
    
    const welcomeMessage = `
${getGreeting()} *${firstName}*! 🎉

بەخێربێیت بۆ *KrdDown Bot*! 🤖

من یارمەتیت دەدەم ڤیدیۆ و وێنە لە هەموو تۆڕە کۆمەڵایەتییەکان داونلۆد بکەیت:

🎵 *TikTok* - بێ واتەرمارک
📸 *Instagram* - پۆست، ڕیڵز، ستۆری
📘 *Facebook* - ڤیدیۆ و ڕیڵز
▶️ *YouTube* - تا 1080p
📌 *Pinterest* - ڤیدیۆ و وێنە

📥 *بەکارهێنان:*
تەنها لینکی ڤیدیۆکە بنێرە بۆم!

💎 *پلانی پرۆ (4K HDR):*
${SITE_URL}

📊 *ئامارەکان:* /stats
ℹ️ *یارمەتی:* /help

_گەشەپێدەر: Zanyar Al-Mzuri Al-Kurdi_
    `;
    
    await bot.sendMessage(chatId, welcomeMessage, {
        parse_mode: 'Markdown',
        ...mainKeyboard
    });
    
    await bot.sendMessage(chatId, '🔗 *بەستەرە خێراکان:*', {
        parse_mode: 'Markdown',
        ...inlineKeyboard
    });
});

// /help Command
bot.onText(/\/help|ℹ️ یارمەتی/, async (msg) => {
    const chatId = msg.chat.id;
    
    const helpMessage = `
📚 *ڕێبەری بەکارهێنانی KrdDown Bot*

*1️⃣ ناردنی لینک*
تەنها لینکی ڤیدیۆکە کۆپی بکە و لێرە پەیست بکە

*2️⃣ چاوەڕوانی*
بۆتەکە ڤیدیۆکە دەدۆزێتەوە و ئامادەی دەکات

*3️⃣ داونلۆد*
دوای ئامادەبوون، ڤیدیۆکەت بۆ دەنێردرێت

🌐 *تۆڕە پشتگیریکراوەکان:*
• 🎵 TikTok - بێ واتەرمارک
• 📸 Instagram - پۆست، ڕیڵز، ستۆری
• 📘 Facebook - ڤیدیۆ، ڕیڵز
• ▶️ YouTube - تا 1080p
• 📌 Pinterest - ڤیدیۆ و وێنە
• 👻 Snapchat
• 🐦 Twitter/X

💡 *نموونەی لینک:*
\`https://www.tiktok.com/@user/video/123456\`
\`https://www.instagram.com/p/abc123/\`
\`https://youtube.com/watch?v=xyz789\`

⚠️ *سنووردارکردنەکان:*
• پلانی ئاسایی: تا 1080p
• پلانی پرۆ: تا 4K HDR

📞 *پەیوەندی:* @z_14x
🌐 *وێبسایت:* ${SITE_URL}
    `;
    
    await bot.sendMessage(chatId, helpMessage, {
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
        ...mainKeyboard
    });
});

// /plans Command
bot.onText(/\/plans|💎 پلانەکان/, async (msg) => {
    const chatId = msg.chat.id;
    
    const plansMessage = `
💎 *پلانەکانی KrdDown*

━━━━━━━━━━━━━━━

🆓 *پلانی بێبەرامبەر*
✅ داونلۆدی 1080p Full HD
✅ پشتگیری هەموو تۆڕەکان
✅ داونلۆدی MP3 (دەنگ)
✅ بێسنوور لە ڕۆژێدا
⚠️ ڕیکلامی ئاسایی

━━━━━━━━━━━━━━━

💎 *پلانی پرۆ*
✅ داونلۆدی 4K Ultra HD + HDR
✅ Dolby Vision
✅ بێ ڕیکلام
✅ داونلۆدی بێسنوور
✅ پشتگیری تایبەت
✅ داونلۆدی بەکۆمەڵ

━━━━━━━━━━━━━━━

🔗 بۆ چالاککردنی پرۆ:
${SITE_URL}

📞 پەیوەندی: @z_14x
    `;
    
    await bot.sendMessage(chatId, plansMessage, {
        parse_mode: 'Markdown',
        ...mainKeyboard
    });
    
    await bot.sendMessage(chatId, '💎 *کلیک بکە بۆ چالاککردنی پرۆ:*', {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: '🔥 چالاککردنی پرۆ', url: SITE_URL }],
                [{ text: '📞 پەیوەندی بە پشتگیری', url: 'https://t.me/z_14x' }]
            ]
        }
    });
});

// /about Command
bot.onText(/\/about|👤 دەربارە/, async (msg) => {
    const chatId = msg.chat.id;
    
    const aboutMessage = `
👤 *دەربارەی KrdDown Bot*

ئەم بۆتە لەلایەن *Zanyar Al-Mzuri Al-Kurdi* پەرەی پێدراوە.

🎯 *ئامانجمان:*
پێشکەشکردنی خێراترین و ئاسانترین ڕێگە بۆ داونلۆدکردنی میدیا لە تۆڕە کۆمەڵایەتییەکان بە زمانی کوردی.

📊 *ئاماری بۆت:*
• 👥 بەکارهێنەران: ${formatNumber(userStats.size)}
• 📥 کۆی داونلۆدەکان: ${formatNumber(downloadCount.total)}
• 📅 داونلۆدەکانی ئەمڕۆ: ${formatNumber(downloadCount.today)}

🌐 *وێبسایت:*
${SITE_URL}

📱 *سۆشیال میدیا:*
• Telegram: @z_14x
• Instagram: @z44nko
• TikTok: @z44nko
• Snapchat: z44nko

📧 *ئیمەیڵ:*
zaniyar.mzuri@email.com

_© 2026 KrdDown. هەموو مافەکان پارێزراون._
    `;
    
    await bot.sendMessage(chatId, aboutMessage, {
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
        ...mainKeyboard
    });
});

// /stats Command
bot.onText(/\/stats|📊 ئامارەکان/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const userStat = getUserStats(userId);
    
    const statsMessage = `
📊 *ئامارەکانی تۆ*

👤 *بەکارهێنەر:* ${msg.from.first_name || 'نادیار'}
📥 *داونلۆدەکانی تۆ:* ${formatNumber(userStat.downloads)}
📅 *یەکەم سەردان:* ${userStat.firstSeen.toLocaleDateString('ku')}
⭐ *پلان:* ${userStat.isVIP ? '💎 پرۆ' : '🆓 بێبەرامبەر'}

━━━━━━━━━━━━━━━

📈 *ئاماری گشتی*
👥 *کۆی بەکارهێنەران:* ${formatNumber(userStats.size)}
📥 *کۆی داونلۆدەکان:* ${formatNumber(downloadCount.total)}
📅 *داونلۆدەکانی ئەمڕۆ:* ${formatNumber(downloadCount.today)}

━━━━━━━━━━━━━━━

💎 بۆ پلانی پرۆ:
${SITE_URL}
    `;
    
    await bot.sendMessage(chatId, statsMessage, {
        parse_mode: 'Markdown',
        ...mainKeyboard
    });
});

// /contact Command
bot.onText(/\/contact|📞 پەیوەندی/, async (msg) => {
    const chatId = msg.chat.id;
    
    const contactMessage = `
📞 *پەیوەندی بە گەشەپێدەرەوە*

👤 *Zanyar Al-Mzuri Al-Kurdi*

📱 *سۆشیال میدیا:*
• Telegram: @z_14x
• Instagram: @z44nko
• TikTok: @z44nko
• Snapchat: z44nko

📧 *ئیمەیڵ:*
zaniyar.mzuri@email.com

🌐 *وێبسایت:*
${SITE_URL}

💬 *بۆ هەر پرسیارێک یان پێشنیارێک، بێ گەرمی پەیوەندیمان پێوە بکە!*
    `;
    
    await bot.sendMessage(chatId, contactMessage, {
        parse_mode: 'Markdown',
        ...mainKeyboard
    });
});

// Callback Query Handler
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    
    if (query.data === 'rate') {
        await bot.answerCallbackQuery(query.id, {
            text: '⭐ سوپاس بۆ ڕەیتکردن! ئێمە بەردەوام لە گەشەپێدانی بۆتەکەین.',
            show_alert: true
        });
    }
});

// ==================== MAIN URL HANDLER ====================
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const username = msg.from.username || msg.from.first_name || 'User';
    const text = msg.text;

    // Skip commands and keyboard buttons
    if (!text) return;
    
    const skipPatterns = ['/', '📥', '💎', 'ℹ️', '📊', '👤', '📞'];
    if (skipPatterns.some(pattern => text.startsWith(pattern))) return;

    // Check for blocked users
    if (blockedUsers.has(userId)) {
        await bot.sendMessage(chatId, '⛔ ببورە، تۆ بلۆک کراوی! بۆ زانیاری زیاتر پەیوەندی بە پشتگیرییەوە بکە: @z_14x');
        return;
    }

    // Handle "داونلۆدی ڤیدیۆ" button
    if (text === 'داونلۆدی ڤیدیۆ') {
        await bot.sendMessage(chatId, '🔗 *تکایە لینکی ڤیدیۆکە بنێرە:*\n\n📝 *نمونە:*\n`https://www.tiktok.com/@user/video/123456`\n`https://www.instagram.com/p/abc123/`\n`https://youtube.com/watch?v=xyz789`\n\n🌐 تۆڕە پشتگیریکراوەکان:\n🎵 TikTok | 📸 Instagram | 📘 Facebook | ▶️ YouTube | 📌 Pinterest', {
            parse_mode: 'Markdown',
            disable_web_page_preview: true
        });
        return;
    }

    // Extract URLs from message
    const urls = extractUrls(text);
    
    if (urls.length === 0) {
        // If not a URL, show suggestion
        if (text.length < 30) {
            await bot.sendMessage(chatId, '❌ *ئەمە لینکی دروست نییە!*\n\nتکایە لینکی ڤیدیۆکە بنێرە بۆ داونلۆدکردن.\n\n💡 *نمونە:*\n`https://www.tiktok.com/@user/video/123456`\n\nℹ️ یارمەتی: /help', {
                parse_mode: 'Markdown',
                disable_web_page_preview: true,
                ...mainKeyboard
            });
        }
        return;
    }

    // Process URL
    const url = urls[0];

    if (!isValidUrl(url)) {
        await bot.sendMessage(chatId, '❌ *لینکەکە نادروستە!* تکایە لینکێکی دروست بنێرە.\n\n💡 نمونە: `https://www.instagram.com/p/abc123/`', {
            parse_mode: 'Markdown'
        });
        return;
    }

    // Update stats
    updateUserStats(userId, username);
    const platform = detectPlatform(url);
    const platformIcon = getPlatformIcon(url);

    // Send processing message
    const processingMsg = await bot.sendMessage(chatId, 
        `${platformIcon} *پرۆسێسکردن...*\n\n` +
        `🔗 \`${url.substring(0, 60)}${url.length > 60 ? '...' : ''}\`\n\n` +
        `⏳ _چاوەڕێبە، میدیاکە ئامادە دەکرێت..._`, {
        parse_mode: 'Markdown'
    });

    try {
        // Download media
        const result = await downloadMedia(url);

        // Delete processing message
        await bot.deleteMessage(chatId, processingMsg.message_id).catch(() => {});

        if (result.status === 'redirect' || result.status === 'stream') {
            // Video download
            const videoUrl = result.url;
            const filename = result.filename || `${platform}_Video`;
            
            const successMessage = 
                `✅ *داونلۆد ئامادەیە!*\n\n` +
                `${platformIcon} ${platform}\n` +
                `📝 *ناو:* ${filename}\n\n` +
                `⬇️ ڤیدیۆکەت لە خوارەوە دەنێردرێت...`;
            
            await bot.sendMessage(chatId, successMessage, {
                parse_mode: 'Markdown',
                ...mainKeyboard
            });

            // Send video
            const sent = await sendFileSafely(chatId, videoUrl, 
                `${platformIcon} داونلۆدکراو لە ${platform}\n🤖 @KrdDown_Bot\n\n💎 پلانی پرۆ: ${SITE_URL}`,
                'video'
            );

            if (!sent) {
                // File too large, send as document or link
                try {
                    await sendFileSafely(chatId, videoUrl,
                        `📁 فایلی ڤیدیۆ - ${platform}\n🤖 @KrdDown_Bot`,
                        'document'
                    );
                } catch (docError) {
                    await bot.sendMessage(chatId,
                        `🔗 *لینکی ڕاستەوخۆی داونلۆد:*\n\n` +
                        `\`${videoUrl}\`\n\n` +
                        `_لەسەر ئەم لینکە کلیک بکە بۆ داونلۆدکردن_\n\n` +
                        `⚠️ لینکەکە بۆ ماوەی سنووردار چالاکە.`,
                        {
                            parse_mode: 'Markdown',
                            ...mainKeyboard
                        }
                    );
                }
            }

            // Send inline keyboard with website link
            await bot.sendMessage(chatId, 
                `🙏 *سوپاس بۆ بەکارهێنانی KrdDown!*\n\n` +
                `💎 بۆ کوالێتی 4K HDR و داونلۆدی بێ ڕیکلام:\n${SITE_URL}`,
                {
                    parse_mode: 'Markdown',
                    ...inlineKeyboard
                }
            );

        } else if (result.status === 'picker' && result.picker && result.picker.length > 0) {
            // Multiple images
            const imagesCount = result.picker.length;
            const maxSend = Math.min(imagesCount, 10);
            
            await bot.sendMessage(chatId,
                `✅ *${imagesCount} وێنە دۆزرانەوە!*\n\n` +
                `${platformIcon} ${platform}\n\n` +
                `📸 ${maxSend} وێنە دەنێردرێن...`,
                {
                    parse_mode: 'Markdown',
                    ...mainKeyboard
                }
            );

            // Send images
            for (let i = 0; i < maxSend; i++) {
                const imgUrl = result.picker[i].url || result.picker[i];
                try {
                    await bot.sendPhoto(chatId, imgUrl, {
                        caption: `📸 وێنەی ${i + 1} لە ${imagesCount}\n🤖 @KrdDown_Bot`
                    });
                    await new Promise(resolve => setTimeout(resolve, 300));
                } catch (imgError) {
                    await bot.sendMessage(chatId, `📸 وێنەی ${i + 1}: ${imgUrl}`);
                }
            }

            if (imagesCount > 10) {
                await bot.sendMessage(chatId,
                    `⚠️ تەنها ١٠ وێنە نێردران.\n\n` +
                    `بۆ وێنەکانی تر سەردانی سایتەکەمان بکە:\n${SITE_URL}`,
                    { ...mainKeyboard }
                );
            }

        } else {
            await bot.sendMessage(chatId,
                `❌ *نەتوانرا میدیا داونلۆد بکرێت!*\n\n` +
                `🚫 ئەم لینکە پشتگیری ناکرێت یان پڕایڤەتە.\n\n` +
                `💡 *ڕێنمایی:*\n` +
                `• دڵنیابە لەوەی ئەکاونتەکە پڕایڤەت نییە\n` +
                `• لینکێکی تر تاقیبکەرەوە\n\n` +
                `📞 پەیوەندی: @z_14x`,
                {
                    parse_mode: 'Markdown',
                    ...mainKeyboard
                }
            );
        }

    } catch (error) {
        console.error('Bot Error:', error.message);
        
        await bot.deleteMessage(chatId, processingMsg.message_id).catch(() => {});
        
        await bot.sendMessage(chatId,
            `❌ *کێشەیەک ڕوویدا!*\n\n` +
            `🔄 تکایە دووبارە هەوڵبدەرەوە.\n\n` +
            `📞 ئەگەر کێشەکە بەردەوام بوو: @z_14x`,
            {
                parse_mode: 'Markdown',
                ...mainKeyboard
            }
        );
    }
});

// ==================== ERROR HANDLING ====================
bot.on('polling_error', (error) => {
    console.error('Polling Error:', error.message);
    if (error.code === 'ETELEGRAM' && error.response && error.response.statusCode === 409) {
        console.log('Another instance is running. Stopping this one...');
        process.exit(1);
    }
});

bot.on('error', (error) => {
    console.error('Bot Error:', error.message);
});

bot.on('webhook_error', (error) => {
    console.error('Webhook Error:', error.message);
});

// ==================== EXPRESS SERVER ====================
app.get('/', (req, res) => {
    res.json({
        status: 'online',
        bot: 'KrdDown Telegram Bot',
        version: '2.0.0',
        users: userStats.size,
        totalDownloads: downloadCount.total,
        todayDownloads: downloadCount.today,
        uptime: Math.floor(process.uptime()),
        developer: 'Zanyar Al-Mzuri Al-Kurdi',
        website: SITE_URL
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════╗
║                                                  ║
║        KrdDown Telegram Bot v2.0.0               ║
║        Developed by Zanyar Al-Mzuri              ║
║                                                  ║
╠══════════════════════════════════════════════════╣
║                                                  ║
║  ✅ Status: Online                               ║
║  🔌 Port: ${PORT}                                   ║
║  🏥 Health: http://localhost:${PORT}/health        ║
║  🕐 Time: ${new Date().toLocaleString()}           ║
║                                                  ║
╠══════════════════════════════════════════════════╣
║                                                  ║
║  📊 Stats:                                       ║
║  👥 Users: ${userStats.size}                                      ║
║  📥 Downloads: ${downloadCount.total}                                  ║
║                                                  ║
╚══════════════════════════════════════════════════╝
    `);
});

// ==================== GRACEFUL SHUTDOWN ====================
process.on('SIGINT', async () => {
    console.log('\n👋 Shutting down KrdDown Bot...');
    await bot.stopPolling();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n👋 Shutting down KrdDown Bot...');
    await bot.stopPolling();
    process.exit(0);
});

module.exports = app;
