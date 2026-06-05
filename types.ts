export type LetterStatus = 'neutral' | 'correct' | 'incorrect';

export interface Question {
  id: number;
  letter: string;       // displayed on the node, e.g. "A", "Ñ", "★"
  prefixType: 'Con la' | 'Contiene la' | 'Termina en';
  verb: string;         // e.g. "cantar"
  tense: 'Futuro Simple' | 'Futuro Perfecto';
  pronoun: string;       // e.g. "yo", "nosotros"
  definition: string;   // description/question format
  translation: string;  // Armenian translation of definition
  answer: string;       // exact matching lowercase answer
  explanation: string;  // fallback grammatic explanation in Spanish
}

export interface Player {
  id: 1 | 2;
  name: string;
  color: 'blue' | 'orange';
  score: number;
  errors: number;
  rosco: Record<number, LetterStatus>; // letter index -> status
  currentIndex: number;                 // current active letter index
  timeRemaining: number;              // countdown timer in seconds
  hasFinished: boolean;                // true if all 30 letters answered
}

export type GameStage = 'setup' | 'playing' | 'gameover';
