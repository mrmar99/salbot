import 'dotenv/config';
import { Bot } from "grammy";

const { TOKEN: token = '' } = process.env;

const bot = new Bot(token);

bot.command("start", (ctx) => ctx.reply("Welcome! Up and running."));

bot.on("message", (ctx) => {
  const { message } = ctx.update;

  if (message.dice && message.dice.emoji === '🎲') {
    console.log(message.dice);
  } else {
    ctx.reply("Кинь кость");
  }
});

bot.start();
