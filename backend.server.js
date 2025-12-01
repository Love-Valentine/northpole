

Created backend/server.js
/**
 * NORTH POLE PEN PALS - BACKEND SERVER
 * Production-ready Node.js/Express API
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const Stripe = require('stripe');
const { OpenAI } = require('openai');
require('dotenv').config();
const app = express();
// ============== CONFIGURATION ==============
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
// Database Connection
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'north_pole_penpals',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});
// ============== MIDDLEWARE ==============
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());
app.use(express.static('public'));
// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);
// ============== AUTH MIDDLEWARE ==============
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.status(401).json({ error: 'Access token required' });
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
};
// ============== PARENT AUTH ROUTES ==============
app.post('/api/auth/parent/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;
        
        // Check if user exists
        const existingUser = await pool.query('SELECT id FROM parents WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Generate parent code
        const parentCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        // Insert parent
        const result = await pool.query(
            `INSERT INTO parents (email, password, name, parent_code, created_at) 
             VALUES ($1, $2, $3, $4, NOW()) RETURNING id, email, name, parent_code`,
            [email, hashedPassword, name, parentCode]
        );
        
        const token = jwt.sign({ id: result.rows[0].id, type: 'parent' }, JWT_SECRET, { expiresIn: '7d' });
        
        res.json({ 
            token, 
            user: result.rows[0],
            message: 'Account created successfully!' 
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});
app.post('/api/auth/parent/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const result = await pool.query('SELECT * FROM parents WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const parent = result.rows[0];
        const validPassword = await bcrypt.compare(password, parent.password);
        
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const token = jwt.sign({ id: parent.id, type: 'parent' }, JWT_SECRET, { expiresIn: '7d' });
        
        res.json({ 
            token, 
            user: { id: parent.id, email: parent.email, name: parent.name, parent_code: parent.parent_code }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});
// ============== KID AUTH ROUTES ==============
app.post('/api/auth/kid/register', async (req, res) => {
    try {
        const { username, password, name, age, parentCode } = req.body;
        
        // Verify parent code
        const parent = await pool.query('SELECT id FROM parents WHERE parent_code = $1', [parentCode]);
        if (parent.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid parent code' });
        }
        
        // Check if username exists
        const existingUser = await pool.query('SELECT id FROM kids WHERE username = $1', [username]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'Username already taken' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const result = await pool.query(
            `INSERT INTO kids (parent_id, username, password, name, age, created_at) 
             VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id, username, name, age`,
            [parent.rows[0].id, username, hashedPassword, name, age]
        );
        
        const token = jwt.sign({ id: result.rows[0].id, type: 'kid' }, JWT_SECRET, { expiresIn: '7d' });
        
        res.json({ token, user: result.rows[0] });
    } catch (error) {
        console.error('Kid registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});
app.post('/api/auth/kid/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        const result = await pool.query('SELECT * FROM kids WHERE username = $1', [username]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const kid = result.rows[0];
        const validPassword = await bcrypt.compare(password, kid.password);
        
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const token = jwt.sign({ id: kid.id, type: 'kid' }, JWT_SECRET, { expiresIn: '7d' });
        
        res.json({ 
            token, 
            user: { id: kid.id, username: kid.username, name: kid.name, age: kid.age, elf_id: kid.elf_id }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});
// ============== ELVES ROUTES ==============
app.get('/api/elves', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM elves ORDER BY id');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch elves' });
    }
});
app.post('/api/elves/select', authenticateToken, async (req, res) => {
    try {
        const { elfId } = req.body;
        
        await pool.query('UPDATE kids SET elf_id = $1 WHERE id = $2', [elfId, req.user.id]);
        
        const elf = await pool.query('SELECT * FROM elves WHERE id = $1', [elfId]);
        
        res.json({ message: 'Elf selected!', elf: elf.rows[0] });
    } catch (error) {
        res.status(500).json({ error: 'Failed to select elf' });
    }
});
// ============== LETTERS ROUTES ==============
app.post('/api/letters', authenticateToken, async (req, res) => {
    try {
        const { content } = req.body;
        
        // Get kid's selected elf
        const kid = await pool.query('SELECT elf_id FROM kids WHERE id = $1', [req.user.id]);
        if (!kid.rows[0].elf_id) {
            return res.status(400).json({ error: 'Please select an elf friend first' });
        }
        
        // Save letter
        const result = await pool.query(
            `INSERT INTO letters (kid_id, elf_id, content, sent_at) 
             VALUES ($1, $2, $3, NOW()) RETURNING *`,
            [req.user.id, kid.rows[0].elf_id, content]
        );
        
        // Get parent's response preference
        const parent = await pool.query(
            `SELECT p.response_mode FROM parents p 
             JOIN kids k ON k.parent_id = p.id 
             WHERE k.id = $1`,
            [req.user.id]
        );
        
        // If AI mode, generate response
        if (parent.rows[0].response_mode === 'ai') {
            const elf = await pool.query('SELECT * FROM elves WHERE id = $1', [kid.rows[0].elf_id]);
            
            // Generate AI response
            const aiResponse = await generateElfResponse(content, elf.rows[0]);
            
            // Save response
            await pool.query(
                `UPDATE letters SET response = $1, response_at = NOW() WHERE id = $2`,
                [aiResponse, result.rows[0].id]
            );
        }
        
        res.json({ message: 'Letter sent to the North Pole!', letter: result.rows[0] });
    } catch (error) {
        console.error('Letter error:', error);
        res.status(500).json({ error: 'Failed to send letter' });
    }
});
app.get('/api/letters', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT l.*, e.name as elf_name, e.emoji as elf_emoji 
             FROM letters l 
             JOIN elves e ON l.elf_id = e.id 
             WHERE l.kid_id = $1 
             ORDER BY l.sent_at DESC`,
            [req.user.id]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch letters' });
    }
});
// Parent view of all letters
app.get('/api/parent/letters', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT l.*, k.name as kid_name, e.name as elf_name 
             FROM letters l 
             JOIN kids k ON l.kid_id = k.id 
             JOIN elves e ON l.elf_id = e.id 
             WHERE k.parent_id = $1 
             ORDER BY l.sent_at DESC`,
            [req.user.id]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch letters' });
    }
});
// Parent respond to letter
app.post('/api/parent/letters/:id/respond', authenticateToken, async (req, res) => {
    try {
        const { response } = req.body;
        const letterId = req.params.id;
        
        await pool.query(
            `UPDATE letters SET response = $1, response_at = NOW(), responded_by = 'parent' 
             WHERE id = $2`,
            [response, letterId]
        );
        
        res.json({ message: 'Response sent!' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to send response' });
    }
});
// ============== AI RESPONSE GENERATION ==============
async function generateElfResponse(letterContent, elf) {
    try {
        const prompt = `You are ${elf.name}, a friendly elf at the North Pole. Your job is ${elf.job} and your personality is: ${elf.personality}. 
        
        A child has written you this letter:
        "${letterContent}"
        
        Write a warm, magical, age-appropriate response (2-3 paragraphs max). Be encouraging, mention life at the North Pole, and sign off as ${elf.name}. Use some emojis sparingly.`;
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 300,
            temperature: 0.8
        });
        return completion.choices[0].message.content;
    } catch (error) {
        // Fallback response if AI fails
        const fallbackResponses = [
            `Oh my jingle bells! Thank you so much for your wonderful letter! Life at the North Pole is so magical - we're busy making toys and singing carols! Keep being amazing! 🎄 Love, ${elf.name}`,
            `Your letter made all the elves do a happy dance! We love hearing from you! The reindeer say hi too! ⭐ Warmly, ${elf.name}`,
            `What a lovely letter! Santa showed it to all of us and we're so happy! Keep spreading joy and kindness! ❄️ Your friend, ${elf.name}`
        ];
        return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
    }
}
// ============== SUBSCRIPTION/PAYMENT ROUTES ==============
app.post('/api/subscriptions/create-checkout', authenticateToken, async (req, res) => {
    try {
        const { planType, addons } = req.body;
        
        const prices = {
            monthly: { price: 999, name: 'Monthly Magic', interval: 'month' },
            yearly: { price: 7999, name: 'Yearly Wonder', interval: 'year' },
            forever: { price: 19999, name: 'Forever Magic', interval: null }
        };
        
        const plan = prices[planType];
        
        let lineItems = [{
            price_data: {
                currency: 'usd',
                product_data: { name: plan.name },
                unit_amount: plan.price,
                ...(plan.interval && { recurring: { interval: plan.interval } })
            },
            quantity: 1
        }];
        
        // Add addons
        const addonPrices = {
            friendship: { price: 499, name: 'Friendship Certificate' },
            nicelist: { price: 499, name: 'Nice List Certificate' },
            video: { price: 1499, name: 'Personalized Video' },
            bundle: { price: 1999, name: 'Ultimate Bundle' }
        };
        
        if (addons && addons.length > 0) {
            addons.forEach(addon => {
                if (addonPrices[addon]) {
                    lineItems.push({
                        price_data: {
                            currency: 'usd',
                            product_data: { name: addonPrices[addon].name },
                            unit_amount: addonPrices[addon].price
                        },
                        quantity: 1
                    });
                }
            });
        }
        
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: plan.interval ? 'subscription' : 'payment',
            success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL}/cancel`,
            customer_email: req.user.email,
            metadata: { parent_id: req.user.id, plan_type: planType }
        });
        
        res.json({ sessionId: session.id, url: session.url });
    } catch (error) {
        console.error('Checkout error:', error);
        res.status(500).json({ error: 'Failed to create checkout session' });
    }
});
// Stripe webhook
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;
    
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        
        // Update subscription status
        await pool.query(
            `UPDATE parents SET subscription_status = 'active', 
             subscription_plan = $1, subscription_date = NOW() 
             WHERE id = $2`,
            [session.metadata.plan_type, session.metadata.parent_id]
        );
    }
    
    res.json({ received: true });
});
// ============== VIDEOS ROUTES ==============
app.get('/api/videos', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM videos WHERE is_active = true ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch videos' });
    }
});
// ============== CERTIFICATES ROUTES ==============
app.get('/api/certificates', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM certificates WHERE kid_id = $1 ORDER BY issued_at DESC`,
            [req.user.id]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch certificates' });
    }
});
// ============== PARENT SETTINGS ==============
app.patch('/api/parent/settings', authenticateToken, async (req, res) => {
    try {
        const { responseMode } = req.body;
        
        await pool.query(
            'UPDATE parents SET response_mode = $1 WHERE id = $2',
            [responseMode, req.user.id]
        );
        
        res.json({ message: 'Settings updated' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update settings' });
    }
});
// Get kids for parent
app.get('/api/parent/kids', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, username, name, age, elf_id, created_at FROM kids WHERE parent_id = $1',
            [req.user.id]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch kids' });
    }
});
// ============== HEALTH CHECK ==============
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// ============== START SERVER ==============
app.listen(PORT, () => {
    console.log(`🎄 North Pole Pen Pals server running on port ${PORT}`);
});
module.exports = app;
