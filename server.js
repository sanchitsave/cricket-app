const express = require('express');
const mysql = require('mysql2/promise'); // Switch to promise-based for async handling
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// MySQL Connection Pool with reconnection logics
let db;

async function initDB() {
  db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    keepAliveInitialDelay: 10000, // Ping every 10 seconds to keep connections alive
    enableKeepAlive: true // Enable keep-alive pings
  });

  try {
    const connection = await db.getConnection();
    console.log('Connected to MySQL');
    connection.release();
  } catch (err) {
    console.error('Error connecting to MySQL:', err);
    setTimeout(initDB, 5000); // Retry after 5 seconds if connection fails
  }

  db.on('error', async (err) => {
    console.error('Database error:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET') {
      console.log('Reconnecting to database...');
      await initDB();
    } else {
      throw err;
    }
  });
}

// Initialize database connection
initDB();

// Helper function to update player stats (now async)
const updatePlayerStats = async (match_id, player_id, runs_scored, balls_faced, wickets_taken, overs_bowled) => {
  try {
    const [result] = await db.query(
      'INSERT INTO Player_Stats (player_id, match_id, runs_scored, balls_faced, wickets_taken, overs_bowled) VALUES (?, ?, ?, ?, ?, ?) ' +
      'ON DUPLICATE KEY UPDATE runs_scored = runs_scored + ?, balls_faced = balls_faced + ?, wickets_taken = wickets_taken + ?, overs_bowled = overs_bowled + ?',
      [player_id, match_id, runs_scored, balls_faced, wickets_taken, overs_bowled, runs_scored, balls_faced, wickets_taken, overs_bowled]
    );
    return result;
  } catch (err) {
    throw err;
  }
};

// API to get all teams
app.get('/teams', async (req, res) => {
  try {
    const [results] = await db.query('SELECT * FROM Teams');
    res.json(results);
  } catch (err) {
    console.error('Error fetching teams:', err);
    res.status(500).json({ error: err.message });
  }
});

// API to add a team
app.post('/teams', async (req, res) => {
  const { team_name } = req.body;
  try {
    const [result] = await db.query('INSERT INTO Teams (team_name) VALUES (?)', [team_name]);
    res.json({ team_id: result.insertId, team_name });
  } catch (err) {
    console.error('Error adding team:', err);
    res.status(500).json({ error: err.message });
  }
});

// API to get players by team
app.get('/players/:team_id', async (req, res) => {
  const { team_id } = req.params;
  try {
    const [results] = await db.query('SELECT * FROM Players WHERE team_id = ?', [team_id]);
    res.json(results);
  } catch (err) {
    console.error('Error fetching players:', err);
    res.status(500).json({ error: err.message });
  }
});

// API to add a player
app.post('/players', async (req, res) => {
  const { team_id, player_name, role } = req.body;
  try {
    const [result] = await db.query('INSERT INTO Players (team_id, player_name, role) VALUES (?, ?, ?)', [team_id, player_name, role]);
    res.json({ player_id: result.insertId, team_id, player_name, role });
  } catch (err) {
    console.error('Error adding player:', err);
    res.status(500).json({ error: err.message });
  }
});

// API to start a new match
app.post('/matches', async (req, res) => {
  const { team1_id, team2_id } = req.body;
  console.log('Received match start request:', req.body);
  try {
    const [result] = await db.query('INSERT INTO Matches (team1_id, team2_id, status) VALUES (?, ?, "ongoing")', [team1_id, team2_id]);
    res.json({ match_id: result.insertId, team1_id, team2_id, status: 'ongoing' });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: err.message });
  }
});

// API to get ongoing matches
app.get('/matches/ongoing', async (req, res) => {
  try {
    const [results] = await db.query('SELECT * FROM Matches WHERE status = "ongoing"');
    res.json(results);
  } catch (err) {
    console.error('Error fetching ongoing matches:', err);
    res.status(500).json({ error: err.message });
  }
});

// API to get match details
app.get('/matches/:match_id', async (req, res) => {
  const { match_id } = req.params;
  try {
    const [results] = await db.query('SELECT * FROM Matches WHERE match_id = ?', [match_id]);
    if (results.length === 0) return res.status(404).json({ error: 'Match not found' });
    res.json(results[0]);
  } catch (err) {
    console.error('Error fetching match details:', err);
    res.status(500).json({ error: err.message });
  }
});

// API to update match status
app.put('/matches/:match_id', async (req, res) => {
  const { match_id } = req.params;
  const { status } = req.body;
  try {
    const [result] = await db.query('UPDATE Matches SET status = ? WHERE match_id = ?', [status, match_id]);
    res.json({ match_id, status });
  } catch (err) {
    console.error('Error updating match status:', err);
    res.status(500).json({ error: err.message });
  }
});

// API to record a ball
app.post('/score-ball', async (req, res) => {
  const { match_id, over_number, ball_number, batsman_id, bowler_id, runs, extras, wicket, wicket_type, repeat_ball } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO Ball_Records (match_id, over_number, ball_number, batsman_id, bowler_id, runs, extras, wicket, wicket_type, repeat_ball) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [match_id, over_number, ball_number, batsman_id, bowler_id, runs, extras || null, wicket || 0, wicket_type || null, repeat_ball || 0]
    );
    const ball_id = result.insertId;

    await updatePlayerStats(match_id, batsman_id, runs, 1, 0, 0);
    const isExtra = extras === 'wide' || extras === 'no_ball';
    await updatePlayerStats(match_id, bowler_id, 0, 0, wicket, isExtra ? 0 : 0.1);

    res.json({ ball_id, ...req.body });
  } catch (err) {
    console.error('Error recording ball:', err);
    res.status(500).json({ error: err.message });
  }
});

// API to get ball records for a match
app.get('/ball-records/:match_id', async (req, res) => {
  const { match_id } = req.params;
  try {
    const [results] = await db.query('SELECT * FROM Ball_Records WHERE match_id = ? ORDER BY over_number, ball_number', [match_id]);
    res.json(results);
  } catch (err) {
    console.error('Error fetching ball records:', err);
    res.status(500).json({ error: err.message });
  }
});

// API to undo the last ball
app.delete('/ball-records/:match_id/last', async (req, res) => {
  const { match_id } = req.params;
  try {
    const [results] = await db.query(
      'SELECT * FROM Ball_Records WHERE ball_id = (SELECT ball_id FROM Ball_Records WHERE match_id = ? ORDER BY ball_id DESC LIMIT 1)',
      [match_id]
    );
    if (results.length === 0) return res.status(404).json({ error: 'No balls to undo' });
    const lastBall = results[0];

    await db.query('DELETE FROM Ball_Records WHERE ball_id = ?', [lastBall.ball_id]);
    await updatePlayerStats(match_id, lastBall.batsman_id, -lastBall.runs, -1, 0, 0);
    const isExtra = lastBall.extras === 'wide' || lastBall.extras === 'no_ball';
    await updatePlayerStats(match_id, lastBall.bowler_id, 0, 0, -lastBall.wicket, isExtra ? 0 : -0.1);

    res.json({ message: 'Last ball undone' });
  } catch (err) {
    console.error('Error undoing last ball:', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));