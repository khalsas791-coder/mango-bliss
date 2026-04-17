import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trophy } from 'lucide-react';

interface MangoGameProps {
  onClose: () => void;
  onClaimReward?: () => void;
}

export function MangoGame({ onClose, onClaimReward }: MangoGameProps) {
  const [score, setScore] = useState(0);
  const [gameActive, setGameActive] = useState(true);
  const [basketPos, setBasketPos] = useState(50); // percentage
  const [mangoes, setMangoes] = useState<{ id: number; x: number; y: number }[]>([]);
  const gameRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>(0);

  useEffect(() => {
    if (!gameActive) return;

    const spawnMango = () => {
      setMangoes(prev => [
        ...prev,
        { id: Date.now(), x: Math.random() * 90 + 5, y: -10 }
      ]);
    };

    const interval = setInterval(spawnMango, 1000);
    return () => clearInterval(interval);
  }, [gameActive]);

  useEffect(() => {
    if (!gameActive) return;

    const update = () => {
      setMangoes(prev => {
        const next = prev.map(m => ({ ...m, y: m.y + 1.5 }));
        
        // Check collisions
        const caught = next.filter(m => m.y > 80 && m.y < 90 && Math.abs(m.x - basketPos) < 10);
        if (caught.length > 0) {
          setScore(s => s + caught.length);
        }

        // Filter out caught or off-screen
        return next.filter(m => m.y < 100 && !caught.find(c => c.id === m.id));
      });

      if (score >= 10) {
        setGameActive(false);
      }

      requestRef.current = requestAnimationFrame(update);
    };

    requestRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(requestRef.current);
  }, [gameActive, basketPos, score]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!gameRef.current) return;
    const rect = gameRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    setBasketPos(Math.min(Math.max(x, 5), 95));
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white w-full max-w-2xl rounded-[3rem] overflow-hidden relative shadow-2xl"
        ref={gameRef}
        onMouseMove={handleMouseMove}
      >
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 z-10 text-slate-400 hover:text-slate-900 transition-colors"
        >
          <X size={32} />
        </button>

        <div className="p-10 text-center">
          <h3 className="font-display font-black text-4xl text-[#e11d48] mb-2 uppercase italic">Mango Catcher</h3>
          <p className="text-slate-500 font-bold tracking-widest uppercase text-xs">Catch 10 mangoes to win a reward!</p>
          
          <div className="mt-8 h-96 bg-rose-50 rounded-[2rem] relative overflow-hidden border-4 border-rose-100 cursor-none">
            {gameActive ? (
              <>
                <div className="absolute top-4 left-4 bg-white px-4 py-2 rounded-full shadow-md font-black text-[#e11d48]">
                  SCORE: {score}
                </div>
                
                {mangoes.map(m => (
                  <div 
                    key={m.id}
                    className="absolute text-4xl"
                    style={{ left: `${m.x}%`, top: `${m.y}%` }}
                  >
                    🥭
                  </div>
                ))}

                <div 
                  className="absolute bottom-10 text-6xl transition-all duration-75"
                  style={{ left: `${basketPos}%`, transform: 'translateX(-50%)' }}
                >
                  🥤
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-10 bg-white/90">
                <Trophy size={80} className="text-yellow-400 mb-6" />
                <h4 className="font-display font-black text-5xl text-[#e11d48] uppercase">YOU WON!</h4>
                <p className="text-slate-600 font-medium mt-4">Use code <span className="font-black text-slate-900">BLISS10</span> for 10% off your first order.</p>
                <button 
                  onClick={() => {
                    onClaimReward?.();
                    onClose();
                  }}
                  className="mt-8 bg-[#e11d48] text-white px-10 py-4 rounded-full font-black text-xl shadow-xl hover:scale-105 transition-transform"
                >
                  CLAIM REWARD
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
