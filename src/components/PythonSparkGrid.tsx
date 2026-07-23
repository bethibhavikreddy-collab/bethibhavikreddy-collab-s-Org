import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from "motion/react";
import { 
  Play, 
  Square, 
  RotateCcw, 
  Terminal, 
  Sparkles, 
  Code2, 
  HelpCircle, 
  Wand2, 
  Check, 
  Copy,
  Layers,
  Bot
} from 'lucide-react';
import { GradientButton } from "@/components/ui/gradient-button";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface Preset {
  id: string;
  name: string;
  description: string;
  code: string;
}

export const PRESETS: Preset[] = [
  {
    id: 'rainbow-spiral',
    name: '🌈 Rainbow Spiral',
    description: 'A glowing spiral loop using Python turtle graphics.',
    code: `# Python Rainbow Spiral
import turtle

t = turtle.Turtle()
t.speed(0)
colors = ["#ff4b4b", "#00f0ff", "#ffd700", "#ff00ea", "#00ff66", "#9d00ff"]

for i in range(36):
    t.color(colors[i % 6])
    t.forward(i * 4 + 10)
    t.right(59)
    print(f"Step {i+1}: Drawing {colors[i % 6]} line")

print("✨ Spiral Complete!")`
  },
  {
    id: 'star-burst',
    name: '🌟 Star Burst',
    description: 'Draw a neon starburst pattern with nested loops.',
    code: `# Python Star Burst
import turtle

t = turtle.Turtle()
colors = ["#00f0ff", "#ffd700", "#ff00ea"]

for i in range(12):
    t.color(colors[i % 3])
    for _ in range(5):
        t.forward(80)
        t.right(144)
    t.right(30)
    print(f"Star branch {i+1}/12 rendered!")

print("🌟 Star Burst complete!")`
  },
  {
    id: 'flower-pattern',
    name: '🌸 Cosmic Flower',
    description: 'Circular geometric flower loops.',
    code: `# Python Cosmic Flower
import turtle

t = turtle.Turtle()
t.color("#00f0ff")

for i in range(18):
    t.circle(40)
    t.right(20)
    print("Petal " + str(i+1) + " drawn!")

print("🌸 Cosmic Flower Blooming!")`
  },
  {
    id: 'text-art',
    name: '💬 Python Console Art',
    description: 'Print fun ASCII art and custom text patterns.',
    code: `# Python Print Art
name = "WonderSpark"
print("====================================")
print(f"   WELCOME TO {name.upper()} PYTHON!   ")
print("====================================")

for i in range(1, 8):
    stars = "★" * (i * 2 - 1)
    print(f"{stars:^20}")

print("\\n[+] Spark Grid Online!")`
  }
];

