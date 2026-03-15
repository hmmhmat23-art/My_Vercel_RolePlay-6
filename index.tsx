import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Settings, Upload, Menu, X, Trash2, Edit2, BookOpen, MessageSquare, Loader2, Check, MessageSquarePlus, History, FolderInput, MoreVertical, Pencil, MessageSquare as MessageCircle, AlertTriangle, AlertCircle, Sparkles, Folder, RefreshCw, Save, XCircle, Play, ChevronRight, ListChecks, CheckSquare, Square, Zap, BrainCircuit, ChevronDown, ChevronUp, Copy, ChevronLeft, FastForward, Download, Edit, Key, Plus, Languages, ExternalLink, ArrowDown, Clipboard, RotateCcw } from 'lucide-react';
import { INITIAL_SETTINGS, MOCK_CHARACTERS, DESIGNER_CHARACTER } from './constants';
import { Character, AppSettings, ChatSession, Message, LorebookEntry, Lorebook } from './types';
import { generateResponse, summarizeChat, googleTranslateFree, replacePlaceholders, extractJSON } from './services/apiService';
import { SettingsModal } from './components/SettingsModal';
import { CharacterModal } from './components/CharacterModal';
import { Button } from './components/Button';
import { FloatingImageViewer } from './components/FloatingImageViewer';
import { useVisualViewport } from './hooks/useVisualViewport';
import { useTranslation } from './translations';

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface TranslationState {
    visible: boolean;
    original: string;
    translated: string;
    loading: boolean;
    error: string | null;
}

const ToastContainer = ({ toasts }: { toasts: Toast[] }) => {
  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <div 
          key={toast.id} 
          className="animate-slide-up-fade bg-[#0a0a0a] border border-zinc-800 text-zinc-200 px-4 py-2 rounded-full shadow-[0_0_20px_rgba(0,0,0,0.5)] flex items-center gap-2 text-xs font-bold uppercase tracking-wider"
        >
          {toast.type === 'success' && <Check size={14} className="text-emerald-500" />}
          {toast.type === 'error' && <AlertCircle size={14} className="text-red-500" />}
          {toast.type === 'info' && <Sparkles size={14} className="text-orange-500" />}
          {toast.message}
        </div>
      ))}
    </div>
  );
};

const renderFormattedContent = (content: string, settings: AppSettings, onImageClick?: (src: string) => void) => {
    const parts = content.split(/(\*[^*]+\*|"[^"]+")/g);

    return parts.map((part, index) => {
        if (part.startsWith('*') && part.endsWith('*')) {
            return (
                <span key={index} style={{ color: settings.thoughtColor }} className="italic">
                    {part}
                </span>
            );
        } else if (part.startsWith('"') && part.endsWith('"')) {
            return (
                <span key={index} style={{ color: settings.dialogueColor }}>
                    {part}
                </span>
            );
        } else {
            return <span key={index}>{part}</span>;
        }
    });
};

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  characters: Character[];
  onSelectChar: (id: string) => void;
  activeCharId: string | null;
  onUploadChar: (json: any) => void;
  onDownloadChar: (id: string) => void;
  sessions: Record<string, ChatSession>;
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onRenameSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onDownloadSession: (id: string) => void;
  onError: (title: string, message: string) => void;
  onEditChar: (char: Character) => void;
  onCreateChar: () => void;
  manageMode: 'chars' | 'sessions' | 'messages' | null;
  setManageMode: (mode: 'chars' | 'sessions' | 'messages' | null) => void;
  selectedIds: Set<string>;
  toggleSelection: (id: string) => void;
  onBulkDelete: () => void;
  onViewImage: (src: string) => void;
  language: 'en' | 'ar';
}

const Sidebar = ({ 
  isOpen, 
  onClose, 
  characters, 
  onSelectChar, 
  activeCharId, 
  onUploadChar,
  onDownloadChar,
  sessions,
  activeSessionId,
  onSelectSession,
  onRenameSession,
  onDeleteSession,
  onDownloadSession,
  onError,
  onEditChar,
  onCreateChar,
  manageMode,
  setManageMode,
  selectedIds,
  toggleSelection,
  onBulkDelete,
  onViewImage,
  language
}: SidebarProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const viewportHeight = useVisualViewport();
  const { t } = useTranslation(language);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        onUploadChar(json);
      } catch (err) {
        onError("Import Failed", "Invalid character file format. Please upload a valid JSON.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const charSessions = activeCharId 
    ? (Object.values(sessions) as ChatSession[])
        .filter((s) => s.characterId === activeCharId)
        .sort((a, b) => b.lastUpdated - a.lastUpdated)
    : [];

  return (
    <>
      {isOpen && (
        <div 
          className="fixed top-0 left-0 w-full bg-black/80 backdrop-blur-sm z-30 md:hidden animate-fade-in"
          style={{ height: viewportHeight }}
          onClick={onClose}
        />
      )}

      <div 
        className={`fixed top-0 left-0 z-40 w-80 lg:w-96 bg-[#050505] border-r border-zinc-900/50 transform transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static flex flex-col shadow-[0_0_40px_rgba(0,0,0,0.5)] shrink-0`}
        style={{ height: viewportHeight }}
      >
        
        <div className="p-8 pb-4 flex items-center justify-between shrink-0">
          <h1 className="text-3xl font-serif font-bold text-orange-500 tracking-widest drop-shadow-[0_0_15px_rgba(234,88,12,0.4)] animate-pulse-slow">
            EREBOS
          </h1>
          <button onClick={onClose} className="md:hidden text-zinc-500 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
          
          <div className="py-4 space-y-4">
            <div className="flex items-center justify-between px-2 h-8">
                <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Folder size={12} /> Entities
                </div>
                <div className="flex items-center gap-2">
                  {manageMode === 'chars' ? (
                     <div className="flex items-center gap-2">
                        <button onClick={onBulkDelete} className="text-[9px] text-red-500 font-bold uppercase hover:underline">
                           Delete ({selectedIds.size})
                        </button>
                        <button onClick={() => setManageMode(null)} className="text-zinc-500 hover:text-white">
                           <X size={12} />
                        </button>
                     </div>
                  ) : (
                    <>
                      <button 
                        onClick={() => setManageMode('chars')}
                        className="text-zinc-600 hover:text-orange-500 transition-colors"
                        title="Manage Entities"
                      >
                        <ListChecks size={14} />
                      </button>
                      <button 
                        onClick={onCreateChar}
                        className="text-zinc-600 hover:text-orange-500 transition-colors"
                        title="Create Entity"
                      >
                        <Plus size={14} />
                      </button>
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="text-zinc-600 hover:text-orange-500 transition-colors flex items-center gap-1"
                        title={t('import')}
                      >
                        <Upload size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">{t('import')}</span>
                      </button>
                    </>
                  )}
                </div>
            </div>
            
            <div className="space-y-1">
                {characters.map((char: Character) => (
                <div 
                    key={char.id}
                    onClick={() => manageMode === 'chars' ? toggleSelection(char.id) : onSelectChar(char.id)}
                    className={`group relative flex items-center gap-4 p-3 rounded-[4px] cursor-pointer transition-all duration-500 border border-transparent 
                    ${manageMode === 'chars' && selectedIds.has(char.id) ? 'bg-orange-950/20 border-orange-500/30' : ''}
                    ${!manageMode && activeCharId === char.id ? 'bg-zinc-900/40 border-orange-900/30 shadow-[inset_0_0_20px_rgba(234,88,12,0.05)]' : 'hover:bg-zinc-900/30 hover:border-zinc-800'}`}
                >
                    {manageMode === 'chars' ? (
                         <div className={`text-orange-500 transition-transform duration-300 ${selectedIds.has(char.id) ? 'scale-110' : 'opacity-50 scale-100'}`}>
                            {selectedIds.has(char.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                         </div>
                    ) : (
                        <>
                            {activeCharId === char.id && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)] rounded-r"></div>
                            )}
                        </>
                    )}
                    
                    <div className="relative" onClick={(e) => { e.stopPropagation(); onViewImage(char.avatarUrl); }}>
                        <img src={char.avatarUrl || undefined} alt={char.name} className={`w-10 h-10 rounded-full object-cover transition-all duration-500 hover:scale-110 hover:ring-2 hover:ring-orange-500/50 cursor-zoom-in ${activeCharId === char.id ? 'grayscale-0 ring-1 ring-orange-500/50 shadow-[0_0_10px_rgba(234,88,12,0.2)]' : 'grayscale opacity-60 group-hover:opacity-100 group-hover:grayscale-0'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className={`font-serif font-medium truncate tracking-wide text-sm transition-colors duration-300 ${activeCharId === char.id ? 'text-orange-100' : 'text-zinc-400 group-hover:text-zinc-200'}`}>{char.name}</h3>
                        <p className="text-[10px] text-zinc-600 truncate group-hover:text-zinc-500 transition-colors duration-300">{char.tagline || "Unknown Entity"}</p>
                    </div>
                    
                    {!manageMode && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                                onClick={(e) => { e.stopPropagation(); onDownloadChar(char.id); }}
                                className="p-1.5 text-zinc-600 hover:text-emerald-500 transition-colors"
                                title="Export Entity"
                            >
                                <Download size={14} />
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onEditChar(char); }}
                                className="p-1.5 text-zinc-600 hover:text-orange-500 transition-colors"
                                title="Entity Configuration"
                            >
                                <Settings size={14} />
                            </button>
                        </div>
                    )}
                </div>
                ))}
            </div>

            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              accept=".json"
            />
          </div>

          {activeCharId && charSessions.length > 0 && (
            <div className="pt-2 space-y-2 animate-slide-up-fade">
               <div className="h-px bg-gradient-to-r from-transparent via-zinc-900 to-transparent my-4"></div>
               <div className="px-2 flex items-center justify-between h-6 mb-2">
                 <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em] flex items-center gap-2">
                    <History size={12} /> Memories
                 </div>
                 {manageMode === 'sessions' ? (
                     <div className="flex items-center gap-2">
                        <button onClick={onBulkDelete} className="text-[9px] text-red-500 font-bold uppercase hover:underline">
                           Delete ({selectedIds.size})
                        </button>
                        <button onClick={() => setManageMode(null)} className="text-zinc-500 hover:text-white">
                           <X size={12} />
                        </button>
                     </div>
                 ) : (
                    <button 
                        onClick={() => setManageMode('sessions')}
                        className="text-zinc-600 hover:text-orange-500 transition-colors"
                        title="Manage Memories"
                    >
                        <ListChecks size={12} />
                    </button>
                 )}
               </div>

               <div className="space-y-0.5">
                {charSessions.map((session: ChatSession) => (
                    <div 
                    key={session.id}
                    onClick={() => manageMode === 'sessions' ? toggleSelection(session.id) : onSelectSession(session.id)}
                    className={`group flex items-center justify-between p-2 pl-3 rounded-[2px] text-xs cursor-pointer transition-all duration-300 
                    ${manageMode === 'sessions' && selectedIds.has(session.id) ? 'bg-orange-950/20 text-orange-400' : ''}
                    ${!manageMode && activeSessionId === session.id ? 'text-orange-400 bg-orange-950/10 border-l-2 border-orange-500/50' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/20 border-l-2 border-transparent'}`}
                    >
                    {manageMode === 'sessions' && (
                         <div className={`mr-3 text-orange-500 transition-transform duration-300 ${selectedIds.has(session.id) ? 'scale-110' : 'opacity-50 scale-100'}`}>
                            {selectedIds.has(session.id) ? <CheckSquare size={12} /> : <Square size={12} />}
                         </div>
                    )}
                    <span className="truncate flex-1 font-medium">{session.name}</span>
                    
                    {!manageMode && (
                        <div className="flex gap-1 opacity-100 transition-opacity duration-300">
                            <button 
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDownloadSession(session.id); }}
                                className="p-1 hover:text-emerald-400 transition-colors"
                                title="Download Chat"
                            >
                                <Download size={10} />
                            </button>
                            <button 
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRenameSession(session.id); }}
                                className="p-1 hover:text-orange-400 transition-colors"
                            >
                                <Pencil size={10} />
                            </button>
                            <button 
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDeleteSession(session.id); }}
                                className="p-1 hover:text-red-400 transition-colors"
                            >
                                <Trash2 size={10} />
                            </button>
                        </div>
                    )}
                    </div>
                ))}
               </div>
            </div>
          )}
        </div>
        
        <div className="p-6 border-t border-zinc-900/50 text-center shrink-0 bg-[#040404]">
          <p className="text-[9px] text-zinc-700 tracking-widest font-serif">V1.4.3 // LOCAL ONLY</p>
        </div>
      </div>
    </>
  );
};

