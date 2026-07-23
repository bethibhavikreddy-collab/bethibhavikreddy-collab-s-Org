import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, 
  Music, 
  BookOpen, 
  RotateCcw, 
  Send, 
  Volume2, 
  VolumeX,
  Plus,
  MousePointer2,
  Atom,
  Terminal,
  Code2
} from 'lucide-react';
import { GradientButton } from "@/components/ui/gradient-button";
import { PythonSparkGrid } from "./components/PythonSparkGrid";

// --- Types ---
interface Shape {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
}

interface Story {
  text: string;
  topic: string;
}

// --- AI Initialization ---
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// --- Components ---

/**
 * A beautiful, interactive grid that ripples and plays notes (visual only for now, can add audio if user enables)
 */
const SparkGrid = () => {
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const nextId = useRef(0);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    const id = nextId.current++;
    setRipples(prev => [...prev, { id, x, y }]);
    
    // Auto-remove ripple
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== id));
    }, 2000);
  };

  return (
    <div 
      id="spark-grid"
      className="relative w-full h-[400px] bg-black/20 rounded-3xl overflow-hidden cursor-crosshair border border-white/10 shadow-2xl backdrop-blur-sm"
      onClick={handleClick}
    >
      {/* Grid Pattern */}
      <div className="absolute inset-0 grid grid-cols-12 grid-rows-8 opacity-20 pointer-events-none">
        {Array.from({ length: 96 }).map((_, i) => (
          <div key={i} className="border-[0.5px] border-white/20" />
        ))}
      </div>

      <AnimatePresence>
        {ripples.map(ripple => (
          <motion.div
            key={ripple.id}
            initial={{ scale: 0, opacity: 0.8 }}
            animate={{ scale: 4, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="absolute w-20 h-20 -ml-10 -mt-10 rounded-full bg-cyan-400/30 blur-xl pointer-events-none"
            style={{ left: `${ripple.x}%`, top: `${ripple.y}%` }}
          />
        ))}
      </AnimatePresence>

      <div className="absolute top-4 left-4 flex items-center gap-2 text-cyan-200/50 text-xs font-mono uppercase tracking-widest">
        <MousePointer2 className="w-3 h-3" />
        Tap to create sparks
      </div>
    </div>
  );
};

/**
 * A simple physics garden where shapes bounce around
 */
const GravityGarden = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const requestRef = useRef<number>(0);

  const colors = [
    'bg-rose-400', 'bg-emerald-400', 'bg-amber-400', 
    'bg-indigo-400', 'bg-fuchsia-400', 'bg-sky-400'
  ];

  const addShape = () => {
    if (shapes.length > 20) return;
    const newShape: Shape = {
      id: Date.now() + Math.random(),
      x: Math.random() * 80 + 10,
      y: Math.random() * 50 + 10,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      size: Math.random() * 40 + 20,
      color: colors[Math.floor(Math.random() * colors.length)]
    };
    setShapes(prev => [...prev, newShape]);
  };

  const clearShapes = () => setShapes([]);

  const updatePhysics = useCallback(() => {
    setShapes(prev => prev.map(s => {
      let nx = s.x + s.vx;
      let ny = s.y + s.vy;
      let nvx = s.vx;
      let nvy = s.vy;

      // Bounce off walls with energy loss
      if (nx <= 0 || nx >= 100) {
        nvx *= -0.8;
        nx = nx <= 0 ? 0.1 : 99.9;
      }
      if (ny <= 0 || ny >= 100) {
        nvy *= -0.8;
        ny = ny <= 0 ? 0.1 : 99.9;
      }

      // Gravity
      nvy += 0.05;

      return { ...s, x: nx, y: ny, vx: nvx, vy: nvy };
    }));
    requestRef.current = requestAnimationFrame(updatePhysics);
  }, []);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(updatePhysics);
    return () => cancelAnimationFrame(requestRef.current);
  }, [updatePhysics]);

  return (
    <div className="relative w-full h-[500px] bg-slate-900/40 rounded-3xl overflow-hidden border border-white/5 shadow-inner">
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button 
          onClick={clearShapes}
          className="p-3 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white rounded-full transition-all active:scale-95 border border-white/5"
          title="Clear Garden"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
        <button 
          onClick={addShape}
          className="p-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-full transition-all active:scale-95 shadow-lg shadow-cyan-500/20 flex items-center gap-2 group"
        >
          <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
          <span className="text-sm font-bold pr-1">Add Bubble</span>
        </button>
      </div>

      {shapes.map(shape => (
        <motion.div
          key={shape.id}
          className={`absolute rounded-full blur-[2px] shadow-lg ${shape.color}`}
          style={{
            left: `${shape.x}%`,
            top: `${shape.y}%`,
            width: shape.size,
            height: shape.size,
            marginLeft: -shape.size / 2,
            marginTop: -shape.size / 2,
          }}
          layoutId={`shape-${shape.id}`}
        />
      ))}

      {shapes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-slate-400/50 flex-col gap-4">
          <Atom className="w-12 h-12 animate-spin-slow" />
          <p className="text-sm font-medium tracking-wide">The garden is quiet. Fill it with bubbles!</p>
        </div>
      )}
    </div>
  );
};

/**
 * Story Generator with curated prompts
 */
