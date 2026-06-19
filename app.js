/**
 * FIFA World Cup 2026 Predictor - Core Engine (Win/Draw/Loss Update)
 * Contains tournament data, state calculations, bracket pairing algorithm, and storage functions.
 */

// 1. Teams and Groups Configuration
const groupsData = {
  A: [
    { name: 'Mexico', code: 'mx' },
    { name: 'South Korea', code: 'kr' },
    { name: 'South Africa', code: 'za' },
    { name: 'Czechia', code: 'cz' }
  ],
  B: [
    { name: 'Canada', code: 'ca' },
    { name: 'Bosnia and Herzegovina', code: 'ba' },
    { name: 'Qatar', code: 'qa' },
    { name: 'Switzerland', code: 'ch' }
  ],
  C: [
    { name: 'Brazil', code: 'br' },
    { name: 'Morocco', code: 'ma' },
    { name: 'Haiti', code: 'ht' },
    { name: 'Scotland', code: 'gb-sct' }
  ],
  D: [
    { name: 'United States', code: 'us' },
    { name: 'Paraguay', code: 'py' },
    { name: 'Australia', code: 'au' },
    { name: 'Turkey', code: 'tr' }
  ],
  E: [
    { name: 'Germany', code: 'de' },
    { name: 'Curacao', code: 'cw' },
    { name: 'Ivory Coast', code: 'ci' },
    { name: 'Ecuador', code: 'ec' }
  ],
  F: [
    { name: 'Netherlands', code: 'nl' },
    { name: 'Japan', code: 'jp' },
    { name: 'Sweden', code: 'se' },
    { name: 'Tunisia', code: 'tn' }
  ],
  G: [
    { name: 'Belgium', code: 'be' },
    { name: 'Egypt', code: 'eg' },
    { name: 'Iran', code: 'ir' },
    { name: 'New Zealand', code: 'nz' }
  ],
  H: [
    { name: 'Spain', code: 'es' },
    { name: 'Cape Verde', code: 'cv' },
    { name: 'Saudi Arabia', code: 'sa' },
    { name: 'Uruguay', code: 'uy' }
  ],
  I: [
    { name: 'France', code: 'fr' },
    { name: 'Senegal', code: 'sn' },
    { name: 'Iraq', code: 'iq' },
    { name: 'Norway', code: 'no' }
  ],
  J: [
    { name: 'Argentina', code: 'ar' },
    { name: 'Algeria', code: 'dz' },
    { name: 'Austria', code: 'at' },
    { name: 'Jordan', code: 'jo' }
  ],
  K: [
    { name: 'Portugal', code: 'pt' },
    { name: 'DR Congo', code: 'cd' },
    { name: 'Uzbekistan', code: 'uz' },
    { name: 'Colombia', code: 'co' }
  ],
  L: [
    { name: 'England', code: 'gb-eng' },
    { name: 'Croatia', code: 'hr' },
    { name: 'Ghana', code: 'gh' },
    { name: 'Panama', code: 'pa' }
  ]
};

// Create a flat team lookup for codes and flags
const teamLookup = {};
for (const letter in groupsData) {
  for (const team of groupsData[letter]) {
    teamLookup[team.name] = { code: team.code, group: letter };
  }
}

// Generate the 6 fixtures for each group programmatically
const groupLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
const generatedGroupFixtures = [];

for (const letter of groupLetters) {
  const teams = groupsData[letter];
  const matchConfigs = [
    { home: 0, away: 1 },
    { home: 2, away: 3 },
    { home: 0, away: 2 },
    { home: 1, away: 3 },
    { home: 3, away: 0 },
    { home: 1, away: 2 }
  ];
  matchConfigs.forEach((cfg, idx) => {
    generatedGroupFixtures.push({
      id: `${letter}-${idx + 1}`,
      group: letter,
      home: teams[cfg.home].name,
      away: teams[cfg.away].name
    });
  });
}

// 2. Application State Definition
let appState = {
  groupPredictions: {},  // key: fixtureId ("A-1") -> 'home', 'away', or 'draw' (or undefined/null)
  knockoutSelections: {} // key: matchId ("R32-1") -> winnerTeamName (string)
};

// Active Tab and Active Group views
let activeTab = 'groups'; // 'groups', 'bracket'
let activeGroupFilter = 'A'; // 'A' through 'L', or 'ALL'
let searchQuery = '';

// Bipartite Matching Config for 3rd Place Allocation
const winnersList = ['1A', '1B', '1D', '1E', '1G', '1I', '1K', '1L'];
const winnerPreferences = {
  '1A': ['C', 'E', 'F', 'H', 'I'],
  '1B': ['E', 'F', 'G', 'I', 'J'],
  '1D': ['B', 'E', 'F', 'I', 'J'],
  '1E': ['A', 'B', 'C', 'D', 'F'],
  '1G': ['A', 'E', 'H', 'I', 'J'],
  '1I': ['C', 'D', 'F', 'G', 'H'],
  '1K': ['D', 'E', 'I', 'J', 'L'],
  '1L': ['E', 'H', 'I', 'J', 'K']
};

