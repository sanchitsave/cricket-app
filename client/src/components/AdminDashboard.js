import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ScoringPanel from './ScoringPanel';
import '../styles/AdminDashboard.css';

function AdminDashboard() {
  const [teams, setTeams] = useState([]);
  const [newTeam, setNewTeam] = useState('');
  const [players, setPlayers] = useState({});
  const [newPlayer, setNewPlayer] = useState({ team_id: '', player_name: '', role: '' });
  const [matchTeams, setMatchTeams] = useState({ team1_id: '', team2_id: '' });
  const [ongoingMatch, setOngoingMatch] = useState(null);
  const [expandedTeam, setExpandedTeam] = useState(null);

  useEffect(() => {
    axios.get('http://localhost:5000/teams')
      .then(res => {
        setTeams(res.data);
        res.data.forEach(team => {
          axios.get(`http://localhost:5000/players/${team.team_id}`)
            .then(playerRes => {
              setPlayers(prev => ({ ...prev, [team.team_id]: playerRes.data }));
            })
            .catch(err => console.error(err));
        });
      })
      .catch(err => console.error(err));

    axios.get('http://localhost:5000/matches/ongoing')
      .then(res => { if (res.data.length > 0) setOngoingMatch(res.data[0]); })
      .catch(err => console.error(err));
  }, []);

  const handleAddTeam = () => {
    axios.post('http://localhost:5000/teams', { team_name: newTeam })
      .then(res => {
        setTeams([...teams, res.data]);
        setNewTeam('');
        axios.get(`http://localhost:5000/players/${res.data.team_id}`)
          .then(playerRes => setPlayers(prev => ({ ...prev, [res.data.team_id]: playerRes.data })))
          .catch(err => console.error(err));
      })
      .catch(err => console.error(err));
  };

  const handleAddPlayer = () => {
    axios.post('http://localhost:5000/players', newPlayer)
      .then(res => {
        const teamId = res.data.team_id;
        setPlayers(prev => ({ ...prev, [teamId]: [...(prev[teamId] || []), res.data] }));
        setNewPlayer({ team_id: '', player_name: '', role: '' });
      })
      .catch(err => console.error(err));
  };

  const togglePlayers = (team_id) => {
    setExpandedTeam(expandedTeam === team_id ? null : team_id);
  };

  const handleStartMatch = () => {
    if (matchTeams.team1_id && matchTeams.team2_id && matchTeams.team1_id !== matchTeams.team2_id) {
      axios.post('http://localhost:5000/matches', matchTeams)
        .then(res => { setOngoingMatch(res.data); setMatchTeams({ team1_id: '', team2_id: '' }); })
        .catch(err => console.error(err));
    } else {
      alert('Please select two different teams!');
    }
  };

  return (
    <div className="admin-dashboard">
      <h1>Admin Dashboard</h1>
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        {/* Manage Teams/Players Tile */}
        <section className="team-section" style={{ flex: '1', minWidth: '300px' }}>
          <h2>Manage Teams/Players</h2>
          <div className="team-input">
            <input value={newTeam} onChange={(e) => setNewTeam(e.target.value)} placeholder="Enter team name" />
            <button onClick={handleAddTeam}>Add Team</button>
          </div>
          <ul className="team-list">
            {teams.map(team => (
              <li key={team.team_id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <span>{team.team_name}</span>
                  <button onClick={() => togglePlayers(team.team_id)}>
                    {expandedTeam === team.team_id ? 'Hide Players' : 'View Players'}
                  </button>
                </div>
                {expandedTeam === team.team_id && players[team.team_id] && (
                  <ul className="player-list">
                    {players[team.team_id].map(player => (
                      <li key={player.player_id}>{player.player_name} <span>({player.role})</span></li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
          <div className="player-section">
            <h3>Add Player</h3>
            <div className="player-input">
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <select value={newPlayer.team_id} onChange={(e) => setNewPlayer({ ...newPlayer, team_id: e.target.value })}>
                  <option value="">Select Team</option>
                  {teams.map(team => (
                    <option key={team.team_id} value={team.team_id}>{team.team_name}</option>
                  ))}
                </select>
                <input 
                  value={newPlayer.player_name} 
                  onChange={(e) => setNewPlayer({ ...newPlayer, player_name: e.target.value })} 
                  placeholder="Player Name" 
                />
                <input 
                  value={newPlayer.role} 
                  onChange={(e) => setNewPlayer({ ...newPlayer, role: e.target.value })} 
                  placeholder="Role (e.g., Batsman)" 
                />
              </div>
              <button 
                onClick={handleAddPlayer} 
                style={{ marginTop: '10px', width: '100%', maxWidth: '200px' }}
              >
                Add Player
              </button>
            </div>
          </div>
        </section>

        {/* Start Match Tile */}
        <section className="match-section" style={{ flex: '1', minWidth: '300px' }}>
          <h2>Start Match</h2>
          {!ongoingMatch ? (
            <div className="match-input">
              <select value={matchTeams.team1_id} onChange={(e) => setMatchTeams({ ...matchTeams, team1_id: e.target.value })}>
                <option value="">Select Team 1</option>
                {teams.map(team => (
                  <option key={team.team_id} value={team.team_id}>{team.team_name}</option>
                ))}
              </select>
              <select value={matchTeams.team2_id} onChange={(e) => setMatchTeams({ ...matchTeams, team2_id: e.target.value })}>
                <option value="">Select Team 2</option>
                {teams.map(team => (
                  <option key={team.team_id} value={team.team_id}>{team.team_name}</option>
                ))}
              </select>
              <button onClick={handleStartMatch}>Start Match</button>
            </div>
          ) : (
            <ScoringPanel match={ongoingMatch} teams={teams} players={players} setOngoingMatch={setOngoingMatch} />
          )}
        </section>
      </div>
    </div>
  );
}

export default AdminDashboard;