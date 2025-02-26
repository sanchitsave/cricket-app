const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// MySQL Connection using environment variables
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.connect(err => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Connected to MySQL');
});

// Serve static files from the React build folder
// app.use(express.static(path.join(__dirname, 'build')));

// Helper function to update player stats
const updatePlayerStats = (match_id, player_id, runs_scored, balls_faced, wickets_taken, overs_bowled, callback) => {
  db.query(
    'INSERT INTO Player_Stats (player_id, match_id, runs_scored, balls_faced, wickets_taken, overs_bowled) VALUES (?, ?, ?, ?, ?, ?) ' +
    'ON DUPLICATE KEY UPDATE runs_scored = runs_scored + ?, balls_faced = balls_faced + ?, wickets_taken = wickets_taken + ?, overs_bowled = overs_bowled + ?',
    [player_id, match_id, runs_scored, balls_faced, wickets_taken, overs_bowled, runs_scored, balls_faced, wickets_taken, overs_bowled],
    callback
  );
};

// API to get all teams
app.get('/teams', (req, res) => {
  db.query('SELECT * FROM Teams', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// API to add a team
app.post('/teams', (req, res) => {
  const { team_name } = req.body;
  db.query('INSERT INTO Teams (team_name) VALUES (?)', [team_name], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ team_id: result.insertId, team_name });
  });
});

// API to get players by team
app.get('/players/:team_id', (req, res) => {
  const { team_id } = req.params;
  db.query('SELECT * FROM Players WHERE team_id = ?', [team_id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// API to add a player
app.post('/players', (req, res) => {
  const { team_id, player_name, role } = req.body;
  db.query('INSERT INTO Players (team_id, player_name, role) VALUES (?, ?, ?)',
    [team_id, player_name, role], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ player_id: result.insertId, team_id, player_name, role });
    });
});

// API to start a new match
app.post('/matches', (req, res) => {
  const { team1_id, team2_id } = req.body;
  console.log('Received match start request:', req.body);
  db.query('INSERT INTO Matches (team1_id, team2_id, status) VALUES (?, ?, "ongoing")',
    [team1_id, team2_id], (err, result) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: err.message });
      }
      res.json({ match_id: result.insertId, team1_id, team2_id, status: 'ongoing' });
    });
});

// API to get ongoing matches
app.get('/matches/ongoing', (req, res) => {
  db.query('SELECT * FROM Matches WHERE status = "ongoing"', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// API to get match details
app.get('/matches/:match_id', (req, res) => {
  const { match_id } = req.params;
  db.query('SELECT * FROM Matches WHERE match_id = ?', [match_id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: 'Match not found' });
    res.json(results[0]);
  });
});

// API to update match status
app.put('/matches/:match_id', (req, res) => {
  const { match_id } = req.params;
  const { status } = req.body;
  db.query('UPDATE Matches SET status = ? WHERE match_id = ?', [status, match_id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ match_id, status });
  });
});

// API to record a ball
app.post('/score-ball', (req, res) => {
  const { match_id, over_number, ball_number, batsman_id, bowler_id, runs, extras, wicket, wicket_type, repeat_ball } = req.body;
  db.query(
    'INSERT INTO Ball_Records (match_id, over_number, ball_number, batsman_id, bowler_id, runs, extras, wicket, wicket_type, repeat_ball) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [match_id, over_number, ball_number, batsman_id, bowler_id, runs, extras || null, wicket || 0, wicket_type || null, repeat_ball || 0],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      const ball_id = result.insertId;

      // Update batsman stats
      updatePlayerStats(match_id, batsman_id, runs, 1, 0, 0, err => {
        if (err) return res.status(500).json({ error: err.message });

        // Update bowler stats (overs_bowled increments by 0.1 per legal ball)
        const isExtra = extras === 'wide' || extras === 'no_ball';
        updatePlayerStats(match_id, bowler_id, 0, 0, wicket, isExtra ? 0 : 0.1, err => {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ ball_id, ...req.body });
        });
      });
    }
  );
});

// API to get ball records for a match
app.get('/ball-records/:match_id', (req, res) => {
  const { match_id } = req.params;
  db.query('SELECT * FROM Ball_Records WHERE match_id = ? ORDER BY over_number, ball_number', [match_id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// API to undo the last ball
app.delete('/ball-records/:match_id/last', (req, res) => {
  const { match_id } = req.params;
  db.query(
    'SELECT * FROM Ball_Records WHERE ball_id = (SELECT ball_id FROM Ball_Records WHERE match_id = ? ORDER BY ball_id DESC LIMIT 1)',
    [match_id],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length === 0) return res.status(404).json({ error: 'No balls to undo' });
      const lastBall = results[0];

      db.query(
        'DELETE FROM Ball_Records WHERE ball_id = ?',
        [lastBall.ball_id],
        (err) => {
          if (err) return res.status(500).json({ error: err.message });

          // Reverse batsman stats
          updatePlayerStats(match_id, lastBall.batsman_id, -lastBall.runs, -1, 0, 0, err => {
            if (err) return res.status(500).json({ error: err.message });

            // Reverse bowler stats
            const isExtra = lastBall.extras === 'wide' || lastBall.extras === 'no_ball';
            updatePlayerStats(match_id, lastBall.bowler_id, 0, 0, -lastBall.wicket, isExtra ? 0 : -0.1, err => {
              if (err) return res.status(500).json({ error: err.message });
              res.json({ message: 'Last ball undone' });
            });
          });
        }
      );
    }
  );
});

// Catch-all route for React routing
// app.get('*', (req, res) => {
//   res.sendFile(path.join(__dirname, 'build', 'index.html'));
// });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));