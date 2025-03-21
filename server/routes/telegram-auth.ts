import { Router } from "express";
import { db } from "@db";
import { sql } from "drizzle-orm";
import { createHmac } from "crypto";
import { generateToken } from "../utils/token";

const router = Router();

// Telegram login verification
router.post("/telegram", async (req, res) => {
  try {
    const telegramData = req.body;
    
    // Verify the data is from Telegram
    if (!verifyTelegramData(telegramData)) {
      return res.status(401).json({ message: "Invalid Telegram authentication data" });
    }
    
    // Check if user with this Telegram ID exists
    const existingUsers = await db.execute(sql`
      SELECT * FROM users 
      WHERE telegram_id = ${telegramData.id.toString()} 
      LIMIT 1
    `);
    
    let user = existingUsers[0];
    
    if (user) {
      // User exists, update Telegram data
      const updatedUsers = await db.execute(sql`
        UPDATE users 
        SET 
          telegram_username = ${telegramData.username},
          telegram_first_name = ${telegramData.first_name},
          telegram_last_name = ${telegramData.last_name},
          telegram_photo_url = ${telegramData.photo_url},
          telegram_auth_date = ${new Date(telegramData.auth_date * 1000)},
          telegram_hash = ${telegramData.hash},
          is_telegram_verified = true,
          telegram_verified_at = ${new Date()}
        WHERE id = ${user.id} 
        RETURNING *
      `);
      
      user = updatedUsers[0];
    } else {
      // Create new user with Telegram data
      const newUsers = await db.execute(sql`
        INSERT INTO users (
          username,
          email,
          password,
          telegram_id,
          telegram_username,
          telegram_first_name,
          telegram_last_name,
          telegram_photo_url,
          telegram_auth_date,
          telegram_hash,
          is_telegram_verified,
          telegram_verified_at
        ) VALUES (
          ${telegramData.username || `tg_${telegramData.id}`},
          ${`${telegramData.id}@telegram.placeholder.com`},
          ${''},
          ${telegramData.id.toString()},
          ${telegramData.username},
          ${telegramData.first_name},
          ${telegramData.last_name},
          ${telegramData.photo_url},
          ${new Date(telegramData.auth_date * 1000)},
          ${telegramData.hash},
          ${true},
          ${new Date()}
        )
        RETURNING *
      `);
      
      user = newUsers[0];
    }
    
    if (!user) {
      return res.status(500).json({ message: "Failed to create or update user" });
    }
    
    // Generate JWT token
    const token = generateToken(user);
    
    // Set cookie
    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    
    return res.status(200).json({
      message: "Telegram authentication successful",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.is_admin,
        telegramUsername: user.telegram_username,
        goatedUsername: user.goated_username,
      },
    });
  } catch (error) {
    console.error("Telegram auth error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Verify Telegram data using HMAC-SHA-256
function verifyTelegramData(data: any): boolean {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.error("TELEGRAM_BOT_TOKEN not set");
    return false;
  }
  
  const { hash, ...userData } = data;
  
  // Create data check string
  const dataCheckArr = Object.keys(userData)
    .sort()
    .map(key => `${key}=${userData[key]}`);
  
  const dataCheckString = dataCheckArr.join('\n');
  
  // Create secret key from bot token
  const secretKey = createHmac('sha256', 'WebAppData')
    .update(process.env.TELEGRAM_BOT_TOKEN)
    .digest();
  
  // Calculate hash
  const calculatedHash = createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');
  
  // Compare hashes
  return calculatedHash === hash;
}

export default router;