// 3. Standings and Qualification Calculations
function calculateStandings() {
  const standings = {};

  // Initialize standings for all groups
  for (const letter of groupLetters) {
    standings[letter] = groupsData[letter].map(team => ({
      name: team.name,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      points: 0
    }));
  }

  // Aggregate match results from W/D/L predictions
  generatedGroupFixtures.forEach(fixture => {
    const pred = appState.groupPredictions[fixture.id];
    if (pred) {
      const homeTeam = standings[fixture.group].find(t => t.name === fixture.home);
      const awayTeam = standings[fixture.group].find(t => t.name === fixture.away);

      homeTeam.played++;
      awayTeam.played++;

      if (pred === 'home') {
        homeTeam.wins++;
        homeTeam.points += 3;
        awayTeam.losses++;
      } else if (pred === 'away') {
        awayTeam.wins++;
        awayTeam.points += 3;
        homeTeam.losses++;
      } else if (pred === 'draw') {
        homeTeam.draws++;
        homeTeam.points += 1;
        awayTeam.draws++;
        awayTeam.points += 1;
      }
    }
  });

  // Sort Standings
  for (const letter of groupLetters) {
    standings[letter].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.wins !== a.wins) return b.wins - a.wins; // Wins as primary tiebreaker
      return a.name.localeCompare(b.name); // Alphabetical tiebreaker fallback
    });
  }

  return standings;
}

// Extract qualifiers and rank third-placed teams
function getQualifiers(standings) {
  const automaticQualifiers = {}; // group -> { 1st: teamName, 2nd: teamName }
  const thirdPlaceCandidates = [];

  for (const letter of groupLetters) {
    const groupStandings = standings[letter];
    automaticQualifiers[letter] = {
      first: groupStandings[0].name,
      second: groupStandings[1].name
    };
    thirdPlaceCandidates.push({
      name: groupStandings[2].name,
      group: letter,
      played: groupStandings[2].played,
      wins: groupStandings[2].wins,
      draws: groupStandings[2].draws,
      losses: groupStandings[2].losses,
      points: groupStandings[2].points
    });
  }

  // Sort the third place teams to select the top 8
  thirdPlaceCandidates.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return a.group.localeCompare(b.group); // Deterministic fallback by group letter
  });

  const qualifiedThirds = thirdPlaceCandidates.slice(0, 8);
  const eliminatedThirds = thirdPlaceCandidates.slice(8);

  return {
    automaticQualifiers,
    allThirds: thirdPlaceCandidates,
    qualifiedThirds,
    eliminatedThirds
  };
}

// Bipartite Matching to map third place teams to winners
function matchThirdPlaceTeams(qualifiedThirds) {
  const qualifiedGroups = qualifiedThirds.map(t => t.group);
  const mapping = {};
  const used = new Set();

  function backtrack(winnerIndex) {
    if (winnerIndex === winnersList.length) {
      return true;
    }
    const w = winnersList[winnerIndex];
    const prefs = winnerPreferences[w];
    for (const group of prefs) {
      if (qualifiedGroups.includes(group) && !used.has(group)) {
        used.add(group);
        mapping[w] = group;
        if (backtrack(winnerIndex + 1)) {
          return true;
        }
        used.delete(group);
        delete mapping[w];
      }
    }
    return false;
  }

  // Attempt perfect matching
  if (backtrack(0)) {
    return mapping;
  }

  // Fallback in case of unexpected matching failure (ensure bracket does not crash)
  const remainingGroups = qualifiedGroups.filter(g => !used.has(g));
  for (const w of winnersList) {
    if (!mapping[w]) {
      const g = remainingGroups.pop();
      mapping[w] = g;
    }
  }
  return mapping;
}

// 4. Bracket Matchups Definition
// Dynamic bracket nodes will read from this setup
function getRoundOf32Matches(standings, qualifiers, thirdMapping) {
  // Get third-place team name by group letter
  function getThirdTeamByGroup(gLetter) {
    const groupStandings = standings[gLetter];
    return groupStandings[2].name;
  }

  const matches = {
    'R32-1': { home: qualifiers.automaticQualifiers.A.second, away: qualifiers.automaticQualifiers.B.second },
    'R32-2': { home: qualifiers.automaticQualifiers.C.first, away: qualifiers.automaticQualifiers.F.second },
    'R32-3': { home: qualifiers.automaticQualifiers.E.first, away: getThirdTeamByGroup(thirdMapping['1E']) },
    'R32-4': { home: qualifiers.automaticQualifiers.F.first, away: qualifiers.automaticQualifiers.C.second },
    'R32-5': { home: qualifiers.automaticQualifiers.E.second, away: qualifiers.automaticQualifiers.I.second },
    'R32-6': { home: qualifiers.automaticQualifiers.I.first, away: getThirdTeamByGroup(thirdMapping['1I']) },
    'R32-7': { home: qualifiers.automaticQualifiers.A.first, away: getThirdTeamByGroup(thirdMapping['1A']) },
    'R32-8': { home: qualifiers.automaticQualifiers.L.first, away: getThirdTeamByGroup(thirdMapping['1L']) },
    'R32-9': { home: qualifiers.automaticQualifiers.G.first, away: getThirdTeamByGroup(thirdMapping['1G']) },
    'R32-10': { home: qualifiers.automaticQualifiers.D.first, away: getThirdTeamByGroup(thirdMapping['1D']) },
    'R32-11': { home: qualifiers.automaticQualifiers.H.first, away: qualifiers.automaticQualifiers.J.second },
    'R32-12': { home: qualifiers.automaticQualifiers.K.second, away: qualifiers.automaticQualifiers.L.second },
    'R32-13': { home: qualifiers.automaticQualifiers.B.first, away: getThirdTeamByGroup(thirdMapping['1B']) },
    'R32-14': { home: qualifiers.automaticQualifiers.D.second, away: qualifiers.automaticQualifiers.G.second },
    'R32-15': { home: qualifiers.automaticQualifiers.J.first, away: qualifiers.automaticQualifiers.H.second },
    'R32-16': { home: qualifiers.automaticQualifiers.K.first, away: getThirdTeamByGroup(thirdMapping['1K']) }
  };

  return matches;
}

