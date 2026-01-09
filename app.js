const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
require('dotenv').config();
//for vercel
const path = require('path');

const app = express();
const port = process.env.PORT || 5000;

// CORS Configuration
const corsOptions = {
    origin: [
        'https://salonmaroc.vercel.app',
        'http://localhost:5000'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// --- CONNEXION POSTGRESQL (SUPABASE) ---
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// --- MIDDLEWARES---
app.use(cors({ origin: true, credentials: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('./public'));

//--CONFIG FOR SUPABASE-- 
app.get('/config', (req, res) => {
    //for cors
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    //for supabase
    res.json({
        SUPABASE_URL: process.env.SUPABASE_URL,
        SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY
    });
});

// --- CONFIGURE NODEMAILER ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,  // Your Gmail address
        pass: process.env.GMAIL_PASS   // Your Gmail app password (NOT regular password)
    }
});

// --- CONTACT FORM ENDPOINT ---
app.post('/contact', async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        // Validation
        if (!name || !email || !subject || !message) {
            return res.status(400).json({
                success: false,
                error: 'All fields are required'
            });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email address'
            });
        }

        // Create email content
        const mailOptions = {
            from: `"Salon Maroc Contact Form" <${process.env.GMAIL_USER}>`,
            to: process.env.GMAIL_USER,
            replyTo: email,
            subject: `[Salon Maroc Contact] ${subject}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #8B7355;">New Contact Form Submission</h2>
                    <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px; border-left: 4px solid #8B7355;">
                        <p><strong>From:</strong> ${name} (${email})</p>
                        <p><strong>Subject:</strong> ${subject}</p>
                        <p><strong>Message:</strong></p>
                        <div style="background-color: white; padding: 15px; border-radius: 3px; margin-top: 10px;">
                            ${message.replace(/\n/g, '<br>')}
                        </div>
                    </div>
                    <p style="color: #666; font-size: 12px; margin-top: 20px;">
                        This message was sent from the Salon Maroc contact form.
                    </p>
                </div>
            `,
            text: `
                New Contact Form Submission

                From: ${name} (${email})
                Subject: ${subject}
                
                Message:
                ${message}
                
                ---
                This message was sent from the Salon Maroc contact form.
            `
        };

        // Send email
        const info = await transporter.sendMail(mailOptions);

        console.log('Email sent:', info.messageId);

        res.json({
            success: true,
            message: 'Thank you for your message! We will get back to you soon.',
            messageId: info.messageId
        });

    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send message. Please try again later.'
        });
    }
});

// --- MIDDLEWARE D'AUTHENTIFICATION (JWT) ---
const checkAuth = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: "No teken generated" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: "invalid or expired token" });
    }
};

// --- ROUTES AUTHENTIFICATION ---

app.post('/users', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "required input" });

    pool.query("SELECT * FROM users WHERE name = $1", [username], (err, result) => {
        if (err) return res.status(500).json({ error: "Error server" });
        if (result.rows.length === 0) return res.status(401).json({ error: "Unknown user" });

        const user = result.rows[0];
        bcrypt.compare(password, user.password, (bErr, isMatch) => {
            if (bErr) {
                console.error("Error bcrypt:", bErr);
                return res.status(500).json({ error: "Error server" });
            }

            if (isMatch) {
                const token = jwt.sign(
                    { userId: user.id_user, username: user.username },
                    process.env.JWT_SECRET,
                    { expiresIn: '2h' }
                );

                res.json({
                    message: "Login successful",
                    token: token,
                    user: { id: user.id_user, username: user.username }
                });
            } else {
                res.status(401).json({ error: "Incorrect password" });
            }
        });
    });
});

