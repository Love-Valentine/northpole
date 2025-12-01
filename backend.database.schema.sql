Created backend/database/schema.sql
-- =====================================================
-- NORTH POLE PEN PALS - DATABASE SCHEMA
-- PostgreSQL Database Schema
-- =====================================================
-- Create database (run this separately if needed)
-- CREATE DATABASE north_pole_penpals;
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- =====================================================
-- PARENTS TABLE
-- =====================================================
CREATE TABLE parents (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    parent_code VARCHAR(10) UNIQUE NOT NULL,
    response_mode VARCHAR(20) DEFAULT 'ai' CHECK (response_mode IN ('ai', 'parent')),
    subscription_status VARCHAR(20) DEFAULT 'inactive' CHECK (subscription_status IN ('inactive', 'active', 'cancelled', 'expired')),
    subscription_plan VARCHAR(20) CHECK (subscription_plan IN ('monthly', 'yearly', 'forever')),
    subscription_date TIMESTAMP,
    stripe_customer_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
-- Index for faster lookups
CREATE INDEX idx_parents_email ON parents(email);
CREATE INDEX idx_parents_parent_code ON parents(parent_code);
-- =====================================================
-- KIDS TABLE
-- =====================================================
CREATE TABLE kids (
    id SERIAL PRIMARY KEY,
    parent_id INTEGER REFERENCES parents(id) ON DELETE CASCADE,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    age INTEGER CHECK (age >= 3 AND age <= 16),
    elf_id INTEGER,
    avatar_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_kids_parent_id ON kids(parent_id);
CREATE INDEX idx_kids_username ON kids(username);
-- =====================================================
-- ELVES TABLE
-- =====================================================
CREATE TABLE elves (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    gender VARCHAR(10) CHECK (gender IN ('boy', 'girl')),
    emoji VARCHAR(10),
    job VARCHAR(255) NOT NULL,
    personality TEXT NOT NULL,
    color_gradient VARCHAR(100),
    avatar_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);
-- Add foreign key to kids table
ALTER TABLE kids ADD CONSTRAINT fk_kids_elf FOREIGN KEY (elf_id) REFERENCES elves(id);
-- =====================================================
-- LETTERS TABLE
-- =====================================================
CREATE TABLE letters (
    id SERIAL PRIMARY KEY,
    kid_id INTEGER REFERENCES kids(id) ON DELETE CASCADE,
    elf_id INTEGER REFERENCES elves(id),
    content TEXT NOT NULL,
    response TEXT,
    responded_by VARCHAR(20) CHECK (responded_by IN ('ai', 'parent')),
    sent_at TIMESTAMP DEFAULT NOW(),
    response_at TIMESTAMP,
    is_read BOOLEAN DEFAULT false,
    is_flagged BOOLEAN DEFAULT false
);
CREATE INDEX idx_letters_kid_id ON letters(kid_id);
CREATE INDEX idx_letters_elf_id ON letters(elf_id);
CREATE INDEX idx_letters_sent_at ON letters(sent_at DESC);
-- =====================================================
-- VIDEOS TABLE
-- =====================================================
CREATE TABLE videos (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    thumbnail_emoji VARCHAR(10),
    thumbnail_url VARCHAR(500),
    video_url VARCHAR(500) NOT NULL,
    video_type VARCHAR(50) CHECK (video_type IN ('welcome', 'tour', 'greeting', 'special', 'personalized')),
    is_premium BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);
-- =====================================================
-- CERTIFICATES TABLE
-- =====================================================
CREATE TABLE certificates (
    id SERIAL PRIMARY KEY,
    kid_id INTEGER REFERENCES kids(id) ON DELETE CASCADE,
    certificate_type VARCHAR(50) NOT NULL CHECK (certificate_type IN ('friendship', 'nicelist', 'achievement', 'special')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    issued_at TIMESTAMP DEFAULT NOW(),
    download_url VARCHAR(500),
    is_downloaded BOOLEAN DEFAULT false
);
CREATE INDEX idx_certificates_kid_id ON certificates(kid_id);
-- =====================================================
-- SUBSCRIPTIONS TABLE (for detailed tracking)
-- =====================================================
CREATE TABLE subscriptions (
    id SERIAL PRIMARY KEY,
    parent_id INTEGER REFERENCES parents(id) ON DELETE CASCADE,
    plan_type VARCHAR(20) NOT NULL CHECK (plan_type IN ('monthly', 'yearly', 'forever')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'past_due')),
    stripe_subscription_id VARCHAR(255),
    stripe_price_id VARCHAR(255),
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    cancel_at_period_end BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_subscriptions_parent_id ON subscriptions(parent_id);
-- =====================================================
-- ADDONS TABLE
-- =====================================================
CREATE TABLE addons (
    id SERIAL PRIMARY KEY,
    parent_id INTEGER REFERENCES parents(id) ON DELETE CASCADE,
    addon_type VARCHAR(50) NOT NULL CHECK (addon_type IN ('friendship_cert', 'nicelist_cert', 'personalized_video', 'bundle')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'delivered')),
    stripe_payment_id VARCHAR(255),
    purchased_at TIMESTAMP DEFAULT NOW(),
    delivered_at TIMESTAMP
);
-- =====================================================
-- GAME SCORES TABLE (for mini games)
-- =====================================================
CREATE TABLE game_scores (
    id SERIAL PRIMARY KEY,
    kid_id INTEGER REFERENCES kids(id) ON DELETE CASCADE,
    game_type VARCHAR(50) NOT NULL CHECK (game_type IN ('find_elf', 'word_search', 'spot_difference')),
    score INTEGER NOT NULL,
    time_seconds INTEGER,
    played_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_game_scores_kid_id ON game_scores(kid_id);
-- =====================================================
-- SESSIONS TABLE (for auth tracking)
-- =====================================================
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    user_type VARCHAR(10) NOT NULL CHECK (user_type IN ('parent', 'kid')),
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    ip_address VARCHAR(45),
    user_agent TEXT
);
CREATE INDEX idx_sessions_user ON sessions(user_id, user_type);
-- =====================================================
-- INSERT DEFAULT ELVES
-- =====================================================
INSERT INTO elves (name, gender, emoji, job, personality, color_gradient) VALUES
-- Boy Elves
('Jingle', 'boy', '🧝‍♂️', 'Toy Workshop Expert', 'Energetic and loves building trains!', 'from-red-700 to-red-900'),
('Frost', 'boy', '🧝‍♂️', 'Reindeer Trainer', 'Gentle and great with animals', 'from-blue-700 to-blue-900'),
('Tinker', 'boy', '🧝‍♂️', 'Gadget Inventor', 'Curious and loves science!', 'from-purple-700 to-purple-900'),
('Dash', 'boy', '🧝‍♂️', 'Sleigh Speed Tester', 'Fast and adventurous!', 'from-green-700 to-green-900'),
('Pepper', 'boy', '🧝‍♂️', 'Cookie Quality Tester', 'Funny and loves jokes!', 'from-orange-700 to-orange-900'),
('Snowball', 'boy', '🧝‍♂️', 'Snow Globe Maker', 'Creative and artistic', 'from-cyan-700 to-cyan-900'),
('Nutmeg', 'boy', '🧝‍♂���', 'Hot Cocoa Specialist', 'Warm and caring', 'from-amber-700 to-amber-900'),
('Boots', 'boy', '🧝‍♂️', 'Letter Sorter', 'Organized and helpful', 'from-stone-700 to-stone-900'),
('Blitzen Jr', 'boy', '🧝‍♂️', 'North Pole Guide', 'Brave and protective', 'from-red-800 to-red-950'),
('Chip', 'boy', '🧝‍♂️', 'Computer Elf', 'Smart and tech-savvy', 'from-slate-700 to-slate-900'),
-- Girl Elves
('Sparkle', 'girl', '🧝‍♀️', 'Cookie Baker', 'Sweet and loves baking treats!', 'from-pink-600 to-pink-800'),
('Holly', 'girl', '🧝‍♀️', 'Gift Wrapper Expert', 'Creative with beautiful bows!', 'from-rose-600 to-rose-800'),
('Twinkle', 'girl', '🧝‍♀️', 'Light Decorator', 'Bright and cheerful!', 'from-yellow-600 to-yellow-800'),
('Snowflake', 'girl', '🧝‍♀️', 'Ice Sculptor', 'Elegant and patient', 'from-sky-600 to-sky-800'),
('Candy', 'girl', '🧝‍♀️', 'Candy Cane Maker', 'Sweet and energetic!', 'from-red-600 to-pink-800'),
('Ivy', 'girl', '🧝‍♀️', 'Garden Elf', 'Nature-loving and peaceful', 'from-emerald-600 to-emerald-800'),
('Mittens', 'girl', '🧝‍♀️', 'Clothing Designer', 'Fashionable and creative', 'from-violet-600 to-violet-800'),
('Cinnamon', 'girl', '🧝‍♀️', 'Scent Specialist', 'Warm and comforting', 'from-orange-600 to-orange-800'),
('Aurora', 'girl', '🧝‍♀️', 'Northern Lights Watcher', 'Dreamy and magical', 'from-indigo-600 to-purple-800'),
('Belle', 'girl', '🧝‍♀️', 'Bell Choir Leader', 'Musical and joyful!', 'from-amber-600 to-amber-800');
-- =====================================================
-- INSERT DEFAULT VIDEOS
-- =====================================================
INSERT INTO videos (title, description, thumbnail_emoji, video_url, video_type, is_premium) VALUES
('Welcome to the North Pole!', 'Take a magical tour of Santas village!', '🏠', '/videos/welcome.mp4', 'welcome', false),
('Meet the Reindeer', 'Say hi to Rudolph and all his friends!', '🦌', '/videos/reindeer.mp4', 'tour', false),
('Inside the Toy Workshop', 'See how we make all the amazing toys!', '🧸', '/videos/workshop.mp4', 'tour', false),
('Elf Dance Party', 'Join our festive holiday dance!', '💃', '/videos/dance.mp4', 'special', false),
('Cookie Baking Time', 'Learn our secret North Pole cookie recipes!', '🍪', '/videos/cookies.mp4', 'special', true),
('Northern Lights Show', 'Watch the beautiful aurora over the North Pole!', '🌌', '/videos/aurora.mp4', 'special', true);
-- =====================================================
-- HELPFUL VIEWS
-- =====================================================
-- View for parent dashboard - all their kids' letters
CREATE VIEW parent_letter_view AS
SELECT 
    l.id,
    l.content,
    l.response,
    l.sent_at,
    l.response_at,
    l.responded_by,
    k.name as kid_name,
    k.parent_id,
    e.name as elf_name,
    e.emoji as elf_emoji
FROM letters l
JOIN kids k ON l.kid_id = k.id
JOIN elves e ON l.elf_id = e.id;
-- View for subscription status
CREATE VIEW subscription_status_view AS
SELECT 
    p.id as parent_id,
    p.name,
    p.email,
    p.subscription_status,
    p.subscription_plan,
    p.subscription_date,
    COUNT(k.id) as kid_count
FROM parents p
LEFT JOIN kids k ON p.id = k.parent_id
GROUP BY p.id;
-- =====================================================
-- TRIGGERS
-- =====================================================
-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';
CREATE TRIGGER update_parents_updated_at 
    BEFORE UPDATE ON parents 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_kids_updated_at 
    BEFORE UPDATE ON kids 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at 
    BEFORE UPDATE ON subscriptions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- =====================================================
-- GRANTS (adjust as needed for your setup)
-- =====================================================
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