// Compute the entire bracket tree, cascading selections
function buildBracketTree() {
  const standings = calculateStandings();
  const qualifiers = getQualifiers(standings);
  const thirdMapping = matchThirdPlaceTeams(qualifiers.qualifiedThirds);
  
  const r32 = getRoundOf32Matches(standings, qualifiers, thirdMapping);
  const r16 = {};
  const qf = {};
  const sf = {};
  const finals = {};

  // R32 Winners
  const r32W = {};
  for (let i = 1; i <= 16; i++) {
    const mId = `R32-${i}`;
    const pair = r32[mId];
    let selected = appState.knockoutSelections[mId];
    // Invalidate if selection is not one of the two competing teams
    if (selected && selected !== pair.home && selected !== pair.away) {
      delete appState.knockoutSelections[mId];
      selected = null;
    }
    r32W[mId] = selected || null;
  }

  // Round of 16 Matchups
  r16['R16-1'] = { home: r32W['R32-1'], away: r32W['R32-4'] };
  r16['R16-2'] = { home: r32W['R32-3'], away: r32W['R32-6'] };
  r16['R16-3'] = { home: r32W['R32-2'], away: r32W['R32-5'] };
  r16['R16-4'] = { home: r32W['R32-7'], away: r32W['R32-8'] };
  r16['R16-5'] = { home: r32W['R32-10'], away: r32W['R32-9'] };
  r16['R16-6'] = { home: r32W['R32-12'], away: r32W['R32-11'] };
  r16['R16-7'] = { home: r32W['R32-13'], away: r32W['R32-16'] };
  r16['R16-8'] = { home: r32W['R32-15'], away: r32W['R32-14'] };

  // R16 Winners
  const r16W = {};
  for (let i = 1; i <= 8; i++) {
    const mId = `R16-${i}`;
    const pair = r16[mId];
    let selected = appState.knockoutSelections[mId];
    if (selected && selected !== pair.home && selected !== pair.away) {
      delete appState.knockoutSelections[mId];
      selected = null;
    }
    r16W[mId] = selected || null;
  }

  // Quarter-final Matchups
  qf['QF-1'] = { home: r16W['R16-1'], away: r16W['R16-2'] };
  qf['QF-2'] = { home: r16W['R16-6'], away: r16W['R16-5'] };
  qf['QF-3'] = { home: r16W['R16-3'], away: r16W['R16-4'] };
  qf['QF-4'] = { home: r16W['R16-7'], away: r16W['R16-8'] };

  // QF Winners
  const qfW = {};
  for (let i = 1; i <= 4; i++) {
    const mId = `QF-${i}`;
    const pair = qf[mId];
    let selected = appState.knockoutSelections[mId];
    if (selected && selected !== pair.home && selected !== pair.away) {
      delete appState.knockoutSelections[mId];
      selected = null;
    }
    qfW[mId] = selected || null;
  }

  // Semi-final Matchups
  sf['SF-1'] = { home: qfW['QF-1'], away: qfW['QF-2'] };
  sf['SF-2'] = { home: qfW['QF-3'], away: qfW['QF-4'] };

  // SF Winners and Losers (needed for Final and 3rd Place)
  const sfW = {};
  const sfL = {};
  for (let i = 1; i <= 2; i++) {
    const mId = `SF-${i}`;
    const pair = sf[mId];
    let selected = appState.knockoutSelections[mId];
    if (selected && selected !== pair.home && selected !== pair.away) {
      delete appState.knockoutSelections[mId];
      selected = null;
    }
    sfW[mId] = selected || null;
    
    // Determine the loser
    if (pair.home && pair.away) {
      if (selected === pair.home) {
        sfL[mId] = pair.away;
      } else if (selected === pair.away) {
        sfL[mId] = pair.home;
      } else {
        sfL[mId] = null;
      }
    } else {
      sfL[mId] = null;
    }
  }

  // Third Place and Final Matchups
  finals['TP'] = { home: sfL['SF-1'], away: sfL['SF-2'] };
  finals['F'] = { home: sfW['SF-1'], away: sfW['SF-2'] };

  // Final and Third Place winners
  let tpWinner = appState.knockoutSelections['TP'] || null;
  if (tpWinner && tpWinner !== finals['TP'].home && tpWinner !== finals['TP'].away) {
    delete appState.knockoutSelections['TP'];
    tpWinner = null;
  }

  let champion = appState.knockoutSelections['F'] || null;
  if (champion && champion !== finals['F'].home && champion !== finals['F'].away) {
    delete appState.knockoutSelections['F'];
    champion = null;
  }

  return {
    standings,
    qualifiers,
    thirdMapping,
    r32,
    r16,
    qf,
    sf,
    finals,
    champion,
    tpWinner
  };
}