export const PythonSparkGrid: React.FC = () => {
  const [code, setCode] = useState<string>(PRESETS[0].code);
  const [output, setOutput] = useState<string[]>(["Ready. Press 'Run Python' to execute!"]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isExplaining, setIsExplaining] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'canvas' | 'terminal'>('canvas');
  const [copied, setCopied] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  // --- Python Safe Execution / Turtle Simulator ---
  const runPythonCode = () => {
    setIsRunning(true);
    setExplanation(null);
    const logs: string[] = [">>> python3 main.py"];
    setOutput(logs);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw subtle grid background
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    const step = 20;
    for (let x = 0; x < canvas.width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Turtle State
    let turtleX = canvas.width / 2;
    let turtleY = canvas.height / 2;
    let turtleAngle = 0; // in degrees (0 = right)
    let penColor = "#00f0ff";
    let isPenDown = true;
    let penSize = 2;

    // Queue of commands to animate
    interface DrawCommand {
      type: 'line' | 'circle' | 'print';
      x1?: number;
      y1?: number;
      x2?: number;
      y2?: number;
      radius?: number;
      color?: string;
      size?: number;
      text?: string;
    }

    const commandQueue: DrawCommand[] = [];

    // Simple Python line-by-line interpreter / parser
    const lines = code.split('\n');
    let variables: Record<string, any> = {
      colors: ["#ff4b4b", "#00f0ff", "#ffd700", "#ff00ea", "#00ff66", "#9d00ff"],
    };

    // Helper to evaluate simple expressions
    const evalExpr = (expr: string, scope: Record<string, any>): any => {
      let trimmed = expr.trim();
      if (trimmed.startsWith('"') && trimmed.endsWith('"')) return trimmed.slice(1, -1);
      if (trimmed.startsWith("'") && trimmed.endsWith("'")) return trimmed.slice(1, -1);
      if (!isNaN(Number(trimmed))) return Number(trimmed);
      if (scope[trimmed] !== undefined) return scope[trimmed];
      
      // Simple string concat
      if (trimmed.includes('+')) {
        const parts = trimmed.split('+');
        return parts.map(p => evalExpr(p, scope)).join('');
      }
      return trimmed;
    };

    // Process Python Code structure
    try {
      let inForLoop = false;
      let loopVar = '';
      let loopRange = 0;
      let loopLines: string[] = [];

      for (let idx = 0; idx < lines.length; idx++) {
        const rawLine = lines[idx];
        const line = rawLine.trim();

        if (!line || line.startsWith('#')) continue;

        // Check for loop header: for i in range(N):
        const forMatch = line.match(/^for\s+([a-zA-Z_]\w*)\s+in\s+range\(([^)]+)\):/);
        if (forMatch) {
          inForLoop = true;
          loopVar = forMatch[1];
          const rangeArg = forMatch[2].trim();
          loopRange = isNaN(Number(rangeArg)) ? (variables[rangeArg] || 10) : Number(rangeArg);
          loopLines = [];
          continue;
        }

        if (inForLoop) {
          // If indented line, collect inside loop
          if (rawLine.startsWith('    ') || rawLine.startsWith('\t')) {
            loopLines.push(line);
            continue;
          } else {
            // Loop ended, execute loop
            inForLoop = false;
            executeLoop(loopVar, loopRange, loopLines);
          }
        }

        // Execute single line
        executeSingleLine(line, variables);
      }

      if (inForLoop) {
        executeLoop(loopVar, loopRange, loopLines);
      }

    } catch (err: any) {
      logs.push(`⚠️ Syntax Error: ${err.message || "Invalid Python syntax"}`);
    }

    function executeLoop(vName: string, count: number, bodyLines: string[]) {
      for (let i = 0; i < count; i++) {
        const loopScope = { ...variables, [vName]: i };
        for (const bLine of bodyLines) {
          executeSingleLine(bLine, loopScope);
        }
      }
    }

    function executeSingleLine(line: string, scope: Record<string, any>) {
      // print(...)
      if (line.startsWith('print(') && line.endsWith(')')) {
        const content = line.slice(6, -1);
        let printedText = '';
        if (content.startsWith('f"') || content.startsWith("f'")) {
          // Interpolated string: f"Step {i+1}: ..."
          printedText = content.slice(2, -1).replace(/\{([^}]+)\}/g, (_, expr) => {
            try {
              // Basic arithmetic like i+1 or colors[i % 6]
              if (expr.includes('%')) {
                const [arrName, rest] = expr.split('[');
                const idxExpr = rest.replace(']', '').trim();
                const [varA, modVal] = idxExpr.split('%').map((s: string) => s.trim());
                const valA = scope[varA] ?? 0;
                const valMod = Number(modVal) || 1;
                const arr = scope[arrName] || variables.colors;
                return arr[(valA % valMod)] || '';
              }
              if (expr.includes('+')) {
                const [a, b] = expr.split('+').map((s: string) => s.trim());
                return (Number(scope[a] || 0) + Number(b || 0)).toString();
              }
              return scope[expr] !== undefined ? scope[expr] : expr;
            } catch {
              return expr;
            }
          });
        } else {
          printedText = evalExpr(content, scope);
        }
        commandQueue.push({ type: 'print', text: String(printedText) });
        return;
      }

      // t.color(...)
      if (line.includes('.color(')) {
        const match = line.match(/\.color\(([^)]+)\)/);
        if (match) {
          const arg = match[1].trim();
          if (arg.includes('[') && arg.includes(']')) {
            // e.g. colors[i % 6]
            const arrName = arg.split('[')[0].trim();
            const idxExpr = arg.split('[')[1].replace(']', '').trim();
            let idx = 0;
            if (idxExpr.includes('%')) {
              const [v, m] = idxExpr.split('%').map((s: string) => s.trim());
              idx = (scope[v] || 0) % (Number(m) || 1);
            } else {
              idx = scope[idxExpr] || 0;
            }
            const arr = scope[arrName] || variables.colors;
            penColor = arr[idx % arr.length] || "#00f0ff";
          } else {
            penColor = evalExpr(arg, scope);
          }
        }
        return;
      }

      // t.forward(...) / t.fd(...)
      if (line.includes('.forward(') || line.includes('.fd(')) {
        const match = line.match(/\.(?:forward|fd)\(([^)]+)\)/);
        if (match) {
          let dist = 10;
          const expr = match[1].trim();
          if (expr.includes('*')) {
            const [a, b] = expr.split('*').map((s: string) => s.trim());
            const valA = scope[a] !== undefined ? scope[a] : Number(a);
            const valB = scope[b] !== undefined ? scope[b] : Number(b);
            dist = (valA || 1) * (valB || 1);
            if (expr.includes('+')) {
              const addVal = Number(expr.split('+')[1].trim()) || 0;
              dist += addVal;
            }
          } else if (expr.includes('+')) {
            const [a, b] = expr.split('+').map((s: string) => s.trim());
            dist = (scope[a] || Number(a) || 0) + (Number(b) || 0);
          } else {
            dist = scope[expr] !== undefined ? scope[expr] : Number(expr) || 20;
          }

          const rad = (turtleAngle * Math.PI) / 180;
          const nextX = turtleX + Math.cos(rad) * dist;
          const nextY = turtleY + Math.sin(rad) * dist;

          if (isPenDown) {
            commandQueue.push({
              type: 'line',
              x1: turtleX,
              y1: turtleY,
              x2: nextX,
              y2: nextY,
              color: penColor,
              size: penSize
            });
          }
          turtleX = nextX;
          turtleY = nextY;
        }
        return;
      }

      // t.right(...) / t.rt(...)
      if (line.includes('.right(') || line.includes('.rt(')) {
        const match = line.match(/\.(?:right|rt)\(([^)]+)\)/);
        if (match) {
          const deg = Number(evalExpr(match[1], scope)) || 90;
          turtleAngle += deg;
        }
        return;
      }

      // t.left(...) / t.lt(...)
      if (line.includes('.left(') || line.includes('.lt(')) {
        const match = line.match(/\.(?:left|lt)\(([^)]+)\)/);
        if (match) {
          const deg = Number(evalExpr(match[1], scope)) || 90;
          turtleAngle -= deg;
        }
        return;
      }

      // t.circle(...)
      if (line.includes('.circle(')) {
        const match = line.match(/\.circle\(([^)]+)\)/);
        if (match) {
          const radius = Number(evalExpr(match[1], scope)) || 30;
          commandQueue.push({
            type: 'circle',
            x1: turtleX,
            y1: turtleY,
            radius,
            color: penColor,
            size: penSize
          });
        }
        return;
      }
    }

    // Animate Execution Frame by Frame
    let stepIndex = 0;
    const animateNext = () => {
      if (stepIndex >= commandQueue.length) {
        setIsRunning(false);
        setOutput(prev => [...prev, ">>> Program finished with exit code 0"]);
        return;
      }

      const cmd = commandQueue[stepIndex];
      stepIndex++;

      if (cmd.type === 'line' && cmd.x1 !== undefined && cmd.y1 !== undefined && cmd.x2 !== undefined && cmd.y2 !== undefined) {
        ctx.beginPath();
        ctx.moveTo(cmd.x1, cmd.y1);
        ctx.lineTo(cmd.x2, cmd.y2);
        ctx.strokeStyle = cmd.color || "#00f0ff";
        ctx.lineWidth = cmd.size || 2;
        ctx.shadowColor = cmd.color || "#00f0ff";
        ctx.shadowBlur = 8;
        ctx.stroke();
      } else if (cmd.type === 'circle' && cmd.x1 !== undefined && cmd.y1 !== undefined && cmd.radius !== undefined) {
        ctx.beginPath();
        ctx.arc(cmd.x1, cmd.y1, cmd.radius, 0, 2 * Math.PI);
        ctx.strokeStyle = cmd.color || "#00f0ff";
        ctx.lineWidth = cmd.size || 2;
        ctx.shadowColor = cmd.color || "#00f0ff";
        ctx.shadowBlur = 8;
        ctx.stroke();
      } else if (cmd.type === 'print' && cmd.text) {
        setOutput(prev => [...prev, cmd.text!]);
      }

      animationFrameRef.current = requestAnimationFrame(animateNext);
    };

    animationFrameRef.current = requestAnimationFrame(animateNext);
  };

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  // --- AI Code Generator with Gemini ---
  const handleGenerateAiCode = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    setExplanation(null);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Write a simple, creative Python turtle drawing script for kids based on this request: "${aiPrompt}".
