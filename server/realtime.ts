import type { Response } from "express";

type ClientConnection = {
  id: string;
  res: Response;
};

let clients: ClientConnection[] = [];

export function registerRealtimeClient(id: string, res: Response) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  res.write(`data: ${JSON.stringify({ type: "CONNECTED", id, timestamp: new Date().toISOString() })}\n\n`);

  const client: ClientConnection = { id, res };
  clients.push(client);

  res.on("close", () => {
    clients = clients.filter((c) => c.id !== id);
  });
}

export function broadcastRealtimeEvent(eventType: string, payload: any) {
  const message = `data: ${JSON.stringify({
    type: eventType,
    payload,
    timestamp: new Date().toISOString(),
  })}\n\n`;

  for (const client of clients) {
    try {
      client.res.write(message);
    } catch {
      // client may have disconnected
    }
  }
}