// 5. Completion Tracker Calculations
function getCompletionStats() {
  let predictedCount = 0;
  const totalMatches = 104; // 72 group stage + 32 knockout matches

  // Count group predictions
  generatedGroupFixtures.forEach(fixture => {
    if (appState.groupPredictions[fixture.id]) {
      predictedCount++;
    }
  });

  // Count knockout predictions
  const koKeys = ['R32-', 'R16-', 'QF-', 'SF-', 'TP', 'F'];
  koKeys.forEach(key => {
    if (key.includes('-')) {
      const max = key === 'R32-' ? 16 : key === 'R16-' ? 8 : key === 'QF-' ? 4 : 2;
      for (let i = 1; i <= max; i++) {
        if (appState.knockoutSelections[`${key}${i}`]) {
          predictedCount++;
        }
      }
    } else {
      if (appState.knockoutSelections[key]) {
        predictedCount++;
      }
    }
  });

  const percent = Math.round((predictedCount / totalMatches) * 100);
  return { predictedCount, totalMatches, percent };
}

// 6. Storage & Action Handlers
const STORAGE_KEY = 'wc2026_predictor_state';

function saveToLocalStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
}

function loadFromLocalStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      
      // Backward-compatible migration from old groupScores format to groupPredictions
      if (parsed.groupScores && !parsed.groupPredictions) {
        parsed.groupPredictions = {};
        for (const fId in parsed.groupScores) {
          const s = parsed.groupScores[fId];
          if (s.homeScore !== null && s.awayScore !== null) {
            if (s.homeScore > s.awayScore) parsed.groupPredictions[fId] = 'home';
            else if (s.homeScore < s.awayScore) parsed.groupPredictions[fId] = 'away';
            else parsed.groupPredictions[fId] = 'draw';
          }
        }
      }
      
      if (parsed.groupPredictions && parsed.knockoutSelections) {
        appState = parsed;
      }
    }
  } catch (e) {
    console.error('Failed to parse predictions from LocalStorage', e);
  }
}

function resetTournament() {
  appState.groupPredictions = {};
  appState.knockoutSelections = {};
  saveToLocalStorage();
  renderApp();
}

function exportPredictions() {
  return JSON.stringify(appState, null, 2);
}

function importPredictions(jsonString) {
  try {
    const parsed = JSON.parse(jsonString);
    
    // Migration fallback for imported templates
    if (parsed.groupScores && !parsed.groupPredictions) {
      parsed.groupPredictions = {};
      for (const fId in parsed.groupScores) {
        const s = parsed.groupScores[fId];
        if (s.homeScore !== null && s.awayScore !== null) {
          if (s.homeScore > s.awayScore) parsed.groupPredictions[fId] = 'home';
          else if (s.homeScore < s.awayScore) parsed.groupPredictions[fId] = 'away';
          else parsed.groupPredictions[fId] = 'draw';
        }
      }
    }
    
    if (parsed.groupPredictions && parsed.knockoutSelections) {
      appState = parsed;
      saveToLocalStorage();
      renderApp();
      return { success: true };
    }
  } catch (e) {
    return { success: false, error: e.message };
  }
  return { success: false, error: 'Invalid data format' };
}

// 7. UI Rendering Layer (DOM Manipulation)
function renderApp() {
  const tree = buildBracketTree();
  updateProgressTracker();
  renderGroupStage(tree);
  renderQualificationSummary(tree);
  renderKnockoutBracket(tree);
  checkChampionCelebration(tree);
}

// Update the Top Progress Tracker Bar
function updateProgressTracker() {
  const stats = getCompletionStats();
  const progressBar = document.getElementById('progress-bar-fill');
  const progressText = document.getElementById('progress-text');
  
  if (progressBar && progressText) {
    progressBar.style.width = `${stats.percent}%`;
    progressText.innerText = `${stats.percent}% Complete (${stats.predictedCount}/${stats.totalMatches} matches predicted)`;
  }
}

