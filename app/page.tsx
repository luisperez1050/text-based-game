'use client';

import { useState, useEffect } from 'react';
import pokemonData from './data/pokemon.json';

type Pokemon = {
  id: number;
  name: string;
  sprite: string;
  stats: {
    [key: string]: number;
  };
  totalStats: number;
  types: string[];
};

type GameState = 'START' | 'PLAYING' | 'ROUND_RESULT' | 'GAME_OVER';

export default function Home() {
  const [gameState, setGameState] = useState<GameState>('START');
  const [round, setRound] = useState(1);
  const [scores, setScores] = useState({ p1: 0, p2: 0 });
  const [p1Card, setP1Card] = useState<Pokemon | null>(null);
  const [p2Card, setP2Card] = useState<Pokemon | null>(null);
  const [currentTurn, setCurrentTurn] = useState<'p1' | 'p2' | null>(null);
  const [roundWinner, setRoundWinner] = useState<'p1' | 'p2' | 'draw' | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const TOTAL_ROUNDS = 12;

  const addLog = (msg: string) => {
    setLogs(prev => [msg, ...prev].slice(0, 5));
  };

  const startGame = () => {
    setGameState('PLAYING');
    setRound(1);
    setScores({ p1: 0, p2: 0 });
    setP1Card(null);
    setP2Card(null);
    setCurrentTurn('p1');
    setLogs(['Game started! Round 1/12']);
  };

  const drawCard = (player: 'p1' | 'p2') => {
    // Pick random pokemon
    const randomIndex = Math.floor(Math.random() * pokemonData.length);
    const pokemon = pokemonData[randomIndex] as Pokemon;

    if (player === 'p1') {
      setP1Card(pokemon);
      setCurrentTurn('p2');
      addLog(`Player 1 drew ${pokemon.name.toUpperCase()} (BST: ${pokemon.totalStats})`);
    } else {
      setP2Card(pokemon);
      setCurrentTurn(null);
      addLog(`Player 2 drew ${pokemon.name.toUpperCase()} (BST: ${pokemon.totalStats})`);
      resolveRound(p1Card!, pokemon);
    }
  };

  const resolveRound = (card1: Pokemon, card2: Pokemon) => {
    setGameState('ROUND_RESULT');
    
    let winner: 'p1' | 'p2' | 'draw' = 'draw';
    if (card1.totalStats > card2.totalStats) {
      winner = 'p1';
      setScores(prev => ({ ...prev, p1: prev.p1 + 1 }));
      addLog(`Round ${round} Winner: Player 1!`);
    } else if (card2.totalStats > card1.totalStats) {
      winner = 'p2';
      setScores(prev => ({ ...prev, p2: prev.p2 + 1 }));
      addLog(`Round ${round} Winner: Player 2!`);
    } else {
      addLog(`Round ${round} Draw!`);
    }
    setRoundWinner(winner);
  };

  const nextRound = () => {
    if (round >= TOTAL_ROUNDS) {
      setGameState('GAME_OVER');
      addLog('Game Over!');
    } else {
      setRound(prev => prev + 1);
      setP1Card(null);
      setP2Card(null);
      setRoundWinner(null);
      setCurrentTurn('p1');
      setGameState('PLAYING');
      addLog(`Round ${round + 1}/${TOTAL_ROUNDS}`);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-emerald-400 font-mono p-4 flex flex-col items-center">
      {/* Header */}
      <header className="w-full max-w-4xl border-b-2 border-emerald-800 pb-4 mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold tracking-widest text-emerald-500">POKÉ-BATTLE</h1>
          <p className="text-sm text-emerald-700">Tactical Creature Combat Simulation</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">ROUND {round > TOTAL_ROUNDS ? TOTAL_ROUNDS : round}/{TOTAL_ROUNDS}</div>
          <div className="flex gap-4 text-sm">
             <span>P1 SCORE: {scores.p1}</span>
             <span>P2 SCORE: {scores.p2}</span>
          </div>
        </div>
      </header>

      {/* Game Area */}
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Player 1 Area */}
        <div className={`border-2 ${currentTurn === 'p1' ? 'border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.3)]' : 'border-emerald-900'} bg-slate-900 p-6 rounded-lg min-h-[400px] flex flex-col items-center relative transition-all duration-300`}>
          <div className="absolute top-2 left-2 text-xs font-bold bg-emerald-900 px-2 py-1 rounded">PLAYER 1</div>
          
          {p1Card ? (
            <div className="flex-1 flex flex-col items-center justify-center w-full animate-in fade-in zoom-in duration-300">
              <img src={p1Card.sprite} alt={p1Card.name} className="w-48 h-48 object-contain pixelated mb-4 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
              <h2 className="text-2xl font-bold mb-2 uppercase">{p1Card.name}</h2>
              <div className="w-full bg-slate-800 rounded p-4">
                <div className="flex justify-between mb-2 border-b border-emerald-800 pb-2">
                  <span>TOTAL POWER</span>
                  <span className="font-bold text-xl">{p1Card.totalStats}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-emerald-600">
                   {p1Card.types.map(t => <span key={t} className="uppercase bg-emerald-950 px-1 rounded text-center">{t}</span>)}
                </div>
              </div>
            </div>
          ) : (
             <div className="flex-1 flex items-center justify-center opacity-20">
               <div className="w-32 h-32 border-4 border-dashed border-emerald-500 rounded-full flex items-center justify-center">?</div>
             </div>
          )}

          {gameState === 'PLAYING' && currentTurn === 'p1' && (
             <button 
               onClick={() => drawCard('p1')}
               className="mt-4 w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xl uppercase tracking-wider rounded transition-colors"
             >
               DRAW POKÉMON
             </button>
          )}
        </div>

        {/* Player 2 Area */}
        <div className={`border-2 ${currentTurn === 'p2' ? 'border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.3)]' : 'border-emerald-900'} bg-slate-900 p-6 rounded-lg min-h-[400px] flex flex-col items-center relative transition-all duration-300`}>
          <div className="absolute top-2 right-2 text-xs font-bold bg-emerald-900 px-2 py-1 rounded">PLAYER 2</div>
          
          {p2Card ? (
            <div className="flex-1 flex flex-col items-center justify-center w-full animate-in fade-in zoom-in duration-300">
              <img src={p2Card.sprite} alt={p2Card.name} className="w-48 h-48 object-contain pixelated mb-4 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
              <h2 className="text-2xl font-bold mb-2 uppercase">{p2Card.name}</h2>
              <div className="w-full bg-slate-800 rounded p-4">
                <div className="flex justify-between mb-2 border-b border-emerald-800 pb-2">
                  <span>TOTAL POWER</span>
                  <span className="font-bold text-xl">{p2Card.totalStats}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-emerald-600">
                   {p2Card.types.map(t => <span key={t} className="uppercase bg-emerald-950 px-1 rounded text-center">{t}</span>)}
                </div>
              </div>
            </div>
          ) : (
             <div className="flex-1 flex items-center justify-center opacity-20">
               <div className="w-32 h-32 border-4 border-dashed border-emerald-500 rounded-full flex items-center justify-center">?</div>
             </div>
          )}

          {gameState === 'PLAYING' && currentTurn === 'p2' && (
             <button 
               onClick={() => drawCard('p2')}
               className="mt-4 w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xl uppercase tracking-wider rounded transition-colors"
             >
               DRAW POKÉMON
             </button>
          )}
        </div>
      </div>

      {/* Action/Status Area */}
      <div className="w-full max-w-2xl text-center mb-8">
        {gameState === 'START' && (
          <button 
            onClick={startGame}
            className="px-12 py-6 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-2xl font-bold rounded shadow-[0_0_20px_rgba(52,211,153,0.4)] animate-pulse"
          >
            START BATTLE
          </button>
        )}

        {gameState === 'ROUND_RESULT' && (
          <div className="animate-in slide-in-from-bottom duration-500">
            <h3 className="text-3xl font-bold mb-4 text-white">
              {roundWinner === 'draw' ? 'IT\'S A DRAW!' : 
               roundWinner === 'p1' ? 'PLAYER 1 WINS THE ROUND!' : 
               'PLAYER 2 WINS THE ROUND!'}
            </h3>
            <button 
              onClick={nextRound}
              className="px-8 py-3 border-2 border-emerald-500 text-emerald-500 hover:bg-emerald-500 hover:text-slate-950 font-bold rounded uppercase transition-all"
            >
              Next Round &gt;
            </button>
          </div>
        )}

        {gameState === 'GAME_OVER' && (
          <div className="bg-slate-900 p-8 rounded-xl border-2 border-emerald-500">
            <h2 className="text-4xl font-bold mb-4 text-white">GAME OVER</h2>
            <p className="text-2xl mb-8">
              {scores.p1 > scores.p2 ? 'PLAYER 1 IS THE CHAMPION!' : 
               scores.p2 > scores.p1 ? 'PLAYER 2 IS THE CHAMPION!' : 
               'THE BATTLE ENDED IN A DRAW!'}
            </p>
            <button 
              onClick={startGame}
              className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded uppercase"
            >
              Play Again
            </button>
          </div>
        )}
      </div>

      {/* Logs */}
      <div className="w-full max-w-4xl bg-black border border-emerald-900 p-4 rounded h-32 overflow-hidden font-mono text-sm opacity-70">
        {logs.map((log, i) => (
          <div key={i} className="mb-1 text-emerald-600">&gt; {log}</div>
        ))}
      </div>
    </main>
  );
}
