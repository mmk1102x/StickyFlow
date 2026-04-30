/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, Reorder, useDragControls } from 'motion/react';
import { Plus, Archive, X, Trash2, CheckCircle2, ListRestart } from 'lucide-react';
import confetti from 'canvas-confetti';

export type NoteColor = 'yellow' | 'pink' | 'green' | 'blue' | 'purple';

export interface Task {
  id: string;
  text: string;
  color: NoteColor;
  isArchived: boolean;
  order: number;
}

export const COLORS: Record<NoteColor, { bg: string, border: string, accent: string }> = {
  yellow: { bg: '#fff78e', border: '#fde047', accent: '#ca8a04' },
  pink: { bg: '#ffafcc', border: '#f9a8d4', accent: '#db2777' },
  green: { bg: '#b9fbc0', border: '#86efac', accent: '#16a34a' },
  blue: { bg: '#a2d2ff', border: '#93c5fd', accent: '#2563eb' },
  purple: { bg: '#d6bcfd', border: '#c4b5fd', accent: '#7c3aed' },
};

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [archivedTasks, setArchivedTasks] = useState<Task[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const [selectedColor, setSelectedColor] = useState<NoteColor>('yellow');
  const [showArchive, setShowArchive] = useState(false);
  
  const archiveButtonRef = useRef<HTMLButtonElement>(null);

  // Load from local storage
  useEffect(() => {
    const savedTasks = localStorage.getItem('stickyflow_tasks');
    const savedArchive = localStorage.getItem('stickyflow_archive');
    if (savedTasks) setTasks(JSON.parse(savedTasks));
    if (savedArchive) setArchivedTasks(JSON.parse(savedArchive));

    // Prevent pull-to-refresh and elastic scrolling
    document.body.style.overscrollBehaviorY = 'contain';
    return () => {
      document.body.style.overscrollBehaviorY = 'auto';
    };
  }, []);

  // Randomize color when opening add modal
  useEffect(() => {
    if (isAdding) {
      const colors = Object.keys(COLORS) as NoteColor[];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      setSelectedColor(randomColor);
    }
  }, [isAdding]);

  // Save to local storage
  useEffect(() => {
    localStorage.setItem('stickyflow_tasks', JSON.stringify(tasks));
    localStorage.setItem('stickyflow_archive', JSON.stringify(archivedTasks));
  }, [tasks, archivedTasks]);

  const addTask = () => {
    if (!newTaskText.trim()) return;
    const newTask: Task = {
      id: crypto.randomUUID(),
      text: newTaskText,
      color: selectedColor,
      isArchived: false,
      order: 0,
    };
    setTasks([newTask, ...tasks]);
    setNewTaskText('');
    setIsAdding(false);
  };

  const archiveTask = (taskId: string) => {
    const taskToArchive = tasks.find(t => t.id === taskId);
    if (!taskToArchive || !archiveButtonRef.current) return;

    const buttonRect = archiveButtonRef.current.getBoundingClientRect();
    const noteElement = document.getElementById(`note-${taskId}`);
    
    if (noteElement) {
      const noteRect = noteElement.getBoundingClientRect();
      
      // We'll manage the animation via local state for that specific task if we wanted 
      // complex pathing, but for now we'll do a simple "dissolve and sparkle"
      const colorHex = COLORS[taskToArchive.color].accent;
      
      confetti({
        particleCount: 40,
        spread: 70,
        origin: { 
          x: (buttonRect.left + buttonRect.width / 2) / window.innerWidth, 
          y: (buttonRect.top + buttonRect.height / 2) / window.innerHeight 
        },
        colors: [colorHex, '#ffffff'],
        ticks: 200,
        gravity: 1.2,
        decay: 0.94,
        startVelocity: 30,
        shapes: ['circle']
      });
    }

    setTasks(tasks.filter(t => t.id !== taskId));
    setArchivedTasks([{ ...taskToArchive, isArchived: true }, ...archivedTasks]);
  };

  const deleteTaskPermanently = (taskId: string) => {
    setArchivedTasks(archivedTasks.filter(t => t.id !== taskId));
  };

  const restoreTask = (taskId: string) => {
    const task = archivedTasks.find(t => t.id === taskId);
    if (!task) return;
    setArchivedTasks(archivedTasks.filter(t => t.id !== taskId));
    setTasks([{ ...task, isArchived: false }, ...tasks]);
  };

  return (
    <div className="min-h-screen w-full bg-linear-to-br from-[#2a2a4a] via-[#4a417a] to-[#7c5c96] overflow-x-hidden font-sans text-slate-100 flex flex-col items-center p-4 md:p-8">
      
      {/* Header */}
      <header className="w-full max-w-2xl flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tighter text-white lowercase">
            stickyflow.
          </h1>
          <p className="text-white/40 text-[10px] uppercase tracking-widest mt-1">Design in sync</p>
        </div>
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setShowArchive(!showArchive)}
            className={`p-3 rounded-full transition-all duration-500 flex items-center gap-2 group ${showArchive ? 'bg-white text-indigo-900 shadow-xl' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
            title="View Archive"
          >
            <Archive size={20} className="group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </header>

      {/* Main Content Areas */}
      <div className="w-full max-w-lg flex-1 relative flex flex-col gap-6">
        
        {/* Active Tasks Board */}
        <div className="w-full flex-1 min-h-[400px]">
          {tasks.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-800 rounded-3xl p-12 text-center pointer-events-none">
              <div className="mb-4 opacity-20">
                <Plus size={64} />
              </div>
              <p className="text-lg font-medium">No tasks yet</p>
              <p className="text-sm">Add a sticky note to start your flow</p>
            </div>
          ) : (
            <Reorder.Group 
              axis="y" 
              values={tasks} 
              onReorder={setTasks}
              className="flex flex-col gap-4 items-center"
            >
              <AnimatePresence mode="popLayout">
                {tasks.map((task, index) => {
                  const isTopPriority = index === 0;
                  const isSecondPriority = index === 1;
                  
                  return (
                    <Reorder.Item
                      key={task.id}
                      value={task}
                      id={`note-${task.id}`}
                      initial={{ opacity: 0, scale: 0.8, y: 20 }}
                      animate={{ 
                        opacity: 1, 
                        scale: isTopPriority ? 1.05 : isSecondPriority ? 1 : 0.95,
                        y: 0,
                        zIndex: 100 - index
                      }}
                      exit={{ 
                        opacity: 0, 
                        scale: 0.5,
                        translateX: (window.innerWidth / 2) - 100, // Move towards roughly where button is
                        translateY: 500,
                        transition: { duration: 0.3, ease: "easeIn" }
                      }}
                      whileDrag={{ scale: 1.1, rotate: 2, zIndex: 1000 }}
                      className="w-full relative px-2"
                    >
                      <StickyNote 
                        task={task} 
                        isTop={isTopPriority} 
                        onArchive={() => archiveTask(task.id)} 
                      />
                    </Reorder.Item>
                  );
                })}
              </AnimatePresence>
            </Reorder.Group>
          )}
        </div>
      </div>

      {/* Floating Action Bar */}
      <div className="fixed bottom-0 left-0 w-full p-6 pb-10 flex justify-between items-end pointer-events-none z-50">
        {/* Archive Portal (The Button that absorbs) */}
        <div className="flex flex-col items-center gap-2 pointer-events-auto">
          <div className="text-[9px] text-white/30 uppercase tracking-[0.2em] font-bold">Archive</div>
          <button
            ref={archiveButtonRef}
            onClick={() => setShowArchive(prev => !prev)}
            className={`relative w-16 h-16 md:w-20 md:h-20 rounded-full border-2 border-dashed transition-all duration-500 group flex items-center justify-center backdrop-blur-md
              ${showArchive ? 'bg-white/20 border-white scale-110' : 'bg-white/5 border-white/30 hover:border-white/60 hover:scale-105'}
            `}
          >
            <div className={`w-6 h-6 md:w-8 md:h-8 border-2 rounded-sm relative transition-colors ${showArchive ? 'border-white' : 'border-white/60 group-hover:border-white'}`}>
              <div className="absolute top-1.5 left-1 w-3 md:w-4 h-[2px] bg-current" />
            </div>
            <div className="absolute top-[-5px] left-[10px] w-0.5 h-0.5 bg-white rounded-full shadow-[0_0_4px_white]" />
            <div className="absolute top-[15px] right-[-8px] w-0.5 h-0.5 bg-white rounded-full shadow-[0_0_4px_white]" />
          </button>
        </div>

        {/* New Task Button */}
        <div className="pointer-events-auto">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsAdding(true)}
            className="bg-linear-to-r from-indigo-500 to-purple-600 p-4 rounded-xl md:rounded-2xl shadow-[0_8px_30px_rgb(99,102,241,0.5)] flex items-center gap-2 text-white font-bold px-6 md:px-8 border border-white/10"
          >
            <Plus size={24} />
            <span className="hidden sm:inline">New Task</span>
            <span className="sm:hidden text-sm uppercase tracking-widest">New</span>
          </motion.button>
        </div>
      </div>

      {/* Modal: Create Task */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 50 }}
              className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl shadow-indigo-500/10"
            >
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Plus className="text-indigo-400" /> Create New Sticky
              </h2>
              
              <textarea
                autoFocus
                placeholder="What's bothering your mind?"
                className="w-full bg-slate-800 text-slate-100 rounded-2xl p-4 min-h-[120px] focus:ring-2 focus:ring-indigo-500 outline-hidden mb-6 placeholder-slate-500"
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    addTask();
                  }
                }}
              />

              <div className="flex justify-between items-center mb-8">
                <div className="flex gap-2">
                  {(Object.keys(COLORS) as NoteColor[]).map((c) => (
                    <button
                      key={c}
                      onClick={() => setSelectedColor(c)}
                      className={`w-8 h-8 rounded-full border-2 transition-transform duration-200 ${selectedColor === c ? 'scale-125 border-white shadow-lg' : 'border-transparent hover:scale-110'}`}
                      style={{ backgroundColor: COLORS[c].bg }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setIsAdding(false)}
                  className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold rounded-2xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={addTask}
                  className="flex-1 py-3 px-4 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-2xl transition-colors shadow-[0_4px_14px_rgba(99,102,241,0.39)]"
                >
                  Add Note
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Archive Side Panel / Modal */}
      <AnimatePresence>
        {showArchive && (
          <div className="fixed inset-0 z-[110] flex items-end md:items-center justify-center p-0 md:p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowArchive(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="relative w-full max-w-2xl h-[80vh] md:h-auto md:max-h-[85vh] bg-slate-900 border-t md:border border-slate-800 rounded-t-3xl md:rounded-3xl flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b border-slate-800 flex justify-between items-center sticky top-0 bg-slate-900 z-10 rounded-t-3xl">
                <div className="flex items-center gap-3">
                  <Archive className="text-indigo-400" />
                  <h2 className="text-2xl font-bold">Past Achievements</h2>
                  <span className="bg-slate-800 text-slate-400 text-xs py-1 px-2.5 rounded-full font-mono">
                    {archivedTasks.length}
                  </span>
                </div>
                <button 
                  onClick={() => setShowArchive(false)}
                  className="p-2 hover:bg-slate-800 rounded-full text-slate-400 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                {archivedTasks.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-600 py-12">
                    <p className="text-lg">Archive is empty</p>
                    <p className="text-sm">Finish some tasks to see them here!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {archivedTasks.map((task) => (
                      <motion.div
                        layout
                        key={task.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-white/5 border border-white/10 p-3 px-5 rounded-lg flex items-center justify-between group backdrop-blur-xs"
                      >
                        <div className="flex items-center gap-4">
                          <div 
                            className="w-1.5 h-6 rounded-full opacity-50"
                            style={{ backgroundColor: COLORS[task.color].bg }}
                          />
                          <div>
                            <p className="line-through text-white/40 font-medium text-sm italic font-serif">{task.text}</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => restoreTask(task.id)}
                            className="p-1.5 text-white/30 hover:text-white hover:bg-white/10 rounded-md transition-all"
                            title="Restore to Active"
                          >
                            <ListRestart size={16} />
                          </button>
                          <button
                            onClick={() => deleteTaskPermanently(task.id)}
                            className="p-1.5 text-white/30 hover:text-rose-400 hover:bg-rose-400/10 rounded-md transition-all"
                            title="Delete Permanently"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

interface StickyNoteProps {
  task: Task;
  isTop: boolean;
  onArchive: () => void;
}

function StickyNote({ task, isTop, onArchive }: StickyNoteProps) {
  const color = COLORS[task.color];
  const rotation = isTop ? 'rotate-[-2deg]' : (task.text.length % 2 === 0 ? 'rotate-1' : 'rotate-[-1.5deg]');
  
  return (
    <div 
      className={`group relative w-full p-8 rounded-sm shadow-[10px_10px_20px_rgba(0,0,0,0.3)] transition-all duration-300 transform-gpu touch-none
        ${rotation}
        ${isTop ? 'max-w-md py-10 px-10' : 'max-w-sm'}
      `}
      style={{ 
        backgroundColor: color.bg,
        boxShadow: `10px 10px 20px rgba(0,0,0,0.3), inset 0 -2px 10px rgba(0,0,0,0.05)`
      }}
    >
      {/* Pin Effect */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-rose-500 rounded-full shadow-md z-10" />
      
      <div className="flex flex-col gap-4 h-full">
        {isTop && (
          <div className="text-[10px] font-bold text-slate-900/40 uppercase tracking-widest mb-1">NOW FOCUS</div>
        )}
        
        <p className={`text-slate-900 leading-tight font-serif whitespace-pre-wrap break-words
          ${isTop ? 'text-2xl font-bold italic' : 'text-[1.1rem] font-semibold'}
        `}>
          {task.text}
        </p>

        <div className="flex justify-between items-center mt-auto pt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="text-[9px] font-bold text-slate-900/30 uppercase tracking-widest">
            {isTop ? 'High Priority' : 'Next Step'}
          </div>
          
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onArchive}
            className="flex items-center gap-2 bg-slate-950/10 hover:bg-slate-950/20 text-slate-900 py-1.5 px-3 rounded-lg font-bold text-[10px] transition-all border border-slate-950/10"
          >
            <CheckCircle2 size={14} />
            Complete
          </motion.button>
        </div>
      </div>

      {/* Die-cut Curl Effect */}
      <div className="absolute bottom-0 right-0 w-8 h-8 pointer-events-none overflow-hidden">
        <div className="absolute bottom-[-15px] right-[-15px] w-12 h-12 bg-black/10 rotate-45 shadow-inner" />
      </div>
    </div>
  );
}