Output ONLY executable Python code inside a \`\`\`python code block. Keep it short (under 25 lines) and use turtle methods like t.color(), t.forward(), t.right(), t.left(), t.circle(), for loops, and print().`,
        config: {
          systemInstruction: "You are an expert Python tutor for kids and creative coders. Return clean Python code.",
        }
      });

      const rawText = response.text || '';
      const codeMatch = rawText.match(/```python\s*([\s\S]*?)\s*```/) || rawText.match(/```\s*([\s\S]*?)\s*```/);
      const generatedCode = codeMatch ? codeMatch[1].trim() : rawText.trim();

      if (generatedCode) {
        setCode(generatedCode);
        setOutput(["✨ AI generated new Python code! Click 'Run Python' to see it draw."]);
        setAiPrompt('');
      }
    } catch (err) {
      console.error(err);
      setOutput(prev => [...prev, "⚠️ AI Code Generation failed. Please try again!"]);
    } finally {
      setIsGenerating(false);
    }
  };

  // --- AI Tutor Explain Code ---
  const handleExplainCode = async () => {
    setIsExplaining(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Explain this Python code in 3 super simple, fun sentences for a young coder:\n\n${code}`,
      });
      setExplanation(response.text || "This code creates fun patterns using Python loops!");
    } catch (err) {
      setExplanation("This Python program uses loops and turtle graphics to draw on screen.");
    } finally {
      setIsExplaining(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full space-y-6">
      {/* Preset Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white/5 p-3 rounded-2xl border border-white/10">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-cyan-400">
          <Code2 className="w-4 h-4" />
          <span>Python Templates:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => {
                setCode(preset.code);
                setOutput(["Loaded preset: " + preset.name]);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                code === preset.code 
                  ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' 
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid Layout: Editor on Left, Canvas/Terminal on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Code Editor */}
        <div className="flex flex-col bg-slate-950 rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-white/5">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="text-xs font-mono text-slate-400 ml-2">main.py</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={copyCode}
                className="p-1.5 text-slate-400 hover:text-white transition-colors"
                title="Copy Code"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
              <button
                onClick={handleExplainCode}
                disabled={isExplaining}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs font-medium border border-purple-500/30 transition-all"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>{isExplaining ? "Explaining..." : "Explain Code"}</span>
              </button>
            </div>
          </div>

          {/* Text Area */}
          <div className="relative p-4 flex-1 min-h-[360px] font-mono text-sm leading-relaxed text-cyan-200">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
              className="w-full h-full min-h-[340px] bg-transparent resize-none focus:outline-none font-mono text-cyan-300 selection:bg-cyan-500/30"
              placeholder="# Write your Python code here..."
            />
          </div>

          {/* Action Bar */}
          <div className="p-4 border-t border-white/10 bg-white/5 flex items-center justify-between gap-4">
            <button
              onClick={() => setCode('# Write python code here...\nimport turtle\nt = turtle.Turtle()\n')}
              className="p-2 text-slate-400 hover:text-white transition-colors"
              title="Reset Code"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <GradientButton 
              onClick={runPythonCode}
              disabled={isRunning}
              className="w-full sm:w-auto"
            >
              {isRunning ? (
                <>
                  <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2 fill-current" />
                  Run Python Code
                </>
              )}
            </GradientButton>
          </div>
        </div>

        {/* Right: Interactive Canvas & Terminal Console */}
        <div className="flex flex-col bg-slate-950 rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
          {/* Header Tabs */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-white/5">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('canvas')}
                className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'canvas' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Canvas Output
              </button>
              <button
                onClick={() => setActiveTab('terminal')}
                className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'terminal' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                Terminal ({output.length})
              </button>
            </div>

            <div className="text-[10px] font-mono text-emerald-400/80 uppercase tracking-widest flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Python 3.12 Engine
            </div>
          </div>

          {/* View Container */}
          <div className="relative min-h-[380px] flex items-center justify-center p-4 bg-black/40">
            {activeTab === 'canvas' ? (
              <canvas
                ref={canvasRef}
                width={440}
                height={360}
                className="w-full h-[360px] max-w-full rounded-2xl border border-white/10 bg-[#090d16] shadow-inner"
              />
            ) : (
              <div className="w-full h-[360px] overflow-y-auto p-4 font-mono text-xs leading-relaxed text-emerald-400 bg-[#090d16] rounded-2xl border border-white/10">
                {output.map((line, idx) => (
                  <div key={idx} className="py-0.5">
                    {line}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Code Assistant & Explanation Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* Prompt Gemini to Generate Python Code */}
        <div className="p-6 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-3xl border border-white/10 space-y-4">
          <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm">
            <Wand2 className="w-4 h-4" />
            <span>AI Python Magic Generator</span>
          </div>
          <p className="text-xs text-slate-400">Describe what you want Python to draw or compute:</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerateAiCode()}
              placeholder="e.g., Draw a bright starfield or a colorful mandala..."
              className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
            <button
              onClick={handleGenerateAiCode}
              disabled={isGenerating || !aiPrompt.trim()}
              className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs rounded-xl disabled:opacity-40 transition-all whitespace-nowrap"
            >
              {isGenerating ? "Generating..." : "Generate Code"}
            </button>
          </div>
        </div>

        {/* AI Code Explanation Box */}
        <div className="p-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-3xl border border-white/10 space-y-3">
          <div className="flex items-center gap-2 text-purple-300 font-bold text-sm">
            <Bot className="w-4 h-4" />
            <span>AI Code Tutor</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed italic">
            {explanation || "Click 'Explain Code' above to get a kid-friendly explanation of how this Python program works step by step!"}
          </p>
        </div>
      </div>
    </div>
  );
};
