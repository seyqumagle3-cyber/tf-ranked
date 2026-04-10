import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type PlayerRecord = {
  id: number;
  username: string;
  uuid: string | null;
  createdAt: string;
};

const dataDir = path.resolve(import.meta.dirname, "..", "..", ".data");
const dataFile = path.join(dataDir, "players.json");

async function ensureStore() {
  await mkdir(dataDir, { recursive: true });
  try {
    await readFile(dataFile, "utf8");
  } catch {
    await writeFile(dataFile, "[]", "utf8");
  }
}

async function readPlayers(): Promise<PlayerRecord[]> {
  await ensureStore();
  const raw = await readFile(dataFile, "utf8");

  try {
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function writePlayers(players: PlayerRecord[]) {
  await ensureStore();
  await writeFile(dataFile, JSON.stringify(players, null, 2), "utf8");
}

export async function listStoredPlayers(): Promise<PlayerRecord[]> {
  const players = await readPlayers();
  return players.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function findStoredPlayerByUsername(username: string) {
  const players = await readPlayers();
  return players.find((player) => player.username.toLowerCase() === username.toLowerCase()) ?? null;
}

export async function addStoredPlayer(username: string, uuid: string | null) {
  const players = await readPlayers();
  const nextId = players.reduce((max, player) => Math.max(max, player.id), 0) + 1;

  const player: PlayerRecord = {
    id: nextId,
    username,
    uuid,
    createdAt: new Date().toISOString(),
  };

  players.push(player);
  await writePlayers(players);
  return player;
}

export async function deleteStoredPlayer(id: number) {
  const players = await readPlayers();
  const nextPlayers = players.filter((player) => player.id !== id);

  if (nextPlayers.length === players.length) {
    return false;
  }

  await writePlayers(nextPlayers);
  return true;
}