// Render the Group Stage View
function renderGroupStage(tree) {
  const container = document.getElementById('group-stage-container');
  if (!container) return;

  container.innerHTML = '';

  // Get list of groups to render based on filter
  const renderList = activeGroupFilter === 'ALL' ? groupLetters : [activeGroupFilter];

  renderList.forEach(letter => {
    const groupCard = document.createElement('div');
    groupCard.className = 'group-card-wrapper glass-panel';

    const groupHeader = document.createElement('div');
    groupHeader.className = 'group-card-header';
    groupHeader.innerHTML = `<h3>Group ${letter}</h3>`;
    groupCard.appendChild(groupHeader);

    const groupBody = document.createElement('div');
    groupBody.className = 'group-card-body';

    // 1. Render Group Fixtures Column
    const fixturesCol = document.createElement('div');
    fixturesCol.className = 'fixtures-column';

    const matches = generatedGroupFixtures.filter(f => f.group === letter);
    matches.forEach(match => {
      const matchCard = document.createElement('div');
      
      // Match active search highlight
      const matchesSearch = searchQuery && 
        (match.home.toLowerCase().includes(searchQuery.toLowerCase()) || 
         match.away.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const pred = appState.groupPredictions[match.id] || null;
      matchCard.className = `match-card ${matchesSearch ? 'search-highlight' : ''} ${pred ? 'has-prediction' : ''}`;

      const homeFlag = `https://flagcdn.com/w40/${teamLookup[match.home].code}.png`;
      const awayFlag = `https://flagcdn.com/w40/${teamLookup[match.away].code}.png`;

      matchCard.innerHTML = `
        <div class="match-team-btn home-btn ${pred === 'home' ? 'active-win' : ''}" data-match-id="${match.id}" data-prediction="home">
          <img class="flag-icon" src="${homeFlag}" alt="${match.home} flag" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22%23ffffff20%22><circle cx=%2212%22 cy=%2212%22 r=%2210%22/></svg>'">
          <span class="team-name" title="${match.home}">${match.home}</span>
        </div>
        <div class="match-draw-btn ${pred === 'draw' ? 'active-draw' : ''}" data-match-id="${match.id}" data-prediction="draw">
          <span>Draw</span>
        </div>
        <div class="match-team-btn away-btn ${pred === 'away' ? 'active-win' : ''}" data-match-id="${match.id}" data-prediction="away">
          <span class="team-name" title="${match.away}">${match.away}</span>
          <img class="flag-icon" src="${awayFlag}" alt="${match.away} flag" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22%23ffffff20%22><circle cx=%2212%22 cy=%2212%22 r=%2210%22/></svg>'">
        </div>
      `;
      fixturesCol.appendChild(matchCard);
    });

    // 2. Render Group Standings Table Column
    const standingsCol = document.createElement('div');
    standingsCol.className = 'standings-column';

    const table = document.createElement('table');
    table.className = 'standings-table';
    table.innerHTML = `
      <thead>
        <tr>
          <th class="col-pos">Pos</th>
          <th class="col-team">Team</th>
          <th class="col-stat">P</th>
          <th class="col-stat">W</th>
          <th class="col-stat">D</th>
          <th class="col-stat">L</th>
          <th class="col-pts">PTS</th>
        </tr>
      </thead>
      <tbody id="standings-body-${letter}"></tbody>
    `;

    const tbody = table.querySelector('tbody');
    tree.standings[letter].forEach((row, idx) => {
      const tr = document.createElement('tr');
      // Style positions: 1-2 green (qualify), 3rd blue/orange (potential), 4th red (eliminated)
      let rowClass = 'row-eliminated';
      if (idx < 2) rowClass = 'row-qualify';
      else if (idx === 2) {
        const isQualifiedThird = tree.qualifiers.qualifiedThirds.some(t => t.name === row.name);
        rowClass = isQualifiedThird ? 'row-third-qualify' : 'row-third-normal';
      }
      tr.className = rowClass;
      
      const flag = `https://flagcdn.com/w40/${teamLookup[row.name].code}.png`;

      tr.innerHTML = `
        <td class="col-pos font-bold">${idx + 1}</td>
        <td class="col-team">
          <div class="team-info">
            <img class="flag-icon-sm" src="${flag}" alt="${row.name} flag" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22%23ffffff20%22><circle cx=%2212%22 cy=%2212%22 r=%2210%22/></svg>'">
            <span class="team-name-table ${searchQuery && row.name.toLowerCase().includes(searchQuery.toLowerCase()) ? 'search-highlight-text' : ''}">${row.name}</span>
          </div>
        </td>
        <td class="col-stat">${row.played}</td>
        <td class="col-stat">${row.wins}</td>
        <td class="col-stat">${row.draws}</td>
        <td class="col-stat">${row.losses}</td>
        <td class="col-pts font-bold">${row.points}</td>
      `;
      tbody.appendChild(tr);
    });

    standingsCol.appendChild(table);
    groupBody.appendChild(fixturesCol);
    groupBody.appendChild(standingsCol);
    groupCard.appendChild(groupBody);
    container.appendChild(groupCard);
  });

  // Attach button prediction listeners once elements are rendered
  const clickableButtons = container.querySelectorAll('.match-team-btn, .match-draw-btn');
  clickableButtons.forEach(btn => {
    btn.addEventListener('click', e => {
      const target = e.currentTarget;
      const matchId = target.dataset.matchId;
      const prediction = target.dataset.prediction; // 'home', 'away', or 'draw'

      const currentPrediction = appState.groupPredictions[matchId];
      if (currentPrediction === prediction) {
        // Toggle selection off if clicking the already selected button
        delete appState.groupPredictions[matchId];
      } else {
        appState.groupPredictions[matchId] = prediction;
      }

      saveToLocalStorage();
      renderApp();
    });
  });
}

// Render the Qualification Summary panel
function renderQualificationSummary(tree) {
  const container = document.getElementById('qualification-summary-container');
  if (!container) return;

  const thirdsTableBody = document.getElementById('thirds-table-body');
  if (!thirdsTableBody) return;

  thirdsTableBody.innerHTML = '';
  tree.qualifiers.allThirds.forEach((row, idx) => {
    const tr = document.createElement('tr');
    const isQualified = idx < 8;
    tr.className = isQualified ? 'row-qualify' : 'row-eliminated';
    
    const flag = `https://flagcdn.com/w40/${teamLookup[row.name].code}.png`;

    tr.innerHTML = `
      <td class="col-pos font-bold">${idx + 1}</td>
      <td class="col-team">
        <div class="team-info">
          <img class="flag-icon-sm" src="${flag}" alt="${row.name} flag" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22%23ffffff20%22><circle cx=%2212%22 cy=%2212%22 r=%2210%22/></svg>'">
          <span class="team-name-table">${row.name} (Gr. ${row.group})</span>
        </div>
      </td>
      <td class="col-stat">${row.played}</td>
      <td class="col-stat">${row.wins}</td>
      <td class="col-stat">${row.draws}</td>
      <td class="col-stat">${row.losses}</td>
      <td class="col-pts font-bold">${row.points}</td>
      <td class="col-stat font-bold text-center">${isQualified ? '<span class="status-badge badge-q">Q</span>' : '<span class="status-badge badge-e">E</span>'}</td>
    `;
    thirdsTableBody.appendChild(tr);
  });
}

// Helper to render a match element in the bracket tree
function createBracketMatchHTML(matchId, matchData, selectedWinner, matchNumber) {
  const home = matchData.home;
  const away = matchData.away;

  const homeFlag = home ? `https://flagcdn.com/w40/${teamLookup[home]?.code}.png` : '';
  const awayFlag = away ? `https://flagcdn.com/w40/${teamLookup[away]?.code}.png` : '';

  const isHomeSelected = selectedWinner && home && selectedWinner === home;
  const isAwaySelected = selectedWinner && away && selectedWinner === away;

  const homeClass = home ? (isHomeSelected ? 'team-slot winner-selected' : (selectedWinner ? 'team-slot loser-dimmed' : 'team-slot')) : 'team-slot tbd-slot';
  const awayClass = away ? (isAwaySelected ? 'team-slot winner-selected' : (selectedWinner ? 'team-slot loser-dimmed' : 'team-slot')) : 'team-slot tbd-slot';

  return `
    <div class="bracket-match-header">Match ${matchNumber}</div>
    <div class="bracket-match-teams">
      <div class="${homeClass}" data-match-id="${matchId}" data-team-name="${home || ''}">
        ${homeFlag ? `<img class="flag-icon-sm" src="${homeFlag}" alt="${home} flag" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22%23ffffff20%22><circle cx=%2212%22 cy=%2212%22 r=%2210%22/></svg>'">` : `<div class="flag-placeholder">?</div>`}
        <span class="team-name-bracket">${home || 'TBD'}</span>
      </div>
      <div class="${awayClass}" data-match-id="${matchId}" data-team-name="${away || ''}">
        ${awayFlag ? `<img class="flag-icon-sm" src="${awayFlag}" alt="${away} flag" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22%23ffffff20%22><circle cx=%2212%22 cy=%2212%22 r=%2210%22/></svg>'">` : `<div class="flag-placeholder">?</div>`}
        <span class="team-name-bracket">${away || 'TBD'}</span>
      </div>
    </div>
  `;
}

// Render the Knockout Bracket Tree view
function renderKnockoutBracket(tree) {
  const rounds = {
    r32: { elId: 'round-32-column', data: tree.r32, nums: [73, 76, 74, 75, 78, 77, 79, 80, 82, 81, 84, 83, 85, 88, 86, 87], keys: Array.from({length: 16}, (_, i) => `R32-${i+1}`) },
    r16: { elId: 'round-16-column', data: tree.r16, nums: [89, 90, 91, 92, 94, 93, 96, 95], keys: Array.from({length: 8}, (_, i) => `R16-${i+1}`) },
    qf: { elId: 'round-qf-column', data: tree.qf, nums: [97, 98, 99, 100], keys: Array.from({length: 4}, (_, i) => `QF-${i+1}`) },
    sf: { elId: 'round-sf-column', data: tree.sf, nums: [101, 102], keys: Array.from({length: 2}, (_, i) => `SF-${i+1}`) },
    finals: { elId: 'round-finals-column', data: tree.finals, nums: [103, 104], keys: ['TP', 'F'] }
  };

  // Helper to map index to match num correctly based on official layout
  const r32MatchesOrdered = [
    { key: 'R32-1', num: 73 },
    { key: 'R32-2', num: 76 },
    { key: 'R32-3', num: 74 },
    { key: 'R32-4', num: 75 },
    { key: 'R32-5', num: 78 },
    { key: 'R32-6', num: 77 },
    { key: 'R32-7', num: 79 },
    { key: 'R32-8', num: 80 },
    { key: 'R32-10', num: 81 }, // Match 81 Winner D vs 3rd
    { key: 'R32-9', num: 82 },  // Match 82 Winner G vs 3rd
    { key: 'R32-12', num: 83 }, // Match 83 2K vs 2L
    { key: 'R32-11', num: 84 }, // Match 84 1H vs 2J
    { key: 'R32-13', num: 85 }, // Match 85 1B vs 3rd
    { key: 'R32-15', num: 86 }, // Match 86 1J vs 2H
    { key: 'R32-16', num: 87 }, // Match 87 1K vs 3rd
    { key: 'R32-14', num: 88 }  // Match 88 2D vs 2G
  ];

  const r16MatchesOrdered = [
    { key: 'R16-1', num: 89 }, // Winner 73 vs 75
    { key: 'R16-2', num: 90 }, // Winner 74 vs 77
    { key: 'R16-3', num: 91 }, // Winner 76 vs 78
    { key: 'R16-4', num: 92 }, // Winner 79 vs 80
    { key: 'R16-5', num: 94 }, // Winner 81 vs 82
    { key: 'R16-6', num: 93 }, // Winner 83 vs 84
    { key: 'R16-7', num: 96 }, // Winner 85 vs 87
    { key: 'R16-8', num: 95 }  // Winner 86 vs 88
  ];

  const qfMatchesOrdered = [
    { key: 'QF-1', num: 97 }, // Winner 89 vs 90
    { key: 'QF-2', num: 98 }, // Winner 93 vs 94
    { key: 'QF-3', num: 99 }, // Winner 91 vs 92
    { key: 'QF-4', num: 100 } // Winner 95 vs 96
  ];

  const sfMatchesOrdered = [
    { key: 'SF-1', num: 101 }, // Winner 97 vs 98
    { key: 'SF-2', num: 102 }  // Winner 99 vs 100
  ];

  const finalsOrdered = [
    { key: 'TP', num: 103 },
    { key: 'F', num: 104 }
  ];

  function renderColumn(colId, matchesList, dataObj) {
    const colEl = document.getElementById(colId);
    if (!colEl) return;
    colEl.innerHTML = '';

    matchesList.forEach(m => {
      const matchCard = document.createElement('div');
      matchCard.className = 'bracket-match-card glass-panel-hover';
      matchCard.id = `card-${m.key}`;

      const selected = appState.knockoutSelections[m.key];
      matchCard.innerHTML = createBracketMatchHTML(m.key, dataObj[m.key], selected, m.num);
      colEl.appendChild(matchCard);
    });
  }

  renderColumn('round-32-column', r32MatchesOrdered, tree.r32);
  renderColumn('round-16-column', r16MatchesOrdered, tree.r16);
  renderColumn('round-qf-column', qfMatchesOrdered, tree.qf);
  renderColumn('round-sf-column', sfMatchesOrdered, tree.sf);
  renderColumn('round-finals-column', finalsOrdered, tree.finals);

  // Add event listeners for team selection in bracket
  const teamSlots = document.querySelectorAll('.bracket-match-teams .team-slot:not(.tbd-slot)');
  teamSlots.forEach(slot => {
    slot.addEventListener('click', e => {
      const target = e.currentTarget;
      const matchId = target.dataset.matchId;
      const teamName = target.dataset.teamName;

      if (teamName) {
        appState.knockoutSelections[matchId] = teamName;
        saveToLocalStorage();
        renderApp();
      }
    });
  });
}

// 8. Champion Celebration Screen Handler
function checkChampionCelebration(tree) {
  const overlay = document.getElementById('champion-overlay');
  if (!overlay) return;

  if (tree.champion) {
    // Show overlay if not already shown for this champion
    if (overlay.dataset.championName !== tree.champion) {
      overlay.dataset.championName = tree.champion;
      overlay.classList.add('active');

      const flag = `https://flagcdn.com/w80/${teamLookup[tree.champion]?.code}.png`;
      const flagEl = document.getElementById('celebration-flag');
      const nameEl = document.getElementById('celebration-team-name');

      if (flagEl) flagEl.src = flag;
      if (nameEl) nameEl.innerText = tree.champion;

      // Start canvas confetti
      startConfetti();
    }
  } else {
    overlay.classList.remove('active');
    overlay.dataset.championName = '';
  }
}

