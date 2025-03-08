require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 3000;


app.use(bodyParser.json());

// MySQL Database Connection

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    connectTimeout: 30000, // Increase timeout (30s)
    ssl: { rejectUnauthorized: false } // Required for Aiven Cloud
});

db.connect((err) => {
    if (err) {
        console.error('Database connection error:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

// Add School API
app.post('/addSchool', (req, res) => {
  const { name, address, latitude, longitude } = req.body;

  // Validation
  if (!name || !address || !latitude || !longitude) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  const query = 'INSERT INTO schools (name, address, latitude, longitude) VALUES (?, ?, ?, ?)';
  db.query(query, [name, address, latitude, longitude], (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Error adding school.' });
    }
    res.status(201).json({ message: 'School added successfully', schoolId: result.insertId });
  });
});

// List Schools API (Updated)
app.get('/listSchools', (req, res) => {
    const { latitude, longitude } = req.query;
  
    // Validation
    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Latitude and longitude are required.' });
    }
  
    const query = 'SELECT id, name, address, latitude, longitude FROM schools';
    db.query(query, (err, results) => {
      if (err) {
        return res.status(500).json({ message: 'Error retrieving schools.' });
      }
  
      // Calculate distance and sort schools by proximity
      const sortedSchools = results
        .map((school) => ({
          id: school.id,
          name: school.name,
          address: school.address,
          distance: calculateDistance(latitude, longitude, school.latitude, school.longitude)
        }))
        .sort((a, b) => a.distance - b.distance);
  
      res.status(200).json(sortedSchools);
    });
  });
  

// Haversine formula to calculate distance between two lat/long coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});