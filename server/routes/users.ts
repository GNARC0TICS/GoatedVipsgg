
import { Router } from "express";
import { db } from "../db";
import { users } from "../db/schema";
import { like } from "drizzle-orm";

const router = Router();

router.get("/search", async (req, res) => {
  const { username } = req.query;
  
  if (typeof username !== "string" || username.length < 3) {
    return res.status(400).json({ error: "Username must be at least 3 characters" });
  }

  const results = await db
    .select()
    .from(users)
    .where(like(users.username, `%${username}%`))
    .limit(10);

  res.json(results.map(user => ({
    username: user.username,
    id: user.id
  })));
});

export default router;
