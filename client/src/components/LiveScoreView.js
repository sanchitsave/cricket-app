import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/LiveScoreView.css';

function LiveScoreView() {
  const [matches, setMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [ballRecords, setBallRecords] = useState([]);
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    axios.get('http://13.232.104.88:5000/matches/ongoing')
      .then(res => setMatches(res.data))
      .catch(err => console.error(err));
    axios.get('http://13.232.104.88:5000/teams')
      .then(res => {
        setTeams(res.data);
        const playerPromises = res.data.map(team =>
          axios.get(`http://13.232.104.88:5000/players/${team.team_id}`)
            .then(playerRes => playerRes.data)
        );
        Promise.all(playerPromises)
          .then(playerArrays => setPlayers(playerArrays.flat()))
          .catch(err => console.error(err));
      })
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    if (selectedMatch) {
      const fetchBallRecords = () => {
        axios.get(`http://13.232.104.88:5000/ball-records/${selectedMatch.match_id}`)
          .then(res => setBallRecords(res.data))
          .catch(err => console.error(err));
      };
      fetchBallRecords();
      const interval = setInterval(fetchBallRecords, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedMatch]);

  const getTeamName = (team_id) => teams.find(t => t.team_id === team_id)?.team_name || 'Unknown';

  // Calculate batting stats with wicket status
  const battingStats = () => {
    const stats = {};
    ballRecords.forEach(ball => {
      if (!stats[ball.batsman_id]) {
        stats[ball.batsman_id] = {
          runs: 0,
          balls: 0,
          name: players.find(p => p.player_id === ball.batsman_id)?.player_name || 'Unknown',
          out: false
        };
      }
      stats[ball.batsman_id].runs += ball.runs;
      stats[ball.batsman_id].balls += 1;
      if (ball.wicket === 1) stats[ball.batsman_id].out = true; // Mark as out if wicket taken
    });
    return Object.values(stats);
  };

  // Calculate bowling stats
  const bowlingStats = () => {
    const stats = {};
    ballRecords.forEach(ball => {
      if (!stats[ball.bowler_id]) {
        stats[ball.bowler_id] = {
          overs: 0,
          runs: 0,
          wickets: 0,
          name: players.find(p => p.player_id === ball.bowler_id)?.player_name || 'Unknown'
        };
      }
      const isExtra = ball.extras === 'wide' || ball.extras === 'no_ball';
      stats[ball.bowler_id].runs += ball.runs + (isExtra ? 1 : 0);
      stats[ball.bowler_id].wickets += ball.wicket;
      if (!isExtra) stats[ball.bowler_id].overs += 0.1;
    });
    Object.values(stats).forEach(bowler => {
      const overs = Math.floor(bowler.overs);
      const balls = Math.round((bowler.overs - overs) * 10);
      bowler.overs = balls === 6 ? `${overs + 1}.0` : `${overs}.${balls}`;
    });
    return Object.values(stats);
  };

  const currentOvers = ballRecords.length > 0
    ? `${ballRecords[ballRecords.length - 1].over_number}.${ballRecords[ballRecords.length - 1].ball_number}`
    : '0.0';

  return (
    <div className="live-score-view">
      <h1>Live Score</h1>
      {!selectedMatch && (
        <section className="match-list">
          <h2>Ongoing Matches</h2>
          {matches.length === 0 ? (
            <p>No ongoing matches.</p>
          ) : (
            <ul>
              {matches.map(match => (
                <li key={match.match_id}>
                  <span>{getTeamName(match.team1_id)} vs {getTeamName(match.team2_id)}</span>
                  <button onClick={() => setSelectedMatch(match)}>View Live Score</button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      {selectedMatch && (
        <section className="live-score">
          <div className="score-header">
            <h2>{getTeamName(selectedMatch.team1_id)} vs {getTeamName(selectedMatch.team2_id)}</h2>
            <div className="team-score">
              {getTeamName(selectedMatch.team1_id)}: {ballRecords.reduce((sum, ball) => sum + ball.runs, 0)}/{ballRecords.reduce((sum, ball) => sum + ball.wicket, 0)} ({currentOvers} Overs)
            </div>
            <button className="back-btn" onClick={() => setSelectedMatch(null)}>Back to Matches</button>
          </div>

          {/* Batting Scorecard */}
          <div className="scorecard-section">
            <h3>Batting</h3>
            <table className="scorecard-table">
              <thead>
                <tr>
                  <th>Batsman</th>
                  <th>Runs</th>
                  <th>Balls</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {battingStats().map((batsman, index) => (
                  <tr key={index}>
                    <td>{batsman.name}</td>
                    <td>{batsman.runs}</td>
                    <td>{batsman.balls}</td>
                    <td data-status={batsman.out ? 'Out' : 'Not Out'}>{batsman.out ? 'Out' : 'Not Out'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bowling Scorecard */}
          <div className="scorecard-section">
            <h3>Bowling</h3>
            <table className="scorecard-table">
              <thead>
                <tr>
                  <th>Bowler</th>
                  <th>Overs</th>
                  <th>Runs</th>
                  <th>Wickets</th>
                </tr>
              </thead>
              <tbody>
                {bowlingStats().map((bowler, index) => (
                  <tr key={index}>
                    <td>{bowler.name}</td>
                    <td>{bowler.overs}</td>
                    <td>{bowler.runs}</td>
                    <td>{bowler.wickets}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Ball Log */}
          <div className="ball-log">
            <h3>Ball-by-Ball</h3>
            <ul>
              {ballRecords.map(ball => (
                <li key={ball.ball_id}>
                  {ball.over_number}.{ball.ball_number}: {ball.runs} runs{ball.extras ? `, ${ball.extras}` : ''}{ball.wicket ? `, Wicket (${ball.wicket_type})` : ''}{ball.repeat_ball ? ' (Repeated)' : ''}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}

export default LiveScoreView;