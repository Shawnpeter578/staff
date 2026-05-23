require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware
app.use(cors());
app.use(express.json()); // Parses incoming JSON payloads
app.use(express.static('public')); // Serve your index.html from a 'public' folder
app.set('view engine', 'ejs'); // Use EJS for the admin template
app.set('views', path.join(__dirname, 'views'));

// Basic Authentication Middleware for the Admin Route
const requireAuth = (req, res, next) => {
  const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
  const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');

  // Username is 'admin', Password comes from Render environment variables
  if (login === 'admin' && password === process.env.ADMIN_PASSWORD) {
    return next();
  }
  
  res.set('WWW-Authenticate', 'Basic realm="401"');
  res.status(401).send('Authentication required.');
};

// POST Route: Receive submission from the frontend
app.post('/api/submit', async (req, res) => {
  const { name, department, experience, total_score, readiness_level, answers } = req.body;

  const { data, error } = await supabase
    .from('inventory_responses')
    .insert([{ name, department, experience, total_score, readiness_level, answers }]);

  if (error) {
    console.error('Supabase Error:', error);
    return res.status(500).json({ success: false, error: 'Database insertion failed' });
  }

  res.status(200).json({ success: true, message: 'Response saved successfully' });
});

// GET Route: Protected Admin Dashboard
app.get('/admin', requireAuth, async (req, res) => {
  // Fetch all responses from Supabase, ordered by newest first
  const { data: responses, error } = await supabase
    .from('inventory_responses')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(500).send('Error fetching data from database.');
  }

  // Render the EJS file and pass the data to it
  res.render('admin', { responses });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});