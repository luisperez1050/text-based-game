import { useState, useEffect, useRef, useCallback } from 'react';
import type { Peer, DataConnection } from 'peerjs';
import { GameState, Pokemon } from '../types';
import pokemonDataRaw from '../data/pokemon.json';

const pokemonData = pokemonDataRaw as Pokemon[];

// Helper to generate a random 6-character code
const generateRoomCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Initial State Factory
const createInitialGameState = (): GameState => ({
  status: 'WAITING',
  round: 1,
  totalRounds: 12,
  scores: { p1: 0, p2: 0 },
  p1Card: null,
  p2Card: null,
  currentTurn: 'p1',
  roundWinner: null,
  logs: ['Waiting for players...'],
  players: { p1: true, p2: false }
});

type PeerGameHook = {
  gameState: GameState | null;
  myRole: 'p1' | 'p2' | null;
  roomCode: string | null;
  isConnected: boolean;
  error: string;
  createGame: () => void;
  joinGame: (code: string) => void;
  drawCard: () => void;
  nextRound: () => void;
  restartGame: () => void;
  leaveGame: () => void;
};

export const usePeerGame = (): PeerGameHook => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myRole, setMyRole] = useState<'p1' | 'p2' | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState('');

  // Refs to hold mutable instances
  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null);
  const gameStateRef = useRef<GameState | null>(null); // For Host to access latest state in callbacks

  // Sync ref with state
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      leaveGame();
    };
  }, []);

  const leaveGame = useCallback(() => {
    if (connRef.current) {
      connRef.current.close();
      connRef.current = null;
    }
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    setGameState(null);
    setMyRole(null);
    setRoomCode(null);
    setIsConnected(false);
    setError('');
  }, []);

  // --- HOST LOGIC (Player 1) ---
  const createGame = useCallback(async () => {
    leaveGame();
    const code = generateRoomCode();
    setRoomCode(code);
    setMyRole('p1');
    setError('');

    // Initialize Game State
    const initialState = createInitialGameState();
    setGameState(initialState);

    // Create Peer with custom ID based on code
    // We use a prefix to avoid collisions with other PeerJS users
    const peerId = `poke-battle-${code}`;
    
    try {
      const { Peer } = await import('peerjs');
      const peer = new Peer(peerId);
      peerRef.current = peer;

      peer.on('open', (id) => {
        console.log('Host Peer Open:', id);
        setIsConnected(true);
      });

      peer.on('error', (err) => {
        console.error('Peer Error:', err);
        setError(`Connection Error: ${err.type}`);
      });

      peer.on('connection', (conn) => {
        console.log('Host: Player 2 connected');
        connRef.current = conn;
        
        // Update state to show P2 connected
        setGameState(prev => {
          if (!prev) return null;
          const newState = { 
            ...prev, 
            players: { ...prev.players, p2: true },
            status: 'PLAYING' as const
          };
          newState.logs = ['Player 2 joined!', ...newState.logs].slice(0, 5);
          
          // Send initial state to P2
          conn.send({ type: 'UPDATE', state: newState });
          return newState;
        });

        conn.on('data', (data: any) => {
          handleHostMessage(data, conn);
        });

        conn.on('close', () => {
          console.log('Host: Player 2 disconnected');
          setGameState(prev => {
            if (!prev) return null;
            const newState = { 
              ...prev, 
              players: { ...prev.players, p2: false },
              status: 'WAITING' as const
            };
            newState.logs = ['Player 2 disconnected', ...newState.logs].slice(0, 5);
            return newState;
          });
          connRef.current = null;
        });
      });
    } catch (e) {
      console.error('Failed to load PeerJS', e);
      setError('Failed to load multiplayer module');
    }
  }, [leaveGame]);

  // Central Logic Processor (Runs on Host)
  const handleHostMessage = (message: any, conn: DataConnection) => {
    const currentState = gameStateRef.current;
    if (!currentState) return;

    let newState = { ...currentState };
    let shouldUpdate = false;

    if (message.type === 'DRAW') {
        // Verify turn
        if (newState.currentTurn === 'p2') {
            const randomPokemon = pokemonData[Math.floor(Math.random() * pokemonData.length)];
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
            shouldUpdate = true;
        }
    } else if (message.type === 'NEXT_ROUND') {
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
        shouldUpdate = true;
    } else if (message.type === 'RESTART' && newState.status === 'GAME_OVER') {
        newState = createInitialGameState();
        newState.players.p2 = true; // Keep P2 connected
        newState.logs = ['Game Restarted!', ...newState.logs];
        shouldUpdate = true;
    }

    if (shouldUpdate) {
        setGameState(newState);
        conn.send({ type: 'UPDATE', state: newState });
    }
  };

  // Host Action Handlers
  const hostDraw = () => {
    const currentState = gameStateRef.current;
    if (!currentState || currentState.currentTurn !== 'p1') return;

    const newState = { ...currentState };
    const randomPokemon = pokemonData[Math.floor(Math.random() * pokemonData.length)];
    
    newState.p1Card = randomPokemon;
    newState.currentTurn = 'p2';
    newState.logs = [`Player 1 drew ${randomPokemon.name}!`, ...newState.logs].slice(0, 5);
    
    setGameState(newState);
    if (connRef.current) connRef.current.send({ type: 'UPDATE', state: newState });
  };

  const hostNextRound = () => {
    const currentState = gameStateRef.current;
    if (!currentState) return;
    
    const newState = { ...currentState };
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

    setGameState(newState);
    if (connRef.current) connRef.current.send({ type: 'UPDATE', state: newState });
  };

  const hostRestart = () => {
    const newState = createInitialGameState();
    // Maintain P2 connection status if they are still there
    newState.players.p2 = !!connRef.current;
    newState.logs = ['Game Restarted!', ...newState.logs];

    setGameState(newState);
    if (connRef.current) connRef.current.send({ type: 'UPDATE', state: newState });
  };


  // --- GUEST LOGIC (Player 2) ---
  const joinGame = useCallback(async (code: string) => {
    leaveGame();
    setRoomCode(code);
    setMyRole('p2');
    setError('');

    // Create Guest Peer (ID auto-generated)
    try {
      const { Peer } = await import('peerjs');
      const peer = new Peer();
      peerRef.current = peer;

      peer.on('open', () => {
        console.log('Guest Peer Open');
        // Connect to Host
        const hostId = `poke-battle-${code}`;
        const conn = peer.connect(hostId);
        connRef.current = conn;

        conn.on('open', () => {
          console.log('Connected to Host');
          setIsConnected(true);
        });

        conn.on('data', (data: any) => {
          if (data.type === 'UPDATE') {
            setGameState(data.state);
          }
        });

        conn.on('close', () => {
          setError('Host disconnected');
          setIsConnected(false);
        });

        conn.on('error', (err) => {
            console.error('Connection Error:', err);
            setError('Could not connect to room. Check code.');
        });
      });

      peer.on('error', (err) => {
          console.error('Peer Error:', err);
          setError(`Connection Error: ${err.type}`);
      });
    } catch (e) {
      console.error('Failed to load PeerJS', e);
      setError('Failed to load multiplayer module');
    }
  }, [leaveGame]);

  // Guest Action Handlers (Send requests to Host)
  const guestDraw = () => {
    if (connRef.current) connRef.current.send({ type: 'DRAW' });
  };
  
  // Note: Usually only Host controls next round/restart, but we can allow Guest to request it if we want.
  // For now, let's say only Host controls flow buttons (Next Round, Restart), 
  // OR we send requests. The UI currently shows Next Round/Restart to both.
  // Let's implement Guest requests for these too to keep it symmetric.
  
  const guestNextRound = () => {
     // For simplicity, let's make Next Round auto-synced or Host-driven.
     // But if the UI shows the button to the Winner, and P2 wins, P2 needs to be able to click it.
     // Wait, the UI logic in GameBoard shows the button to *everyone*?
     // Actually GameBoard: onClick={onNextRound}.
     // Let's allow Guest to trigger it via message.
     // BUT, the current Host Logic doesn't handle NEXT_ROUND message. 
     // I should add it if I want P2 to be able to click it.
     // However, simpler is: Only Host can click "Next Round" or "Restart".
     // Or, let's update Host Logic to accept these commands.
  };
  
  // Actually, to avoid complexity, let's just send the message.
  // But I need to update handleHostMessage above.
  // Let's update handleHostMessage to handle NEXT_ROUND and RESTART from P2.

  // --- PUBLIC API ---
  const drawCard = () => {
    if (myRole === 'p1') hostDraw();
    else guestDraw();
  };

  const nextRound = () => {
    // Only Host executes logic, Guest sends request
    if (myRole === 'p1') hostNextRound();
    else if (connRef.current) connRef.current.send({ type: 'NEXT_ROUND' });
  };

  const restartGame = () => {
    if (myRole === 'p1') hostRestart();
    else if (connRef.current) connRef.current.send({ type: 'RESTART' });
  };

  return {
    gameState,
    myRole,
    roomCode,
    isConnected,
    error,
    createGame,
    joinGame,
    drawCard,
    nextRound,
    restartGame,
    leaveGame
  };
};
