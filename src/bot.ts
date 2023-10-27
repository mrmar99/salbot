import 'dotenv/config';
import { Bot, CallbackQueryContext, CommandContext, Context, InlineKeyboard, session, SessionFlavor, InputFile } from "grammy";
import { I18n, I18nFlavor } from '@grammyjs/i18n';
import { parseMode } from '@grammyjs/parse-mode';
import { Player } from './game/player';
import { Game } from './game/game';
import { Queue } from './game/queue';
import boards from './game/boards.json';

const { TOKEN: token = '' } = process.env;

interface SessionData {
  players: Record<number, Player>;
  G: Game;
  winners: Record<number, Player>;
  currentPlayer: Player | null;
  isGameStarted: boolean;
  diceThrows: Queue<number>;
  chipColors: Record<string, { emoji: string, selected: boolean }>;
  imageMsgId: number;
}

type MyContext = Context & I18nFlavor & SessionFlavor<SessionData>;

const bot = new Bot<MyContext>(token);
bot.api.config.use(parseMode("HTML"));

function initial(): SessionData {
  return {
    players: {},
    G: new Game(),
    winners: {},
    currentPlayer: null,
    isGameStarted: false,
    diceThrows: new Queue(),
    chipColors: {
      "red": { emoji: '🔴', selected: false },
      "orange": { emoji: '🟠', selected: false },
      "yellow": { emoji: '🟡', selected: false },
      "green": { emoji: '🟢', selected: false },
      "blue": { emoji: '🔵', selected: false },
      "purple": { emoji: '🟣', selected: false },
      "black": { emoji: '⚫️', selected: false },
      "white": { emoji: '⚪️', selected: false },
      "brown": { emoji: '🟤', selected: false },
    },
    imageMsgId: -1,
  };
}

const i18n = new I18n<MyContext>({
  defaultLocale: "ru", 
  directory: "locales",
});

bot.use(i18n);
bot.use(session({ initial }));

function createGameKb(
  ctx: CommandContext<MyContext> | CallbackQueryContext<MyContext>, 
  chipColors: Record<string, { emoji: string, selected: boolean }>) {
  const colors = Object.entries(ctx.session.chipColors);
  const kb = new InlineKeyboard().text("Начать игру", "startGame").row();
  for (let i = 0; i < colors.length; i++) {
    const [color, { emoji, selected }] = colors[i];
    const kbEmoji = selected ? '✖️' : emoji;
    kb.text(kbEmoji, color + '-chip');
    if ((i + 1) % 3 === 0) kb.row();
  }

  return kb.text("Покинуть игру", "leaveGame").row();
}

bot.command("game", async (ctx) => {
  if (!ctx.session.isGameStarted) {
    const kb = createGameKb(ctx, ctx.session.chipColors);
    await ctx.reply(ctx.t("game.str"), { reply_markup: kb });
    ctx.session.G.setBoard(boards[0], './board0.jpg');
  } else {
    const msgId = ctx.update.message?.message_id;
    await ctx.reply(ctx.t("game.already-started"), {
      reply_to_message_id: msgId,
    });
  }
});

bot.on("message:dice", (ctx) => {
  const dice = ctx.update.message.dice;
  const userId = ctx.update.message.from.id;

  ctx.session.diceThrows.enqueue(ctx.update.message.message_id);

  const { G, currentPlayer, winners } = ctx.session;
  if (currentPlayer && G.isStarted && userId === currentPlayer.id && dice.emoji === '🎲') {
    setTimeout(() => {
      if (ctx.session.diceThrows.length > 0) {
        return ctx.api.deleteMessage(ctx.update.message.chat.id, ctx.session.diceThrows.dequeue());
      }
    }, 10000);

    G.dice(dice.value);

    const tmpPlayer = currentPlayer;
    ctx.session.currentPlayer = G.nextPlayer();

    ctx.reply(`
Ход игрока ${tmpPlayer.id}
Клетка ${tmpPlayer.pos}
Выпало число ${dice.value}

Следующим ходит ${ctx.session.currentPlayer.id}`);

    if (currentPlayer.status === 'won') {
      winners[userId] = currentPlayer;
    }

    if (G.hasFinished) {
      ctx.reply(`Победители: ${Object.keys(winners).join('\n')}`);
      ctx.reply(`Проигравший: ${G.lastPlayer}`);

      ctx.session.G.stop();
      ctx.session.isGameStarted = false;
      ctx.session.players = {};
      ctx.session.winners = {};
      ctx.session.currentPlayer = null;
    }
  }
});

