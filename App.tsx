import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Play, 
  Pause, 
  RotateCcw, 
  HelpCircle, 
  CheckCircle2, 
  XCircle, 
  Swords, 
  RefreshCw, 
  Info, 
  Timer, 
  ArrowRight, 
  ChevronRight,
  BookOpen,
  Award,
  BookMarked
} from 'lucide-react';
import { QUESTIONS_P1, QUESTIONS_P2 } from './data';
import { Player, GameStage, LetterStatus, Question } from './types';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playSfx(type: 'correct' | 'incorrect' | 'pass' | 'tick' | 'victory' | 'gameover') {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    switch (type) {
      case 'correct': {
        const freqs = [261.63, 329.63, 392.00, 523.25];
        freqs.forEach((freq, index) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + index * 0.08);
          gain.gain.setValueAtTime(0, now + index * 0.08);
          gain.gain.linearRampToValueAtTime(0.15, now + index * 0.08 + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.08 + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + index * 0.08);
          osc.stop(now + index * 0.08 + 0.35);
        });
        break;
      }
      case 'incorrect': {
        [0, 0.12].forEach((delay) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(120, now + delay);
          osc.frequency.linearRampToValueAtTime(80, now + delay + 0.1);
          gain.gain.setValueAtTime(0, now + delay);
          gain.gain.linearRampToValueAtTime(0.2, now + delay + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.11);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + delay);
          osc.stop(now + delay + 0.12);
        });
        break;
      }
      case 'pass': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(900, now + 0.18);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
        break;
      }
      case 'tick': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1000, now);
        gain.gain.setValueAtTime(0.03, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.04);
        break;
      }
      case 'victory': {
        const notes = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25];
        notes.forEach((freq, index) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + index * 0.12);
          gain.gain.setValueAtTime(0, now + index * 0.12);
          gain.gain.linearRampToValueAtTime(0.12, now + index * 0.12 + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.12 + 0.4);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + index * 0.12);
          osc.stop(now + index * 0.12 + 0.5);
        });
        break;
      }
      case 'gameover': {
        const notes = [329.63, 293.66, 261.63];
        notes.forEach((freq, index) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + index * 0.15);
          gain.gain.setValueAtTime(0, now + index * 0.15);
          gain.gain.linearRampToValueAtTime(0.12, now + index * 0.15 + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.15 + 0.6);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + index * 0.15);
          osc.stop(now + index * 0.15 + 0.7);
        });
        break;
      }
    }
  } catch (error) {
    console.warn('Audio synthesis failed or is blocked by user interaction settings:', error);
  }
}

