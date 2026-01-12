
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to SQLite database
const db = new sqlite3.Database('./hospital.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        db.serialize(() => {
            // Create users table (for admin, receptionist)
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('admin', 'receptionist'))
            )`);

            // Create doctors table
            db.run(`CREATE TABLE IF NOT EXISTS doctors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                doctorId TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL
            )`);

            // Create patients table
            db.run(`CREATE TABLE IF NOT EXISTS patients (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                age INTEGER NOT NULL,
                phone TEXT NOT NULL,
                gender TEXT NOT NULL,
                address TEXT NOT NULL
            )`);

            // Create appointments table
            db.run(`CREATE TABLE IF NOT EXISTS appointments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_name TEXT NOT NULL,
                patient_age TEXT NOT NULL,
                patient_phone TEXT NOT NULL,
                patient_gender TEXT NOT NULL,
                patient_address TEXT NOT NULL,
                booking_date TEXT NOT NULL,
                problem TEXT NOT NULL,
                visited_before BOOLEAN NOT NULL,
                category TEXT,
                slot TEXT
            )`);
            
            // Create default users/doctors if they don't exist
            const salt = bcrypt.genSaltSync(10);
            const hashedPassword = bcrypt.hashSync('123', salt);

            // Default Admin
            db.get(`SELECT * FROM users WHERE username = ?`, ['admin'], (err, row) => {
                if (!row) {
                    db.run(`INSERT INTO users (name, username, password, role) VALUES (?, ?, ?, ?)`, ['Admin User', 'admin', hashedPassword, 'admin']);
                }
            });

            // Default Receptionist
            db.get(`SELECT * FROM users WHERE username = ?`, ['r101'], (err, row) => {
                if (!row) {
                    db.run(`INSERT INTO users (name, username, password, role) VALUES (?, ?, ?, ?)`, ['Sravanika', 'r101', hashedPassword, 'receptionist']);
                }
            });

            // Default Doctor
            db.get(`SELECT * FROM doctors WHERE doctorId = ?`, ['d101'], (err, row) => {
                if (!row) {
                    db.run(`INSERT INTO doctors (name, doctorId, password) VALUES (?, ?, ?)`, ['Dr. Smith', 'd101', hashedPassword]);
                }
            });

            console.log('Database tables and default users created or already exist.');
        });
    }
});

// API endpoint for login
app.post('/api/login', (req, res) => {
    console.log('--- Login Attempt Received ---');
    console.log('Request Body:', req.body);

    const { username, password, role } = req.body;

    if (!username || !password || !role) {
        console.log('Login failed: Missing username, password, or role.');
        return res.status(400).json({ error: 'Username, password, and role are required.' });
    }

    if (role === 'doctor') {
        const sql = `SELECT * FROM doctors WHERE doctorId = ?`;
        db.get(sql, [username], (err, user) => {
            console.log(`Searching for doctor with ID: ${username}`);
            if (err) {
                console.error('Database error during doctor login:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            console.log('User found in doctors table:', user);
            if (!user) {
                return res.status(404).json({ error: 'Doctor not found.' });
            }

            const passwordIsValid = bcrypt.compareSync(password, user.password);
            console.log('Doctor password validation result:', passwordIsValid);

            if (!passwordIsValid) {
                return res.status(401).json({ error: 'Invalid password.' });
            }

            res.status(200).json({ message: 'Login successful!', user: { name: user.name, role: 'doctor' } });
        });
    } else if (role === 'admin' || role === 'receptionist') {
        const sql = `SELECT * FROM users WHERE username = ? AND role = ?`;
        db.get(sql, [username, role], (err, user) => {
            console.log(`Searching for user with username: ${username} and role: ${role}`);
            if (err) {
                console.error('Database error during user login:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            console.log('User found in users table:', user);
            if (!user) {
                return res.status(404).json({ error: 'User not found.' });
            }

            const passwordIsValid = bcrypt.compareSync(password, user.password);
            console.log('User password validation result:', passwordIsValid);

            if (!passwordIsValid) {
                return res.status(401).json({ error: 'Invalid password.' });
            }

            res.status(200).json({ message: 'Login successful!', user: { name: user.name, role: user.role } });
        });
    } else {
        console.log(`Login failed: Invalid role specified ('${role}').`);
        res.status(400).json({ error: 'Invalid role specified.' });
    }
});
 
// API endpoint for patient booking
app.post('/api/appointments', (req, res) => {
    const { name, age, phone, gender, address, date, problem, visited, category, slot } = req.body;

    // Basic validation
    if (!name || !age || !phone || !date || !problem || !category || !slot) {
        return res.status(400).json({ error: 'Please fill out all required fields.' });
    }

    const sql = `INSERT INTO appointments (patient_name, patient_age, patient_phone, patient_gender, patient_address, booking_date, problem, visited_before, category, slot)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [name, age, phone, gender, address, date, problem, visited === 'yes', category, slot];

    db.run(sql, params, function(err) {
        if (err) {
            console.error('Error inserting appointment:', err.message);
            return res.status(500).json({ error: 'An error occurred while booking the appointment.' });
        }
        res.status(201).json({ 
            message: 'Appointment booked successfully!',
            appointmentId: this.lastID 
        });
    });
});

// Basic route to check if server is running
app.get('/', (req, res) => {
    res.send('Backend server is running!');
});

// Start the server
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
