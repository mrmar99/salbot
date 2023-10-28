import "dotenv/config";
import {
  Bot,
  CallbackQueryContext,
  CommandContext,
  Context,
  InlineKeyboard,
  session,
  SessionFlavor,
  InputFile,
  InputMediaBuilder,
} from "grammy";
import { I18n, I18nFlavor } from "@grammyjs/i18n";
import { parseMode } from "@grammyjs/parse-mode";
import { Player } from "./game/player";
import { Game } from "./game/game";
import { Queue } from "./game/queue";
import boards from "./game/boards.json";

const { TOKEN: token = "" } = process.env;

interface SessionData {
  players: Record<number, Player>;
  playersColors: string[];
  G: Game;
  winners: Record<number, Player>;
  currentPlayer: Player | null;
  isGameStarted: boolean;
  diceThrows: Queue<number>;
  chipColors: Record<string, { emoji: string; selected: boolean }>;
  imageMsgId: number;
  infoMsgId: number;
}

type MyContext = Context & I18nFlavor & SessionFlavor<SessionData>;

const bot = new Bot<MyContext>(token);
bot.api.config.use(parseMode("HTML"));

function initial(): SessionData {
  return {
    players: {},
    playersColors: [],
    G: new Game(),
    winners: {},
    currentPlayer: null,
    isGameStarted: false,
    diceThrows: new Queue(),
    chipColors: {
      "red":    { emoji: "🔴", selected: false },
      "orange": { emoji: "🟠", selected: false },
      "yellow": { emoji: "🟡", selected: false },
      "green":  { emoji: "🟢", selected: false },
      "blue":   { emoji: "🔵", selected: false },
      "purple": { emoji: "🟣", selected: false },
      "black":  { emoji: "⚫️", selected: false },
      "white":  { emoji: "⚪️", selected: false },
      "brown":  { emoji: "🟤", selected: false },
    },
    imageMsgId: -1,
    infoMsgId: -1,
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
  chipColors: Record<string, { emoji: string; selected: boolean }>
) {
  const colors = Object.entries(ctx.session.chipColors);
  const kb = new InlineKeyboard().text("Начать игру", "startGame").row();
  for (let i = 0; i < colors.length; i++) {
    const [color, { emoji, selected }] = colors[i];
    const kbEmoji = selected ? "✖️" : emoji;
    kb.text(kbEmoji, color + "-chip");
    if ((i + 1) % 3 === 0) kb.row();
  }

  return kb.text("Покинуть игру", "leaveGame").row();
}

bot.command("game", async (ctx) => {
  if (!ctx.session.isGameStarted) {
    const kb = createGameKb(ctx, ctx.session.chipColors);
    await ctx.reply(ctx.t("game.str"), { reply_markup: kb });
    ctx.session.G.setBoard(boards[0], "board0.jpg");
  } else {
    await ctx.reply(ctx.t("game.already-started"), {
      reply_to_message_id: ctx.update.message?.message_id,
    });
  }
});

bot.on("message:dice", async (ctx) => {
  const dice = ctx.update.message.dice;
  const userId = ctx.update.message.from.id;

  const { G, currentPlayer, winners } = ctx.session;

  if (currentPlayer && userId !== currentPlayer.id) {
    ctx.deleteMessage();
    return;
  }

  ctx.session.diceThrows.enqueue(ctx.update.message.message_id);

  if (
    currentPlayer &&
    G.isStarted &&
    userId === currentPlayer.id &&
    dice.emoji === "🎲"
  ) {
    setTimeout(() => {
      if (ctx.session.diceThrows.length > 0) {
        return ctx.api.deleteMessage(
          ctx.update.message.chat.id,
          ctx.session.diceThrows.dequeue()
        );
      }
    }, 10000);

    G.dice(dice.value);

    const tmpPlayer = currentPlayer;
    ctx.session.currentPlayer = G.nextPlayer();

    ctx.api.editMessageText(
      ctx.update.message.chat.id,
      ctx.session.infoMsgId,
      `Ход игрока ${ctx.session.currentPlayer.visibleName}`
    );

    await ctx.api.editMessageMedia(
      ctx.update.message.chat.id,
      ctx.session.imageMsgId,
      InputMediaBuilder.photo(new InputFile(G.boardPVBuffer)),
    );

    if (currentPlayer.status === "won") {
      winners[userId] = currentPlayer;
    }

    if (G.hasFinished) {
      ctx.reply(`Победители: ${Object.keys(winners).join("\n")}`);
      ctx.reply(`Проигравший: ${G.lastPlayer}`);
      ctx.unpinChatMessage(ctx.session.infoMsgId);

      ctx.session.G.stop();
      ctx.session.isGameStarted = false;
      ctx.session.players = {};
      ctx.session.winners = {};
      ctx.session.currentPlayer = null;
    }
  }
});

bot.callbackQuery(
  [
    "red-chip",
    "orange-chip",
    "yellow-chip",
    "green-chip",
    "blue-chip",
    "purple-chip",
    "black-chip",
    "white-chip",
    "brown-chip",
  ],
  async (ctx) => {
    const color = ctx.match.toString().split("-")[0];
    const { id, first_name: firstName } = ctx.update.callback_query.from;

    if (ctx.session.G.isStarted) {
      if (ctx.session.G.isStarted) {
        await ctx.answerCallbackQuery({
          text: ctx.t("game.join-forbidden"),
        });
        return;
      }
    }

    if (!ctx.session.chipColors[color].selected) {
      if (!(id in ctx.session.players)) {
        ctx.session.players[id] = new Player(id);
      } else {
        const prevColor = ctx.session.players[id].color;
        ctx.session.chipColors[prevColor].selected = false;
      }
      ctx.session.players[id].color = color;
      ctx.session.players[id].visibleName = firstName;
      ctx.session.chipColors[color].selected = true;
    } else {
      await ctx.answerCallbackQuery({
        text: ctx.t("game.color-selected"),
      });
    }

    ctx.session.playersColors = Object.values(ctx.session.players).map(
      (p) => `${ctx.session.chipColors[p.color].emoji} ${p.visibleName}`
    );

    const playersStr =
      `\n\n${ctx.t("game.players-list")}\n` + ctx.session.playersColors.join("\n");
    await ctx.editMessageText(ctx.t("game.str").concat(playersStr), {
      reply_markup: createGameKb(ctx, ctx.session.chipColors),
    });
  }
);

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
      const playersStr =
        `\n\n${ctx.t("game.players-list")}\n` +
        Object.values(ctx.session.players).join("\n");
      await ctx.editMessageText(ctx.t("game.str").concat(playersStr), {
        reply_markup: createGameKb(ctx, ctx.session.chipColors),
      });
    }
  }
});

bot.callbackQuery("startGame", async (ctx) => {
  if (!ctx.session.G.isStarted) {
    const firstPlayer = await ctx.session.G.start(ctx.session.players);

    if (!firstPlayer) {
      await ctx.answerCallbackQuery({
        text: ctx.t("game.min-players-count"),
      });
      return;
    }

    ctx.session.currentPlayer = firstPlayer;
    await ctx.deleteMessage();
    await ctx.answerCallbackQuery({ text: ctx.t("game.started") });

    const boardPVBuffer = ctx.session.G.boardPVBuffer;
    const imageMsg = await ctx.replyWithPhoto(new InputFile(boardPVBuffer));
    ctx.session.imageMsgId = imageMsg.message_id;
    await ctx.reply(ctx.session.playersColors.join("\n"));

    const infoMsg = await ctx.reply(
      ctx.t("throw-dice", { player: ctx.session.currentPlayer.visibleName })
    );
    await ctx.replyWithDice("🎲");
    ctx.session.infoMsgId = infoMsg.message_id;
    ctx.pinChatMessage(ctx.session.infoMsgId);

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