interface MessageEditorProps {
    initialContent: string;
    role: 'user' | 'model';
    isFirstMessage: boolean;
    onSave: (newContent: string) => void;
    onCancel: () => void;
    onRegenerate: () => void;
    isGenerating: boolean;
}

const MessageEditor = ({ initialContent, role, isFirstMessage, onSave, onCancel, onRegenerate, isGenerating }: MessageEditorProps) => {
    const [content, setContent] = useState(initialContent);
    const [isTranslating, setIsTranslating] = useState(false);
    const [originalContent, setOriginalContent] = useState<string | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useLayoutEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = '0px'; 
            const scrollHeight = textareaRef.current.scrollHeight;
            textareaRef.current.style.height = scrollHeight + 'px';
        }
    }, [content]);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.focus();
            const len = textareaRef.current.value.length;
            textareaRef.current.setSelectionRange(len, len);
        }
    }, []);

    const handleTranslate = async () => {
        if (!content.trim() && !originalContent) return;
        
        // Restore logic
        if (originalContent !== null) {
            setContent(originalContent);
            setOriginalContent(null);
            return;
        }

        setIsTranslating(true);
        try {
            const hasArabic = /[\u0600-\u06FF]/.test(content);
            const target = hasArabic ? 'en' : 'ar';
            const translated = await googleTranslateFree(content, target);
            setOriginalContent(content);
            setContent(translated);
        } catch (e) {
            console.error("Translation failed", e);
        } finally {
            setIsTranslating(false);
        }
    };

    return (
        <div className={`relative w-full transition-all duration-300 ${role === 'user' ? 'items-end' : 'items-start'}`}>
            <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onFocus={(e) => {
                    if (window.innerWidth < 768) {
                        setTimeout(() => {
                            e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }, 300);
                    }
                }}
                className={`
                    w-full resize-none overflow-hidden outline-none p-5 text-sm md:text-base leading-7 tracking-wide rounded-2xl
                    focus:ring-1 focus:ring-orange-500/50 transition-all duration-200 shadow-xl
                    ${role === 'user' 
                        ? 'bg-zinc-900/60 text-zinc-200 border border-orange-500/60 rounded-tr-sm' 
                        : 'bg-black/60 text-zinc-200 border border-orange-500/30 rounded-tl-sm'
                    }
                `}
            />
            
            <div className="flex items-center justify-end gap-2 mt-3 animate-fade-in">
                <button 
                    onClick={handleTranslate}
                    disabled={isTranslating || isGenerating || (!content.trim() && !originalContent)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition-all disabled:opacity-50"
                    title={originalContent ? "Restore Original" : "Translate content (Auto Detect)"}
                >
                    {isTranslating ? <Loader2 size={10} className="animate-spin" /> : originalContent ? <RotateCcw size={10} /> : <Languages size={10} />}
                    {originalContent ? "Restore" : "Translate"}
                </button>

                <button 
                    onClick={onCancel}
                    className="px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                    Cancel
                </button>
                
                {role === 'model' && !isFirstMessage && (
                    <button 
                        onClick={onRegenerate}
                        disabled={isGenerating}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 text-[10px] font-bold uppercase tracking-wider text-orange-500/80 hover:text-orange-400 transition-all disabled:opacity-50"
                    >
                        <RefreshCw size={10} className={isGenerating ? "animate-spin" : ""} /> Regenerate
                    </button>
                )}

                <button 
                    onClick={() => onSave(content)}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-orange-600 hover:bg-orange-500 text-white text-[10px] font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(234,88,12,0.3)] hover:shadow-[0_0_25px_rgba(234,88,12,0.5)] transition-all border border-orange-500/50"
                >
                    <Save size={10} /> Save
                </button>
            </div>
        </div>
    );
};

