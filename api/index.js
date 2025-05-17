import { Telegraf, Markup } from 'telegraf';
import { GoogleGenAI } from '@google/genai';
import { message } from 'telegraf/filters'
import fs from 'fs/promises';
import path from 'path';
import Mustache from 'mustache';

// Load environment variables
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!TELEGRAM_BOT_TOKEN || !GEMINI_API_KEY) {
    throw new Error('Missing required environment variables');
}

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
const instructions = await fs.readFile(path.join(process.cwd(), 'templates/instructions.md'), 'utf8');
const greetingMessage = await fs.readFile(path.join(process.cwd(), 'templates/greeting.md'), 'utf8');

const config = {
    responseMimeType: "text/plain",
    systemInstruction: [
        {
            text: instructions,
        }
    ],
};

const model = 'gemini-2.5-flash-preview-04-17';
const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

// Start command
bot.start(async (ctx) => {
    await ctx.replyWithMarkdownV2(greetingMessage);
});

// Handle text messages
bot.on(message('text'), async (ctx) => {

    try {

        const result = await ai.models.generateContent({
            model,
            config,
            contents: [
                {
                    role: 'user',
                    parts: [
                        {
                            text: ctx.message.text
                        }
                    ]
                }
            ],
        });

        await ctx.reply(result.text);


    } catch (error) {

        await ctx.reply(JSON.stringify({ error }));
        
    }
});

// Error handling
bot.catch((err, ctx) => {
    console.error(`Error for ${ctx.updateType}`, err);
    ctx.reply('حدث خطأ غير متوقع أثناء معالجة رسالتك.');
});

export default async function handle(req, res) {

    if (req.method === 'POST') {

        await bot.handleUpdate(req.body, res);

    } else {

        res.status(200).json('Listening to bot events...');

    }

}