// Confetti particle simulation on canvas
let confettiInterval = null;
function startConfetti() {
  const canvas = document.getElementById('celebration-confetti-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  const colors = ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#a855f7', '#00df89', '#ffffff'];

  for (let i = 0; i < 150; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      r: Math.random() * 6 + 4,
      d: Math.random() * canvas.height,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.random() * 10 - 5,
      tiltAngleIncremental: Math.random() * 0.07 + 0.02,
      tiltAngle: 0
    });
  }

  function drawConfetti() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach((p, idx) => {
      p.tiltAngle += p.tiltAngleIncremental;
      p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2;
      p.x += Math.sin(p.tiltAngle);
      p.tilt = Math.sin(p.tiltAngle - idx / 3) * 15;

      ctx.beginPath();
      ctx.lineWidth = p.r;
      ctx.strokeStyle = p.color;
      ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
      ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
      ctx.stroke();

      if (p.y > canvas.height) {
        particles[idx] = {
          x: Math.random() * canvas.width,
          y: -20,
          r: p.r,
          d: p.d,
          color: p.color,
          tilt: p.tilt,
          tiltAngleIncremental: p.tiltAngleIncremental,
          tiltAngle: p.tiltAngle
        };
      }
    });
  }

  if (confettiInterval) clearInterval(confettiInterval);
  confettiInterval = setInterval(drawConfetti, 20);

  // Resize listener
  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
}