const StoryEcho = () => {
  const [topic, setTopic] = useState('');
  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(false);

  const generateStory = async (theme?: string) => {
    const targetTopic = theme || topic;
    if (!targetTopic.trim()) return;
    setLoading(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Create a magical, very short story (exactly 3 sentences) for children about: ${targetTopic}. Keep it whimsical, safe, and positive.`,
        config: {
          systemInstruction: "You are a professional children's storyteller. You write tiny magical moments.",
        }
      });
      setStory({ text: response.text || "Once upon a time, a little mystery happened...", topic: targetTopic });
      if (!theme) setTopic('');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-8">
      <div className="flex flex-wrap gap-2">
        {['Space Whales', 'Floating Castles', 'Robot Gardeners', 'Crystal Caves', 'Cloud Kittens'].map(theme => (
          <button
            key={theme}
            onClick={() => {
              setTopic(theme);
              generateStory(theme);
            }}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            {theme}
          </button>
        ))}
      </div>

      <div className="relative group">
        <input 
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && generateStory()}
          placeholder="Or type your own... (e.g. A friendly dragon)"
          className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-xl text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all font-medium pr-14 shadow-2xl"
        />
        <button 
          onClick={() => generateStory()}
          disabled={loading || !topic.trim()}
          className="absolute right-3 top-3 bottom-3 px-4 bg-purple-500 hover:bg-purple-600 disabled:opacity-30 text-white rounded-xl transition-all shadow-lg shadow-purple-500/20"
        >
          {loading ? (
            <RotateCcw className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {story && (
          <motion.div
            key={story.text}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-8 bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-white/10 rounded-3xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
              <BookOpen className="w-16 h-16" />
            </div>
            <h4 className="text-xs font-bold text-purple-300 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Sparkles className="w-3 h-3" />
              Story: {story.topic}
            </h4>
            <p className="text-xl text-white font-medium leading-relaxed italic italic-font">
              "{story.text}"
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'grid' | 'garden' | 'story'>('grid');

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-cyan-500/30 overflow-x-hidden font-sans">
      {/* Background Atmosphere */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-500/10 rounded-full blur-[120px]" />
      </div>

      {/* Main Content */}
      <main className="relative z-10 max-w-4xl mx-auto px-6 py-12 lg:py-24 space-y-16">
        
        {/* Hero Section */}
        <header className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-cyan-300 text-[10px] uppercase font-bold tracking-[0.2em]"
          >
            <Sparkles className="w-3 h-3" />
            Experimental Lab
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-6xl md:text-8xl font-black tracking-tighter leading-none"
          >
            Wonder<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">Spark</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-lg md:text-xl text-slate-400 font-medium max-w-xl"
          >
            A magical discovery playground for curious minds. 
            No rules, just pure interaction and imagination.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap items-center gap-4 pt-2"
          >
            <GradientButton onClick={() => setActiveTab('grid')}>
              Python Playground
            </GradientButton>
            <GradientButton variant="variant" onClick={() => setActiveTab('story')}>
              Echo Story
            </GradientButton>
          </motion.div>
        </header>

        {/* Navigation / Tabs */}
        <section className="flex flex-wrap gap-4">
          {[
            { id: 'grid', label: 'Python Spark Grid', icon: Terminal, color: 'text-cyan-400' },
            { id: 'garden', label: 'Gravity garden', icon: Atom, color: 'text-rose-400' },
            { id: 'story', label: 'Story Echo', icon: BookOpen, color: 'text-purple-400' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                flex items-center gap-3 px-6 py-3 rounded-full border transition-all duration-300
                ${activeTab === tab.id 
                  ? 'bg-white/10 border-white/20 text-white shadow-lg' 
                  : 'bg-transparent border-white/5 text-slate-500 hover:text-slate-300 hover:border-white/10'}
              `}
            >
              <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? tab.color : ''}`} />
              <span className="font-bold tracking-tight">{tab.label}</span>
            </button>
          ))}
        </section>

        {/* Content Area */}
        <section className="min-h-[500px]">
          <AnimatePresence mode="wait">
            {activeTab === 'grid' && (
              <motion.div
                key="grid"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                className="space-y-4"
              >
                <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-2">
                  <div>
                    <h3 className="text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">
                      Python Spark Grid
                    </h3>
                    <p className="text-xs text-slate-400">
                      Write, run, and experiment with Python code for all ages!
                    </p>
                  </div>
                </div>
                <PythonSparkGrid />
              </motion.div>
            )}

            {activeTab === 'garden' && (
              <motion.div
                key="garden"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                className="space-y-4"
              >
                <h3 className="text-2xl font-bold tracking-tight">Gravity Garden</h3>
                <GravityGarden />
              </motion.div>
            )}

            {activeTab === 'story' && (
              <motion.div
                key="story"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Story Echo</h3>
                  <p className="text-slate-400 font-medium">Whisper a topic, and the AI will echo back a tiny magical tale.</p>
                </div>
                <StoryEcho />
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Footer */}
        <footer className="pt-24 border-t border-white/5 flex flex-col md:flex-row justify-between gap-6 opacity-30">
          <div className="flex items-center gap-2 font-mono text-[10px] tracking-widest uppercase">
            <RotateCcw className="w-3 h-3" />
            V0.1 Alpha - Non-Destructive Lab
          </div>
          <div className="flex gap-6 text-[10px] font-bold uppercase tracking-widest">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Safety</a>
            <a href="#" className="hover:text-white transition-colors">Experimental</a>
          </div>
        </footer>
      </main>
    </div>
  );
}
