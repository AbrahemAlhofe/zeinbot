import { Telegraf, Markup } from 'telegraf';
import {GoogleGenAI} from '@google/genai';
import fs from 'fs/promises';
import Mustache from 'mustache';
import { createServer } from "http";

// Load environment variables
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!TELEGRAM_BOT_TOKEN || !GEMINI_API_KEY) {
  throw new Error('Missing required environment variables');
}

// Initialize Gemini
const ai = new GoogleGenAI({apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY});
const instructions = await fs.readFile('./instructions.md', 'utf8');

const config = {
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
  ctx.reply(
    Mustache.render(await fs.readFile('./welcome.md', 'utf8'), {name: "Test"}),
    Markup.keyboard([['مساعدة', 'مثال']])
      .resize()
      .oneTime()
  );
});

// Help command
bot.help((ctx) => {
  ctx.replyWithMarkdownV2(
    '🎤 *كيفية استخدام البوت:*\n\n' +
    '1. أرسل فكرة أو موضوع للمحتوى الصوتي\n' +
    '2. سأقوم بإرسال خيارات تحتوي على:\n' +
    '   - الشخصية الصوتية\n' +
    '   - النص المقترح\n' +
    '   - النبرة\n' +
    '   - المكان\n' +
    '   - الخلفية الصوتية\n\n' +
    'أو جرب /example لرؤية مثال'
  );
});

// Example command
bot.command('example', (ctx) => {
  ctx.reply(
    'مثال: محتوى صوتي عن السفر\n\n' +
    'أرسل لي: "أريد محتوى صوتي عن متعة السفر واستكشاف أماكن جديدة"'
  );
});

// Handle text messages
bot.on('text', async (ctx) => {
  try {

    await ctx.sendChatAction('typing');

    const result = await ai.models.generateContent({
        model,
        config,
        contents: ctx.message.text,
    });
    
    if (result.text === undefined) throw new Error('No text returned from model');

    ctx.reply(result.text);
    
  } catch (error) {
    console.error('Error processing message:', error);
    ctx.reply('عذرًا، حدث خطأ أثناء معالجة طلبك. يرجى المحاولة مرة أخرى.');
  }
});

// Error handling
bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}`, err);
  ctx.reply('حدث خطأ غير متوقع أثناء معالجة رسالتك.');
});

export default createServer(await bot.createWebhook({ domain: "zeinbot.vercel.app" })).listen(3000);