import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";
const app = new Hono();

// Supabase client for auth verification
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Middleware to verify auth token
async function verifyAuth(c: any, next: any) {
  const accessToken = c.req.header('Authorization')?.split(' ')[1];
  
  if (!accessToken) {
    return c.json({ error: 'Unauthorized: No token provided' }, 401);
  }

  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  
  if (error || !user) {
    console.error('Authorization error:', error);
    return c.json({ error: 'Unauthorized: Invalid token' }, 401);
  }

  c.set('userId', user.id);
  c.set('user', user);
  await next();
}

// Health check endpoint
app.get("/make-server-3ed9c009/health", (c) => {
  return c.json({ status: "ok" });
});

// Get user profile
app.get("/make-server-3ed9c009/user/profile", verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const key = `user:${userId}:profile`;
    
    const profile = await kv.get(key);
    
    if (!profile) {
      // Create default profile for new user
      const user = c.get('user');
      const defaultProfile = {
        userId,
        credits: 0,
        nickname: user.user_metadata?.name || user.email?.split('@')[0] || '사용자',
        church: '',
        createdAt: new Date().toISOString(),
      };
      
      await kv.set(key, defaultProfile);
      return c.json({ profile: defaultProfile });
    }
    
    return c.json({ profile });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return c.json({ error: 'Failed to fetch profile' }, 500);
  }
});

// Update user profile
app.post("/make-server-3ed9c009/user/profile", verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();
    const { nickname, church, credits } = body;
    
    const key = `user:${userId}:profile`;
    const existingProfile = await kv.get(key);
    
    const updatedProfile = {
      ...existingProfile,
      userId,
      nickname: nickname ?? existingProfile?.nickname,
      church: church ?? existingProfile?.church,
      credits: credits ?? existingProfile?.credits ?? 0,
      updatedAt: new Date().toISOString(),
    };
    
    if (!existingProfile) {
      updatedProfile.createdAt = new Date().toISOString();
    }
    
    await kv.set(key, updatedProfile);
    
    return c.json({ profile: updatedProfile });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return c.json({ error: 'Failed to update profile' }, 500);
  }
});

// Save transcription record
app.post("/make-server-3ed9c009/transcription", verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();
    const { mode, verse, credits, book, chapter, verseNum } = body;
    
    const timestamp = Date.now();
    const transcriptionId = `${timestamp}-${Math.random().toString(36).substr(2, 9)}`;
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Save transcription record
    const transcription = {
      id: transcriptionId,
      userId,
      mode,
      verse,
      credits,
      book,
      chapter,
      verseNum,
      date,
      timestamp: new Date().toISOString(),
    };
    
    const transcriptionKey = `user:${userId}:transcription:${transcriptionId}`;
    await kv.set(transcriptionKey, transcription);
    
    // Update daily stats
    const dailyKey = `user:${userId}:daily:${date}`;
    const dailyStats = await kv.get(dailyKey) || { date, earned: 0, count: 0, transcriptions: [] };
    
    dailyStats.earned = (dailyStats.earned || 0) + credits;
    dailyStats.count = (dailyStats.count || 0) + 1;
    dailyStats.transcriptions = [...(dailyStats.transcriptions || []), transcriptionId];
    
    await kv.set(dailyKey, dailyStats);
    
    // Update user credits
    const profileKey = `user:${userId}:profile`;
    const profile = await kv.get(profileKey);
    
    if (profile) {
      profile.credits = (profile.credits || 0) + credits;
      await kv.set(profileKey, profile);
    }
    
    return c.json({ 
      transcription,
      dailyEarned: dailyStats.earned,
      totalCredits: profile?.credits || 0
    });
  } catch (error) {
    console.error('Error saving transcription:', error);
    return c.json({ error: 'Failed to save transcription' }, 500);
  }
});

// Get transcriptions (with optional filters)
app.get("/make-server-3ed9c009/transcriptions", verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const prefix = `user:${userId}:transcription:`;
    
    const transcriptions = await kv.getByPrefix(prefix);
    
    // Sort by timestamp (newest first)
    transcriptions.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeB - timeA;
    });
    
    return c.json({ transcriptions });
  } catch (error) {
    console.error('Error fetching transcriptions:', error);
    return c.json({ error: 'Failed to fetch transcriptions' }, 500);
  }
});

// Get daily stats for a specific date or date range
app.get("/make-server-3ed9c009/daily-stats", verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const date = c.req.query('date'); // YYYY-MM-DD
    const month = c.req.query('month'); // YYYY-MM
    
    if (date) {
      // Get single day stats
      const dailyKey = `user:${userId}:daily:${date}`;
      const stats = await kv.get(dailyKey);
      return c.json({ date, stats: stats || { date, earned: 0, count: 0 } });
    } else if (month) {
      // Get all days in month
      const prefix = `user:${userId}:daily:${month}`;
      const monthStats = await kv.getByPrefix(prefix);
      return c.json({ month, stats: monthStats });
    } else {
      // Get today's stats
      const today = new Date().toISOString().split('T')[0];
      const dailyKey = `user:${userId}:daily:${today}`;
      const stats = await kv.get(dailyKey);
      return c.json({ date: today, stats: stats || { date: today, earned: 0, count: 0 } });
    }
  } catch (error) {
    console.error('Error fetching daily stats:', error);
    return c.json({ error: 'Failed to fetch daily stats' }, 500);
  }
});

// Get completed verses (for Bible tab marking)
app.get("/make-server-3ed9c009/completed-verses", verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const prefix = `user:${userId}:transcription:`;
    
    const transcriptions = await kv.getByPrefix(prefix);
    
    // Create a map of completed verses: { "창세기-1-1": true, ... }
    const completedVerses: { [key: string]: boolean } = {};
    transcriptions.forEach((t: any) => {
      if (t.book && t.chapter && t.verseNum) {
        const key = `${t.book}-${t.chapter}-${t.verseNum}`;
        completedVerses[key] = true;
      }
    });
    
    return c.json({ completedVerses });
  } catch (error) {
    console.error('Error fetching completed verses:', error);
    return c.json({ error: 'Failed to fetch completed verses' }, 500);
  }
});

Deno.serve(app.fetch);