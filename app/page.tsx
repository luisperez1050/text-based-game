'use client';

import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import GameBoard from './components/GameBoard';
import { GameState, Pokemon } from './types';
import pokemonDataRaw from './data/pokemon.json';

const pokemonData = pokemonDataRaw as Pokemon[];

let socket: Socket | null = null;

export default function Home() {
  const [mode, setMode] = useState<'menu' | 'local' | 'online'>('menu');
  
  // --- ONLINE STATE ---
  const [onlineGameState, setOnlineGameState] = useState<GameState | null>(null);
  const [myRole, setMyRole] = useState<'p1' | 'p2' | 'spectator' | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [inputCode, setInputCode] = useState('');
  const [joinError, setJoinError] = useState('');

  // --- LOCAL STATE ---
  const [localGameState, setLocalGameState] = useState<GameState | null>(null);

  // --- SOCKET EFFECT ---
  useEffect(() => {
    if (mode !== 'online') {
      if (socket) {
        socket.disconnect();
        socket = null;
      }
      return;
    }

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
    });

    socket.on('game_update', (newState: GameState) => {
      setOnlineGameState(newState);
    });

    socket.on('error', (msg: string) => {
      setJoinError(msg);
    });

    return () => {
      if (socket) socket.disconnect();
    };
  }, [mode]);

  // --- ONLINE HANDLERS ---
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

  const handleOnlineDraw = () => {
    if (socket && myRole === onlineGameState?.currentTurn) {
      socket.emit('draw_card');
    }
  };

  const handleOnlineNextRound = () => {
    if (socket) socket.emit('next_round');
  };

  const handleOnlineRestart = () => {
    if (socket) socket.emit('restart_game');
  };

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
      players: { p1: true, p2: true }
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

      // Determine Winner
      const p1Power = newState.p1Card!.totalStats;
      const p2Power = newState.p2Card!.totalStats;

      if (p1Power > p2Power) {
        newState.roundWinner = 'p1';
        newState.scores.p1 += 1;
        newState.logs = ['Player 1 wins the round!', ...newState.logs].slice(0, 5);
      } else if (p2Power > p1Power) {
        newState.roundWinner = 'p2';
        newState.scores.p2 += 1;
        newState.logs = ['Player 2 wins the round!', ...newState.logs].slice(0, 5);
      } else {
        newState.roundWinner = 'draw';
        newState.logs = ['It\'s a draw!', ...newState.logs].slice(0, 5);
      }

      newState.status = 'ROUND_RESULT';
    }

    setLocalGameState(newState);
  };

  const handleLocalNextRound = () => {
    if (!localGameState) return;
    
    const newState = { ...localGameState };
    
    if (newState.round >= newState.totalRounds) {
      newState.status = 'GAME_OVER';
      newState.logs = ['Game Over!', ...newState.logs].slice(0, 5);
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

  const handleLocalRestart = () => {
    startLocalGame();
  };

  // --- RENDER ---

  // 1. MENU VIEW
  if (mode === 'menu') {
    return (
      <main className="min-h-screen bg-slate-950 text-emerald-400 font-mono p-4 flex flex-col items-center justify-center">
        <h1 className="text-6xl font-bold tracking-widest text-emerald-500 mb-4">POKÉ-BATTLE</h1>
        <p className="text-xl text-emerald-700 mb-12">Choose Your Game Mode</p>
        
        <div className="flex flex-col md:flex-row gap-8 w-full max-w-4xl">
          {/* Local Mode */}
          <div className="flex-1 bg-slate-900 border-2 border-emerald-900 p-8 rounded-lg flex flex-col items-center hover:border-emerald-500 transition-colors group cursor-pointer" onClick={startLocalGame}>
            <h2 className="text-2xl font-bold mb-4 group-hover:text-emerald-300">LOCAL CO-OP</h2>
            <p className="mb-8 text-center text-emerald-600">Play with a friend on the same device.</p>
            <button className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xl rounded transition-colors">
              PLAY LOCAL
            </button>
          </div>

          {/* Online Mode */}
          <div className="flex-1 bg-slate-900 border-2 border-emerald-900 p-8 rounded-lg flex flex-col items-center hover:border-emerald-500 transition-colors group cursor-pointer" onClick={() => setMode('online')}>
            <h2 className="text-2xl font-bold mb-4 group-hover:text-emerald-300">ONLINE MULTIPLAYER</h2>
            <p className="mb-8 text-center text-emerald-600">Create a room and invite a remote friend.</p>
            <button className="w-full py-4 border-2 border-emerald-600 hover:bg-emerald-600 hover:text-slate-950 text-emerald-500 font-bold text-xl rounded transition-colors">
              PLAY ONLINE
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
            &lt; BACK TO MENU
         </button>
         <GameBoard 
            gameState={localGameState}
            myRole={null} // Not used in local mode
            localMode={true}
            onDraw={handleLocalDraw}
            onNextRound={handleLocalNextRound}
            onRestart={handleLocalRestart}
         />
      </div>
    );
  }

  // 3. ONLINE LOBBY / GAME VIEW
  if (mode === 'online') {
    if (!isConnected) {
      return (
        <main className="min-h-screen bg-slate-950 text-emerald-400 font-mono flex flex-col items-center justify-center">
          <div className="text-2xl animate-pulse mb-4">Connecting to Game Server...</div>
          <button onClick={() => setMode('menu')} className="text-emerald-600 hover:text-emerald-400 underline">
            Cancel
          </button>
        </main>
      );
    }

    // Lobby
    if (!roomCode || !onlineGameState) {
      return (
        <main className="min-h-screen bg-slate-950 text-emerald-400 font-mono p-4 flex flex-col items-center justify-center relative">
          <button onClick={() => setMode('menu')} className="absolute top-4 left-4 text-emerald-600 hover:text-emerald-400 font-bold border border-emerald-800 px-4 py-2 rounded bg-slate-900">
            &lt; BACK TO MENU
          </button>

          <h1 className="text-6xl font-bold tracking-widest text-emerald-500 mb-4">ONLINE LOBBY</h1>
          
          <div className="flex flex-col md:flex-row gap-8 w-full max-w-4xl">
            {/* Create Room */}
            <div className="flex-1 bg-slate-900 border-2 border-emerald-900 p-8 rounded-lg flex flex-col items-center hover:border-emerald-500 transition-colors">
              <h2 className="text-2xl font-bold mb-4">NEW GAME</h2>
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

    // Online Game
    return (
      <div className="relative">
         <button onClick={() => { setMode('menu'); socket?.disconnect(); }} className="absolute top-4 left-4 z-50 text-emerald-600 hover:text-emerald-400 font-bold border border-emerald-800 px-4 py-2 rounded bg-slate-900">
            &lt; LEAVE GAME
         </button>
         <GameBoard 
            gameState={onlineGameState}
            myRole={myRole}
            localMode={false}
            onDraw={handleOnlineDraw}
            onNextRound={handleOnlineNextRound}
            onRestart={handleOnlineRestart}
            roomCode={roomCode}
         />
      </div>
    );
  }

  return null;
}
