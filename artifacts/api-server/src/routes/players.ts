import { Router } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  addStoredPlayer,
  deleteStoredPlayer,
  findStoredPlayerByUsername,
  listStoredPlayers,
} from "../lib/players-store";

const ADMIN_KEY = process.env.ADMIN_KEY;
const hasDatabase = Boolean(process.env.DATABASE_URL);

const router = Router();

function hasValidAdminKey(value: string | undefined): boolean {
  return Boolean(ADMIN_KEY) && value === ADMIN_KEY;
}

router.get("/admin/verify", (req, res) => {
  const adminKey = req.headers["x-admin-key"] as string | undefined;

  if (!hasValidAdminKey(adminKey)) {
    res.status(401).json({ error: "Invalid admin key" });
    return;
  }

  res.status(204).send();
});

router.get("/", async (req, res) => {
  try {
    if (!hasDatabase) {
      res.json(await listStoredPlayers());
      return;
    }

    const { db, playersTable } = await import("@workspace/db");
    const players = await db.select().from(playersTable).orderBy(playersTable.createdAt);
    res.json(
      players.map((p) => ({
        id: p.id,
        username: p.username,
        uuid: p.uuid ?? null,
        createdAt: p.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to list players");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  const bodySchema = z.object({
    username: z.string().min(1).max(16),
    adminKey: z.string(),
  });

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { username, adminKey } = parsed.data;

  if (!hasValidAdminKey(adminKey)) {
    res.status(401).json({ error: "Invalid admin key" });
    return;
  }

  try {
    let uuid: string | null = null;
    try {
      const mojangRes = await fetch(
        `https://api.mojang.com/users/profiles/minecraft/${username}`
      );
      if (mojangRes.ok) {
        const mojangData = (await mojangRes.json()) as { id?: string };
        uuid = mojangData.id ?? null;
      }
    } catch {
      req.log.warn({ username }, "Could not fetch Mojang UUID");
    }

    if (!hasDatabase) {
      const existing = await findStoredPlayerByUsername(username);
      if (existing) {
        res.status(409).json({ error: "Player already exists" });
        return;
      }

      const inserted = await addStoredPlayer(username, uuid);
      res.status(201).json(inserted);
      return;
    }

    const { db, playersTable } = await import("@workspace/db");
    const existing = await db
      .select()
      .from(playersTable)
      .where(eq(playersTable.username, username));

    if (existing.length > 0) {
      res.status(409).json({ error: "Player already exists" });
      return;
    }

    const [inserted] = await db
      .insert(playersTable)
      .values({ username, uuid })
      .returning();

    res.status(201).json({
      id: inserted.id,
      username: inserted.username,
      uuid: inserted.uuid ?? null,
      createdAt: inserted.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to add player");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  const adminKey = req.headers["x-admin-key"] as string | undefined;

  if (!hasValidAdminKey(adminKey)) {
    res.status(401).json({ error: "Invalid admin key" });
    return;
  }

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid player id" });
    return;
  }

  try {
    if (!hasDatabase) {
      const deleted = await deleteStoredPlayer(id);
      if (!deleted) {
        res.status(404).json({ error: "Player not found" });
        return;
      }

      res.status(204).send();
      return;
    }

    const { db, playersTable } = await import("@workspace/db");
    const deleted = await db
      .delete(playersTable)
      .where(eq(playersTable.id, id))
      .returning();

    if (deleted.length === 0) {
      res.status(404).json({ error: "Player not found" });
      return;
    }

    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete player");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
