'use client';

import { GameState } from '../types';

type GameBoardProps = {
  gameState: GameState;
  myRole: 'p1' | 'p2' | 'spectator' | null;
  localMode?: boolean;
  onDraw: () => void;
  onNextRound: () => void;
  onRestart: () => void;
  onBonusPickP1?: () => void;
  onBonusPickP2?: () => void;
  onSetNameP1?: (name: string) => void;
  onSetNameP2?: (name: string) => void;
  roomCode?: string | null;
};

export default function GameBoard({ 
  gameState, 
  myRole, 
  localMode = false, 
  onDraw, 
  onNextRound, 
  onRestart,
  onBonusPickP1,
  onBonusPickP2,
  onSetNameP1,
  onSetNameP2,
  roomCode 
}: GameBoardProps) {
  
  // Helper to determine if a button should be enabled
  const canDraw = (player: 'p1' | 'p2') => {
    if (gameState.status !== 'PLAYING') return false;
    if (gameState.currentTurn !== player) return false;
    // In local mode, we can always draw if it's our turn.
    // In online mode, we must also be the correct role.
    if (localMode) return true;
    return myRole === player;
  };

  const getButtonText = (player: 'p1' | 'p2') => {
    if (gameState.currentTurn !== player) return `WAITING FOR ${player.toUpperCase()}...`;
    if (localMode) return 'DRAW POKÉMON';
    return myRole === player ? 'DRAW POKÉMON' : `WAITING FOR ${player.toUpperCase()}...`;
  };

  return (
    <main className="min-h-screen bg-theme-bg-primary text-theme-text-primary font-mono p-4 pt-16 flex flex-col items-center w-full">
      {/* Header */}
      <header className="w-full max-w-4xl border-b-2 border-theme-border-secondary pb-4 mb-8 flex flex-col sm:flex-row sm:justify-between gap-4 sm:gap-6 items-start sm:items-end">
        <div>
          <h1 className="text-4xl font-bold tracking-widest text-theme-text-accent">POKÉ-BATTLE</h1>
          <div className="flex items-center gap-4">
            <p className="text-sm text-theme-text-secondary">{localMode ? 'Local Co-op' : 'Multiplayer Edition'}</p>
            {!localMode && roomCode && (
              <span className="bg-theme-button-bg px-2 py-1 rounded text-xs text-theme-button-text font-bold">ROOM: {roomCode}</span>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">
            {gameState.isTieBreak ? 'FINAL ROUND' : `ROUND ${gameState.round > gameState.totalRounds ? gameState.totalRounds : gameState.round}/${gameState.totalRounds}`}
          </div>
          <div className="flex gap-4 text-sm justify-end">
             <span>{gameState.names?.p1 ? gameState.names.p1 : 'P1'}: {gameState.scores.p1}</span>
             <span>{gameState.names?.p2 ? gameState.names.p2 : 'P2'}: {gameState.scores.p2}</span>
          </div>
          {!localMode && (
            <div className="mt-2 text-xs font-bold bg-theme-button-bg px-2 py-1 rounded inline-block text-theme-button-text">
              YOU ARE: {myRole === 'p1' ? 'PLAYER 1' : myRole === 'p2' ? 'PLAYER 2' : 'SPECTATOR'}
            </div>
          )}
        </div>
      </header>

      {/* Waiting Screen (Only for Online) */}
      {!localMode && gameState.status === 'WAITING' && (
        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl text-center">
          <div className="text-2xl mb-4 animate-pulse">WAITING FOR PLAYERS...</div>
          <p className="text-theme-text-secondary mb-8">Share this code with your friend:</p>
          <div className="text-6xl font-bold bg-theme-bg-secondary px-8 py-4 rounded border-2 border-dashed border-theme-text-accent mb-8 select-all">
            {roomCode}
          </div>
          <div className="w-full max-w-md p-4 border border-theme-border-secondary rounded bg-theme-bg-secondary">
             <div className="flex justify-between border-b border-theme-border-secondary pb-2 mb-2">
               <span>PLAYER 1</span>
               <span className={gameState.players.p1 ? 'text-theme-text-primary' : 'text-slate-600'}>
                 {gameState.players.p1 ? 'CONNECTED' : 'WAITING...'} {myRole === 'p1' && '(YOU)'}
               </span>
             </div>
             <div className="flex justify-between">
               <span>PLAYER 2</span>
               <span className={gameState.players.p2 ? 'text-theme-text-primary' : 'text-slate-500'}>
                 {gameState.players.p2 ? 'CONNECTED' : 'WAITING...'} {myRole === 'p2' && '(YOU)'}
               </span>
             </div>
          </div>
        </div>
      )}

      {/* Game Area */}
      {(localMode || gameState.status !== 'WAITING') && (
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Player 1 Area */}
          <div className={`border-2 ${gameState.currentTurn === 'p1' ? 'border-theme-text-primary shadow-[0_0_15px_rgb(var(--theme-text-primary)/0.3)]' : 'border-theme-border-primary'} bg-theme-bg-secondary p-6 rounded-lg min-h-[400px] flex flex-col items-center relative transition-all duration-300`}>
            <div className="absolute top-2 left-2 text-xs font-bold bg-theme-button-bg px-2 py-1 rounded text-theme-button-text">
              {gameState.names?.p1 ? gameState.names.p1 : 'PLAYER 1'} {(!localMode && myRole === 'p1') && '(YOU)'}
            </div>
            <div className="absolute top-2 left-40">
              <input
                type="text"
                maxLength={20}
                value={gameState.names?.p1 ?? ''}
                onChange={(e) => onSetNameP1 && onSetNameP1(e.target.value)}
                placeholder="Add name"
                className="bg-theme-bg-primary text-theme-text-primary text-xs px-2 py-1 rounded border border-theme-border-secondary"
              />
            </div>
            
            {gameState.p1Card ? (
              <div className="flex-1 flex flex-col items-center justify-center w-full animate-in fade-in zoom-in duration-300">
                <img src={gameState.p1Card.sprite} alt={gameState.p1Card.name} className="w-48 h-48 object-contain pixelated mb-4 drop-shadow-[0_0_10px_rgb(var(--theme-text-primary)/0.5)]" />
                <h2 className="text-2xl font-bold mb-2 uppercase">{gameState.p1Card.name}</h2>
                <div className="w-full bg-theme-bg-primary rounded p-4">
                  <div className="flex justify-between mb-2 border-b border-theme-border-secondary pb-2">
                    <span>TOTAL POWER</span>
                    <span className="font-bold text-xl text-theme-text-accent">{gameState.p1Card.totalStats}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-theme-text-secondary">
                     {gameState.p1Card.types.map((t: string) => <span key={t} className="uppercase bg-theme-border-primary px-1 rounded text-center text-theme-text-primary">{t}</span>)}
                  </div>
                </div>
              </div>
            ) : (
               <div className="flex-1 flex items-center justify-center opacity-20">
                 <div className="w-32 h-32 border-4 border-dashed border-theme-text-accent rounded-full flex items-center justify-center">?</div>
               </div>
            )}
  
            {gameState.status === 'PLAYING' && gameState.currentTurn === 'p1' && (
               <button 
                 onClick={onDraw}
                 disabled={!canDraw('p1')}
                 className={`mt-4 w-full py-4 ${canDraw('p1') ? 'bg-theme-button-bg hover:bg-theme-button-hover-bg text-theme-button-text cursor-pointer' : 'bg-theme-bg-primary text-slate-500 cursor-not-allowed'} font-bold text-xl uppercase tracking-wider rounded transition-colors`}
               >
                 {getButtonText('p1')}
               </button>
            )}
            {gameState.status === 'ROUND_RESULT' && gameState.roundWinner === 'p2' && gameState.bonusPickAvailable.p1 && (
              <button
                onClick={onBonusPickP1}
                className="mt-4 w-full py-3 border-2 border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-slate-950 font-bold text-sm uppercase rounded"
              >
                Bonus Pick
              </button>
            )}
          </div>
  
          {/* Player 2 Area */}
          <div className={`border-2 ${gameState.currentTurn === 'p2' ? 'border-theme-text-primary shadow-[0_0_15px_rgb(var(--theme-text-primary)/0.3)]' : 'border-theme-border-primary'} bg-theme-bg-secondary p-6 rounded-lg min-h-[400px] flex flex-col items-center relative transition-all duration-300`}>
            <div className="absolute top-2 right-2 text-xs font-bold bg-theme-button-bg px-2 py-1 rounded text-theme-button-text">
              {gameState.names?.p2 ? gameState.names.p2 : 'PLAYER 2'} {(!localMode && myRole === 'p2') && '(YOU)'}
            </div>
            <div className="absolute top-2 right-40">
              <input
                type="text"
                maxLength={20}
                value={gameState.names?.p2 ?? ''}
                onChange={(e) => onSetNameP2 && onSetNameP2(e.target.value)}
                placeholder="Add name"
                className="bg-theme-bg-primary text-theme-text-primary text-xs px-2 py-1 rounded border border-theme-border-secondary"
              />
            </div>
            
            {gameState.p2Card ? (
              <div className="flex-1 flex flex-col items-center justify-center w-full animate-in fade-in zoom-in duration-300">
                <img src={gameState.p2Card.sprite} alt={gameState.p2Card.name} className="w-48 h-48 object-contain pixelated mb-4 drop-shadow-[0_0_10px_rgb(var(--theme-text-primary)/0.5)]" />
                <h2 className="text-2xl font-bold mb-2 uppercase">{gameState.p2Card.name}</h2>
                <div className="w-full bg-theme-bg-primary rounded p-4">
                  <div className="flex justify-between mb-2 border-b border-theme-border-secondary pb-2">
                    <span>TOTAL POWER</span>
                    <span className="font-bold text-xl text-theme-text-accent">{gameState.p2Card.totalStats}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-theme-text-secondary">
                     {gameState.p2Card.types.map((t: string) => <span key={t} className="uppercase bg-theme-border-primary px-1 rounded text-center text-theme-text-primary">{t}</span>)}
                  </div>
                </div>
              </div>
            ) : (
               <div className="flex-1 flex items-center justify-center opacity-20">
                 <div className="w-32 h-32 border-4 border-dashed border-theme-text-accent rounded-full flex items-center justify-center">?</div>
               </div>
            )}
  
            {gameState.status === 'PLAYING' && gameState.currentTurn === 'p2' && (
               <button 
                 onClick={onDraw}
                 disabled={!canDraw('p2')}
                 className={`mt-4 w-full py-4 ${canDraw('p2') ? 'bg-theme-button-bg hover:bg-theme-button-hover-bg text-theme-button-text cursor-pointer' : 'bg-theme-bg-primary text-slate-500 cursor-not-allowed'} font-bold text-xl uppercase tracking-wider rounded transition-colors`}
               >
                 {getButtonText('p2')}
               </button>
            )}
            {gameState.status === 'ROUND_RESULT' && gameState.roundWinner === 'p1' && gameState.bonusPickAvailable.p2 && (
              <button
                onClick={onBonusPickP2}
                className="mt-4 w-full py-3 border-2 border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-slate-950 font-bold text-sm uppercase rounded"
              >
                Bonus Pick
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
              onClick={onNextRound}
              className="px-8 py-3 border-2 border-theme-button-bg text-theme-text-accent hover:bg-theme-button-bg hover:text-theme-button-text font-bold rounded uppercase transition-all"
            >
              Next Round &gt;
            </button>
          </div>
        )}

        {gameState.status === 'GAME_OVER' && (
          <div className="bg-theme-bg-secondary p-8 rounded-xl border-2 border-theme-text-accent">
            <h2 className="text-4xl font-bold mb-4 text-white">GAME OVER</h2>
            <p className="text-2xl mb-8">
              {gameState.scores.p1 > gameState.scores.p2 ? 'PLAYER 1 IS THE CHAMPION!' : 
               gameState.scores.p2 > gameState.scores.p1 ? 'PLAYER 2 IS THE CHAMPION!' : 
               'THE BATTLE ENDED IN A DRAW!'}
            </p>
            <button 
              onClick={onRestart}
              className="px-8 py-3 bg-theme-button-bg hover:bg-theme-button-hover-bg text-theme-button-text font-bold rounded uppercase"
            >
              Play Again
            </button>
          </div>
        )}
      </div>

      {/* Logs */}
      <div className="w-full max-w-4xl bg-theme-bg-primary border border-theme-border-primary p-4 rounded h-32 overflow-y-scroll font-mono text-sm opacity-70">
        {gameState.logs.map((log: string, i: number) => (
          <div key={i} className="mb-1 text-theme-text-secondary">&gt; {log}</div>
        ))}
      </div>
    </main>
  );
}