app.post('/register', async (req, res) => {
    const { name, password, email } = req.body;
    if (!name || !password || !email) {
        return res.status(400).json({ error: "All fields are required" });
    }

    try {
        const existing = await pool.query("SELECT 1 FROM users WHERE name = $1", [name]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: "Username already in use" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query("INSERT INTO users (name, password, email) VALUES ($1, $2, $3)",
            [name, hashedPassword, email]);
        res.json({ message: "User created !" });
    } catch (e) {
        if (e.code === '23505') {
            return res.status(409).json({ error: "Username or email already in use" });
        }
        console.error("Registration error:", e);
        res.status(500).json({ error: "Server error" });
    }
});

app.get('/logout', (req, res) => {
    res.json({ message: "logout successful. Please delete token in client side." });
});

// --- ROUTES Salon ---

app.get('/salon', (req, res) => {
    pool.query("SELECT * FROM salon", (err, result) => {
        if (err) {
            console.error("SQL Error on /salon route:", err.message);
            console.error("Full error details:", err);
            return res.status(500).json({
                error: "SQL Error",
                message: err.message
            });
        }
        res.json(result.rows);
    });
});


app.get('/salon/:id_salon', (req, res) => {
    const salonId = req.params.id_salon;
    pool.query("SELECT * FROM salon WHERE id_salon = $1 ", [salonId], (err, result) => {
        if (err) return res.status(500).json({ error: "SQL Error" });
        res.json(result.rows);
    });
});

app.post('/salon', checkAuth, (req, res) => {
    const { name, services, city, m_range_price, review, working_h, status, img } = req.body;

    // Validate required fields
    if (!name || !services || !city || !m_range_price || !review || !working_h || !status || !img) {
        return res.status(400).json({ error: "All fields are required" });
    }

    const servicesArray = services.split(',').map(s => s.trim());
    const workingHoursJson = JSON.stringify(working_h);

    pool.query("INSERT INTO salon (name, services, city, m_range_price, review, working_h, status, img) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
        [name, servicesArray, city, m_range_price, parseFloat(review), workingHoursJson, status, img],
        (err, result) => {
            if (err) {
                console.error("SQL Error:", err);
                return res.status(500).json({ error: "Database error: " + err.message });
            }
            res.status(201).json({
                message: "Salon created successfully",
                salon: result.rows[0]
            });
        }
    );
});

app.put('/salon/:id_salon', checkAuth, (req, res) => {
    const salonId = req.params.id_salon;
    const { name, services, city, m_range_price, review, working_h, status, img } = req.body;

    const servicesArray = services.split(',').map(s => s.trim());
    const workingHoursJson = JSON.stringify(working_h);

    pool.query(`UPDATE salon SET name = $1, services = $2, city = $3, m_range_price = $4, review = $5, working_h = $6, status = $7, img = $8
             WHERE id_salon = $9`,
        [name, servicesArray, city, m_range_price, parseFloat(review), workingHoursJson, status, img, salonId],
        (err, result) => {
            if (err) {
                console.error("SQL Error:", err);
                return res.status(500).json({ error: "Database error" });
            }
            res.status(201).json({
                message: "Salon updated successfully",
                salon: result.rows[0]
            });
        }
    );
});

app.delete('/salon/:id_salon', checkAuth, async (req, res) => {
    try {
        const salonId = req.params.id_salon;
        const checkResult = await pool.query(
            "SELECT * FROM salon WHERE id_salon = $1",
            [salonId]
        );
        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Salon not found"
            });
        }
        await pool.query(
            "DELETE FROM salon WHERE id_salon = $1",
            [salonId]
        );
        res.json({
            success: true,
            message: "Salon deleted successfully"
        });
    } catch (err) {
        console.error("Delete error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to delete salon"
        });
    }
});

// --- ROUTES favorite salon (AJUSTÉES POUR JWT) ---

// ajouter fav_salon
app.post("/fav_salon/:id_salon", checkAuth, (req, res) => {
    const salonId = req.params.id_salon;
    const userId = req.user.id_user;

    pool.query(`INSERT INTO fav_salon (id_user, id_salon) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [userId, salonId], (err) => {
        if (err) return res.status(500).json({ error: "Error while adding salon" });
        res.json({ message: "salon added to favorites with success!" });
    });
});

// Récupérer mes salons favoris
app.get("/fav_salon", checkAuth, (req, res) => {
    const userId = req.user.id_user;
    pool.query(`
        SELECT salon.* FROM salon 
        JOIN fav_salon ON salon.id_salon = fav_salon.id_salon 
        WHERE fav_salon.id_user = $1
    `, [userId], (err, result) => {
        if (err) return res.status(500).json({ error: "failed to recuperate favorite salons" });
        res.json(result.rows);
    });
});

// Annuler un fav_salon 
app.delete("/fav_salon/:id_salon", checkAuth, (req, res) => {
    const salonId = req.params.id_salon;
    const userId = req.user.id_user;

    pool.query(`DELETE FROM fav_salon WHERE id_user = $1 AND id_salon = $2`, [userId, salonId], (err, result) => {
        if (err) return res.status(500).json({ error: "Failed to add" });
        res.json({ message: "Fav salon annulée." });
    });
});

// vercel 
// Serve static files from public folder
app.use(express.static('public'));

// Handle SPA routing - serve index.html for all non-API routes
app.get('*splat', (req, res) => {
    // Check if it's an API route
    if (req.path.startsWith('/api') ||
        req.path.startsWith('/salon') ||
        req.path.startsWith('/users') ||
        req.path.startsWith('/register') ||
        req.path.startsWith('/fav_salon') ||
        req.path.startsWith('/contact') ||
        req.path.startsWith('/config')) {
        return res.status(404).json({ error: 'Endpoint not found' });
    }

    // Serve the frontend for all other routes
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Export for Vercel serverless
module.exports = app;

// Only run the server locally (not on Vercel)
if (require.main === module) {
    const port = process.env.PORT || 5000;
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
}

// Lancer le serveur
app.listen(port, () => {
    console.log(`Server active on port ${port}`);
});