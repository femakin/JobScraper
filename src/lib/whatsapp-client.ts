import makeWASocket, {
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion,
  Browsers,
  DisconnectReason,
  type WASocket,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import pino from "pino";
import path from "path";
import * as qrcode from "qrcode-terminal";

const AUTH_DIR = path.resolve(process.cwd(), "whatsapp-auth");

const logger = pino({ level: "silent" });

export async function connectWhatsApp(
  onReady: (sock: WASocket) => void
): Promise<WASocket> {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    browser: Browsers.macOS("Desktop"),
    logger,
    generateHighQualityLinkPreview: false,
    syncFullHistory: false,
    markOnlineOnConnect: false,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("\n--- Scan this QR code with WhatsApp ---\n");
      qrcode.generate(qr, { small: true });
      console.log("\nOpen WhatsApp > Settings > Linked Devices > Link a Device\n");
    }

    if (connection === "open") {
      console.log("[WhatsApp] Connected successfully");
      onReady(sock);
    }

    if (connection === "close") {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log(
        `[WhatsApp] Connection closed (code: ${statusCode}).`,
        shouldReconnect ? "Reconnecting..." : "Logged out — delete whatsapp-auth/ and re-scan."
      );

      if (shouldReconnect) {
        setTimeout(() => connectWhatsApp(onReady), 3000);
      } else {
        process.exit(1);
      }
    }
  });

  return sock;
}
