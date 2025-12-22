'use client';

import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

type Pokemon = {
  id: number;
  name: string;
  sprite: string;
  stats: { [key: string]: number };
  totalStats: number;
  types: string[];
};

type GameState = {
  status: 'WAITING' | 'PLAYING' | 'ROUND_RESULT' | 'GAME_OVER';
  round: number;
  totalRounds: number;
  scores: { p1: number; p2: number };
  p1Card: Pokemon | null;
  p2Card: Pokemon | null;
  currentTurn: 'p1' | 'p2' | null;
  roundWinner: 'p1' | 'p2' | 'draw' | null;
  logs: string[];
  players: { p1: boolean; p2: boolean }; // Only knowing if they exist is enough
};

let socket: Socket;

export default function Home() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myRole, setMyRole] = useState<'p1' | 'p2' | 'spectator' | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [inputCode, setInputCode] = useState('');
  const [joinError, setJoinError] = useState('');

  useEffect(() => {
    // In production, we need a real URL. 
    // For now, let's allow it to be configured via Env or fallback to localhost
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
    
    socket = io(socketUrl);

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to socket server');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from socket server');
    });

    socket.on('room_joined', ({ roomCode, role }) => {
      setRoomCode(roomCode);
      setMyRole(role);
      console.log(`Joined room ${roomCode} as ${role}`);
    });

    socket.on('game_update', (newState: GameState) => {
      setGameState(newState);
    });

    socket.on('error', (msg) => {
      setJoinError(msg);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const createRoom = () => {
    if (socket) socket.emit('create_room');
  };

  const joinRoom = () => {
    if (inputCode.length !== 6) {
      setJoinError('Code must be 6 characters');
      return;
    }
    setJoinError('');
    if (socket) socket.emit('join_room', inputCode);
  };

  const handleDraw = () => {
    if (socket && myRole === gameState?.currentTurn) {
      socket.emit('draw_card');
    }
  };

  const handleNextRound = () => {
    if (socket) socket.emit('next_round');
  };

  const handleRestart = () => {
    if (socket) socket.emit('restart_game');
  };

  if (!isConnected) {
    return (
      <main className="min-h-screen bg-slate-950 text-emerald-400 font-mono flex items-center justify-center">
        <div className="text-2xl animate-pulse">Connecting to Game Server...</div>
      </main>
    );
  }

  // LOBBY VIEW
  if (!roomCode || !gameState) {
    return (
      <main className="min-h-screen bg-slate-950 text-emerald-400 font-mono p-4 flex flex-col items-center justify-center">
        <h1 className="text-6xl font-bold tracking-widest text-emerald-500 mb-4">POKÉ-BATTLE</h1>
        <p className="text-xl text-emerald-700 mb-12">Multiplayer Tactical Combat</p>
        
        <div className="flex flex-col md:flex-row gap-8 w-full max-w-4xl">
          {/* Create Room */}
          <div className="flex-1 bg-slate-900 border-2 border-emerald-900 p-8 rounded-lg flex flex-col items-center hover:border-emerald-500 transition-colors">
            <h2 className="text-2xl font-bold mb-4">NEW GAME</h2>
            <p className="mb-8 text-center text-emerald-600">Start a fresh battle and invite a friend.</p>
            <button 
              onClick={createRoom}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xl rounded transition-colors"
            >
              CREATE ROOM
            </button>
          </div>

          {/* Join Room */}
          <div className="flex-1 bg-slate-900 border-2 border-emerald-900 p-8 rounded-lg flex flex-col items-center hover:border-emerald-500 transition-colors">
            <h2 className="text-2xl font-bold mb-4">JOIN GAME</h2>
            <p className="mb-4 text-center text-emerald-600">Enter the 6-character room code.</p>
            <input 
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              placeholder="A1B2C3"
              maxLength={6}
              className="w-full bg-slate-950 border border-emerald-700 p-4 text-center text-2xl font-bold tracking-widest mb-4 focus:outline-none focus:border-emerald-400 rounded"
            />
            {joinError && <p className="text-red-500 mb-4">{joinError}</p>}
            <button 
              onClick={joinRoom}
              className="w-full py-4 border-2 border-emerald-600 hover:bg-emerald-600 hover:text-slate-950 text-emerald-500 font-bold text-xl rounded transition-colors"
            >
              JOIN ROOM
            </button>
          </div>
        </div>
      </main>
    );
  }

  // GAME VIEW
  return (
    <main className="min-h-screen bg-slate-950 text-emerald-400 font-mono p-4 flex flex-col items-center">
      {/* Header */}
      <header className="w-full max-w-4xl border-b-2 border-emerald-800 pb-4 mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold tracking-widest text-emerald-500">POKÉ-BATTLE</h1>
          <div className="flex items-center gap-4">
            <p className="text-sm text-emerald-700">Multiplayer Edition</p>
            <span className="bg-emerald-900 px-2 py-1 rounded text-xs text-white font-bold">ROOM: {roomCode}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">ROUND {gameState.round > gameState.totalRounds ? gameState.totalRounds : gameState.round}/{gameState.totalRounds}</div>
          <div className="flex gap-4 text-sm justify-end">
             <span>P1: {gameState.scores.p1}</span>
             <span>P2: {gameState.scores.p2}</span>
          </div>
          <div className="mt-2 text-xs font-bold bg-emerald-900 px-2 py-1 rounded inline-block text-emerald-100">
            YOU ARE: {myRole === 'p1' ? 'PLAYER 1' : myRole === 'p2' ? 'PLAYER 2' : 'SPECTATOR'}
          </div>
        </div>
      </header>

      {/* Waiting Screen */}
      {gameState.status === 'WAITING' && (
        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl text-center">
          <div className="text-2xl mb-4 animate-pulse">WAITING FOR PLAYERS...</div>
          <p className="text-emerald-600 mb-8">Share this code with your friend:</p>
          <div className="text-6xl font-bold bg-slate-900 px-8 py-4 rounded border-2 border-dashed border-emerald-500 mb-8 select-all">
            {roomCode}
          </div>
          <div className="w-full max-w-md p-4 border border-emerald-800 rounded bg-slate-900">
             <div className="flex justify-between border-b border-emerald-800 pb-2 mb-2">
               <span>PLAYER 1</span>
               <span className={gameState.players.p1 ? 'text-green-400' : 'text-slate-600'}>
                 {gameState.players.p1 ? 'CONNECTED' : 'WAITING...'} {myRole === 'p1' && '(YOU)'}
               </span>
             </div>
             <div className="flex justify-between">
               <span>PLAYER 2</span>
               <span className={gameState.players.p2 ? 'text-green-400' : 'text-slate-600'}>
                 {gameState.players.p2 ? 'CONNECTED' : 'WAITING...'} {myRole === 'p2' && '(YOU)'}
               </span>
             </div>
          </div>
        </div>
      )}

      {/* Game Area */}
      {gameState.status !== 'WAITING' && (
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Player 1 Area */}
          <div className={`border-2 ${gameState.currentTurn === 'p1' ? 'border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.3)]' : 'border-emerald-900'} bg-slate-900 p-6 rounded-lg min-h-[400px] flex flex-col items-center relative transition-all duration-300`}>
            <div className="absolute top-2 left-2 text-xs font-bold bg-emerald-900 px-2 py-1 rounded">PLAYER 1 {myRole === 'p1' && '(YOU)'}</div>
            
            {gameState.p1Card ? (
              <div className="flex-1 flex flex-col items-center justify-center w-full animate-in fade-in zoom-in duration-300">
                <img src={gameState.p1Card.sprite} alt={gameState.p1Card.name} className="w-48 h-48 object-contain pixelated mb-4 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
                <h2 className="text-2xl font-bold mb-2 uppercase">{gameState.p1Card.name}</h2>
                <div className="w-full bg-slate-800 rounded p-4">
                  <div className="flex justify-between mb-2 border-b border-emerald-800 pb-2">
                    <span>TOTAL POWER</span>
                    <span className="font-bold text-xl">{gameState.p1Card.totalStats}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-emerald-600">
                     {gameState.p1Card.types.map((t: string) => <span key={t} className="uppercase bg-emerald-950 px-1 rounded text-center">{t}</span>)}
                  </div>
                </div>
              </div>
            ) : (
               <div className="flex-1 flex items-center justify-center opacity-20">
                 <div className="w-32 h-32 border-4 border-dashed border-emerald-500 rounded-full flex items-center justify-center">?</div>
               </div>
            )}
  
            {gameState.status === 'PLAYING' && gameState.currentTurn === 'p1' && (
               <button 
                 onClick={handleDraw}
                 disabled={myRole !== 'p1'}
                 className={`mt-4 w-full py-4 ${myRole === 'p1' ? 'bg-emerald-600 hover:bg-emerald-500 text-slate-950 cursor-pointer' : 'bg-slate-800 text-slate-500 cursor-not-allowed'} font-bold text-xl uppercase tracking-wider rounded transition-colors`}
               >
                 {myRole === 'p1' ? 'DRAW POKÉMON' : 'WAITING FOR P1...'}
               </button>
            )}
          </div>
  
          {/* Player 2 Area */}
          <div className={`border-2 ${gameState.currentTurn === 'p2' ? 'border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.3)]' : 'border-emerald-900'} bg-slate-900 p-6 rounded-lg min-h-[400px] flex flex-col items-center relative transition-all duration-300`}>
            <div className="absolute top-2 right-2 text-xs font-bold bg-emerald-900 px-2 py-1 rounded">PLAYER 2 {myRole === 'p2' && '(YOU)'}</div>
            
            {gameState.p2Card ? (
              <div className="flex-1 flex flex-col items-center justify-center w-full animate-in fade-in zoom-in duration-300">
                <img src={gameState.p2Card.sprite} alt={gameState.p2Card.name} className="w-48 h-48 object-contain pixelated mb-4 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
                <h2 className="text-2xl font-bold mb-2 uppercase">{gameState.p2Card.name}</h2>
                <div className="w-full bg-slate-800 rounded p-4">
                  <div className="flex justify-between mb-2 border-b border-emerald-800 pb-2">
                    <span>TOTAL POWER</span>
                    <span className="font-bold text-xl">{gameState.p2Card.totalStats}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-emerald-600">
                     {gameState.p2Card.types.map((t: string) => <span key={t} className="uppercase bg-emerald-950 px-1 rounded text-center">{t}</span>)}
                  </div>
                </div>
              </div>
            ) : (
               <div className="flex-1 flex items-center justify-center opacity-20">
                 <div className="w-32 h-32 border-4 border-dashed border-emerald-500 rounded-full flex items-center justify-center">?</div>
               </div>
            )}
  
            {gameState.status === 'PLAYING' && gameState.currentTurn === 'p2' && (
               <button 
                 onClick={handleDraw}
                 disabled={myRole !== 'p2'}
                 className={`mt-4 w-full py-4 ${myRole === 'p2' ? 'bg-emerald-600 hover:bg-emerald-500 text-slate-950 cursor-pointer' : 'bg-slate-800 text-slate-500 cursor-not-allowed'} font-bold text-xl uppercase tracking-wider rounded transition-colors`}
               >
                 {myRole === 'p2' ? 'DRAW POKÉMON' : 'WAITING FOR P2...'}
               </button>
            )}
          </div>
        </div>
      )}

      {/* Action/Status Area */}
      <div className="w-full max-w-2xl text-center mb-8">
        {gameState.status === 'ROUND_RESULT' && (
          <div className="animate-in slide-in-from-bottom duration-500">
            <h3 className="text-3xl font-bold mb-4 text-white">
              {gameState.roundWinner === 'draw' ? 'IT\'S A DRAW!' : 
               gameState.roundWinner === 'p1' ? 'PLAYER 1 WINS THE ROUND!' : 
               'PLAYER 2 WINS THE ROUND!'}
            </h3>
            <button 
              onClick={handleNextRound}
              className="px-8 py-3 border-2 border-emerald-500 text-emerald-500 hover:bg-emerald-500 hover:text-slate-950 font-bold rounded uppercase transition-all"
            >
              Next Round &gt;
            </button>
          </div>
        )}

        {gameState.status === 'GAME_OVER' && (
          <div className="bg-slate-900 p-8 rounded-xl border-2 border-emerald-500">
            <h2 className="text-4xl font-bold mb-4 text-white">GAME OVER</h2>
            <p className="text-2xl mb-8">
              {gameState.scores.p1 > gameState.scores.p2 ? 'PLAYER 1 IS THE CHAMPION!' : 
               gameState.scores.p2 > gameState.scores.p1 ? 'PLAYER 2 IS THE CHAMPION!' : 
               'THE BATTLE ENDED IN A DRAW!'}
            </p>
            <button 
              onClick={handleRestart}
              className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded uppercase"
            >
              Play Again
            </button>
          </div>
        )}
      </div>

      {/* Logs */}
      <div className="w-full max-w-4xl bg-black border border-emerald-900 p-4 rounded h-32 overflow-hidden font-mono text-sm opacity-70">
        {gameState.logs.map((log: string, i: number) => (
          <div key={i} className="mb-1 text-emerald-600">&gt; {log}</div>
        ))}
      </div>
    </main>
  );
}