function closeCelebration() {
  const overlay = document.getElementById('champion-overlay');
  if (overlay) {
    overlay.classList.remove('active');
  }
  if (confettiInterval) {
    clearInterval(confettiInterval);
    confettiInterval = null;
  }
}

// 9. Page Initialization & DOM Event Wiring
document.addEventListener('DOMContentLoaded', () => {
  // Restore predictions from LocalStorage
  loadFromLocalStorage();

  // Tab switching setup
  const tabGroupsBtn = document.getElementById('tab-groups-btn');
  const tabBracketBtn = document.getElementById('tab-bracket-btn');
  const tabGroupsSec = document.getElementById('tab-groups-section');
  const tabBracketSec = document.getElementById('tab-bracket-section');

  function switchTab(tab) {
    activeTab = tab;
    if (tab === 'groups') {
      tabGroupsBtn.classList.add('active');
      tabBracketBtn.classList.remove('active');
      tabGroupsSec.classList.remove('hidden');
      tabBracketSec.classList.add('hidden');
    } else {
      tabGroupsBtn.classList.remove('active');
      tabBracketBtn.classList.add('active');
      tabGroupsSec.classList.add('hidden');
      tabBracketSec.classList.remove('hidden');
    }
    renderApp();
  }

  tabGroupsBtn.addEventListener('click', () => switchTab('groups'));
  tabBracketBtn.addEventListener('click', () => switchTab('bracket'));

  // Group filter tab buttons
  const groupFiltersContainer = document.getElementById('group-filters-container');
  if (groupFiltersContainer) {
    const filters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'ALL'];
    filters.forEach(f => {
      const btn = document.createElement('button');
      btn.className = `filter-btn ${activeGroupFilter === f ? 'active' : ''}`;
      btn.innerText = f === 'ALL' ? 'All Groups' : f;
      btn.addEventListener('click', () => {
        // Toggle active style
        groupFiltersContainer.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeGroupFilter = f;
        renderApp();
      });
      groupFiltersContainer.appendChild(btn);
    });
  }

  // Team search
  const searchInput = document.getElementById('team-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', e => {
      searchQuery = e.target.value;
      renderApp();
    });
  }

  // Reset button action
  const resetBtn = document.getElementById('btn-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to reset all predictions? This will erase your group predictions and bracket choices.')) {
        resetTournament();
      }
    });
  }

  // Export predictions
  const exportBtn = document.getElementById('btn-export');
  const modalExport = document.getElementById('import-export-modal');
  const modalTextArea = document.getElementById('import-export-textarea');
  const modalTitle = document.getElementById('modal-title');
  const btnSubmitImport = document.getElementById('btn-submit-import');

  if (exportBtn && modalExport && modalTextArea && modalTitle) {
    exportBtn.addEventListener('click', () => {
      modalTitle.innerText = 'Export Predictions';
      modalTextArea.value = exportPredictions();
      modalTextArea.readOnly = true;
      btnSubmitImport.classList.add('hidden');
      modalExport.classList.add('active');
    });
  }

  // Import predictions
  const importBtn = document.getElementById('btn-import');
  if (importBtn && modalExport && modalTextArea && modalTitle) {
    importBtn.addEventListener('click', () => {
      modalTitle.innerText = 'Import Predictions';
      modalTextArea.value = '';
      modalTextArea.placeholder = 'Paste your exported JSON prediction data here...';
      modalTextArea.readOnly = false;
      btnSubmitImport.classList.remove('hidden');
      modalExport.classList.add('active');
    });
  }

  // Close modals
  const closeModalBtns = document.querySelectorAll('.close-modal-btn');
  closeModalBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      modalExport.classList.remove('active');
    });
  });

  // Submit Import
  if (btnSubmitImport && modalTextArea && modalExport) {
    btnSubmitImport.addEventListener('click', () => {
      const input = modalTextArea.value;
      const res = importPredictions(input);
      if (res.success) {
        alert('Predictions imported successfully!');
        modalExport.classList.remove('active');
      } else {
        alert('Failed to import: ' + res.error);
      }
    });
  }

  // Close Champion overlay
  const closeCelebrationBtn = document.getElementById('btn-close-celebration');
  if (closeCelebrationBtn) {
    closeCelebrationBtn.addEventListener('click', closeCelebration);
  }

  // Initial render
  renderApp();
});
