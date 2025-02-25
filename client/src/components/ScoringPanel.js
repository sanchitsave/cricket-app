import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/ScoringPanel.css';

function ScoringPanel({ match, teams, players, setOngoingMatch }) {
  const [ballData, setBallData] = useState({
    match_id: match.match_id,
    over_number: 0,
    ball_number: 1,
    batsman_id: '',
    bowler_id: '',
    runs: 0,
    extras: '',
    wicket: 0,
    wicket_type: '',
    repeat_ball: 0 // New field: 0 = No, 1 = Yes
  });
  const [ballRecords, setBallRecords] = useState([]);
  const [currentOverBowler, setCurrentOverBowler] = useState('');

  useEffect(() => {
    axios.get(`http://13.232.104.88:5000/ball-records/${match.match_id}`)
      .then(res => {
        const records = res.data;
        setBallRecords(records);

        if (records.length > 0) {
          const lastBall = records[records.length - 1];
          const isExtra = lastBall.extras === 'wide' || lastBall.extras === 'no_ball';
          const nextBallNumber = lastBall.ball_number < 6 && !isExtra ? lastBall.ball_number + 1 : lastBall.ball_number < 6 && isExtra && lastBall.repeat_ball === 0 ? lastBall.ball_number + 1 : 1;
          const nextOverNumber = lastBall.ball_number < 6 && !isExtra ? lastBall.over_number : lastBall.ball_number < 6 && isExtra && lastBall.repeat_ball === 0 ? lastBall.over_number : lastBall.over_number + 1;
          const lastBowlerInOver = records
            .filter(b => b.over_number === lastBall.over_number)
            .slice(-1)[0]?.bowler_id || lastBall.bowler_id;

          setBallData({
            match_id: match.match_id,
            over_number: nextOverNumber,
            ball_number: nextBallNumber,
            batsman_id: '',
            bowler_id: nextBallNumber === 1 ? '' : lastBowlerInOver,
            runs: 0,
            extras: '',
            wicket: 0,
            wicket_type: '',
            repeat_ball: 0
          });

          if (nextBallNumber !== 1) setCurrentOverBowler(lastBowlerInOver);
        }
      })
      .catch(err => console.error(err));
  }, [match.match_id]);

  const handleScoreBall = () => {
    axios.post('http://13.232.104.88:5000/score-ball', ballData)
      .then(res => {
        setBallRecords([...ballRecords, res.data]);
        const isExtra = ballData.extras === 'wide' || ballData.extras === 'no_ball';
        const nextBallNumber = isExtra && ballData.repeat_ball === 1 ? ballData.ball_number : ballData.ball_number < 6 ? ballData.ball_number + 1 : 1;
        const nextOverNumber = isExtra && ballData.repeat_ball === 1 ? ballData.over_number : ballData.ball_number < 6 ? ballData.over_number : ballData.over_number + 1;
        const nextBowler = nextBallNumber === 1 ? '' : currentOverBowler || ballData.bowler_id;
        if (!currentOverBowler && ballData.bowler_id) setCurrentOverBowler(ballData.bowler_id);

        setBallData({
          ...ballData,
          ball_number: nextBallNumber,
          over_number: nextOverNumber,
          batsman_id: '',
          bowler_id: nextBowler,
          runs: 0,
          extras: '',
          wicket: 0,
          wicket_type: '',
          repeat_ball: 0
        });
      })
      .catch(err => console.error(err));
  };

  const handleUndoBall = () => {
    axios.delete(`http://13.232.104.88:5000/ball-records/${match.match_id}/last`)
      .then(() => {
        axios.get(`http://13.232.104.88:5000/ball-records/${match.match_id}`)
          .then(res => {
            const records = res.data;
            setBallRecords(records);

            if (records.length > 0) {
              const lastBall = records[records.length - 1];
              const isExtra = lastBall.extras === 'wide' || lastBall.extras === 'no_ball';
              const nextBallNumber = lastBall.ball_number < 6 && !isExtra ? lastBall.ball_number + 1 : lastBall.ball_number < 6 && isExtra && lastBall.repeat_ball === 0 ? lastBall.ball_number + 1 : 1;
              const nextOverNumber = lastBall.ball_number < 6 && !isExtra ? lastBall.over_number : lastBall.ball_number < 6 && isExtra && lastBall.repeat_ball === 0 ? lastBall.over_number : lastBall.over_number + 1;
              const lastBowlerInOver = records
                .filter(b => b.over_number === lastBall.over_number)
                .slice(-1)[0]?.bowler_id || lastBall.bowler_id;

              setBallData({
                ...ballData,
                over_number: nextOverNumber,
                ball_number: nextBallNumber,
                bowler_id: nextBallNumber === 1 ? '' : lastBowlerInOver,
                repeat_ball: 0
              });
              setCurrentOverBowler(nextBallNumber === 1 ? '' : lastBowlerInOver);
            } else {
              setBallData({
                match_id: match.match_id,
                over_number: 0,
                ball_number: 1,
                batsman_id: '',
                bowler_id: '',
                runs: 0,
                extras: '',
                wicket: 0,
                wicket_type: '',
                repeat_ball: 0
              });
              setCurrentOverBowler('');
            }
          })
          .catch(err => console.error(err));
      })
      .catch(err => console.error(err));
  };

  const handleEndMatch = () => {
    axios.put(`http://13.232.104.88:5000/matches/${match.match_id}`, { status: 'completed' })
      .then(() => setOngoingMatch(null))
      .catch(err => console.error(err));
  };

  const team1Players = players[match.team1_id] || [];
  const team2Players = players[match.team2_id] || [];

  const currentOvers = ballRecords.length > 0 
    ? `${ballRecords[ballRecords.length - 1].over_number}.${ballRecords[ballRecords.length - 1].ball_number}`
    : '0.0';

  return (
    <div className="scoring-panel">
      <h2>Scoring: {teams.find(t => t.team_id === match.team1_id)?.team_name} vs {teams.find(t => t.team_id === match.team2_id)?.team_name}</h2>
      <div className="score-summary">
        <div><strong>Runs:</strong> {ballRecords.reduce((sum, ball) => sum + ball.runs, 0)}</div>
        <div><strong>Wickets:</strong> {ballRecords.reduce((sum, ball) => sum + ball.wicket, 0)}</div>
        <div><strong>Overs:</strong> {currentOvers}</div>
      </div>
      <div className="ball-input">
        <h3>Score Ball {ballData.over_number}.{ballData.ball_number}</h3>

        {/* Current Batsman Selection */}
        <div className="tile-section">
          <h4>Current Batsman</h4>
          <div className="tile-container">
            {team1Players.map(player => (
              <div
                key={player.player_id}
                className={`tile ${ballData.batsman_id === player.player_id ? 'selected' : ''}`}
                onClick={() => setBallData({ ...ballData, batsman_id: player.player_id })}
              >
                {player.player_name}
              </div>
            ))}
          </div>
        </div>

        {/* Current Bowler Selection */}
        <div className="tile-section">
          <h4>Current Bowler</h4>
          <div className="tile-container">
            {team2Players.map(player => (
              <div
                key={player.player_id}
                className={`tile ${ballData.bowler_id === player.player_id ? 'selected' : ''} ${ballData.ball_number !== 1 && currentOverBowler ? 'disabled' : ''}`}
                onClick={() => {
                  if (ballData.ball_number === 1 || !currentOverBowler) {
                    setBallData({ ...ballData, bowler_id: player.player_id });
                    if (!currentOverBowler) setCurrentOverBowler(player.player_id);
                  }
                }}
              >
                {player.player_name}
              </div>
            ))}
          </div>
        </div>

        {/* Runs Selection */}
        <div className="tile-section">
          <h4>Runs</h4>
          <div className="tile-container">
            {[0, 1, 2, 3, 4, 6].map(run => (
              <div
                key={run}
                className={`tile ${ballData.runs === run ? 'selected' : ''}`}
                onClick={() => setBallData({ ...ballData, runs: run })}
              >
                {run}
              </div>
            ))}
          </div>
        </div>

        {/* Extras Selection */}
        <div className="tile-section">
          <h4>Extras</h4>
          <div className="tile-container">
            {['', 'wide', 'no_ball'].map(extra => (
              <div
                key={extra || 'none'}
                className={`tile ${ballData.extras === extra ? 'selected' : ''}`}
                onClick={() => setBallData({ ...ballData, extras: extra, repeat_ball: extra ? 1 : 0 })}
              >
                {extra || 'None'}
              </div>
            ))}
          </div>
        </div>

        {/* Repeat Ball Selection (Shown only for Wide/No Ball) */}
        {(ballData.extras === 'wide' || ballData.extras === 'no_ball') && (
          <div className="tile-section">
            <h4>Repeat Ball</h4>
            <div className="tile-container">
              <div
                className={`tile ${ballData.repeat_ball === 0 ? 'selected' : ''}`}
                onClick={() => setBallData({ ...ballData, repeat_ball: 0 })}
              >
                No
              </div>
              <div
                className={`tile ${ballData.repeat_ball === 1 ? 'selected' : ''}`}
                onClick={() => setBallData({ ...ballData, repeat_ball: 1 })}
              >
                Yes
              </div>
            </div>
          </div>
        )}

        {/* Wicket Selection */}
        <div className="tile-section">
          <h4>Wicket</h4>
          <div className="tile-container">
            <div
              className={`tile ${ballData.wicket === 0 ? 'selected' : ''}`}
              onClick={() => setBallData({ ...ballData, wicket: 0, wicket_type: '' })}
            >
              No
            </div>
            <div
              className={`tile ${ballData.wicket === 1 ? 'selected' : ''}`}
              onClick={() => setBallData({ ...ballData, wicket: 1 })}
            >
              Yes
            </div>
          </div>
          {ballData.wicket === 1 && (
            <div className="tile-container" style={{ marginTop: '10px' }}>
              {['bowled', 'caught', 'lbw', 'run_out'].map(type => (
                <div
                  key={type}
                  className={`tile ${ballData.wicket_type === type ? 'selected' : ''}`}
                  onClick={() => setBallData({ ...ballData, wicket_type: type })}
                >
                  {type === 'run_out' ? 'Run Out' : type.charAt(0).toUpperCase() + type.slice(1)}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="ball-actions">
          <button className="save-btn" onClick={handleScoreBall}>Save Ball</button>
          <button className="undo-btn" onClick={handleUndoBall} disabled={ballRecords.length === 0}>Undo Last Ball</button>
        </div>
      </div>
      <button className="end-match-btn" onClick={handleEndMatch}>End Match</button>
      <div className="ball-log">
        <h3>Ball Log</h3>
        <ul>
          {ballRecords.map(ball => (
            <li key={ball.ball_id}>
              {ball.over_number}.{ball.ball_number}: {ball.runs} runs{ball.extras ? `, ${ball.extras}` : ''}{ball.wicket ? `, Wicket (${ball.wicket_type})` : ''}{ball.repeat_ball ? ' (Repeated)' : ''}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default ScoringPanel;