export default function App() {
  // Game state
  const [stage, setStage] = useState<GameStage>('setup');
  const [activePlayer, setActivePlayer] = useState<1 | 2>(1);
  const [p1Name, setP1Name] = useState<string>('Jugador Azul');
  const [p2Name, setP2Name] = useState<string>('Jugador Naranja');
  const [durationParam, setDurationParam] = useState<number>(180); // seconds per player
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [view3D, setView3D] = useState<boolean>(true);
  const [paused, setPaused] = useState<boolean>(false);

  // Active inputs
  const [answerInput, setAnswerInput] = useState<string>('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'pass' | null; message: string }>({ type: null, message: '' });
  const [historyLog, setHistoryLog] = useState<string[]>([]);

  // AI Modal Explain state
  const [showAiModal, setShowAiModal] = useState<boolean>(false);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiExplanation, setAiExplanation] = useState<string>('');
  const [aiTargetQuestion, setAiTargetQuestion] = useState<Question | null>(null);

  // Players data
  const [player1, setPlayer1] = useState<Player>({
    id: 1,
    name: 'Azul',
    color: 'blue',
    score: 0,
    errors: 0,
    rosco: Object.fromEntries(QUESTIONS_P1.map((q) => [q.id, 'neutral' as LetterStatus])),
    currentIndex: 0,
    timeRemaining: 180,
    hasFinished: false,
  });

  const [player2, setPlayer2] = useState<Player>({
    id: 2,
    name: 'Naranja',
    color: 'orange',
    score: 0,
    errors: 0,
    rosco: Object.fromEntries(QUESTIONS_P2.map((q) => [q.id, 'neutral' as LetterStatus])),
    currentIndex: 0,
    timeRemaining: 180,
    hasFinished: false,
  });

  // Track the text input element for autofocus
  const inputRef = useRef<HTMLInputElement>(null);

  // Sound helper that respects user setting
  const triggerSfx = (type: 'correct' | 'incorrect' | 'pass' | 'tick' | 'victory' | 'gameover') => {
    if (soundEnabled) {
      playSfx(type);
    }
  };

  // Setup game
  const handleStartGame = () => {
    const p1: Player = {
      id: 1,
      name: p1Name.trim() || 'Jugador Azul',
      color: 'blue',
      score: 0,
      errors: 0,
      rosco: Object.fromEntries(QUESTIONS_P1.map((q) => [q.id, 'neutral' as LetterStatus])),
      currentIndex: 0,
      timeRemaining: durationParam,
      hasFinished: false,
    };

    const p2: Player = {
      id: 2,
      name: p2Name.trim() || 'Jugador Naranja',
      color: 'orange',
      score: 0,
      errors: 0,
      rosco: Object.fromEntries(QUESTIONS_P2.map((q) => [q.id, 'neutral' as LetterStatus])),
      currentIndex: 0,
      timeRemaining: durationParam,
      hasFinished: false,
    };

    setPlayer1(p1);
    setPlayer2(p2);
    setActivePlayer(1);
    setStage('playing');
    setPaused(false);
    setAnswerInput('');
    setFeedback({ type: null, message: '' });
    setHistoryLog([`Comienza la partida con ${p1.name} en el turno.`]);
    triggerSfx('pass');
  };

  // Get active player object
  const currentPlayer = activePlayer === 1 ? player1 : player2;
  const currentOpponent = activePlayer === 1 ? player2 : player1;

  const currentQuestions = activePlayer === 1 ? QUESTIONS_P1 : QUESTIONS_P2;
  const opponentQuestions = activePlayer === 1 ? QUESTIONS_P2 : QUESTIONS_P1;

  // Active question index selection
  const activeQuestionIndex = currentPlayer.currentIndex;
  const activeQuestion = currentQuestions[activeQuestionIndex];

  // Tick active player countdown timer
  useEffect(() => {
    if (stage !== 'playing' || paused || showAiModal) return;

    const timerInterval = setInterval(() => {
      // Find active player timers
      if (activePlayer === 1) {
        setPlayer1((prev) => {
          if (prev.timeRemaining <= 1) {
            clearInterval(timerInterval);
            triggerSfx('incorrect');
            handleTimeout(1);
            return { ...prev, timeRemaining: 0, hasFinished: true };
          }
          if (prev.timeRemaining <= 10 && prev.timeRemaining > 1) {
            triggerSfx('tick');
          }
          return { ...prev, timeRemaining: prev.timeRemaining - 1 };
        });
      } else {
        setPlayer2((prev) => {
          if (prev.timeRemaining <= 1) {
            clearInterval(timerInterval);
            triggerSfx('incorrect');
            handleTimeout(2);
            return { ...prev, timeRemaining: 0, hasFinished: true };
          }
          if (prev.timeRemaining <= 10 && prev.timeRemaining > 1) {
            triggerSfx('tick');
          }
          return { ...prev, timeRemaining: prev.timeRemaining - 1 };
        });
      }
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [stage, activePlayer, paused, showAiModal]);

  // Autofocus input box when turn swaps or question changes
  useEffect(() => {
    if (stage === 'playing' && !paused && !showAiModal) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [activePlayer, activeQuestionIndex, stage, paused, showAiModal]);

  // Auto-switch active player if the current active player has finished or has no time left
  useEffect(() => {
    if (stage !== 'playing') return;

    if (activePlayer === 1) {
      if (player1.hasFinished || player1.timeRemaining <= 0) {
        if (!player2.hasFinished && player2.timeRemaining > 0) {
          setActivePlayer(2);
          addHistory(`🔄 Cambio de jugador: Turno para ${player2.name} ya que ${player1.name} ha terminado de responder.`);
        } else {
          endGame();
        }
      }
    } else {
      if (player2.hasFinished || player2.timeRemaining <= 0) {
        endGame();
      }
    }
  }, [activePlayer, player1.hasFinished, player2.hasFinished, player1.timeRemaining, player2.timeRemaining, stage]);

  // Fallback if player runs out of time
  const handleTimeout = (pid: 1 | 2) => {
    const updatedName = pid === 1 ? player1.name : player2.name;
    addHistory(`⚠️ ¡A ${updatedName} se le ha agotado el tiempo!`);
    
    // Switch turn or end game
    if (pid === 1) {
      if (!player2.hasFinished && player2.timeRemaining > 0) {
        setActivePlayer(2);
      } else {
        endGame();
      }
    } else {
      endGame();
    }
  };

  // Find next unanswered letter index
  const findNextIndex = (rosco: Record<number, LetterStatus>, startIndex: number): number | null => {
    // Check from startIndex + 1 till end, wrapping around
    for (let offset = 1; offset <= 30; offset++) {
      const idx = (startIndex + offset) % 30;
      if (rosco[idx] === 'neutral') {
        return idx;
      }
    }
    return null;
  };

  // Record an event to audit trail log
  const addHistory = (text: string) => {
    setHistoryLog((prev) => [text, ...prev].slice(0, 30));
  };

  // Handle a guess/response submission
  const handleSubmitAnswer = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (paused || stage !== 'playing') return;

    const trimmedInput = answerInput.trim().toLowerCase();
    if (!trimmedInput) return;

    const correctAns = activeQuestion.answer.trim().toLowerCase();
    
    // Strict comparison
    let isCorrect = trimmedInput === correctAns;
    let accentWarn = false;

    // Accent-insensitive fallback matching for Spanish
    if (!isCorrect) {
      const normInput = trimmedInput.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const normCorrect = correctAns.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (normInput === normCorrect) {
        isCorrect = true;
        accentWarn = true;
      }
    }

    const pSetter = activePlayer === 1 ? setPlayer1 : setPlayer2;
    const playerActual = activePlayer === 1 ? player1 : player2;

    if (isCorrect) {
      triggerSfx('correct');
      if (accentWarn) {
        setFeedback({ type: 'success', message: `¡Correcto! Pero recuerda la tilde: "${activeQuestion.answer}"` });
      } else {
        setFeedback({ type: 'success', message: `¡Correcto! "${activeQuestion.answer}"` });
      }
      addHistory(`💚 ${playerActual.name} acertó la [${activeQuestion.letter}] con "${activeQuestion.answer}" (${activeQuestion.tense})`);

      pSetter((prev) => {
        const nextRosco = { ...prev.rosco, [activeQuestionIndex]: 'correct' as LetterStatus };
        const nextIdx = findNextIndex(nextRosco, activeQuestionIndex);

        if (nextIdx === null) {
          addHistory(`🏆 ¡${prev.name} ha terminado de responder a todo su Rosco!`);
          
          // Swap turn immediately if other player still active
          setTimeout(() => {
            swapTurn(prev.name, 'completar su Rosco');
          }, 300);

          return {
            ...prev,
            rosco: nextRosco,
            score: prev.score + 1,
            hasFinished: true,
          };
        }

        return {
          ...prev,
          rosco: nextRosco,
          score: prev.score + 1,
          currentIndex: nextIdx,
        };
      });

      // Same player continues turn. Just clear answer state.
      setAnswerInput('');
    } else {
      triggerSfx('incorrect');
      setFeedback({ type: 'error', message: `Incorrecto. Era "${activeQuestion.answer}"` });
      addHistory(`❤️ ${playerActual.name} falló la [${activeQuestion.letter}]: escribió "${answerInput}" (correcto: "${activeQuestion.answer}")`);

      pSetter((prev) => {
        const nextRosco = { ...prev.rosco, [activeQuestionIndex]: 'incorrect' as LetterStatus };
        const nextIdx = findNextIndex(nextRosco, activeQuestionIndex);

        if (nextIdx === null) {
          addHistory(`🏁 ¡${prev.name} ha completado su Rosco!`);
          
          // Swap turn immediately if other player still active
          setTimeout(() => {
            swapTurn(prev.name, 'completar su Rosco');
          }, 300);

          return {
            ...prev,
            rosco: nextRosco,
            errors: prev.errors + 1,
            hasFinished: true,
          };
        }

        return {
          ...prev,
          rosco: nextRosco,
          errors: prev.errors + 1,
          currentIndex: nextIdx,
        };
      });

      // Clear answer input and stay on turn
      setAnswerInput('');
    }

    // Reset feedback notice after 2.5 seconds
    setTimeout(() => {
      setFeedback((prev) => {
        if (prev.type !== 'pass') {
          return { type: null, message: '' };
        }
        return prev;
      });
    }, 2500);
  };

  // Perform "Pasapalabra" turn shift
  const handlePasapalabra = () => {
    if (paused || stage !== 'playing') return;

    triggerSfx('pass');
    const playerActual = activePlayer === 1 ? player1 : player2;

    // Shift index to the next, reserving the current 'neutral' state
    const nextIdx = findNextIndex(playerActual.rosco, activeQuestionIndex);

    const pSetter = activePlayer === 1 ? setPlayer1 : setPlayer2;
    pSetter((prev) => {
      if (nextIdx !== null) {
        return { ...prev, currentIndex: nextIdx };
      }
      return prev;
    });

    setAnswerInput('');
    setFeedback({ type: 'pass', message: `¡Pasapalabra para la letra ${activeQuestion.letter}! Siguiente pregunta.` });
    
    addHistory(`🔄 ${playerActual.name} pasó la palabra en la [${activeQuestion.letter}]. Sigue jugando.`);

    setTimeout(() => {
      setFeedback((prev) => (prev.type === 'pass' ? { type: null, message: '' } : prev));
    }, 2000);
  };

  // Swap turns between player 1 and 2
  const swapTurn = (leavingName: string, reason: string) => {
    addHistory(`🔄 Turno completado para ${leavingName}: ${reason}.`);
    
    // Check if the other player is available to take turn
    if (activePlayer === 1) {
      if (!player2.hasFinished && player2.timeRemaining > 0) {
        setActivePlayer(2);
      } else {
        endGame();
      }
    } else {
      endGame();
    }
  };

  // Monitor total game completion
  useEffect(() => {
    if (stage === 'playing') {
      const p1Done = player1.hasFinished || player1.timeRemaining <= 0;
      const p2Done = player2.hasFinished || player2.timeRemaining <= 0;

      // If everyone is fully answered or timed out, end game!
      if (p1Done && p2Done) {
        endGame();
      }
    }
  }, [player1.hasFinished, player2.hasFinished, player1.timeRemaining, player2.timeRemaining, stage]);

  const endGame = () => {
    setStage('gameover');
    triggerSfx('victory');
  };

  // Virtual keys accent handler for Spanish typists
  const handleInsertAccent = (char: string) => {
    setAnswerInput((prev) => prev + char);
    inputRef.current?.focus();
  };

  // Fetch grammatical explanation from Gemini API backend proxy
  const handleGetAiExplanation = async (q: Question) => {
    setAiTargetQuestion(q);
    setShowAiModal(true);
    setAiLoading(true);
    setAiExplanation('');

    try {
      const response = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verb: q.verb,
          pronoun: q.pronoun,
          tense: q.tense,
          question: q.definition,
          answer: q.answer,
          explanation: q.explanation
        })
      });

      if (!response.ok) {
        throw new Error('Servidor no responde');
      }

      const resJson = await response.json();
      setAiExplanation(resJson.explanation);
    } catch (error) {
      console.error(error);
      setAiExplanation(`**Aviso:** No se pudo conectar con el servidor IA. \n\n**Explicación predeterminada:** \n${q.explanation}`);
    } finally {
      setAiLoading(false);
    }
  };

  // Helper to color classes based on letter node status
  const getNodeColorClass = (status: LetterStatus, isActive: boolean, pColor: 'blue' | 'orange') => {
    if (isActive) {
      return pColor === 'blue' 
        ? 'bg-blue-600 text-white ring-4 ring-blue-300 ring-offset-2 ring-offset-slate-900 border-none scale-125 z-20 shadow-lg shadow-blue-500/50' 
        : 'bg-orange-600 text-white ring-4 ring-orange-300 ring-offset-2 ring-offset-slate-900 border-none scale-125 z-20 shadow-lg shadow-orange-500/50';
    }

    switch (status) {
      case 'correct':
        return 'bg-emerald-500 text-white border-none shadow-md shadow-emerald-500/30 scale-100';
      case 'incorrect':
        return 'bg-red-500 text-white border-none shadow-md shadow-red-500/30 scale-100';
      default:
        return 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700 font-medium scale-90';
    }
  };

  // Restart app entirely
  const handleResetApp = () => {
    setStage('setup');
    setPlayer1({
      id: 1,
      name: 'Azul',
      color: 'blue',
      score: 0,
      errors: 0,
      rosco: Object.fromEntries(QUESTIONS_P1.map((q) => [q.id, 'neutral' as LetterStatus])),
      currentIndex: 0,
      timeRemaining: 180,
      hasFinished: false,
    });
    setPlayer2({
      id: 2,
      name: 'Naranja',
      color: 'orange',
      score: 0,
      errors: 0,
      rosco: Object.fromEntries(QUESTIONS_P2.map((q) => [q.id, 'neutral' as LetterStatus])),
      currentIndex: 0,
      timeRemaining: 180,
      hasFinished: false,
    });
    setHistoryLog([]);
  };

  // Calculate winner label
  const getWinnerInfo = () => {
    if (player1.score > player2.score) {
      return { msg: `🏆 ¡Vuelve vencedor ${player1.name}!`, color: 'text-blue-400', p: player1 };
    } else if (player2.score > player1.score) {
      return { msg: `🏆 ¡Vuelve vencedor ${player2.name}!`, color: 'text-orange-400', p: player2 };
    } else {
      // Tie-breaker by errors count
      if (player1.errors < player2.errors) {
        return { msg: `🏆 ¡${player1.name} gana por menor cantidad de errores!`, color: 'text-blue-400', p: player1 };
      } else if (player2.errors < player1.errors) {
        return { msg: `🏆 ¡${player2.name} gana por menor cantidad de errores!`, color: 'text-orange-400', p: player2 };
      }
      return { msg: `🤝 ¡Partida extremadamente reñida! Empate técnico.`, color: 'text-yellow-400', p: null };
    }
  };

  return (
    <div className="absolute inset-0 overflow-x-hidden overflow-y-auto min-h-screen ambient-bg text-slate-100 flex flex-col font-sans" id="game_container">
      {/* Header bar */}
      <header className="w-full bg-slate-900/80 backdrop-blur-md border-b border-slate-800 py-3 px-6 flex justify-between items-center z-30 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-orange-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <span className="text-xl font-bold tracking-tight text-white select-none">P</span>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2 select-none">
              Pasapalabra <span className="text-xs bg-slate-800 text-emerald-400 font-mono px-2 py-0.5 rounded-full border border-emerald-500/30">Gramatológico</span>
            </h1>
            <p className="text-xs text-slate-400 select-none">Aprende los tiempos futuros del español jugando en parejas</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Sounds toggle */}
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-lg bg-slate-800/80 text-slate-300 hover:text-white transition-colors hover:bg-slate-700/80 border border-slate-700/50"
            title={soundEnabled ? 'Silenciar sonidos' : 'Habilitar sonidos'}
          >
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} className="text-red-400" />}
          </button>

          {/* Perspective toggle */}
          {stage === 'playing' && (
            <button 
              onClick={() => setView3D(!view3D)}
              className="px-3 py-1.5 rounded-lg bg-slate-800/80 text-xs text-slate-300 hover:text-white transition-colors hover:bg-slate-700/80 border border-slate-700/50 flex items-center gap-2 font-mono"
            >
              <RefreshCw size={14} className={view3D ? 'animate-spin-slow' : ''} />
              Modo: {view3D ? '3D' : '2D'}
            </button>
          )}

          {stage === 'playing' && (
            <button
              onClick={() => setPaused(!paused)}
              className={`p-2 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-mono border ${
                paused 
                  ? 'bg-amber-950/40 text-amber-300 border-amber-600/30' 
                  : 'bg-slate-800/80 text-slate-300 hover:text-white border-slate-700/50'
              }`}
            >
              {paused ? <Play size={14} /> : <Pause size={14} />}
              {paused ? 'Reanudar' : 'Pausar'}
            </button>
          )}

          {stage !== 'setup' && (
            <button 
              onClick={handleResetApp}
              className="p-2 rounded-lg bg-slate-800/80 text-slate-300 hover:text-red-400 transition-colors hover:bg-slate-700/80 border border-slate-700/50"
              title="Reiniciar todo"
            >
              <RotateCcw size={18} />
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-6 max-w-7xl w-full mx-auto z-10">
        
        {/* VIEW 1: SETUP PANEL */}
        <AnimatePresence mode="wait">
          {stage === 'setup' && (
            <motion.div 
              key="setup_view"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="w-full max-w-2xl bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden"
              id="setup_panel"
            >
              {/* Outer grid light accents */}
              <div className="absolute -top-12 -left-12 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl"></div>

              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-1.5 bg-slate-800/50 text-blue-400 text-xs tracking-wide uppercase px-3 py-1.5 rounded-full border border-blue-500/20 mb-3">
                  <Swords size={12} /> Duelo Gramatical de 2 Jugadores
                </div>
                <h2 className="text-3xl font-extrabold tracking-tight text-white mb-2">¡Prepara el Rosco de Futuro!</h2>
                <p className="text-sm text-slate-400 max-w-md mx-auto">
                  La mítica rueda de 30 preguntas basada en el popular concurso televisivo. Practica el <span className="text-blue-400">Futuro Simple</span> y el <span className="text-orange-400">Futuro Perfecto</span>.
                </p>
              </div>

              {/* Form details */}
              <div className="space-y-6">
                
                {/* Players input Names row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Player 1 Details */}
                  <div className="space-y-2 p-4 rounded-2xl bg-blue-950/10 border border-blue-900/30">
                    <label className="text-xs font-bold text-blue-400 tracking-wider uppercase block">Jugador 1 (Rosco Azul)</label>
                    <input 
                      type="text"
                      className="w-full p-3 rounded-xl bg-slate-950 border border-blue-800/40 text-slate-200 outline-none focus:border-blue-500 transition-colors focus:ring-1 focus:ring-blue-500/30 text-sm font-semibold"
                      placeholder="Escribe el nombre del primer jugador..."
                      value={p1Name}
                      onChange={(e) => setP1Name(e.target.value)}
                    />
                    <span className="text-[10px] text-slate-400 block italic">Se turnará en dirección horaria</span>
                  </div>

                  {/* Player 2 Details */}
                  <div className="space-y-2 p-4 rounded-2xl bg-orange-950/10 border border-orange-900/30">
                    <label className="text-xs font-bold text-orange-400 tracking-wider uppercase block">Jugador 2 (Rosco Naranja)</label>
                    <input 
                      type="text"
                      className="w-full p-3 rounded-xl bg-slate-950 border border-orange-850/40 text-slate-200 outline-none focus:border-orange-500 transition-colors focus:ring-1 focus:ring-orange-500/30 text-sm font-semibold"
                      placeholder="Escribe el nombre del segundo jugador..."
                      value={p2Name}
                      onChange={(e) => setP2Name(e.target.value)}
                    />
                    <span className="text-[10px] text-slate-400 block italic">Juega en simultáneo en rueda separada</span>
                  </div>
                </div>

                {/* Configuration Options grid */}
                <div className="bg-slate-950/50 p-5 rounded-2xl border border-slate-800 space-y-4">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                    <Timer size={14} className="text-emerald-400" /> Configuración de la Rueda
                  </h3>
                  
                  {/* Timer adjust */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Tiempo por Jugador:</span>
                      <span className="text-slate-200 font-mono font-medium">{durationParam} Segundos ({Math.floor(durationParam / 60)} min {durationParam % 60} s)</span>
                    </div>
                    <input 
                      type="range"
                      min="60"
                      max="300"
                      step="10"
                      value={durationParam}
                      onChange={(e) => setDurationParam(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>

                  {/* Educational clues quick tip */}
                  <div className="flex gap-3 bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
                    <Info size={22} className="text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-200 block">Reglas de Juego:</strong>
                      Cada jugador responde a todo su Rosco de manera continua y consecutiva. "Pasapalabra" salta a la siguiente letra sin perder el turno. Al finalizar ambos jugadores, se comparan sus aciertos y errores para declarar al ganador. El jugador posee las ayudas del corrector interactivo y puede solicitar análisis gramatical por Inteligencia Artificial (Gemini) en diferido presionando el botón de ayuda de cada pregunta.
                    </div>
                  </div>
                </div>

                {/* Start Action */}
                <button 
                  onClick={handleStartGame}
                  className="w-full bg-gradient-to-r from-blue-600 to-orange-600 hover:from-blue-500 hover:to-orange-500 text-white font-bold py-4 rounded-xl shadow-lg transition-transform hover:-translate-y-0.5 flex items-center justify-center gap-2 uppercase tracking-wider text-sm shadow-blue-505/20"
                >
                  <Sparkles size={16} className="animate-pulse" />
                  Iniciar Duelo Pasapalabra
                </button>
              </div>
            </motion.div>
          )}

          {/* VIEW 2: ACTIVE GAMEBOARD */}
          {stage === 'playing' && (
            <motion.div 
              key="playing_view"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
              id="gameboard_main"
            >
              
              {/* Left Column: Player Roscos Side by Side (or combined in 1 visual panel) */}
              <div className="lg:col-span-12 xl:col-span-7 bg-slate-900/40 p-4 md:p-6 border border-slate-800 rounded-3xl backdrop-blur-md flex flex-col items-center justify-center shadow-2xl relative overflow-hidden min-h-[500px]">
                
                {/* 3D Wheel Tilt Matrix backgrounds */}
                <div className="absolute top-0 left-0 text-[180px] font-extrabold text-slate-800/5 select-none font-mono">3D</div>
                
                {/* Combined HUD display of Score counters */}
                <div className="w-full grid grid-cols-2 gap-6 mb-8 relative z-20">
                  
                  {/* P1 Azul state card */}
                  <div className={`p-4 rounded-2xl border transition-all ${
                    activePlayer === 1 
                      ? 'bg-blue-950/20 border-blue-500 shadow-md shadow-blue-500/20' 
                      : 'bg-slate-950/40 border-slate-800/80 opacity-70'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full bg-blue-500 ${activePlayer === 1 && 'animate-ping'}`}></span>
                        <h3 className="text-sm font-bold text-blue-400 truncate max-w-[120px]">{player1.name}</h3>
                      </div>
                      <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-blue-900/20 text-blue-300 font-semibold">
                        P1 {player1.hasFinished && '✓'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-slate-900/50 p-1.5 rounded-lg border border-slate-850">
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Aciertos</div>
                        <div className="text-base font-black text-emerald-400 font-mono">{player1.score}</div>
                      </div>
                      <div className="bg-slate-900/50 p-1.5 rounded-lg border border-slate-850">
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Fallos</div>
                        <div className="text-base font-black text-red-400 font-mono">{player1.errors}</div>
                      </div>
                      <div className="bg-slate-900/50 p-1.5 rounded-lg border border-slate-850">
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Tiempo</div>
                        <div className="text-sm font-black text-slate-200 mt-0.5 font-mono">
                          {Math.floor(player1.timeRemaining / 60)}:{(player1.timeRemaining % 60).toString().padStart(2, '0')}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* P2 Naranja state card */}
                  <div className={`p-4 rounded-2xl border transition-all ${
                    activePlayer === 2 
                      ? 'bg-orange-950/20 border-orange-500 shadow-md shadow-orange-500/20' 
                      : 'bg-slate-950/40 border-slate-800/80 opacity-70'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full bg-orange-500 ${activePlayer === 2 && 'animate-ping'}`}></span>
                        <h3 className="text-sm font-bold text-orange-400 truncate max-w-[120px]">{player2.name}</h3>
                      </div>
                      <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-orange-900/20 text-orange-300 font-semibold">
                        P2 {player2.hasFinished && '✓'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-slate-900/50 p-1.5 rounded-lg border border-slate-850">
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Aciertos</div>
                        <div className="text-base font-black text-emerald-400 font-mono">{player2.score}</div>
                      </div>
                      <div className="bg-slate-900/50 p-1.5 rounded-lg border border-slate-850">
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Fallos</div>
                        <div className="text-base font-black text-red-400 font-mono">{player2.errors}</div>
                      </div>
                      <div className="bg-slate-900/50 p-1.5 rounded-lg border border-slate-850">
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Tiempo</div>
                        <div className="text-sm font-black text-slate-200 mt-0.5 font-mono">
                          {Math.floor(player2.timeRemaining / 60)}:{(player2.timeRemaining % 60).toString().padStart(2, '0')}
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* THE 3D / 2D WHEEL DISPLAY SPACE */}
                <div 
                  className={`relative w-full aspect-square max-w-[380px] md:max-w-[420px] flex items-center justify-center transition-all duration-700 ${
                    view3D ? 'perspective-1000' : ''
                  }`}
                  id="rosco_interaction_area"
                >
                  
                  {/* Outer Rings & Orbit helper decoration */}
                  <div className={`absolute inset-4 rounded-full border border-dashed border-slate-800/70 transition-transform duration-700 ${
                    view3D ? 'transform rotateX(55deg)' : ''
                  }`}></div>

                  <div className={`absolute inset-20 rounded-full border border-slate-850 transition-transform duration-700 ${
                    view3D ? 'transform rotateX(55deg)' : ''
                  }`}></div>

                  {/* Ring Container styled as 3D rotating disc depending on active index */}
                  <div 
                    className="w-full h-full relative transition-transform duration-[800ms] ease-out preserve-3d"
                    style={{
                      transform: view3D 
                        ? `rotateX(55deg) rotateZ(${-((currentPlayer.currentIndex) / 30) * 360}deg)` 
                        : 'none',
                    }}
                  >
                    
                    {/* Render corresponding 30 nodes */}
                    {currentQuestions.map((q, i) => {
                      const angle = (i / 30) * 360; // angular degree
                      const radians = (angle * Math.PI) / 180;
                      // Layout radius
                      const radius = 158; // px radius
                      
                      const x = radius * Math.cos(radians - Math.PI / 2);
                      const y = radius * Math.sin(radians - Math.PI / 2);

                      const status = currentPlayer.rosco[q.id] || 'neutral';
                      const isActive = currentPlayer.currentIndex === q.id;

                      return (
                        <div
                          key={`letter_node_${q.id}`}
                          onClick={() => {
                            if (paused) return;
                            // Only allow jumping to standard unanswered questions of current player
                            if (currentPlayer.rosco[q.id] === 'neutral') {
                              const pSetter = activePlayer === 1 ? setPlayer1 : setPlayer2;
                              pSetter(prev => ({ ...prev, currentIndex: q.id }));
                              triggerSfx('pass');
                            }
                          }}
                          className={`absolute w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-mono tracking-tight cursor-pointer cursor-hand select-none border letter-node ${
                            getNodeColorClass(status, isActive, currentPlayer.color)
                          }`}
                          style={{
                           left: `calc(50% + ${x}px - 16px)`,
                           top: `calc(50% + ${y}px - 16px)`,
                           transform: view3D 
                             // Keep nodes facing the user directly as billboard texts
                             ? `rotateZ(${(currentPlayer.currentIndex / 30) * 360}deg) rotateX(-55deg) scale(${isActive ? 1.25 : 0.95})`
                             : `scale(${isActive ? 1.25 : 1})`,
                           transition: 'all 0.5s ease-out',
                           // Add bright indicator border
                           boxShadow: isActive 
                             ? (currentPlayer.color === 'blue' ? '0 0 15px rgba(59,130,246,0.6)' : '0 0 15px rgba(249,115,22,0.6)') 
                             : 'none'
                          }}
                        >
                          <span className={`${isActive ? 'scale-110' : ''}`}>{q.letter}</span>
                        </div>
                      );
                    })}

                    {/* Central display label visible inside the donut */}
                    <div 
                      className="absolute inset-[30%] bg-slate-950/90 rounded-full border border-slate-800 flex flex-col items-center justify-center text-center p-3 z-0 backface-hidden preserve-3d shadow-xl"
                      style={{
                        transform: view3D ? `rotateX(-55deg) rotateZ(${(currentPlayer.currentIndex / 30) * 360}deg)` : 'none'
                      }}
                    >
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest block">LETRA ACTUAL</span>
                      <span className={`text-4xl font-extrabold tracking-tighter block select-none ${
                        currentPlayer.color === 'blue' ? 'text-blue-400' : 'text-orange-400'
                      }`}>
                        {activeQuestion?.letter}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-1 uppercase tracking-wide font-mono">
                        {activeQuestion?.tense.split(' ')[1] || 'Pasado'}
                      </span>
                    </div>

                  </div>

                </div>

                {/* Sub-note: showing other player inactive mini dot indicators */}
                <div className="mt-4 text-xs text-slate-400 flex items-center gap-3">
                  <span className="font-semibold block">Rosco de {currentOpponent.name}:</span>
                  <div className="flex gap-1 overflow-x-auto max-w-[280px] p-1 bg-slate-950/60 rounded-md border border-slate-800">
                    {opponentQuestions.map((q) => {
                      const status = currentOpponent.rosco[q.id] || 'neutral';
                      let dotColor = 'bg-slate-800';
                      if (status === 'correct') dotColor = 'bg-emerald-500';
                      if (status === 'incorrect') dotColor = 'bg-red-500';
                      
                      return (
                        <div 
                          key={`opp_dot_${q.id}`}
                          title={`${q.letter}`}
                          className={`w-1.5 h-1.5 rounded-full ${dotColor}`}
                        />
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Right Column: Turn Info, Text Input, Clues Panel */}
              <div className="lg:col-span-12 xl:col-span-5 flex flex-col gap-6">
                
                {/* Active Clue Panel */}
                <div 
                  className={`bg-slate-900/60 p-6 border rounded-3xl backdrop-blur-md relative overflow-hidden transition-all duration-300 ${
                    currentPlayer.color === 'blue' ? 'border-blue-900/40' : 'border-orange-950/40'
                  }`}
                  id="clues_box"
                >
                  <div className="absolute top-0 right-0 p-3 opacity-10">
                    <BookOpen size={92} className="text-slate-400" />
                  </div>

                  {/* Clue heading */}
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/80">
                    <span className={`text-xs font-mono font-bold uppercase tracking-widest ${
                      currentPlayer.color === 'blue' ? 'text-blue-400' : 'text-orange-400'
                    }`}>
                      {activeQuestion?.prefixType} "{activeQuestion?.letter}"
                    </span>

                    <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5 bg-slate-800/40 px-2.5 py-1 rounded-full border border-slate-750">
                      <BookMarked size={12} className="text-emerald-400" /> {activeQuestion?.tense}
                    </span>
                  </div>

                  {/* Prompt core clues: Infinitive, Pronoun, Definition */}
                  <div className="space-y-4 relative z-10 min-h-[140px]">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-850">
                        <span className="text-[10px] text-slate-500 font-bold uppercase block tracking-wider">Verbo Infinitivo</span>
                        <span className="text-sm font-bold text-slate-200 block italic leading-none mt-1">{activeQuestion?.verb}</span>
                      </div>
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-850">
                        <span className="text-[10px] text-slate-500 font-bold uppercase block tracking-wider">Pronombre Sujeto</span>
                        <span className="text-sm font-bold text-slate-200 block mt-1 leading-none">{activeQuestion?.pronoun}</span>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-850 lider-text space-y-3">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1.5 tracking-wider">Pista / Definición</span>
                        <p className="text-sm md:text-base text-slate-200 leading-relaxed font-normal">
                          {activeQuestion?.definition}
                        </p>
                      </div>
                      <div className="border-t border-slate-800/80 pt-2.5">
                        <span className="text-[10px] text-amber-400 font-bold uppercase block mb-1 tracking-wider flex items-center gap-1.5">
                          🇦🇲 Թարգմանություն
                        </span>
                        <p className="text-xs md:text-sm text-amber-200/90 leading-relaxed font-normal italic">
                          {activeQuestion?.translation}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Character visual tracker bar */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                    <span>Letras en palabra correcta: <strong className="text-slate-200 font-mono">{activeQuestion?.answer.replaceAll(' ', '').length}</strong></span>
                    <button 
                      onClick={() => handleGetAiExplanation(activeQuestion)}
                      className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1.5 hover:underline"
                    >
                      <Sparkles size={12} /> Explicación Gramática IA
                    </button>
                  </div>
                </div>

                {/* PAUSED MASK/STATE PANELS */}
                {paused ? (
                  <div className="bg-slate-950/80 p-6 border border-amber-500/30 rounded-3xl text-center space-y-4">
                    <p className="text-amber-400 text-sm font-bold">⏸️ PARTIDA EN PAUSA</p>
                    <p className="text-xs text-slate-400">Los cronómetros están inactivos. Vuelva a reanudar para continuar respondiendo.</p>
                    <button 
                      onClick={() => setPaused(false)}
                      className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-widest"
                    >
                      Volver a Jugar
                    </button>
                  </div>
                ) : (
                  /* Standard Input panel form */
                  <form 
                    onSubmit={handleSubmitAnswer}
                    className="space-y-4 p-5 md:p-6 bg-slate-900/60 rounded-3xl border border-slate-800/80 shadow-lg relative"
                  >
                    
                    {/* Feedback animation state */}
                    <AnimatePresence>
                      {feedback.message && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className={`p-3 rounded-xl text-xs font-semibold text-center absolute -top-12 left-0 right-0 border ${
                            feedback.type === 'success' 
                              ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/30' 
                              : feedback.type === 'error' 
                              ? 'bg-red-950/90 text-red-300 border-red-500/30' 
                              : 'bg-slate-900/95 text-slate-300 border-slate-700/50'
                          }`}
                        >
                          {feedback.message}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <label className="font-bold uppercase tracking-widest text-slate-400 block">Tu respuesta:</label>
                        <span className="text-[10px] text-slate-500 italic block">Respuestas en minúsculas</span>
                      </div>

                      <div className="relative">
                        <input 
                          ref={inputRef}
                          type="text"
                          className="w-full text-lg p-3.5 pr-24 rounded-2xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-700 font-mono tracking-wide lowercase outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-center"
                          placeholder="Escribe el verbo conjugado..."
                          value={answerInput}
                          onChange={(e) => setAnswerInput(e.target.value)}
                        />
                        
                        {/* Interactive accented helper keys */}
                        <div className="absolute right-2 top-2 bottom-2 flex items-center bg-slate-900/80 px-2 rounded-xl text-xs font-bold gap-1 text-slate-300 border border-slate-800">
                          {['á', 'é', 'í', 'ó', 'ú', 'ñ'].map((char) => (
                            <button
                              key={`acc_${char}`}
                              type="button"
                              onClick={() => handleInsertAccent(char)}
                              className="w-5 h-6 rounded hover:bg-slate-755 hover:text-white transition-colors flex items-center justify-center font-mono active:scale-90 text-[11px]"
                            >
                              {char}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Submit Actions */}
                    <div className="grid grid-cols-2 gap-4">
                      
                      {/* Submit Response */}
                      <button 
                        type="submit"
                        className="p-3.5 bg-emerald-500 hover:bg-emerald-400 font-bold rounded-xl text-slate-950 text-xs tracking-wider uppercase flex items-center justify-center gap-1.5 transition-transform hover:-translate-y-0.5 shadow-md shadow-emerald-500/10"
                      >
                        <CheckCircle2 size={14} /> Responder
                      </button>

                      {/* Pass Turn */}
                      <button 
                        type="button"
                        onClick={handlePasapalabra}
                        className="p-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs tracking-wider uppercase flex items-center justify-center gap-1.5 transition-transform hover:-translate-y-0.5 shadow-md"
                      >
                        Pasapalabra <ChevronRight size={14} />
                      </button>

                    </div>

                    {/* Hints trigger panel */}
                    <div className="text-[10px] text-slate-400 text-center leading-relaxed">
                      💡 Consejo: Presiona <kbd className="px-1.5 py-0.5 text-[8px] border border-slate-700 rounded bg-slate-800 text-slate-300">Enter</kbd> para enviar la respuesta. O presiona el botón Pasapalabra si tienes dudas de conjugación.
                    </div>

                  </form>
                )}

                {/* History Log Audit box */}
                <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-3xl backdrop-blur-md flex-1 flex flex-col min-h-[140px] max-h-[220px]">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest border-b border-slate-800/80 pb-2 mb-3 flex items-center justify-between">
                    <span>📝 Últimas Jugadas</span>
                    <span className="text-[10px] text-slate-500 font-mono">Registro de auditoría</span>
                  </h4>
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
                    {historyLog.length === 0 ? (
                      <p className="text-slate-500 italic text-center py-4">Aún no se han realizado jugadas.</p>
                    ) : (
                      historyLog.map((log, index) => (
                        <div 
                          key={`log_${index}`} 
                          className={`p-2 rounded bg-slate-950/40 border-l-2 text-slate-300 ${
                            log.includes('💚') 
                              ? 'border-emerald-500' 
                              : log.includes('❤️') 
                              ? 'border-red-500' 
                              : 'border-blue-500/30'
                          }`}
                        >
                          {log}
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

            </motion.div>
          )}

          {/* VIEW 3: GAME OVER STATS */}
          {stage === 'gameover' && (
            <motion.div 
              key="gameover_view"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden text-center"
              id="gameover_panel"
            >
              
              <div className="absolute -top-12 -left-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl"></div>

              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-green-300 text-slate-950 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
                <Award size={36} />
              </div>

              <h2 className="text-3xl font-black text-white tracking-tight mb-2">¡Partida Completada!</h2>
              <p className="text-sm text-slate-400 mb-6">Ambos jugadores han agotado sus ruedas de letras correspondientes.</p>

              {/* Winner Statement banner */}
              <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-850 mb-8 max-w-md mx-auto">
                <p className={`text-base md:text-lg font-bold ${getWinnerInfo().color}`}>
                  {getWinnerInfo().msg}
                </p>
              </div>

              {/* Detailed Dual Results columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-xl mx-auto mb-8">
                
                {/* P1 Azul Outcomes */}
                <div className="bg-slate-950/40 p-5 rounded-2xl border border-blue-900/20 text-left">
                  <h3 className="text-sm font-bold text-blue-400 border-b border-slate-850 pb-2 mb-3 flex items-center justify-between">
                    <span>{player1.name}</span>
                    <span className="text-[10px] tracking-wide text-slate-500 bg-slate-900 px-2 py-0.5 rounded-full">Azul</span>
                  </h3>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Aciertos (Verdes):</span>
                      <strong className="text-emerald-400 font-mono text-sm">{player1.score}</strong>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Fallos (Rojos):</span>
                      <strong className="text-red-400 font-mono text-sm">{player1.errors}</strong>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Sin contestar (Azules):</span>
                      <strong className="text-blue-400 font-mono text-sm">
                        {30 - (player1.score + player1.errors)}
                      </strong>
                    </div>
                    <div className="flex justify-between text-xs border-t border-slate-850 pt-2 mt-2">
                      <span className="text-slate-400">Tiempo sobrante:</span>
                      <strong className="text-slate-200 font-mono">
                        {Math.floor(player1.timeRemaining / 60)}m {player1.timeRemaining % 60}s
                      </strong>
                    </div>
                  </div>
                </div>

                {/* P2 Naranja Outcomes */}
                <div className="bg-slate-950/40 p-5 rounded-2xl border border-orange-900/20 text-left">
                  <h3 className="text-sm font-bold text-orange-400 border-b border-slate-850 pb-2 mb-3 flex items-center justify-between">
                    <span>{player2.name}</span>
                    <span className="text-[10px] tracking-wide text-slate-500 bg-slate-900 px-2 py-0.5 rounded-full">Naranja</span>
                  </h3>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Aciertos (Verdes):</span>
                      <strong className="text-emerald-400 font-mono text-sm">{player2.score}</strong>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Fallos (Rojos):</span>
                      <strong className="text-red-400 font-mono text-sm">{player2.errors}</strong>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Sin contestar (Azules):</span>
                      <strong className="text-blue-400 font-mono text-sm">
                        {30 - (player2.score + player2.errors)}
                      </strong>
                    </div>
                    <div className="flex justify-between text-xs border-t border-slate-850 pt-2 mt-2">
                      <span className="text-slate-400">Tiempo sobrante:</span>
                      <strong className="text-slate-200 font-mono">
                        {Math.floor(player2.timeRemaining / 60)}m {player2.timeRemaining % 60}s
                      </strong>
                    </div>
                  </div>
                </div>

              </div>

              {/* Actions */}
              <button 
                onClick={handleResetApp}
                className="px-8 py-3.5 bg-gradient-to-r from-blue-600 to-orange-650 hover:from-blue-500 hover:to-orange-550 text-white font-bold rounded-xl text-xs tracking-wider uppercase flex items-center justify-center gap-1.5 mx-auto transition-transform hover:-translate-y-0.5 shadow-lg"
              >
                <RotateCcw size={14} /> Jugar Otra Partida
              </button>

            </motion.div>
          )}
        </AnimatePresence>

      </main>

      {/* FOOTER COGNITIVE INFO BANNER */}
      <footer className="w-full text-center py-4 bg-slate-950/40 border-t border-slate-900 text-[10px] text-slate-500 font-sans tracking-wide">
        Pasapalabra de Gramática — Un juego diseñado para el dominio lingüístico de verbos en el pasado en Español.
      </footer>

      {/* AI EXPLANATION GRAMMAR MODAL (FLOAT DIALOG) */}
      <AnimatePresence>
        {showAiModal && aiTargetQuestion && (
          <div className="fixed inset-0 bg-slate-950/85 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="bg-slate-900 border border-slate-850 rounded-3xl p-6 max-w-xl w-full flex flex-col max-h-[85vh] shadow-2xl relative overflow-hidden"
              id="ai_grammar_overlay"
            >
              {/* Decorative side block */}
              <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-blue-500"></div>

              {/* Modal header */}
              <div className="flex justify-between items-start pb-4 border-b border-slate-800 mb-4 pl-2">
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-blue-400 font-bold uppercase mb-1">
                    <Sparkles size={14} className="animate-pulse" /> Asistente de Gramática IA
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-100">
                    Análisis: "{aiTargetQuestion.answer}"
                  </h3>
                  <p className="text-xs text-slate-400 block mt-0.5 font-mono">
                    Verbo {aiTargetQuestion.verb} — {aiTargetQuestion.tense} ({aiTargetQuestion.pronoun})
                  </p>
                </div>
                
                <button 
                  onClick={() => setShowAiModal(false)}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable Explanation logic content */}
              <div className="flex-1 overflow-y-auto pr-2 pl-2 text-sm leading-relaxed text-slate-300 space-y-4 font-normal">
                {aiLoading ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-3">
                    <div className="w-8 h-8 rounded-full border-4 border-t-blue-500 border-r-blue-500/20 border-b-blue-500/20 border-l-blue-500/20 animate-spin"></div>
                    <span className="text-xs text-slate-400 font-mono">Conectando con Gemini 3.5...</span>
                  </div>
                ) : (
                  <div className="space-y-3 whitespace-pre-line text-left">
                    {/* Render helper text parsed nicely as simple bullets */}
                    {aiExplanation}
                  </div>
                )}
              </div>

              {/* Modal controls footer */}
              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3 mt-4">
                <button 
                  onClick={() => setShowAiModal(false)}
                  className="px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors"
                >
                  Entendido, cerrar
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
