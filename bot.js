"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const grammy_1 = require("grammy");
const { TOKEN: token = '' } = process.env;
console.log(token);
// Create an instance of the `Bot` class and pass your bot token to it.
const bot = new grammy_1.Bot(token); // <-- put your bot token between the ""
// Handle the /start command.
bot.command("start", (ctx) => ctx.reply("Welcome! Up and running."));
// Handle other messages.
bot.on("message", (ctx) => {
    const { message } = ctx.update;
    if (message.dice && message.dice.emoji === '🎲') {
        console.log(message.dice);
    }
    else {
        ctx.reply("Кинь кость");
    }
});
bot.start();