bot.callbackQuery([
  "red-chip",
  "orange-chip",
  "yellow-chip",
  "green-chip",
  "blue-chip",
  "purple-chip",
  "black-chip",
  "white-chip",
  "brown-chip"
], async (ctx) => {
  const color = ctx.match.toString().split('-')[0];
  const { id, first_name: firstName } = ctx.update.callback_query.from;
  
  if (ctx.session.G.isStarted) {
    if (ctx.session.G.isStarted) {
      await ctx.answerCallbackQuery({
        text: ctx.t("game.join-forbidden"),
      });
      return;
    }
  }

  if (!(id in ctx.session.players) && !ctx.session.chipColors[color].selected) {
    ctx.session.players[id] = new Player(id);
    ctx.session.players[id].color = color;
    ctx.session.chipColors[color].selected = true;
  } else if (ctx.session.chipColors[color].selected) {
    await ctx.answerCallbackQuery({
      text: ctx.t("game.color-selected"),
    });
  } else if (id in ctx.session.players && !ctx.session.chipColors[color].selected) {
    const prevColor = ctx.session.players[id].color;
    ctx.session.chipColors[prevColor].selected = false;
    ctx.session.players[id].color = color;
    ctx.session.chipColors[color].selected = true;
  }

  const playersStr = `\n\n${ctx.t("game.players-list")}\n` + Object.keys(ctx.session.players).join('\n');
  await ctx.editMessageText(ctx.t("game.str").concat(playersStr), {
    reply_markup: createGameKb(ctx, ctx.session.chipColors),
  });
});

bot.callbackQuery("leaveGame", async (ctx) => {
  const { id } = ctx.update.callback_query.from;
  
  if (ctx.session.G.isStarted) {
    await ctx.answerCallbackQuery({
      text: ctx.t("game.leaving-forbidden"),
    });
    return;
  }

  if (id in ctx.session.players) {
    const color = ctx.session.players[id].color;
    ctx.session.chipColors[color].selected = false;
    delete ctx.session.players[id];

    if (!Object.keys(ctx.session.players).length) {
      await ctx.editMessageText(ctx.t("game.str"), {
        reply_markup: createGameKb(ctx, ctx.session.chipColors),
      });
    } else {
      const playersStr = `\n\n${ctx.t("game.players-list")}\n` + Object.values(ctx.session.players).join('\n');
      await ctx.editMessageText(ctx.t("game.str").concat(playersStr), {
        reply_markup: createGameKb(ctx, ctx.session.chipColors),
      });
    }
  }
});

bot.callbackQuery("startGame", async (ctx) => {
  if (!ctx.session.G.isStarted) {
    const startOptions = ctx.session.G.start(ctx.session.players);

    if (!startOptions) {
      await ctx.answerCallbackQuery({
        text: ctx.t("game.min-players-count"),
      });
      return;
    }

    const { firstPlayer, boardUrlPV } = startOptions;

    ctx.session.currentPlayer = firstPlayer;
    await ctx.deleteMessage();
    await ctx.answerCallbackQuery({ text: ctx.t("game.started") });

    const diceMsg = await ctx.replyWithDice('🎲');
    await ctx.reply(ctx.t("throw-dice", { player: ctx.session.currentPlayer.id }), {
      reply_to_message_id: diceMsg.message_id,
    });
    
    const imageMsg = await ctx.replyWithPhoto(new InputFile(boardUrlPV), {
      caption: 'a'
    });
    ctx.session.imageMsgId = imageMsg.message_id;

    ctx.reply('Ход игрока...');

    ctx.session.isGameStarted = true;
  } else {
    await ctx.answerCallbackQuery({
      text: ctx.t("game.already-started"),
    });
  }
});

bot.catch(console.error);

bot.start({
	drop_pending_updates: true,
	onStart: () => console.log("Bot started"),
});