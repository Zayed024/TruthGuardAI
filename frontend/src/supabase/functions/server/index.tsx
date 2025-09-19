import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from 'npm:@supabase/supabase-js';
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
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

// Health check endpoint
app.get("/make-server-cd4019c8/health", (c) => {
  return c.json({ status: "ok" });
});

// Check if admin users exist
app.get("/make-server-cd4019c8/admin/exists", async (c) => {
  try {
    // Get all user records from KV store that are admins
    const adminUsers = await kv.getByPrefix('user_');
    const hasAdmins = adminUsers.some(user => user.isAdmin === true);
    
    return c.json({ hasAdmins });
  } catch (error) {
    console.log('Check admin exists error:', error);
    return c.json({ error: 'Failed to check admin status' }, 500);
  }
});

// User signup endpoint
app.post("/make-server-cd4019c8/auth/signup", async (c) => {
  try {
    const { email, password, name } = await c.req.json();
    
    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400);
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });

    if (error) {
      console.log('Signup error:', error);
      return c.json({ error: error.message }, 400);
    }

    // Store user metadata in KV store
    if (data.user) {
      await kv.set(`user_${data.user.id}`, {
        email: data.user.email,
        name,
        isAdmin: false,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      });
    }

    return c.json({ 
      user: data.user,
      message: 'User created successfully' 
    });

  } catch (error) {
    console.log('Signup endpoint error:', error);
    return c.json({ error: 'Internal server error during signup' }, 500);
  }
});

// Admin user creation endpoint
app.post("/make-server-cd4019c8/auth/admin/signup", async (c) => {
  try {
    const { email, password, adminKey } = await c.req.json();
    
    // Simple admin key validation (in production, use proper admin authentication)
    if (adminKey !== 'truthguard-admin-2024') {
      return c.json({ error: 'Invalid admin key' }, 403);
    }

    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400);
    }

    // Check if user already exists
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    if (!listError && existingUsers?.users) {
      const existingUser = existingUsers.users.find(user => user.email === email);
      if (existingUser) {
        // Check if existing user is already an admin
        const userData = await kv.get(`user_${existingUser.id}`);
        if (userData?.isAdmin) {
          return c.json({ 
            error: 'Admin user with this email already exists',
            suggestion: 'Try logging in with the existing admin credentials instead'
          }, 409);
        } else {
          // Update existing user to admin
          await kv.set(`user_${existingUser.id}`, {
            ...userData,
            isAdmin: true,
            name: userData?.name || 'Admin User',
            lastLogin: new Date().toISOString()
          });
          
          return c.json({ 
            user: existingUser,
            message: 'Existing user upgraded to admin successfully'
          });
        }
      }
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name: 'Admin User', isAdmin: true },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });

    if (error) {
      console.log('Admin signup error:', error);
      
      // Handle specific error cases
      if (error.message.includes('already been registered')) {
        return c.json({ 
          error: 'A user with this email already exists',
          suggestion: 'Try a different email address or contact support if this should be upgraded to admin'
        }, 409);
      }
      
      return c.json({ error: error.message }, 400);
    }

    // Store admin metadata in KV store
    if (data.user) {
      await kv.set(`user_${data.user.id}`, {
        email: data.user.email,
        name: 'Admin User',
        isAdmin: true,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      });
    }

    return c.json({ 
      user: data.user,
      message: 'Admin user created successfully' 
    });

  } catch (error) {
    console.log('Admin signup endpoint error:', error);
    return c.json({ error: 'Internal server error during admin signup' }, 500);
  }
});

// Get user profile endpoint (requires authentication)
app.get("/make-server-cd4019c8/auth/profile", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'No access token provided' }, 401);
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user) {
      console.log('Get user profile error:', error);
      return c.json({ error: 'Invalid access token' }, 401);
    }

    // Get additional user data from KV store
    const userData = await kv.get(`user_${user.id}`);

    return c.json({
      user: {
        id: user.id,
        email: user.email,
        name: userData?.name || user.user_metadata?.name,
        isAdmin: userData?.isAdmin || user.user_metadata?.isAdmin || false,
        lastLogin: userData?.lastLogin
      }
    });

  } catch (error) {
    console.log('Get profile endpoint error:', error);
    return c.json({ error: 'Internal server error while fetching profile' }, 500);
  }
});

// Update last login endpoint
app.post("/make-server-cd4019c8/auth/update-login", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'No access token provided' }, 401);
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user) {
      return c.json({ error: 'Invalid access token' }, 401);
    }

    // Update last login in KV store
    const userData = await kv.get(`user_${user.id}`);
    if (userData) {
      await kv.set(`user_${user.id}`, {
        ...userData,
        lastLogin: new Date().toISOString()
      });
    }

    return c.json({ message: 'Last login updated' });

  } catch (error) {
    console.log('Update login endpoint error:', error);
    return c.json({ error: 'Internal server error while updating login' }, 500);
  }
});

// Store analysis history endpoint
app.post("/make-server-cd4019c8/analysis/history", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'No access token provided' }, 401);
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user) {
      return c.json({ error: 'Invalid access token' }, 401);
    }

    const analysisData = await c.req.json();
    const analysisId = crypto.randomUUID();
    
    // Store analysis in KV store
    await kv.set(`analysis_${user.id}_${analysisId}`, {
      ...analysisData,
      userId: user.id,
      createdAt: new Date().toISOString(),
      id: analysisId
    });

    return c.json({ 
      message: 'Analysis saved successfully',
      analysisId 
    });

  } catch (error) {
    console.log('Store analysis endpoint error:', error);
    return c.json({ error: 'Internal server error while storing analysis' }, 500);
  }
});

// Get analysis history endpoint
app.get("/make-server-cd4019c8/analysis/history", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'No access token provided' }, 401);
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user) {
      return c.json({ error: 'Invalid access token' }, 401);
    }

    // Get user's analysis history from KV store
    const analyses = await kv.getByPrefix(`analysis_${user.id}_`);
    
    // Sort by creation date (newest first)
    const sortedAnalyses = analyses.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return c.json({ analyses: sortedAnalyses });

  } catch (error) {
    console.log('Get analysis history endpoint error:', error);
    return c.json({ error: 'Internal server error while fetching analysis history' }, 500);
  }
});

Deno.serve(app.fetch);