const ThoughtBlock = ({ content }: { content: string }) => {
    const [isOpen, setIsOpen] = useState(false);

    if (!content) return null;

    return (
        <div className="mb-4 rounded bg-zinc-900/30 border border-zinc-800 overflow-hidden">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-2 px-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-orange-500 hover:bg-zinc-800/50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <BrainCircuit size={14} />
                    <span>Thought Process</span>
                </div>
                {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            
            {isOpen && (
                <div className="p-3 text-xs font-mono text-zinc-400 bg-black/20 border-t border-zinc-800 whitespace-pre-wrap leading-relaxed animate-slide-up-fade">
                    {content}
                </div>
            )}
        </div>
    );
};

interface SessionAction {
  type: 'rename' | 'delete' | 'bulk_delete';
  sessionId?: string;
  count?: number;
}

interface ErrorState {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

function App() {
  const [characters, setCharacters] = useState<Character[]>(() => {
    try {
      const saved = localStorage.getItem('erebos_characters');
      let parsed = saved ? JSON.parse(saved) : MOCK_CHARACTERS;
      if (!parsed.find((c: Character) => c.id === 'designer')) {
          parsed = [DESIGNER_CHARACTER, ...parsed];
      }
      return parsed;
    } catch { return MOCK_CHARACTERS; }
  });
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('erebos_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Force enableAdvancedJailbreak to true once for existing users
        if (parsed._migratedJailbreak !== true) {
            parsed.enableAdvancedJailbreak = true;
            parsed._migratedJailbreak = true;
        }
        if (parsed._migratedJailbreakV2 !== true) {
            parsed.jailbreakOverride = INITIAL_SETTINGS.jailbreakOverride;
            parsed._migratedJailbreakV2 = true;
        }
        if (parsed._migratedDesignerPrompt !== true) {
            parsed.designerSystemPrompt = INITIAL_SETTINGS.designerSystemPrompt;
            parsed._migratedDesignerPrompt = true;
        }
        return { ...INITIAL_SETTINGS, ...parsed };
      }
      return INITIAL_SETTINGS;
    } catch { return INITIAL_SETTINGS; }
  });
  
  const { t } = useTranslation(settings.language);
  
  const [activeCharId, setActiveCharId] = useState<string | null>(() => {
    return localStorage.getItem('erebos_activeCharId') || null;
  });
  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => {
    return localStorage.getItem('erebos_activeSessionId') || null;
  });
  const [chatSelection, setChatSelection] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Record<string, ChatSession>>(() => {
    try {
      const saved = localStorage.getItem('erebos_sessions');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  useEffect(() => {
    localStorage.setItem('erebos_characters', JSON.stringify(characters));
  }, [characters]);

  useEffect(() => {
    localStorage.setItem('erebos_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('erebos_sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    if (activeCharId) localStorage.setItem('erebos_activeCharId', activeCharId);
    else localStorage.removeItem('erebos_activeCharId');
  }, [activeCharId]);

  useEffect(() => {
    if (activeSessionId) localStorage.setItem('erebos_activeSessionId', activeSessionId);
    else localStorage.removeItem('erebos_activeSessionId');
  }, [activeSessionId]);
  
  const [sessionAction, setSessionAction] = useState<SessionAction | null>(null);
  const [renameInput, setRenameInput] = useState("");
  const [errorModal, setErrorModal] = useState<ErrorState | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'general' | 'generation' | 'world'>('general');
  const [isCharModalOpen, setIsCharModalOpen] = useState(false);
  const [editingChar, setEditingChar] = useState<Character | null>(null);
  
  const [inputVal, setInputVal] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isOrbFlashed, setIsOrbFlashed] = useState(false);

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [messageToDeleteId, setMessageToDeleteId] = useState<string | null>(null);
  
  const [manageMode, setManageMode] = useState<'chars' | 'sessions' | 'messages' | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const [viewedImage, setViewedImage] = useState<string | null>(null);

  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [quotaErrorMsg, setQuotaErrorMsg] = useState("");
  const [tempApiKey, setTempApiKey] = useState("");

  const viewportHeight = useVisualViewport();

  const [translation, setTranslation] = useState<TranslationState>({
      visible: false,
      original: '',
      translated: '',
      loading: false,
      error: null
  });

  const [messageTranslations, setMessageTranslations] = useState<Record<string, { text: string, visible: boolean, loading: boolean, sourceText: string }>>({});

  const bottomRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (isGenerating && chatContainerRef.current) {
        const { scrollHeight, scrollTop, clientHeight } = chatContainerRef.current;
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
        
        if (distanceFromBottom < 100) {
            bottomRef.current?.scrollIntoView({ behavior: 'auto' });
        }
    }
  }, [sessions, isGenerating]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSessionId]);


  const activeSession = activeSessionId ? sessions[activeSessionId] : null;
  const activeChar = activeCharId ? characters.find(c => c.id === activeCharId) : null;
  
  const lastMsg = activeSession?.messages[activeSession.messages.length - 1];
  const hasNewMessages = activeSession
      ? !activeSession.lastSummarizedMessageId || (lastMsg && lastMsg.id !== activeSession.lastSummarizedMessageId)
      : false;

  // Determine the session associated with the character being edited
  const editingSession = editingChar 
    ? (activeSession && activeSession.characterId === editingChar.id 
        ? activeSession 
        : (Object.values(sessions) as ChatSession[]).filter(s => s.characterId === editingChar.id).sort((a,b) => b.lastUpdated - a.lastUpdated)[0]
      )
    : null;

  // Check if the editing session has new messages for summarization
  const editingSessionHasNewMessages = editingSession
      ? !editingSession.lastSummarizedMessageId || (editingSession.messages.length > 0 && editingSession.messages[editingSession.messages.length - 1].id !== editingSession.lastSummarizedMessageId)
      : false;

  const showError = (title: string, message: string, actionLabel?: string, onAction?: () => void) => 
    setErrorModal({ title, message, actionLabel, onAction });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = generateId();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const detectJsonType = (data: any): 'CHARACTER' | 'CHAT' | 'UNKNOWN' => {
      if (data.type === 'risuChat') return 'CHAT';
      if (data.spec === 'chara_card_v2') return 'CHARACTER';
      const isCharacterFields = (obj: any) => 
          (typeof obj.name === 'string' || typeof obj.ch_name === 'string') && 
          (typeof obj.first_mes === 'string' || typeof obj.mes_example === 'string');
      const rootIsChar = isCharacterFields(data);
      const dataIsChar = data.data && isCharacterFields(data.data);
      const hasRootMessages = Array.isArray(data.messages) && data.messages.length > 0;
      const hasDataMessages = data.data && (Array.isArray(data.data.messages) || Array.isArray(data.data.message));
      const hasHistory = Array.isArray(data.history);
      const isArrayRoot = Array.isArray(data);
      if (hasRootMessages || hasDataMessages || hasHistory || isArrayRoot) return 'CHAT';
      if (rootIsChar || dataIsChar) return 'CHARACTER';
      return 'UNKNOWN';
  };

  const handleOrbClick = () => {
    setIsOrbFlashed(true);
    setTimeout(() => {
      setIsOrbFlashed(false);
      setIsSidebarOpen(true);
    }, 200);
  };

  const handleToggleSelection = (id: string) => {
    if (manageMode === 'chars' && id === 'designer') return;
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSetManageMode = (mode: 'chars' | 'sessions' | 'messages' | null) => {
      setManageMode(mode);
      setSelectedIds(new Set());
      setEditingMessageId(null);
  };

  const handleBulkDelete = () => {
      if (selectedIds.size === 0) return;
      setSessionAction({ type: 'bulk_delete', count: selectedIds.size });
  };

  const performBulkDelete = () => {
      if (manageMode === 'chars') {
          const charsToDelete = Array.from(selectedIds).filter(id => id !== 'designer');
          setCharacters(prev => prev.filter(c => !selectedIds.has(c.id) || c.id === 'designer'));
          setSessions(prev => {
              const next = { ...prev };
              Object.keys(next).forEach(sid => {
                  if (selectedIds.has(next[sid].characterId) && next[sid].characterId !== 'designer') delete next[sid];
              });
              return next;
          });
          if (activeCharId && selectedIds.has(activeCharId) && activeCharId !== 'designer') {
              setActiveCharId(null);
              setActiveSessionId(null);
              setChatSelection(null);
          }
          if (charsToDelete.length > 0) {
              showToast(`Deleted ${charsToDelete.length} entities`, 'success');
          } else {
              showToast(`No entities deleted`, 'info');
          }
      } else if (manageMode === 'sessions') {
          setSessions(prev => {
              const next = { ...prev };
              selectedIds.forEach(id => delete next[id]);
              return next;
          });
          if (activeSessionId && selectedIds.has(activeSessionId)) {
              setActiveSessionId(null);
          }
          showToast(`Deleted ${selectedIds.size} memories`, 'success');
      } else if (manageMode === 'messages' && activeSession) {
          setSessions(prev => ({
              ...prev,
              [activeSession.id]: {
                  ...activeSession,
                  messages: activeSession.messages.filter((m, idx) => idx === 0 || !selectedIds.has(m.id)),
                  lastUpdated: Date.now()
              }
          }));
          showToast(`Deleted ${selectedIds.size} messages`, 'success');
      }
      
      setSessionAction(null);
      setManageMode(null);
      setSelectedIds(new Set());
  };

  const handleStopGeneration = () => {
      if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
          setIsGenerating(false);
          showToast("Generation stopped", "info");
      }
  };

  const handleTranslateInput = async () => {
    if (!inputVal.trim()) return;
    
    setTranslation({
        visible: true,
        original: inputVal,
        translated: '',
        loading: true,
        error: null
    });

    try {
        const result = await googleTranslateFree(inputVal, 'en');
        setTranslation(prev => ({ ...prev, loading: false, translated: result }));
    } catch (err) {
        setTranslation(prev => ({ 
            ...prev, 
            loading: false, 
            error: "Security Policy blocked direct translation." 
        }));
    }
  };

  const handleTranslateWithSystem = async () => {
      setTranslation(prev => ({ ...prev, loading: true, error: null }));
      const prompt = `Translate the following text to English. Output only the translation, no extra text:\n\n${translation.original}`;
      
      const char: Character = { id: 'sys', name: 'Sys', tagline:'', description:'', appearance:'', personality:'', firstMessage:'', chatExamples:'', avatarUrl:'', scenario:'', jailbreak:'', lorebooks:[] };
      const tempSettings: AppSettings = { ...settings, maxOutputTokens: 1024, streamResponse: false, systemPromptOverride: 'You are a translator.' };
      
      try {
          const stream = generateResponse([{id:'t', role:'user', content:prompt, timestamp:0}], char, tempSettings);
          let full = "";
          for await (const chunk of stream) full += chunk;
          setTranslation(prev => ({ ...prev, loading: false, translated: full.trim() }));
      } catch (e) {
          setTranslation(prev => ({ ...prev, loading: false, error: "System translation failed." }));
      }
  };

  const toggleMessageTranslation = async (msgId: string, content: string, role: string) => {
      const current = messageTranslations[msgId];
      
      if (current && current.sourceText === content) {
          setMessageTranslations(prev => ({
              ...prev,
              [msgId]: { ...prev[msgId], visible: !prev[msgId].visible }
          }));
          return;
      }

      setMessageTranslations(prev => ({
          ...prev,
          [msgId]: { text: '', visible: true, loading: true, sourceText: content }
      }));

      try {
          const hasArabic = /[\u0600-\u06FF]/.test(content);
          const target = hasArabic ? 'en' : 'ar';
          
          const result = await googleTranslateFree(content, target);
          
          setMessageTranslations(prev => ({
              ...prev,
              [msgId]: { text: result, visible: true, loading: false, sourceText: content }
          }));
      } catch (e) {
          setMessageTranslations(prev => ({
              ...prev,
              [msgId]: { text: "Translation failed.", visible: true, loading: false, sourceText: content }
          }));
      }
  };

  const handleDownloadChat = (sessionId: string) => {
    const session = sessions[sessionId];
    if (!session) return;
    
    try {
        const exportData = {
            ...session,
            exportedAt: Date.now(),
            version: '1.0'
        };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${session.name.replace(/[^a-z0-9]/gi, '_') || 'chat'}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast("Chat downloaded successfully", "success");
    } catch (e) {
        showToast("Failed to download chat", "error");
    }
  };

  const handleDownloadCharacter = (id: string) => {
      const char = characters.find(c => c.id === id);
      if (!char) return;

      const exportData = {
          spec: 'chara_card_v2',
          spec_version: '2.0',
          data: {
              name: char.name,
              description: char.description,
              background: char.background,
              personality: char.personality,
              scenario: char.scenario,
              first_mes: char.firstMessage,
              alternate_greetings: char.alternateGreetings || [], // Include alternate greetings
              mes_example: char.chatExamples,
              system_prompt: char.jailbreak,
              creator_notes: char.tagline,
              tagline: char.tagline,
              appearance: char.appearance,
              tags: [],
              avatar: char.avatarUrl,
              character_book: {
                  entries: char.lorebooks.flatMap(lb => lb.entries)
              },
              lorebooks: char.lorebooks,
              extensions: {
                  velvet_core: { ...char }
              }
          },
          ...char
      };

      try {
          const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${char.name.replace(/[^a-z0-9]/gi, '_')}.json`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          showToast("Entity exported successfully", "success");
      } catch (e) {
          showToast("Failed to export entity", "error");
      }
  };

  const handleCreateChar = () => {
      setEditingChar(null);
      setIsCharModalOpen(true);
  };

  const handleSendMessage = async (overrideText?: string) => {
    if (!activeSession || !activeChar) return;
    const currentSessionId = activeSession.id;
    
    const userText = overrideText !== undefined ? overrideText : inputVal.trim();
    let historyForGeneration = [...activeSession.messages];

    if (userText) {
        // REPLACE PLACEHOLDERS HERE BEFORE CREATING MESSAGE
        const processedUserText = replacePlaceholders(userText, activeChar, settings.userName);

        const userMsg: Message = { 
            id: generateId(), 
            role: 'user', 
            content: processedUserText, 
            timestamp: Date.now(),
            swipes: [processedUserText],
            currentIndex: 0
        };

        setSessions(prev => ({
            ...prev,
            [currentSessionId]: {
                ...prev[currentSessionId],
                messages: [...prev[currentSessionId].messages, userMsg],
                lastUpdated: Date.now()
            }
        }));
        
        historyForGeneration.push(userMsg);
        if (overrideText === undefined) setInputVal("");
    }

    setIsGenerating(true);
    
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    const botMsgId = generateId();
    const botMsgPlaceholder: Message = { 
        id: botMsgId, 
        role: 'model', 
        content: '', 
        timestamp: Date.now(),
        swipes: [''],
        currentIndex: 0
    };

    setSessions(prev => ({
      ...prev,
      [currentSessionId]: {
        ...prev[currentSessionId],
        messages: [...prev[currentSessionId].messages, botMsgPlaceholder],
        lastUpdated: Date.now()
      }
    }));

    try {
      // Pass the summary from the active session
      const stream = generateResponse(historyForGeneration, activeChar, settings, activeSession.summary, abortControllerRef.current.signal);
      let fullContent = "";

      for await (const chunk of stream) {
          fullContent += chunk;
          
          setSessions(prev => ({
              ...prev,
              [currentSessionId]: {
                  ...prev[currentSessionId],
                  messages: prev[currentSessionId].messages.map(m => 
                      m.id === botMsgId ? { ...m, content: fullContent.replace('[ACTION: APPLY_CHARACTER]', ''), swipes: [fullContent.replace('[ACTION: APPLY_CHARACTER]', '')] } : m
                  )
              }
          }));
      }

      if (activeChar.id === 'designer' && fullContent.includes('[ACTION: APPLY_CHARACTER]')) {
          let contentToApply = fullContent;
          let jsonMatch = extractJSON(fullContent);
          if (!jsonMatch) {
              const allMessages = [...historyForGeneration, { id: botMsgId, role: 'model', content: fullContent, timestamp: Date.now(), swipes: [fullContent], currentIndex: 0 } as Message];
              for (let i = allMessages.length - 1; i >= 0; i--) {
                  if (extractJSON(allMessages[i].content)) {
                      contentToApply = allMessages[i].content;
                      jsonMatch = extractJSON(allMessages[i].content);
                      break;
                  }
              }
          }
          
          if (jsonMatch) {
              let result = jsonMatch;
              if (Array.isArray(result)) result = result[0];
              if (result.character) result = result.character;
              
              const newChar: Character = {
                  id: generateId(),
                  name: result.name || '',
                  tagline: result.tagline || '',
                  description: result.description || '',
                  background: result.background || '',
                  appearance: result.appearance || '',
                  personality: result.personality || '',
                  firstMessage: result.firstMessage || '',
                  alternateGreetings: result.alternateGreetings || [],
                  chatExamples: result.chatExamples || '',
                  avatarUrl: result.avatarUrl || '',
                  scenario: result.scenario || '',
                  jailbreak: result.jailbreak || '',
                  lorebooks: result.lorebooks || [],
                  style: result.style || '',
                  eventSequence: result.eventSequence || ''
              };
              setEditingChar(newChar);
              setIsCharModalOpen(true);
          } else {
              showToast("Could not extract valid JSON for character.", "error");
          }
      }

    } catch (error: any) {
       const errorMessage = error?.message || String(error);
       if (errorMessage === "Aborted" || error?.name === 'AbortError') {
           setIsGenerating(false);
           return;
       }
       
       if (errorMessage.startsWith("QUOTA_EXCEEDED")) {
           setQuotaErrorMsg(errorMessage.split("|")[1] || "Rate limit or quota exceeded.");
           setShowQuotaModal(true);
           setTempApiKey(settings.apiKey || "");
           setIsGenerating(false);
           return;
       }

       setSessions(prev => {
           const session = prev[currentSessionId];
           const lastMsg = session.messages[session.messages.length - 1];
           if (lastMsg.id === botMsgId && !lastMsg.content) {
               return {
                   ...prev,
                   [currentSessionId]: {
                       ...session,
                       messages: session.messages.slice(0, -1)
                   }
               };
           }
           return prev;
       });

      showError(
          "Connection Failed", 
          errorMessage,
          "Fix Connection",
          () => {
              setErrorModal(null);
              setSettingsTab('generation');
              setIsSettingsOpen(true);
          }
      );
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleContinueGeneration = async () => {
    if (!activeSession || !activeChar) return;
    const currentSessionId = activeSession.id;
    const lastMsg = activeSession.messages[activeSession.messages.length - 1];
    
    if (!lastMsg || lastMsg.role !== 'model') return;

    setIsGenerating(true);
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    try {
        const historyForGen = [...activeSession.messages];
        
        historyForGen.push({
            id: 'temp-sys-continue',
            role: 'user', 
            content: `[Instruction: The previous message was cut off mid-sentence. Please finish the sentence and complete the immediate thought or action. Do not restart the description. Do not repeat text. Keep the continuation concise.]`,
            timestamp: Date.now()
        } as Message);

        const currentLength = lastMsg.content.length;
        const settingMinLen = typeof settings.minOutputLength === 'number' 
            ? settings.minOutputLength 
            : parseInt(settings.minOutputLength as any, 10) || 0;
            
        const targetLength = settings.minOutputEnabled ? settingMinLen : 0;
        const remaining = Math.max(0, targetLength - currentLength);

        const continueSettings = {
            ...settings,
            minOutputEnabled: remaining > 0,
            minOutputLength: remaining
        };

        const stream = generateResponse(historyForGen, activeChar, continueSettings, activeSession.summary, abortControllerRef.current.signal);
        
        let fullContent = lastMsg.content;
        
        for await (const chunk of stream) {
            fullContent += chunk;
            setSessions(prev => {
                const session = prev[currentSessionId];
                return {
                    ...prev,
                    [currentSessionId]: {
                        ...session,
                        messages: session.messages.map(m => {
                            if (m.id === lastMsg.id) {
                                const currentIdx = m.currentIndex || 0;
                                const updatedSwipes = [...(m.swipes || [m.content])];
                                updatedSwipes[currentIdx] = fullContent;
                                return { ...m, content: fullContent, swipes: updatedSwipes };
                            }
                            return m;
                        }),
                        lastUpdated: Date.now()
                    }
                }
            });
        }
    } catch (error: any) {
        const errorMessage = error?.message || String(error);
        if (errorMessage === "Aborted" || error?.name === 'AbortError') return;
        if (errorMessage.startsWith("QUOTA_EXCEEDED")) {
           setQuotaErrorMsg(errorMessage.split("|")[1] || "Rate limit or quota exceeded.");
           setShowQuotaModal(true);
           setTempApiKey(settings.apiKey || "");
           return;
        }
        showError("Continue Failed", errorMessage);
    } finally {
        setIsGenerating(false);
        abortControllerRef.current = null;
    }
  };

  const handleRegenerateMessage = async (messageId: string) => {
    if (!activeSession || !activeChar) return;
    const index = activeSession.messages.findIndex(m => m.id === messageId);
    if (index < 0) return;

    setMessageTranslations(prev => {
        const next = { ...prev };
        delete next[messageId];
        return next;
    });

    const history = activeSession.messages.slice(0, index); 
    
    setIsGenerating(true);
    setEditingMessageId(null); 

    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    try {
        let newSwipeIndex = 0;
        setSessions(prev => {
            const session = prev[activeSession.id];
            const msg = session.messages[index];
            const currentSwipes = msg.swipes || [msg.content];
            newSwipeIndex = currentSwipes.length; 
            
            const newSwipes = [...currentSwipes, ""];
            
            return {
                ...prev,
                [activeSession.id]: {
                    ...session,
                    messages: session.messages.map((m, i) => 
                        i === index ? { ...m, content: '', swipes: newSwipes, currentIndex: newSwipeIndex, timestamp: Date.now() } : m
                    ),
                }
            };
        });

        const stream = generateResponse(history, activeChar, settings, activeSession.summary, abortControllerRef.current.signal);
        let fullContent = "";

        for await (const chunk of stream) {
            fullContent += chunk;
            setSessions(prev => {
                const session = prev[activeSession.id];
                return {
                    ...prev,
                    [activeSession.id]: {
                        ...session,
                        messages: session.messages.map(m => {
                            if (m.id === messageId) {
                                const updatedSwipes = [...(m.swipes || [])];
                                if (updatedSwipes.length <= newSwipeIndex) updatedSwipes.push("");
                                updatedSwipes[newSwipeIndex] = fullContent;
                                return { ...m, content: fullContent, swipes: updatedSwipes };
                            }
                            return m;
                        }),
                        lastUpdated: Date.now()
                    }
                }
            });
        }

    } catch (error: any) {
         const errorMessage = error?.message || String(error);
         if (errorMessage === "Aborted" || error?.name === 'AbortError') return;
         if (errorMessage.startsWith("QUOTA_EXCEEDED")) {
           setQuotaErrorMsg(errorMessage.split("|")[1] || "Rate limit or quota exceeded.");
           setShowQuotaModal(true);
           setTempApiKey(settings.apiKey || "");
           return;
        }
         showError(
          "Regeneration Failed", 
          errorMessage,
          "Fix Connection",
          () => {
              setErrorModal(null);
              setSettingsTab('generation');
              setIsSettingsOpen(true);
          }
      );
    } finally {
        setIsGenerating(false);
        abortControllerRef.current = null;
    }
  };

  const handleSwipeMessage = (messageId: string, direction: 'left' | 'right') => {
    if (!activeSession) return;
    
    setMessageTranslations(prev => {
        const next = { ...prev };
        if (next[messageId]) {
            delete next[messageId];
        }
        return next;
    });

    setSessions(prev => {
        const session = prev[activeSession.id];
        return {
            ...prev,
            [activeSession.id]: {
                ...session,
                messages: session.messages.map(m => {
                    if (m.id === messageId && m.swipes && m.swipes.length > 1) {
                        const currentIdx = m.currentIndex || 0;
                        let newIdx = direction === 'left' ? currentIdx - 1 : currentIdx + 1;
                        
                        if (newIdx < 0) return m; 
                        if (newIdx >= m.swipes.length) return m; 
                        
                        return {
                            ...m,
                            currentIndex: newIdx,
                            content: m.swipes[newIdx]
                        };
                    }
                    return m;
                })
            }
        };
    });
  };

  const handleDeleteMessage = (messageId: string) => {
    if (!activeSession) return;
    const index = activeSession.messages.findIndex(m => m.id === messageId);
    if (index === 0) return; 
    setMessageToDeleteId(messageId);
  };

  const performDeleteSwipe = () => {
      if (!activeSession || !messageToDeleteId) return;
      setSessions(prev => {
          const session = prev[activeSession.id];
          return {
              ...prev,
              [activeSession.id]: {
                  ...session,
                  messages: session.messages.map(m => {
                      if (m.id === messageToDeleteId && m.swipes && m.swipes.length > 1) {
                          const currentIdx = m.currentIndex || 0;
                          const newSwipes = m.swipes.filter((_, i) => i !== currentIdx);
                          const newIdx = Math.max(0, currentIdx - 1);
                          return {
                              ...m,
                              swipes: newSwipes,
                              currentIndex: newIdx,
                              content: newSwipes[newIdx]
                          };
                      }
                      return m;
                  })
              }
          };
      });
      setMessageToDeleteId(null);
      showToast("Version deleted", "success");
  };

  const performDeleteMessage = () => {
    if (!activeSession || !messageToDeleteId) return;
    setSessions(prev => ({
        ...prev,
        [activeSession.id]: {
            ...activeSession,
            messages: activeSession.messages.filter(m => m.id !== messageToDeleteId),
            lastUpdated: Date.now()
        }
    }));
    setMessageTranslations(prev => {
        const next = { ...prev };
        delete next[messageToDeleteId];
        return next;
    });
    setMessageToDeleteId(null);
    showToast("Message deleted", "success");
  };

  const handleEditMessage = (messageId: string, currentContent: string) => {
      setEditingMessageId(messageId);
      setEditContent(currentContent);
  };

  const handleSaveEdit = (newContent: string) => {
      if (!activeSession || !editingMessageId) return;
      
      setMessageTranslations(prev => {
          const next = { ...prev };
          delete next[editingMessageId];
          return next;
      });

      // REPLACE PLACEHOLDERS ON EDIT
      const processedContent = activeChar ? replacePlaceholders(newContent, activeChar, settings.userName) : newContent;

      setSessions(prev => ({
          ...prev,
          [activeSession.id]: {
              ...activeSession,
              messages: activeSession.messages.map(m => {
                  if (m.id === editingMessageId) {
                      const updatedSwipes = [...(m.swipes || [m.content])];
                      const currentIdx = m.currentIndex || 0;
                      updatedSwipes[currentIdx] = processedContent;
                      return { 
                          ...m, 
                          content: processedContent, 
                          swipes: updatedSwipes,
                          currentIndex: currentIdx
                      };
                  }
                  return m;
              }),
              lastUpdated: Date.now()
          }
      }));
      setEditingMessageId(null);
      setEditContent("");
      showToast("Edit saved", "success");
  };

  const handleCopyMessage = (content: string) => {
      navigator.clipboard.writeText(content).then(() => {
          showToast("Copied to clipboard", "success");
      }).catch(() => {
          showToast("Failed to copy", "error");
      });
  };

  const handleCancelEdit = () => {
      setEditingMessageId(null);
      setEditContent("");
  };

  // Modified to take optional session ID for flexible summarization
  const handleGenerateSummary = async (mode: 'full' | 'incremental', length?: 'short' | 'medium' | 'detailed', promptOverride?: string, targetSessionId?: string) => {
    const targetSession = targetSessionId ? sessions[targetSessionId] : activeSession;
    if(!targetSession) return null;
    
    const lastMessageId = targetSession.messages[targetSession.messages.length - 1]?.id;
    let summaryText = "";

    // Apply prompt override if provided
    const summarySettings = promptOverride 
        ? { ...settings, summaryPromptOverride: promptOverride }
        : settings;

    try {
      if (mode === 'incremental' && targetSession.summary) {
          const lastIndex = targetSession.messages.findIndex(m => m.id === targetSession.lastSummarizedMessageId);
          const startIndex = lastIndex === -1 ? 0 : lastIndex + 1;
          const newMessages = targetSession.messages.slice(startIndex);
          
          if (newMessages.length === 0) {
              showToast("No new messages to summarize", "info");
              return null; 
          }

          const fragment = await summarizeChat(newMessages, summarySettings, targetSession.summary);
          summaryText = fragment; 
      } else {
          summaryText = await summarizeChat(targetSession.messages, summarySettings, undefined, length);
      }

      if (summaryText) {
         return { summary: summaryText, lastId: lastMessageId };
      } else {
        showError("Summarization Failed", "Failed to generate summary.");
        return null;
      }
    } catch (e: any) {
      const errorMessage = e?.message || String(e);
      if (errorMessage.startsWith("QUOTA_EXCEEDED")) {
          setQuotaErrorMsg(errorMessage.split("|")[1] || "Rate limit or quota exceeded.");
          setShowQuotaModal(true);
          setTempApiKey(settings.apiKey || "");
      } else {
          showError("Summarization Failed", errorMessage);
      }
      return null;
    }
  };

  // Modified to take optional session ID
  const handleSaveSession = (newSummary: string, lastSummarizedId?: string, targetSessionId?: string) => {
      const id = targetSessionId || (activeSession ? activeSession.id : null);
      if (!id) return;
      
      setSessions(prev => ({
          ...prev,
          [id]: {
              ...prev[id], 
              summary: newSummary,
              lastSummarizedMessageId: lastSummarizedId || prev[id].lastSummarizedMessageId,
              lastUpdated: Date.now()
          }
      }));
      showToast("Memory bank updated", "success");
  };

  const handleSaveChar = (char: Character) => {
    setCharacters(prev => {
      const exists = prev.find(c => c.id === char.id);
      if (exists) return prev.map(c => c.id === char.id ? char : c);
      return [...prev, char];
    });
    showToast("Entity saved", "success");
  };

  const handleUploadChar = (jsonData: any) => {
    const type = detectJsonType(jsonData);
    if (type === 'CHAT') {
        showError("Incorrect File Type", "This appears to be a Chat History.");
        return;
    }
    const source = jsonData.data ? jsonData.data : jsonData;
    
    let appearance = source.appearance || "";
    if (source.extensions && source.extensions.appearance && source.extensions.appearance !== appearance) {
        if (appearance) appearance += "\n\n";
        appearance += source.extensions.appearance;
    }
    if (source.extensions && source.extensions.velvet_core && source.extensions.velvet_core.appearance) {
         if (!appearance) appearance = source.extensions.velvet_core.appearance;
    }
    
    let lorebooks: Lorebook[] = [];

    if (source.lorebooks && Array.isArray(source.lorebooks)) {
        lorebooks = source.lorebooks;
    } else if (source.character_book && source.character_book.entries) {
        const entries: LorebookEntry[] = source.character_book.entries.map((entry: any) => {
            if (!entry) return null; 
            return {
                id: generateId(),
                keys: entry.keys || [],
                content: entry.content || "",
                enabled: entry.enabled !== false
            };
        }).filter((e: any) => e !== null); 

        if (entries.length > 0) {
            lorebooks.push({
                id: generateId(),
                name: source.character_book.name || "Character Lore",
                description: source.character_book.description || "",
                entries: entries,
                enabled: true
            });
        }
    }

    // Extract alternate greetings
    let alternateGreetings: string[] = [];
    if (Array.isArray(source.alternate_greetings)) {
        alternateGreetings = source.alternate_greetings.filter((g: any) => typeof g === 'string' && g.trim().length > 0);
    }

    const newChar: Character = {
      id: generateId(),
      name: source.name || source.ch_name || "Unknown Entity",
      tagline: source.tagline || source.short_description || source.creator_notes || "", 
      description: source.description || "",
      background: source.background || source.lore || "",
      appearance: appearance, 
      personality: source.personality || "",
      firstMessage: source.firstMessage || source.first_mes || "...",
      alternateGreetings: alternateGreetings,
      chatExamples: source.chatExamples || source.mes_example || source.example_dialogue || "",
      scenario: source.scenario || "",
      eventSequence: source.eventSequence || source.event_sequence || source.plot_points || (source.extensions?.velvet_core?.eventSequence) || "",
      style: source.style || source.writing_style || source.narrative_style || source.style_guide || (source.extensions?.velvet_core?.style) || "",
      jailbreak: source.jailbreak || source.post_history_instructions || source.system_prompt || "",
      avatarUrl: source.avatarUrl || source.avatar || `https://picsum.photos/id/${Math.floor(Math.random() * 100)}/200/200`,
      lorebooks: lorebooks
    };
    handleSaveChar(newChar);
    setIsSidebarOpen(false);
    setChatSelection(newChar.id);
  };

  const initiateRenameSession = (sessionId: string) => {
    setRenameInput(sessions[sessionId]?.name || "");
    setSessionAction({ type: 'rename', sessionId });
  };
  const performRenameSession = () => {
    if (sessionAction?.type === 'rename' && sessionAction.sessionId && renameInput.trim()) {
      setSessions(prev => ({
        ...prev,
        [sessionAction.sessionId!]: { ...prev[sessionAction.sessionId!], name: renameInput.trim() }
      }));
      setSessionAction(null);
      showToast("Session renamed", "success");
    }
  };
  const initiateDeleteSession = (sessionId: string) => setSessionAction({ type: 'delete', sessionId });
  const performDeleteSession = () => {
     if (sessionAction?.type === 'delete' && sessionAction.sessionId) {
      const sessionId = sessionAction.sessionId;
      setSessions(prev => {
        const next = { ...prev };
        delete next[sessionId];
        return next;
      });
      if (activeSessionId === sessionId) setActiveSessionId(null);
      setSessionAction(null);
      showToast("Record deleted", "success");
    }
  };
  const handleSelectSessionFromSidebar = (sessionId: string) => {
    setActiveSessionId(sessionId);
    if (sessions[sessionId]) setActiveCharId(sessions[sessionId].characterId);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };
  const handleSelectChar = (id: string) => {
    setIsSidebarOpen(false);
    setChatSelection(id);
    setActiveCharId(id);
  };
  const handleStartNewChat = () => {
    if (!chatSelection) return;
    const char = characters.find(c => c.id === chatSelection);
    if (!char) return;
    const newSessionId = generateId();

    // Collect all greetings: Main + Alternates
    const allGreetings = [char.firstMessage, ...(char.alternateGreetings || [])];
    
    // Process placeholders for ALL greetings and filter empty ones
    const processedSwipes = allGreetings
        .filter(g => g && g.trim())
        .map(g => replacePlaceholders(g, char, settings.userName));

    // Fallback if somehow empty
    if (processedSwipes.length === 0) processedSwipes.push("...");

    const newSession: ChatSession = {
        id: newSessionId,
        characterId: chatSelection,
        name: `Entry ${new Date().toLocaleDateString()}`,
        messages: [{ 
            id: generateId(), 
            role: 'model', 
            content: processedSwipes[0], 
            timestamp: Date.now(),
            swipes: processedSwipes, // Add all processed variations here
            currentIndex: 0
        }],
        summary: '',
        lastUpdated: Date.now()
    };
    setSessions(prev => ({ ...prev, [newSessionId]: newSession }));
    setActiveCharId(chatSelection);
    setActiveSessionId(newSessionId);
    setChatSelection(null);
  };
  const handleContinueChat = () => {
    if (!chatSelection) return;
    const charSessions = (Object.values(sessions) as ChatSession[]).filter((s) => s.characterId === chatSelection).sort((a, b) => b.lastUpdated - a.lastUpdated);
    if (charSessions.length > 0) {
        setActiveSessionId(charSessions[0].id);
        setActiveCharId(chatSelection);
    } else {
        handleStartNewChat();
        return;
    }
    setChatSelection(null);
  };
  const handleImportChat = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!chatSelection) return;
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const json = JSON.parse(event.target?.result as string);
            if (detectJsonType(json) === 'CHARACTER') {
                showError("Incorrect File Type", "This appears to be a Character Card.");
                return;
            }
            let rawMessages: any[] = [];
            if (json.type === 'risuChat' && json.data && Array.isArray(json.data.message)) rawMessages = json.data.message;
            else if (Array.isArray(json)) rawMessages = json;
            else if (json.messages) rawMessages = json.messages;
            else if (json.history) rawMessages = json.history;
            else if (json.data && Array.isArray(json.data.messages)) rawMessages = json.data.messages;
            else { showError("Invalid File", "Could not find chat history."); return; }

            const loadedMessages: Message[] = rawMessages.map((m: any) => {
                let role: 'user' | 'model' = 'user';
                if (m.role === 'char' || m.role === 'model' || m.role === 'assistant' || m.is_user === false) role = 'model';
                const content = m.data || m.content || m.mes || '';
                return {
                    id: m.id || generateId(),
                    role: role,
                    content: content,
                    timestamp: m.timestamp || m.send_date || m.time || Date.now(),
                    swipes: [content],
                    currentIndex: 0
                };
            });
            const newSessionId = generateId();
            setSessions(prev => ({
                ...prev,
                [newSessionId]: {
                    id: newSessionId,
                    characterId: chatSelection,
                    name: file.name.replace('.json', '') || 'Imported Log',
                    messages: loadedMessages,
                    summary: json.summary || '',
                    lastUpdated: Date.now()
                }
            }));
            setActiveCharId(chatSelection);
            setActiveSessionId(newSessionId);
            setChatSelection(null);
            showToast("Chat imported successfully", "success");
        } catch (err) { showError("Import Error", "Failed to import chat."); }
    };
    reader.readAsText(file);
    if (chatFileInputRef.current) chatFileInputRef.current.value = '';
  };

  const defaultUserAvatar = "https://ui-avatars.com/api/?name=User&background=18181b&color=71717a";
  const selectedCharForMenu = chatSelection ? characters.find(c => c.id === chatSelection) : null;
  const isReadyToSend = !!(activeChar && activeSession && !isGenerating);

  const handleSaveQuotaKey = () => {
      const newSettings = { ...settings, apiKey: tempApiKey.trim() };
      setSettings(newSettings);
      localStorage.setItem('erebos_settings', JSON.stringify(newSettings));
      setShowQuotaModal(false);
      showToast("API Key updated. Please try again.", "success");
  };

  return (
    <div className="flex bg-[#030303] text-zinc-300 font-sans overflow-hidden" style={{ height: viewportHeight }} dir={settings.language === 'ar' ? 'rtl' : 'ltr'}>
      <ToastContainer toasts={toasts} />
      
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)}
        characters={characters}
        onSelectChar={handleSelectChar}
        activeCharId={activeCharId}
        onUploadChar={handleUploadChar}
        onDownloadChar={handleDownloadCharacter}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSessionFromSidebar}
        onRenameSession={initiateRenameSession}
        onDeleteSession={initiateDeleteSession}
        onDownloadSession={handleDownloadChat}
        onError={showError}
        onEditChar={(char) => { setEditingChar(char); setIsCharModalOpen(true); }}
        onCreateChar={handleCreateChar}
        manageMode={manageMode}
        setManageMode={handleSetManageMode}
        selectedIds={selectedIds}
        toggleSelection={handleToggleSelection}
        onBulkDelete={handleBulkDelete}
        onViewImage={setViewedImage}
        language={settings.language || 'en'}
      />

      <div className="flex-1 flex flex-col relative overflow-hidden">
        {settings.customBackgroundUrl ? (
            <>
                <div 
                    className="absolute inset-0 bg-cover bg-center z-0 transition-all duration-700"
                    style={{ 
                        backgroundImage: `url(${settings.customBackgroundUrl})`,
                        filter: `blur(${settings.backgroundBlur}px)`
                    }}
                />
                <div 
                    className="absolute inset-0 bg-black z-0 transition-all duration-500"
                    style={{ opacity: settings.backgroundOpacity }}
                />
            </>
        ) : (
             <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-900/40 via-[#030303] to-[#030303] z-0 transition-all duration-700"></div>
        )}

        <div className="flex-1 flex flex-col relative z-10 h-full">
            <div className="flex items-center justify-between p-6 border-b border-zinc-900/50 bg-[#030303]/60 backdrop-blur z-10 transition-all duration-500">
             <div className="w-full max-w-6xl mx-auto flex items-center justify-between gap-4">
                <div className="flex items-center gap-6 flex-1 min-w-0 group/header">
                    <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-zinc-400 hover:text-white transition-colors shrink-0">
                        <Menu size={24} />
                    </button>
                    {activeChar && activeSession && (
                    <div className="flex items-center gap-4 animate-slide-up-fade min-w-0 flex-1">
                        <div className="relative group cursor-pointer shrink-0">
                            <div className="absolute inset-0 bg-orange-500/20 blur-md rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                            <img 
                                src={activeChar.avatarUrl || undefined} 
                                className="relative w-12 h-12 rounded-full object-cover ring-1 ring-zinc-800 group-hover:ring-orange-500/50 transition-all duration-500 shadow-lg cursor-zoom-in" 
                                onClick={(e) => { e.stopPropagation(); setViewedImage(activeChar.avatarUrl); }}
                            />
                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-black shadow-[0_0_8px_rgba(16,185,129,0.5)] pointer-events-none"></div>
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <h2 className="text-xl font-serif font-bold text-white tracking-wide leading-none truncate cursor-pointer" onClick={() => { setEditingChar(activeChar); setIsCharModalOpen(true); }}>
                                    {activeChar.name.toUpperCase()}
                                </h2>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setEditingChar(activeChar); setIsCharModalOpen(true); }}
                                    className="shrink-0 text-zinc-700 hover:text-orange-500 transition-colors p-1"
                                >
                                    <Edit2 size={14} />
                                </button>
                            </div>
                            <p className="text-[10px] text-orange-500/80 uppercase tracking-widest font-medium">
                                {activeSession ? `// ${activeSession.name}` : '// STANDBY'}
                            </p>
                        </div>
                    </div>
                    )}
                </div>
                
                <div className="flex items-center gap-1 bg-zinc-900/30 p-1 rounded-lg border border-zinc-800/50 backdrop-blur-md shrink-0">
                    {activeChar?.id === 'designer' && activeSession && (
                        <button
                            onClick={() => handleSendMessage("Please summarize the character we've been designing into a JSON block and output [ACTION: APPLY_CHARACTER].")}
                            disabled={isGenerating}
                            className={`p-2 rounded-md transition-all duration-300 ${isGenerating ? 'text-zinc-600 opacity-50' : 'text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-400'}`}
                            title="Extract & Apply Character"
                        >
                            <Sparkles size={18} />
                        </button>
                    )}
                    {activeChar && activeSession && (
                        manageMode === 'messages' ? (
                            <button 
                                onClick={() => handleSetManageMode(null)} 
                                className="p-2 text-orange-500 bg-orange-500/10 rounded-md hover:bg-orange-500/20 transition-all duration-300"
                                title="Exit Selection"
                            >
                                <X size={18} />
                            </button>
                        ) : (
                            <button 
                                onClick={() => handleSetManageMode('messages')}
                                className="p-2 text-zinc-400 hover:text-orange-400 hover:bg-white/5 rounded-md transition-all duration-300"
                                title="Manage Messages"
                            >
                                <ListChecks size={18} />
                            </button>
                        )
                    )}

                    {activeChar && activeSession && <div className="w-px h-4 bg-zinc-700/50 mx-1"></div>}

                    <button 
                        onClick={() => { setSettingsTab('general'); setIsSettingsOpen(true); }}
                        className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-md transition-all duration-300 group"
                        title="Configuration"
                    >
                        <Settings size={18} className="group-hover:rotate-90 transition-transform duration-500" />
                    </button>
                </div>
              </div>
            </div>

            <div 
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto px-4 py-8 space-y-8 scroll-auto scrollbar-thin scrollbar-thumb-zinc-800 w-full max-w-6xl mx-auto"
            >
            {!activeSession ? (
                <div 
                    className="h-full flex flex-col items-center justify-center space-y-6 select-none"
                >
                    <div 
                        onClick={handleOrbClick}
                        className={`
                        w-32 h-32 rounded-full border border-orange-900/50 flex items-center justify-center 
                        transition-all duration-300 cursor-pointer
                        ${isOrbFlashed ? 'bg-orange-500 shadow-[0_0_100px_rgba(249,115,22,0.8)] scale-110 border-orange-400' : 'bg-transparent shadow-[0_0_30px_rgba(234,88,12,0.2)] hover:border-orange-500/80 hover:shadow-[0_0_60px_rgba(234,88,12,0.3)] hover:scale-105'}
                        `}
                    >
                        <Sparkles 
                            size={40} 
                            className={`
                            transition-all duration-300
                            ${isOrbFlashed ? 'text-white scale-125 rotate-45' : 'text-orange-500 hover:rotate-12'}
                            `} 
                        />
                    </div>
                    <div className="text-center font-serif pointer-events-none group">
                        <h3 className="text-2xl text-transparent bg-clip-text bg-gradient-to-br from-white to-orange-200 tracking-[0.2em] mb-2 font-bold transition-colors">MANIFESTATION</h3>
                        <p className="text-orange-900 text-xs tracking-widest uppercase font-bold transition-colors duration-300 group-hover:text-orange-500">Select an entity to begin communion</p>
                    </div>
                </div>
            ) : (
                <>
                    {activeSession.messages.map((msg, idx) => {
                        let thoughtContent: string | null = null;
                        let displayContent = msg.content;
                        
                        if (msg.role === 'model') {
                            const thinkMatch = msg.content.match(/<think>([\s\S]*?)<\/think>/);
                            if (thinkMatch) {
                                thoughtContent = thinkMatch[1].trim();
                                displayContent = msg.content.replace(/<think>[\s\S]*?<\/think>/, '').trim();
                            }
                        }

                        const swipesCount = msg.swipes ? msg.swipes.length : 1;
                        const currentSwipeIdx = msg.currentIndex || 0;
                        const isLastMessage = idx === activeSession.messages.length - 1;
                        const translationState = messageTranslations[msg.id];

                        return (
                        <div 
                        key={msg.id} 
                        onClick={() => {
                            if (manageMode === 'messages' && idx !== 0) {
                                handleToggleSelection(msg.id);
                            }
                        }}
                        className={`flex flex-col gap-2 group/message animate-slide-up-fade relative ${msg.role === 'user' ? 'items-end' : 'items-start'} ${manageMode === 'messages' && idx !== 0 ? 'cursor-pointer hover:opacity-90 pl-12' : ''}`}
                        >
                            {manageMode === 'messages' && idx !== 0 && (
                                <div className={`absolute left-0 top-1/2 -translate-y-1/2 transition-all duration-300 z-20 ${selectedIds.has(msg.id) ? 'text-orange-500 scale-110' : 'text-zinc-700'}`}>
                                    {selectedIds.has(msg.id) ? <CheckSquare size={24} /> : <Square size={24} />}
                                </div>
                            )}

                            <div className={`flex items-end gap-4 max-w-[90%] md:max-w-[70%] lg:max-w-[65%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                
                                <div className="shrink-0 mb-1 cursor-zoom-in" onClick={(e) => { 
                                    e.stopPropagation(); 
                                    setViewedImage(msg.role === 'model' && activeChar ? activeChar.avatarUrl : (settings.userAvatarUrl || defaultUserAvatar)); 
                                }}>
                                    {msg.role === 'model' && activeChar ? (
                                        <img src={activeChar.avatarUrl || undefined} className="w-8 h-8 rounded-sm object-cover opacity-80 group-hover:opacity-100 transition-all duration-300 shadow-[0_0_10px_rgba(0,0,0,0.5)]" />
                                    ) : (
                                        <img src={settings.userAvatarUrl || defaultUserAvatar} className="w-8 h-8 rounded-sm object-cover opacity-60 group-hover:opacity-100 transition-all duration-300" />
                                    )}
                                </div>

                                {editingMessageId === msg.id ? (
                                    <div className={`flex flex-col gap-2 w-full min-w-[300px] animate-fade-in ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                        <MessageEditor 
                                            initialContent={editContent}
                                            role={msg.role as 'user' | 'model'}
                                            isFirstMessage={idx === 0}
                                            isGenerating={isGenerating}
                                            onCancel={handleCancelEdit}
                                            onSave={handleSaveEdit}
                                            onRegenerate={() => handleRegenerateMessage(msg.id)}
                                        />
                                    </div>
                                ) : (
                                    <div className="relative group/bubble w-full">
                                        <div 
                                            className={`
                                                relative p-5 text-sm md:text-base leading-7 tracking-wide transition-all duration-300
                                                ${msg.role === 'user' 
                                                ? 'bg-zinc-900/40 text-zinc-300 border shadow-[0_0_15px_-3px_rgba(249,115,22,0.15)] rounded-2xl rounded-tr-sm' 
                                                : 'bg-black/40 text-zinc-200 border shadow-[0_0_20px_-5px_rgba(249,115,22,0.05)] rounded-2xl rounded-tl-sm'}
                                                ${manageMode === 'messages' && selectedIds.has(msg.id) ? 'border-orange-500 bg-orange-950/20' : msg.role === 'user' ? 'border-orange-500/60' : 'border-orange-500/30'}
                                            `}
                                        >
                                            {msg.role === 'model' && (
                                                <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/0 via-zinc-900/0 to-orange-900/10 pointer-events-none rounded-2xl"></div>
                                            )}
                                            
                                            <div className="whitespace-pre-wrap font-light relative z-10 select-text cursor-text">
                                                {thoughtContent && <ThoughtBlock content={thoughtContent} />}
                                                {renderFormattedContent(displayContent, settings)}
                                            </div>

                                            {translationState && translationState.visible && (
                                                <div className="mt-3 pt-3 border-t border-white/10 relative z-10 animate-slide-up-fade">
                                                    <div className="flex items-center gap-2 mb-1 text-[10px] uppercase font-bold text-orange-500/80 tracking-wider">
                                                        <Languages size={10} /> Translation
                                                    </div>
                                                    {translationState.loading ? (
                                                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                                                            <Loader2 size={12} className="animate-spin" /> Translating...
                                                        </div>
                                                    ) : (
                                                        <div className="text-sm font-light text-zinc-300 leading-relaxed whitespace-pre-wrap" dir="auto">
                                                            {renderFormattedContent(translationState.text, settings)}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {!manageMode && (
                                                <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-white/5 relative z-10 select-none">
                                                    
                                                    {swipesCount > 1 && (
                                                        <div className="flex items-center gap-1 mr-auto bg-black/40 rounded px-1.5 py-0.5 border border-white/5">
                                                            <button 
                                                                onClick={() => handleSwipeMessage(msg.id, 'left')}
                                                                className="text-zinc-500 hover:text-orange-500 transition-colors p-0.5 disabled:opacity-30 disabled:hover:text-zinc-500 disabled:cursor-not-allowed"
                                                                disabled={currentSwipeIdx === 0}
                                                            >
                                                                <ChevronLeft size={10} />
                                                            </button>
                                                            <span className="text-[9px] font-mono text-zinc-400">{currentSwipeIdx + 1}/{swipesCount}</span>
                                                            <button 
                                                                onClick={() => handleSwipeMessage(msg.id, 'right')}
                                                                className="text-zinc-500 hover:text-orange-500 transition-colors p-0.5 disabled:opacity-30 disabled:hover:text-zinc-500 disabled:cursor-not-allowed"
                                                                disabled={currentSwipeIdx === swipesCount - 1}
                                                            >
                                                                <ChevronRight size={10} />
                                                            </button>
                                                        </div>
                                                    )}

                                                    <button 
                                                        onClick={() => toggleMessageTranslation(msg.id, displayContent, msg.role)} 
                                                        className={`p-1 rounded hover:bg-white/5 transition-colors ${translationState?.visible ? 'text-orange-500' : ''}`}
                                                        style={!translationState?.visible ? { color: settings.actionButtonColor, opacity: settings.actionButtonOpacity } : {}}
                                                        title="Translate"
                                                    >
                                                        <Languages size={12} />
                                                    </button>

                                                    <button 
                                                        onClick={() => handleCopyMessage(msg.content)} 
                                                        className="p-1 rounded hover:bg-white/5 transition-colors"
                                                        style={{ color: settings.actionButtonColor, opacity: settings.actionButtonOpacity }}
                                                        title="Copy"
                                                    >
                                                        <Copy size={12} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleEditMessage(msg.id, msg.content)} 
                                                        disabled={isGenerating}
                                                        className="p-1 rounded hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                                        style={{ color: settings.actionButtonColor, opacity: settings.actionButtonOpacity }}
                                                        title="Edit"
                                                    >
                                                        <Edit size={12} />
                                                    </button>
                                                    
                                                    {msg.role === 'model' && idx !== 0 && (
                                                        <button 
                                                            onClick={() => handleRegenerateMessage(msg.id)}
                                                            className="p-1 rounded hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                                            style={{ color: settings.actionButtonColor, opacity: settings.actionButtonOpacity }}
                                                            title="Regenerate"
                                                            disabled={isGenerating}
                                                        >
                                                            <RefreshCw size={12} className={isGenerating ? "animate-spin" : ""} />
                                                        </button>
                                                    )}

                                                    {msg.role === 'model' && isLastMessage && !isGenerating && idx !== 0 && (
                                                         <button 
                                                            onClick={handleContinueGeneration}
                                                            className="p-1 rounded hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                                            style={{ color: settings.actionButtonColor, opacity: settings.actionButtonOpacity }}
                                                            title="Continue Generation"
                                                        >
                                                            <FastForward size={12} />
                                                        </button>
                                                    )}

                                                    {msg.role === 'model' && activeChar?.id === 'designer' && extractJSON(msg.content) && (
                                                        <button 
                                                            onClick={() => {
                                                                let result = extractJSON(msg.content);
                                                                if (result) {
                                                                    if (Array.isArray(result)) result = result[0];
                                                                    if (result.character) result = result.character;
                                                                    const newChar: Character = {
                                                                        id: generateId(),
                                                                        name: result.name || 'New Entity',
                                                                        tagline: result.tagline || '',
                                                                        description: result.description || '',
                                                                        background: result.background || '',
                                                                        appearance: result.appearance || '',
                                                                        personality: result.personality || '',
                                                                        firstMessage: result.firstMessage || '',
                                                                        alternateGreetings: result.alternateGreetings || [],
                                                                        chatExamples: result.chatExamples || '',
                                                                        avatarUrl: result.avatarUrl || '',
                                                                        scenario: result.scenario || '',
                                                                        jailbreak: result.jailbreak || '',
                                                                        style: result.style || '',
                                                                        eventSequence: result.eventSequence || '',
                                                                        lorebooks: result.lorebooks || []
                                                                    };
                                                                    setCharacters(prev => [newChar, ...prev]);
                                                                    setActiveCharId(newChar.id);
                                                                    setManageMode(null);
                                                                    const newSessionId = generateId();
                                                                    setSessions(prev => ({
                                                                        ...prev,
                                                                        [newSessionId]: {
                                                                            id: newSessionId,
                                                                            characterId: newChar.id,
                                                                            messages: [],
                                                                            lastUpdated: Date.now(),
                                                                            summary: '',
                                                                            lastSummarizedMessageId: null
                                                                        }
                                                                    }));
                                                                    setActiveSessionId(newSessionId);
                                                                    showToast("Entity imported successfully", "success");
                                                                }
                                                            }}
                                                            className="p-1 rounded hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                                            style={{ color: settings.actionButtonColor, opacity: settings.actionButtonOpacity }}
                                                            title={t('importDataNow')}
                                                        >
                                                            <Download size={12} />
                                                        </button>
                                                    )}

                                                    {idx !== 0 && (
                                                        <button 
                                                            onClick={() => handleDeleteMessage(msg.id)}
                                                            disabled={isGenerating}
                                                            className="p-1 rounded hover:bg-white/5 hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                                            style={{ color: settings.actionButtonColor, opacity: settings.actionButtonOpacity }}
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            <div className={`text-[9px] text-zinc-700 uppercase tracking-widest px-14 opacity-0 group-hover/message:opacity-100 transition-opacity duration-500`}>
                                {msg.role === 'user' ? settings.userName : activeChar?.name} • {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </div>
                        </div>
                    );
                    })}
                    
                    {isGenerating && (
                        <div className="flex items-start gap-4 animate-pulse">
                            <div className="w-8 h-8 rounded-sm bg-zinc-900 shadow-inner"></div>
                            <div className="flex gap-1.5 pt-3">
                                <div className="w-1 h-1 bg-orange-500/50 rounded-full animate-bounce shadow-[0_0_5px_rgba(249,115,22,0.5)]"></div>
                                <div className="w-1 h-1 bg-orange-500/50 rounded-full animate-bounce delay-150 shadow-[0_0_5px_rgba(249,115,22,0.5)]"></div>
                                <div className="w-1 h-1 bg-orange-500/50 rounded-full animate-bounce delay-300 shadow-[0_0_5px_rgba(249,115,22,0.5)]"></div>
                            </div>
                        </div>
                    )}
                    <div ref={bottomRef} />
                </>
            )}
            </div>

            {/* Translation and Input area code ... (omitted for brevity, assume unchanged logic) */}
            {activeSession && !manageMode && (
            <div className="p-6 md:p-8 pt-2 bg-gradient-to-t from-[#030303] via-[#030303] to-transparent relative">
                
                {/* Translation Modal Overlay */}
                {translation.visible && (
                    <div className="absolute bottom-full left-6 right-6 md:left-8 md:right-8 mb-2 z-30 animate-slide-up-fade">
                        <div className="bg-[#0a0a0a] border border-orange-900/50 rounded-lg shadow-[0_0_30px_rgba(0,0,0,0.8)] overflow-hidden">
                            <div className="flex items-center justify-between p-2 px-3 bg-zinc-900/50 border-b border-zinc-800">
                                <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest flex items-center gap-2">
                                    <Languages size={12} /> Translator // {translation.loading ? "Processing..." : "EN Output"}
                                </span>
                                <button onClick={() => setTranslation(prev => ({ ...prev, visible: false }))} className="text-zinc-500 hover:text-white">
                                    <X size={14} />
                                </button>
                            </div>
                            <div className="p-3">
                                {translation.loading ? (
                                    <div className="flex items-center justify-center py-4">
                                        <Loader2 className="animate-spin text-orange-500" size={20} />
                                    </div>
                                ) : translation.error ? (
                                    <div className="text-center py-2">
                                        <p className="text-xs text-red-400 mb-2 flex items-center justify-center gap-1"><AlertTriangle size={12}/> {translation.error}</p>
                                        <div className="flex justify-center gap-2">
                                            <button 
                                                onClick={handleTranslateWithSystem}
                                                className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1 rounded border border-zinc-700 transition-colors"
                                            >
                                                Retry with System (AI)
                                            </button>
                                            <a 
                                                href={`https://translate.google.com/?sl=auto&tl=en&text=${encodeURIComponent(translation.original)}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1 rounded border border-zinc-700 transition-colors flex items-center gap-1"
                                            >
                                                Open External <ExternalLink size={10}/>
                                            </a>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-sm text-zinc-300 leading-relaxed font-light select-text">{translation.translated}</p>
                                        <div className="mt-3 pt-3 border-t border-zinc-800 flex justify-end gap-2">
                                            <button 
                                                onClick={() => {
                                                    navigator.clipboard.writeText(translation.translated);
                                                    showToast("Copied translation", "success");
                                                }}
                                                className="flex items-center gap-1 text-[10px] bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white px-2 py-1 rounded transition-colors"
                                            >
                                                <Clipboard size={12} /> Copy
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    setInputVal(translation.translated);
                                                    setTranslation(prev => ({ ...prev, visible: false }));
                                                }}
                                                className="flex items-center gap-1 text-[10px] bg-orange-900/20 hover:bg-orange-900/40 border border-orange-900/50 text-orange-400 hover:text-orange-300 px-3 py-1 rounded transition-colors"
                                            >
                                                <ArrowDown size={12} /> Replace Input
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <div className="max-w-6xl mx-auto relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500/20 to-zinc-800/50 rounded-lg blur opacity-0 group-hover:opacity-100 transition duration-1000 group-focus-within:opacity-100 group-focus-within:duration-500"></div>
                <div className="relative flex items-end gap-2 bg-[#080808] border border-zinc-800/50 rounded-lg p-2 shadow-2xl transition-colors duration-300 group-focus-within:border-orange-900/30">
                    <textarea
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    onFocus={(e) => {
                        if (window.innerWidth < 768) {
                            setTimeout(() => {
                                e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }, 300);
                        }
                    }}
                    onKeyDown={(e) => {
                        const isMobile = window.innerWidth < 768;
                        if (e.key === 'Enter' && !e.shiftKey) {
                            if (isMobile) {
                                return;
                            }
                            e.preventDefault();
                            handleSendMessage();
                        }
                    }}
                    placeholder={activeChar ? `Write to ${activeChar.name}... (or send empty to continue)` : "..."}
                    className="w-full bg-transparent border-none text-zinc-300 placeholder-zinc-700 focus:ring-0 outline-none resize-none h-12 md:h-auto min-h-[3rem] max-h-32 py-3 px-3 font-light tracking-wide text-sm scrollbar-none"
                    disabled={!activeChar || !activeSession || isGenerating}
                    rows={1}
                    />
                    
                    <button
                        onClick={handleTranslateInput}
                        disabled={!inputVal.trim() || isGenerating}
                        className={`
                            p-3 transition-all duration-300 rounded-lg
                            ${inputVal.trim() && !isGenerating
                                ? 'text-zinc-400 hover:text-orange-400 hover:bg-white/5'
                                : 'text-zinc-700 opacity-30 cursor-not-allowed'
                            }
                        `}
                        title="Translate to English"
                    >
                        <Languages size={20} strokeWidth={1.5} />
                    </button>

                    {isGenerating ? (
                         <button
                            onClick={handleStopGeneration}
                            className="p-3 text-red-500 hover:text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.4)] animate-pulse transition-all duration-300 rounded-lg"
                            title="Stop Generation"
                        >
                            <Square size={20} fill="currentColor" />
                        </button>
                    ) : (
                        <button
                        onClick={() => handleSendMessage()} 
                        disabled={!isReadyToSend}
                        className={`
                            p-3 transition-all duration-300 rounded-lg
                            ${isReadyToSend 
                                ? 'text-orange-500 hover:text-orange-400 shadow-[0_0_10px_rgba(234,88,12,0.4)] animate-pulse' 
                                : 'text-zinc-600 opacity-30 cursor-not-allowed'
                            }
                        `}
                        >
                            {inputVal.trim() ? <MessageSquarePlus size={20} strokeWidth={1.5} /> : <Play size={20} strokeWidth={1.5} fill="currentColor" className="opacity-80"/>}
                        </button>
                    )}
                </div>
                <div className="mt-2 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                    <p className="text-[9px] text-zinc-700 tracking-[0.3em] font-serif uppercase">VelvetCore // Interactive</p>
                </div>
                </div>
            </div>
            )}
            
            {activeSession && manageMode === 'messages' && (
                <div className="p-6 md:p-8 pt-2 bg-[#030303] border-t border-zinc-900">
                    <div className="max-w-6xl mx-auto flex items-center justify-between">
                         <div className="text-zinc-500 text-xs font-bold uppercase tracking-wider">
                            {selectedIds.size} Messages Selected
                         </div>
                         <Button variant="danger" onClick={handleBulkDelete} disabled={selectedIds.size === 0}>
                            Delete Selected
                         </Button>
                    </div>
                </div>
            )}
        </div>
      </div>
      
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={setSettings}
        initialTab={settingsTab}
      />

      <CharacterModal
        isOpen={isCharModalOpen}
        onClose={() => setIsCharModalOpen(false)}
        onSave={handleSaveChar}
        character={editingChar}
        currentSummary={editingSession?.summary}
        currentLastSummarizedId={editingSession?.lastSummarizedMessageId}
        onSummarize={editingSession ? (mode, length, prompt) => handleGenerateSummary(mode, length, prompt, editingSession.id) : undefined}
        onSaveSession={(summary, lastId) => { if(editingSession) handleSaveSession(summary, lastId, editingSession.id) }}
        hasNewMessages={editingSessionHasNewMessages}
        settings={settings}
      />
      
      {viewedImage && (
        <FloatingImageViewer 
          src={viewedImage}
          onClose={() => setViewedImage(null)}
        />
      )}

      {/* Character Selection Modal - Restored */}
      {selectedCharForMenu && (
        <div className="fixed top-0 left-0 w-full z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in" style={{ height: viewportHeight }}>
             <div className="relative bg-[#050505] border border-zinc-800 w-full max-w-md p-8 shadow-[0_0_100px_rgba(234,88,12,0.15)] animate-modal-enter">
                <button onClick={() => setChatSelection(null)} className="absolute top-4 right-4 text-zinc-600 hover:text-white transition-colors">
                    <X size={20} />
                </button>

                <div className="flex justify-center mb-8 relative">
                    <div className="absolute inset-0 bg-orange-500/20 blur-xl rounded-full animate-pulse-slow"></div>
                    <div 
                        className="w-32 h-32 rounded-full p-1 bg-gradient-to-b from-zinc-700 to-black relative z-10 shadow-2xl cursor-zoom-in"
                        onClick={(e) => { e.stopPropagation(); setViewedImage(selectedCharForMenu.avatarUrl); }}
                    >
                         <img 
                            src={selectedCharForMenu.avatarUrl || undefined} 
                            className="w-full h-full rounded-full object-cover border-4 border-[#050505]" 
                         />
                    </div>
                </div>
                <div className="text-center mb-8">
                    <h3 className="text-xs font-serif text-orange-500 tracking-[0.3em] mb-2 uppercase drop-shadow-[0_0_8px_rgba(234,88,12,0.5)]">Manifestation // Character</h3>
                    <h2 className="text-3xl font-serif font-bold text-white mb-2">{selectedCharForMenu.name}</h2>
                    <p className="text-xs text-zinc-500 font-light leading-relaxed max-w-[80%] mx-auto">
                        {selectedCharForMenu.tagline || selectedCharForMenu.description.slice(0, 80) + "..."}
                    </p>
                </div>
                
                <div className="space-y-3">
                    <Button fullWidth variant="primary" onClick={handleStartNewChat} className="flex items-center justify-center gap-2 py-4 shadow-[0_0_20px_rgba(234,88,12,0.2)] hover:shadow-[0_0_30px_rgba(234,88,12,0.4)] transition-shadow duration-500">
                        <MessageSquarePlus size={16} /> Start New Communion
                    </Button>

                    <Button fullWidth variant="outline" onClick={handleContinueChat} className="flex items-center justify-center gap-2 py-4">
                        <History size={16} /> Resume Manifestation
                    </Button>

                     <Button fullWidth variant="ghost" onClick={() => chatFileInputRef.current?.click()} className="flex items-center justify-center gap-2 py-4 text-zinc-600 hover:text-orange-400">
                        <FolderInput size={16} /> {t('importRecord')}
                    </Button>
                    <input type="file" ref={chatFileInputRef} onChange={handleImportChat} className="hidden" accept=".json" />
                </div>
             </div>
        </div>
      )}

      {/* Session Action Modal */}
      {sessionAction && (
          <div className="fixed top-0 left-0 w-full z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm" style={{ height: viewportHeight }}>
              <div className="bg-[#0a0a0a] border border-orange-900/30 p-6 rounded shadow-lg max-w-sm w-full m-4">
                  <h4 className="text-orange-500 font-bold mb-4 uppercase tracking-wider">
                      {sessionAction.type === 'rename' && 'Rename Memory'}
                      {sessionAction.type === 'delete' && 'Delete Memory'}
                      {sessionAction.type === 'bulk_delete' && 'Bulk Delete'}
                  </h4>
                  
                  {sessionAction.type === 'rename' && (
                      <input 
                        className="w-full bg-black border border-zinc-800 p-3 text-zinc-200 focus:border-orange-500/50 outline-none mb-6"
                        value={renameInput}
                        onChange={(e) => setRenameInput(e.target.value)}
                        onFocus={(e) => {
                            if (window.innerWidth < 768) {
                                setTimeout(() => {
                                    e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }, 300);
                            }
                        }}
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && performRenameSession()}
                      />
                  )}

                  {sessionAction.type === 'delete' && (
                      <p className="text-zinc-400 text-sm mb-6">Are you sure you want to delete this memory record? This action cannot be undone.</p>
                  )}

                  {sessionAction.type === 'bulk_delete' && (
                      <p className="text-zinc-400 text-sm mb-6">Are you sure you want to delete {sessionAction.count} items? This action cannot be undone.</p>
                  )}

                  <div className="flex justify-end gap-2">
                      <Button variant="ghost" onClick={() => setSessionAction(null)}>Cancel</Button>
                      {sessionAction.type === 'rename' && (
                          <Button variant="primary" onClick={performRenameSession}>Rename</Button>
                      )}
                      {sessionAction.type === 'delete' && (
                          <Button variant="danger" onClick={performDeleteSession}>Delete</Button>
                      )}
                       {sessionAction.type === 'bulk_delete' && (
                          <Button variant="danger" onClick={performBulkDelete}>Delete All</Button>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* Message Delete Modal */}
      {messageToDeleteId && (
          <div className="fixed top-0 left-0 w-full z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in" style={{ height: viewportHeight }}>
              <div className="bg-[#0a0a0a] border border-red-900/30 p-6 rounded shadow-lg max-w-sm w-full m-4 animate-modal-enter">
                  <h4 className="text-red-500 font-bold mb-4 uppercase tracking-wider">Delete Content?</h4>
                   {(() => {
                        const msg = activeSession?.messages.find(m => m.id === messageToDeleteId);
                        const hasVersions = msg && msg.swipes && msg.swipes.length > 1;
                        return (
                            <>
                                <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
                                    {hasVersions 
                                        ? "This message has multiple versions. Delete just the current version or the entire message?" 
                                        : "Are you sure you want to delete this message? This action cannot be undone."}
                                </p>
                                <div className="flex justify-end gap-2 flex-wrap">
                                    <Button variant="ghost" onClick={() => setMessageToDeleteId(null)}>Cancel</Button>
                                    {hasVersions && (
                                        <Button variant="outline" onClick={performDeleteSwipe} className="border-red-900/50 text-red-500 hover:bg-red-950/20 hover:text-red-400 hover:border-red-500">
                                            Delete Version
                                        </Button>
                                    )}
                                    <Button variant="danger" onClick={performDeleteMessage}>
                                        {hasVersions ? "Delete All" : "Delete"}
                                    </Button>
                                </div>
                            </>
                        );
                    })()}
              </div>
          </div>
      )}

      {/* Quota Modal */}
      {showQuotaModal && (
          <div className="fixed top-0 left-0 w-full z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm" style={{ height: viewportHeight }}>
              <div className="bg-[#0a0a0a] border border-red-900/30 p-6 rounded shadow-lg max-w-md w-full m-4">
                  <div className="flex items-center gap-2 mb-4 text-red-500">
                      <AlertTriangle size={24} />
                      <h3 className="text-lg font-bold">Rate Limit or Quota Exceeded</h3>
                  </div>
                  <p className="text-zinc-400 text-sm mb-4 leading-relaxed">
                      You have hit the rate limit (Too Many Requests) or your API quota has been exhausted. If you are using a free API key, you may be limited to 15 requests per minute. Please wait a minute and try again, or provide a new API Key.
                  </p>
                  <div className="bg-red-900/20 border border-red-900/50 p-3 rounded mb-6">
                      <p className="text-xs text-red-400 font-mono break-words">{quotaErrorMsg}</p>
                  </div>
                  <div className="mb-6">
                      <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-2">New API Key</label>
                      <div className="relative">
                          <input 
                              type="password"
                              className="w-full bg-black border border-zinc-800 p-3 pl-10 text-zinc-200 focus:border-red-500/50 outline-none text-sm font-mono"
                              value={tempApiKey}
                              onChange={(e) => setTempApiKey(e.target.value)}
                              onFocus={(e) => {
                                  if (window.innerWidth < 768) {
                                      setTimeout(() => {
                                          e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                      }, 300);
                                  }
                              }}
                              placeholder="sk-..."
                          />
                          <Key size={14} className="absolute left-3 top-3.5 text-zinc-600" />
                      </div>
                  </div>
                  <div className="flex justify-end gap-2">
                      <Button variant="ghost" onClick={() => setShowQuotaModal(false)}>Cancel</Button>
                      <Button variant="danger" onClick={handleSaveQuotaKey}>Update Key</Button>
                  </div>
              </div>
          </div>
      )}

      {/* Error Modal */}
      {errorModal && (
          <div className="fixed top-0 left-0 w-full z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm" style={{ height: viewportHeight }}>
              <div className="bg-[#0a0a0a] border border-red-900/30 p-6 rounded shadow-lg max-w-sm w-full m-4">
                  <h4 className="text-red-500 font-bold mb-2 flex items-center gap-2">
                      <AlertCircle size={18} /> {errorModal.title}
                  </h4>
                  <p className="text-zinc-400 text-xs mb-6 leading-relaxed">{errorModal.message}</p>
                  <div className="flex justify-end gap-2">
                      <Button variant="ghost" onClick={() => setErrorModal(null)}>Close</Button>
                      {errorModal.onAction && (
                          <Button variant="danger" onClick={errorModal.onAction}>{errorModal.actionLabel || "Retry"}</Button>
                      )}
                  </div>
              </div>
          </div>
      )}

    </div>
  );
}

export default App;