'use client';

import { useState } from 'react';
import GameBoard from './components/GameBoard';
import { GameState, Pokemon } from './types';
import pokemonDataRaw from './data/pokemon.json';
import { usePeerGame } from './hooks/usePeerGame';

const pokemonData = pokemonDataRaw as Pokemon[];

export default function Home() {
  const [mode, setMode] = useState<'menu' | 'local' | 'online' | 'scoreboard'>('menu');
  
  // Type advantage mapping (simplified)
  const typeAdvantage: Record<string, string[]> = {
    fire: ['grass','ice','bug','steel'],
    water: ['fire','ground','rock'],
    grass: ['water','ground','rock'],
    electric: ['water','flying'],
    ice: ['grass','ground','flying','dragon'],
    fighting: ['normal','ice','rock','dark','steel'],
    poison: ['grass','fairy'],
    ground: ['fire','electric','poison','rock','steel'],
    flying: ['grass','fighting','bug'],
    psychic: ['fighting','poison'],
    bug: ['grass','psychic','dark'],
    rock: ['fire','ice','flying','bug'],
    ghost: ['psychic','ghost'],
    dragon: ['dragon'],
    dark: ['psychic','ghost'],
    steel: ['ice','rock','fairy'],
    fairy: ['fighting','dragon','dark'],
  };
  const hasTypeAdvantage = (attacker: Pokemon, defender: Pokemon) => {
    return attacker.types.some(t => (typeAdvantage[t.toLowerCase()] || []).some(d => defender.types.map(x => x.toLowerCase()).includes(d)));
  };
  const adjustedPower = (attacker: Pokemon, defender: Pokemon) => {
    const base = attacker.totalStats;
    return hasTypeAdvantage(attacker, defender) ? Math.round(base * 1.2) : base;
  };
  
  // --- ONLINE STATE (via PeerJS Hook) ---
  const {
    gameState: onlineGameState,
    myRole,
    roomCode,
    isConnected,
    error: joinError,
    createGame,
    joinGame,
    drawCard: handleOnlineDraw,
    nextRound: handleOnlineNextRound,
    restartGame: handleOnlineRestart,
    leaveGame,
    bonusPick: handleOnlineBonusPick,
    setName: setOnlineName
  } = usePeerGame();

  const [inputCode, setInputCode] = useState('');
  const [localJoinError, setLocalJoinError] = useState('');

  // --- LOCAL STATE ---
  const [localGameState, setLocalGameState] = useState<GameState | null>(null);

  // --- LOCAL HANDLERS ---
  const startLocalGame = () => {
    setLocalGameState({
      status: 'PLAYING',
      round: 1,
      totalRounds: 12,
      scores: { p1: 0, p2: 0 },
      p1Card: null,
      p2Card: null,
      currentTurn: 'p1',
      roundWinner: null,
      logs: ['Local Game Started!'],
      players: { p1: true, p2: true },
      bonusPickAvailable: { p1: true, p2: true },
      isTieBreak: false,
      names: { p1: null, p2: null },
      stats: { p1Overkills: 0, p2Overkills: 0, p1BonusPicks: 0, p2BonusPicks: 0, tieBreakWin: null }
    });
    setMode('local');
  };

  const handleLocalDraw = () => {
    if (!localGameState) return;
    
    // Pick random pokemon
    const randomPokemon = pokemonData[Math.floor(Math.random() * pokemonData.length)];
    const newState = { ...localGameState };

    if (newState.currentTurn === 'p1') {
      newState.p1Card = randomPokemon;
      newState.currentTurn = 'p2';
      newState.logs = [`Player 1 drew ${randomPokemon.name}!`, ...newState.logs].slice(0, 5);
    } else {
      newState.p2Card = randomPokemon;
      newState.currentTurn = null; // End of turn
      newState.logs = [`Player 2 drew ${randomPokemon.name}!`, ...newState.logs].slice(0, 5);

      // Determine Winner (apply type advantage bonus)
      const p1Power = adjustedPower(newState.p1Card!, newState.p2Card!);
      const p2Power = adjustedPower(newState.p2Card!, newState.p1Card!);

      if (p1Power > p2Power) {
        newState.roundWinner = 'p1';
        newState.logs = ['Player 1 wins the round!', ...newState.logs].slice(0, 5);
      } else if (p2Power > p1Power) {
        newState.roundWinner = 'p2';
        newState.logs = ['Player 2 wins the round!', ...newState.logs].slice(0, 5);
      } else {
        if (newState.isTieBreak) {
          newState.logs = ['Tie-break draw. Redraw!', ...newState.logs].slice(0, 5);
          newState.status = 'PLAYING';
          newState.p1Card = null;
          newState.p2Card = null;
          newState.currentTurn = 'p1';
          newState.roundWinner = null;
          setLocalGameState(newState);
          return;
        } else {
          newState.roundWinner = 'draw';
          newState.logs = ['It\'s a draw!', ...newState.logs].slice(0, 5);
        }
      }

      newState.status = 'ROUND_RESULT';
    }

    setLocalGameState(newState);
  };

  const handleLocalNextRound = () => {
    if (!localGameState) return;
    
    const newState = { ...localGameState };
    
    // Apply scores for the completed round before advancing
    if (newState.status === 'ROUND_RESULT' && newState.p1Card && newState.p2Card && newState.roundWinner && newState.roundWinner !== 'draw') {
      const p1Power = adjustedPower(newState.p1Card, newState.p2Card);
      const p2Power = adjustedPower(newState.p2Card, newState.p1Card);
      const diff = Math.abs(p1Power - p2Power);
      const winner = newState.roundWinner;
      newState.scores[winner] += 1;
      if (diff >= 150) {
        newState.scores[winner] += 1;
        newState.logs = [`Overkill bonus! +1 point for ${winner.toUpperCase()}`, ...newState.logs].slice(0, 5);
        if (winner === 'p1') newState.stats.p1Overkills += 1;
        else newState.stats.p2Overkills += 1;
      }
      if (diff >= 300) {
        newState.scores[winner] += 2;
        newState.logs = [`Overkill bonus! +2 point for ${winner.toUpperCase()}`, ...newState.logs].slice(0, 5);
      }
    }
    
    if (newState.isTieBreak) {
      newState.status = 'GAME_OVER';
      newState.logs = ['Final round complete!', ...newState.logs].slice(0, 5);
      if (newState.roundWinner && newState.roundWinner !== 'draw') {
        newState.stats.tieBreakWin = newState.roundWinner;
      }
    } else if (newState.round >= newState.totalRounds) {
      if (newState.scores.p1 === newState.scores.p2) {
        newState.status = 'PLAYING';
        newState.isTieBreak = true;
        newState.p1Card = null;
        newState.p2Card = null;
        newState.currentTurn = 'p1';
        newState.roundWinner = null;
        newState.logs = ['Final Round! No draws allowed.', ...newState.logs].slice(0, 5);
      } else {
        newState.status = 'GAME_OVER';
        newState.logs = ['Game Over!', ...newState.logs].slice(0, 5);
      }
    } else {
      newState.round += 1;
      newState.status = 'PLAYING';
      newState.p1Card = null;
      newState.p2Card = null;
      newState.currentTurn = 'p1';
      newState.roundWinner = null;
      newState.logs = [`Round ${newState.round} started!`, ...newState.logs].slice(0, 5);
    }
    
    setLocalGameState(newState);
  };

  const handleLocalBonusPickP1 = () => {
    if (!localGameState || !localGameState.bonusPickAvailable.p1 || localGameState.status !== 'ROUND_RESULT') return;
    const newState = { ...localGameState };
    newState.p1Card = pokemonData[Math.floor(Math.random() * pokemonData.length)];
    newState.bonusPickAvailable = { p1: false, p2: newState.bonusPickAvailable.p2 };
    newState.stats.p1BonusPicks += 1;
    const p1Power = adjustedPower(newState.p1Card!, newState.p2Card!);
    const p2Power = adjustedPower(newState.p2Card!, newState.p1Card!);
    if (p1Power > p2Power) {
      newState.roundWinner = 'p1';
      newState.logs = [`Player 1 used Bonus Pick and takes the lead with ${newState.p1Card!.name}!`, ...newState.logs].slice(0, 5);
    } else if (p2Power > p1Power) {
      newState.roundWinner = 'p2';
      newState.logs = [`Player 1 used Bonus Pick but it's not enough.`, ...newState.logs].slice(0, 5);
    } else {
      newState.roundWinner = 'draw';
      newState.logs = [`Player 1 used Bonus Pick and forced a draw.`, ...newState.logs].slice(0, 5);
    }
    setLocalGameState(newState);
  };
  const handleLocalBonusPickP2 = () => {
    if (!localGameState || !localGameState.bonusPickAvailable.p2 || localGameState.status !== 'ROUND_RESULT') return;
    const newState = { ...localGameState };
    newState.p2Card = pokemonData[Math.floor(Math.random() * pokemonData.length)];
    newState.bonusPickAvailable = { p1: newState.bonusPickAvailable.p1, p2: false };
    newState.stats.p2BonusPicks += 1;
    const p1Power = adjustedPower(newState.p1Card!, newState.p2Card!);
    const p2Power = adjustedPower(newState.p2Card!, newState.p1Card!);
    if (p2Power > p1Power) {
      newState.roundWinner = 'p2';
      newState.logs = [`Player 2 used Bonus Pick and takes the lead with ${newState.p2Card!.name}!`, ...newState.logs].slice(0, 5);
    } else if (p1Power > p2Power) {
      newState.roundWinner = 'p1';
      newState.logs = [`Player 2 used Bonus Pick but it's not enough.`, ...newState.logs].slice(0, 5);
    } else {
      newState.roundWinner = 'draw';
      newState.logs = [`Player 2 used Bonus Pick and forced a draw.`, ...newState.logs].slice(0, 5);
    }
    setLocalGameState(newState);
  };
  const handleLocalRestart = () => {
    startLocalGame();
  };

  const handleJoinClick = () => {
      if (inputCode.length !== 6) {
          setLocalJoinError('Code must be 6 characters');
          return;
      }
      setLocalJoinError('');
      joinGame(inputCode);
  };

  const setLocalNameP1 = (name: string) => {
    const trimmed = name.trim().slice(0, 20);
    if (!localGameState) return;
    const other = localGameState.names?.p2 ?? null;
    const finalName = other && other.toLowerCase() === trimmed.toLowerCase() ? `${trimmed} (2)` : trimmed;
    setLocalGameState({ ...localGameState, names: { p1: finalName, p2: localGameState.names?.p2 ?? null } });
  };
  const setLocalNameP2 = (name: string) => {
    const trimmed = name.trim().slice(0, 20);
    if (!localGameState) return;
    const other = localGameState.names?.p1 ?? null;
    const finalName = other && other.toLowerCase() === trimmed.toLowerCase() ? `${trimmed} (2)` : trimmed;
    setLocalGameState({ ...localGameState, names: { p1: localGameState.names?.p1 ?? null, p2: finalName } });
  };
  const setOnlineNameP1 = (name: string) => {
    const trimmed = name.trim().slice(0, 20);
    if (!onlineGameState) return;
    const other = onlineGameState.names?.p2 ?? null;
    const finalName = other && other.toLowerCase() === trimmed.toLowerCase() ? `${trimmed} (2)` : trimmed;
    setOnlineName(finalName);
  };
  const setOnlineNameP2 = (name: string) => {
    const trimmed = name.trim().slice(0, 20);
    if (!onlineGameState) return;
    const other = onlineGameState.names?.p1 ?? null;
    const finalName = other && other.toLowerCase() === trimmed.toLowerCase() ? `${trimmed} (2)` : trimmed;
    setOnlineName(finalName);
  };

  const SCOREBOARD_KEY = 'pokebattle_scoreboard';
  type ScoreEntry = { gamesWon: number; roundsWon: number; overkills: number; tieBreakWins: number; bonusPicks: number };
  type Scoreboard = Record<string, ScoreEntry>;
  const loadScoreboard = (): Scoreboard => {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(SCOREBOARD_KEY) : null;
    return raw ? JSON.parse(raw) as Scoreboard : {};
  };
  const saveScoreboard = (sb: Scoreboard) => {
    if (typeof window !== 'undefined') window.localStorage.setItem(SCOREBOARD_KEY, JSON.stringify(sb));
  };
  const updateScoreboardForGame = (state: GameState) => {
    if (!state || state.status !== 'GAME_OVER') return;
    const sb = loadScoreboard();
    const p1Name = state.names?.p1 || 'PLAYER 1';
    const p2Name = state.names?.p2 || 'PLAYER 2';
    const ensure = (name: string) => {
      if (!sb[name]) sb[name] = { gamesWon: 0, roundsWon: 0, overkills: 0, tieBreakWins: 0, bonusPicks: 0 };
    };
    ensure(p1Name); ensure(p2Name);
    sb[p1Name].roundsWon += state.scores.p1;
    sb[p2Name].roundsWon += state.scores.p2;
    sb[p1Name].overkills += state.stats.p1Overkills;
    sb[p2Name].overkills += state.stats.p2Overkills;
    sb[p1Name].bonusPicks += state.stats.p1BonusPicks;
    sb[p2Name].bonusPicks += state.stats.p2BonusPicks;
    if (state.stats.tieBreakWin === 'p1') sb[p1Name].tieBreakWins += 1;
    if (state.stats.tieBreakWin === 'p2') sb[p2Name].tieBreakWins += 1;
    if (state.scores.p1 > state.scores.p2) sb[p1Name].gamesWon += 1;
    else if (state.scores.p2 > state.scores.p1) sb[p2Name].gamesWon += 1;
    saveScoreboard(sb);
  };

  if (typeof window !== 'undefined') {
    if (localGameState && localGameState.status === 'GAME_OVER') updateScoreboardForGame(localGameState);
    if (onlineGameState && onlineGameState.status === 'GAME_OVER') updateScoreboardForGame(onlineGameState);
  }
  // --- RENDER ---

  // 1. MENU VIEW
  if (mode === 'menu') {
    return (
      <main className="min-h-screen bg-slate-950 text-emerald-400 font-mono p-4 flex flex-col items-center justify-center">
        <h1 className="text-6xl font-bold tracking-widest text-emerald-500 mb-4">POKÉ-BATTLE</h1>
        <p className="text-xl text-emerald-700 mb-12">Choose Your Game Mode</p>
        
        <div className="flex flex-col md:flex-row gap-8 w-full max-w-4xl">
          {/* Local Mode */}
          <div className="flex-1 bg-slate-900 border-2 border-emerald-900 p-8 rounded-lg flex flex-col items-center justify-between hover:border-emerald-500 transition-colors group cursor-pointer" onClick={startLocalGame}>
            <h2 className="text-2xl font-bold mb-4 group-hover:text-emerald-300">LOCAL CO-OP</h2>
            <p className="mb-8 text-center text-emerald-600 flex-grow">Play with a friend on the same device.</p>
            <button className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xl rounded transition-colors">
              PLAY LOCAL
            </button>
          </div>

          {/* Online Mode */}
          <div className="flex-1 bg-slate-900 border-2 border-emerald-900 p-8 rounded-lg flex flex-col items-center justify-between hover:border-emerald-500 transition-colors group cursor-pointer" onClick={() => setMode('online')}>
            <h2 className="text-2xl font-bold mb-4 group-hover:text-emerald-300">ONLINE CO-OP</h2>
            <p className="mb-8 text-center text-emerald-600 flex-grow">Create a room and invite a remote friend.</p>
            <button className="w-full py-4 border-2 border-emerald-600 hover:bg-emerald-600 hover:text-slate-950 text-emerald-500 font-bold text-xl rounded transition-colors">
              PLAY ONLINE
            </button>
          </div>
          
          {/* Scoreboard */}
          <div className="flex-1 bg-slate-900 border-2 border-emerald-900 p-8 rounded-lg flex flex-col items-center justify-between hover:border-emerald-500 transition-colors group cursor-pointer" onClick={() => setMode('scoreboard')}>
            <h2 className="text-2xl font-bold mb-4 group-hover:text-emerald-300">SCOREBOARD</h2>
            <p className="mb-8 text-center text-emerald-600 flex-grow">View totals across sessions.</p>
            <button className="w-full py-4 border-2 border-emerald-600 hover:bg-emerald-600 hover:text-slate-950 text-emerald-500 font-bold text-xl rounded transition-colors">
              VIEW SCOREBOARD
            </button>
          </div>
        </div>
      </main>
    );
  }

  // 2. LOCAL GAME VIEW
  if (mode === 'local' && localGameState) {
    return (
      <div className="relative">
         <button onClick={() => setMode('menu')} className="absolute top-4 left-4 z-50 text-emerald-600 hover:text-emerald-400 font-bold border border-emerald-800 px-4 py-2 rounded bg-slate-900">
            &lt; BACK TO GAME MODE
         </button>
         <GameBoard 
            gameState={localGameState}
            myRole={null} // Not used in local mode
            localMode={true}
            onDraw={handleLocalDraw}
            onNextRound={handleLocalNextRound}
            onRestart={handleLocalRestart}
            onBonusPickP1={handleLocalBonusPickP1}
            onBonusPickP2={handleLocalBonusPickP2}
            onSetNameP1={setLocalNameP1}
            onSetNameP2={setLocalNameP2}
         />
      </div>
    );
  }

  // 3. ONLINE LOBBY / GAME VIEW
  if (mode === 'online') {
    // Lobby
    if (!roomCode || !onlineGameState) {
      return (
        <main className="min-h-screen bg-slate-950 text-emerald-400 font-mono p-4 flex flex-col items-center justify-center relative">
          <button onClick={() => setMode('menu')} className="absolute top-4 left-4 text-emerald-600 hover:text-emerald-400 font-bold border border-emerald-800 px-4 py-2 rounded bg-slate-900">
            &lt; BACK TO GAME MODE
          </button>

          <h1 className="text-6xl font-bold tracking-widest text-emerald-500 mb-4">ONLINE LOBBY</h1>
          
          <div className="flex flex-col md:flex-row gap-8 w-full max-w-4xl mx-auto">
            {/* Create Room */}
            <div className="flex-1 bg-slate-900 border-2 border-emerald-900 p-8 rounded-lg flex flex-col items-center hover:border-emerald-500 transition-colors">
              <h2 className="text-2xl font-bold mb-4">NEW GAME</h2>
              <button 
                onClick={createGame}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xl rounded transition-colors"
              >
                CREATE ROOM
              </button>
            </div>

            {/* Join Room */}
            <div className="flex-1 bg-slate-900 border-2 border-emerald-900 p-8 rounded-lg flex flex-col items-center hover:border-emerald-500 transition-colors">
              <h2 className="text-2xl font-bold mb-4">JOIN GAME</h2>
              <input 
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                placeholder="A1B2C3"
                maxLength={6}
                className="w-full bg-slate-950 border border-emerald-700 p-4 text-center text-2xl font-bold tracking-widest mb-4 focus:outline-none focus:border-emerald-400 rounded"
              />
              {(joinError || localJoinError) && <p className="text-red-500 mb-4">{joinError || localJoinError}</p>}
              <button 
                onClick={handleJoinClick}
                className="w-full py-4 border-2 border-emerald-600 hover:bg-emerald-600 hover:text-slate-950 text-emerald-500 font-bold text-xl rounded transition-colors"
              >
                JOIN ROOM
              </button>
            </div>
          </div>
        </main>
      );
    }

    // Online Game
    return (
      <div className="relative">
         <button onClick={() => { leaveGame(); setMode('menu'); }} className="absolute top-4 left-4 z-50 text-emerald-600 hover:text-emerald-400 font-bold border border-emerald-800 px-4 py-2 rounded bg-slate-900">
            &lt; LEAVE GAME
         </button>
         <GameBoard 
            gameState={onlineGameState}
            myRole={myRole}
            localMode={false}
            onDraw={handleOnlineDraw}
            onNextRound={handleOnlineNextRound}
            onRestart={handleOnlineRestart}
            onBonusPickP1={handleOnlineBonusPick}
            onBonusPickP2={handleOnlineBonusPick}
            onSetNameP1={setOnlineNameP1}
            onSetNameP2={setOnlineNameP2}
            roomCode={roomCode}
         />
      </div>
    );
  }

  if (mode === 'scoreboard') {
    const sb = loadScoreboard();
    const entries = Object.entries(sb).sort((a,b) => b[1].gamesWon - a[1].gamesWon);
    return (
      <main className="min-h-screen bg-slate-950 text-emerald-400 font-mono p-8">
        <button onClick={() => setMode('menu')} className="mb-8 text-emerald-600 hover:text-emerald-400 font-bold border border-emerald-800 px-4 py-2 rounded bg-slate-900">
          &lt; BACK TO GAME MODE
        </button>
        <h1 className="text-4xl font-bold mb-6 text-emerald-500">SCOREBOARD</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {entries.map(([name, s]) => (
            <div key={name} className="bg-slate-900 border border-emerald-800 p-4 rounded">
              <div className="text-xl font-bold text-white mb-2">{name}</div>
              <div className="text-sm text-emerald-400">
                <div>Games Won: {s.gamesWon}</div>
                <div>Rounds Won: {s.roundsWon}</div>
                <div>Overkills: {s.overkills}</div>
                <div>Tie-break Wins: {s.tieBreakWins}</div>
                <div>Bonus Picks: {s.bonusPicks}</div>
              </div>
            </div>
          ))}
          {entries.length === 0 && (
            <div className="text-emerald-600">No games recorded yet.</div>
          )}
        </div>
      </main>
    );
  }
  return null;
}
