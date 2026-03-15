import React, { useState, useRef, useEffect } from 'react';
import { AppSettings, Lorebook, LorebookEntry, SettingsPreset } from '../types';
import { Button } from './Button';
import { 
  User, Cpu, Server, Key, X, Check, Loader2, Image as ImageIcon, 
  Trash2, Upload, Palette, Zap, Sparkles, Globe, BookOpen, Pencil, 
  ToggleRight, ToggleLeft, CheckSquare, Square, Edit, FileJson, Sliders, RefreshCcw, ExternalLink, AlertTriangle, ChevronLeft, Save, Plus, FileCode,
  Cloud, Lock, RefreshCw, Box, Languages, RotateCcw, ShieldAlert
} from 'lucide-react';
import { testConnection, getPuterModels, googleTranslateFree } from '../services/apiService';
import { HORDE_MODELS, GEMINI_MODELS, DEEPSEEK_MODELS, ROUTEWAY_MODELS, PUTER_MODELS, VERCEL_MODELS, INITIAL_SETTINGS, PROMPT_TEMPLATES } from '../constants';

// Declare puter global if missing
declare const puter: any;

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
  initialTab?: 'general' | 'generation' | 'world';
}

type Tab = 'general' | 'generation' | 'world';

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

import { DebouncedTextarea } from './DebouncedTextarea';
import { useVisualViewport } from '../hooks/useVisualViewport';
import { useTranslation } from '../translations';

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSave, initialTab }) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const { t } = useTranslation(localSettings.language);
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [translatingField, setTranslatingField] = useState<string | null>(null);
  const [originalValues, setOriginalValues] = useState<Record<string, string>>({}); // Store original text for restore
  
  // Puter State
  const [puterSignedIn, setPuterSignedIn] = useState(false);
  const [puterModels, setPuterModels] = useState<string[]>(PUTER_MODELS);
  const [fetchingPuterModels, setFetchingPuterModels] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const lorebookInputRef = useRef<HTMLInputElement>(null);
  
  // Lorebook State
  const [manageLorebookMode, setManageLorebookMode] = useState(false);
  const [selectedLorebooks, setSelectedLorebooks] = useState<Set<string>>(new Set());
  const [renameLorebookId, setRenameLorebookId] = useState<string | null>(null);
  const [renameLorebookName, setRenameLorebookName] = useState("");
  const [lorebookToDelete, setLorebookToDelete] = useState<string | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [editingLorebook, setEditingLorebook] = useState<Lorebook | null>(null); // New state

  // Preset State
  const [newPresetName, setNewPresetName] = useState("");
  const [presetToDelete, setPresetToDelete] = useState<string | null>(null);
  const [renamePresetId, setRenamePresetId] = useState<string | null>(null);
  const [renamePresetName, setRenamePresetName] = useState("");
  const viewportHeight = useVisualViewport();

  useEffect(() => {
    if (!isOpen) {
        setLocalSettings(settings);
        setOriginalValues({}); // Reset originals on close/re-open if needed, or keep for persistence if preferred. Here resetting to sync with fresh settings.
    }
  }, [settings, isOpen]);
  
  useEffect(() => {
    if (isOpen) {
        if (initialTab) {
            setActiveTab(initialTab);
        }
        setManageLorebookMode(false);
        setSelectedLorebooks(new Set());
        setShowBulkDeleteConfirm(false);
        setShowResetConfirm(false);
        setNewPresetName("");
        setPresetToDelete(null);
        setEditingLorebook(null);
        
        // Check Puter Auth status
        if (typeof puter !== 'undefined' && puter.auth) {
            setPuterSignedIn(puter.auth.isSignedIn());
        }
    }
  }, [isOpen, initialTab]);

  const handleChange = (field: keyof AppSettings, value: any) => {
    setLocalSettings(prev => {
        let cleanValue = value;
        if (['temperature', 'topP', 'topA', 'repetitionPenalty', 'backgroundOpacity'].includes(field)) {
             cleanValue = parseFloat(value);
             if (isNaN(cleanValue)) cleanValue = prev[field as keyof AppSettings];
        } else if (['topK', 'maxOutputTokens', 'minOutputLength', 'backgroundBlur'].includes(field)) {
             cleanValue = parseInt(value, 10);
             if (isNaN(cleanValue)) cleanValue = prev[field as keyof AppSettings];
        }

        const next = { ...prev, [field]: cleanValue };
        
        if (field === 'apiProvider') {
            if (value === 'openrouter') {
                if (next.modelName.includes('gemini') && !next.modelName.includes('google/')) {
                    next.modelName = 'google/gemini-2.0-flash-lite-preview-02-05:free';
                }
            } else if (value === 'horde') {
                if (!HORDE_MODELS.includes(next.modelName)) next.modelName = HORDE_MODELS[0];
            } else if (value === 'gemini') {
                 if (!GEMINI_MODELS.includes(next.modelName)) next.modelName = GEMINI_MODELS[0];
            } else if (value === 'deepseek') {
                 if (!DEEPSEEK_MODELS.includes(next.modelName)) next.modelName = DEEPSEEK_MODELS[0];
            } else if (value === 'routeway') {
                 if (!next.modelName || !ROUTEWAY_MODELS.includes(next.modelName)) next.modelName = ROUTEWAY_MODELS[0];
            } else if (value === 'vercel') {
                 if (!next.modelName || !VERCEL_MODELS.includes(next.modelName)) next.modelName = VERCEL_MODELS[0];
            } else if (value === 'puter') {
                 // Force Mythomax for Puter as requested
                 next.modelName = 'gryphe/mythomax-l2-13b';
            }
        }
        return next;
    });
    setTestStatus('idle');
  };

  const handleTranslate = async (field: keyof AppSettings) => {
      // Restore logic
      if (originalValues[field as string]) {
          handleChange(field, originalValues[field as string]);
          setOriginalValues(prev => {
              const next = { ...prev };
              delete next[field as string];
              return next;
          });
          return;
      }

      const text = localSettings[field] as string;
      if (!text || typeof text !== 'string' || !text.trim()) return;
      
      setTranslatingField(field as string);
      try {
          const hasArabic = /[\u0600-\u06FF]/.test(text);
          const target = hasArabic ? 'en' : 'ar';
          const translated = await googleTranslateFree(text, target);
          
          setOriginalValues(prev => ({ ...prev, [field as string]: text }));
          handleChange(field, translated);
      } catch (e) {
          console.error("Translation failed", e);
      } finally {
          setTranslatingField(null);
      }
  };

  const handlePuterSignIn = async () => {
    if (typeof puter === 'undefined') return;
    try {
        await puter.auth.signIn();
        setPuterSignedIn(true);
    } catch (e) {
        console.error("Puter Sign In Failed", e);
    }
  };
  
  const handleFetchPuterModels = async () => {
      // Disabled since we are enforcing a model
      setFetchingPuterModels(true);
      try {
          const models = await getPuterModels();
          setPuterModels(models);
      } catch (e) {
          console.error(e);
      } finally {
          setFetchingPuterModels(false);
      }
  };

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  const handleCancel = () => {
      setLocalSettings(settings);
      onClose();
  };

  const handleResetClick = () => {
      setShowResetConfirm(true);
  };

  const performReset = () => {
      const existingPresets = localSettings.savedPresets || [];
      const defaults = { ...INITIAL_SETTINGS, savedPresets: existingPresets };
      setLocalSettings(defaults);
      setTestStatus('idle');
      setShowResetConfirm(false);
      setActiveTab('general');
  };

  // Preset Logic
  const handleCreatePreset = () => {
      if (!newPresetName.trim()) return;
      const { savedPresets, globalLorebooks, ...dataToSave } = localSettings;
      const newPreset: SettingsPreset = {
          id: generateId(),
          name: newPresetName.trim(),
          created: Date.now(),
          data: dataToSave
      };
      handleChange('savedPresets', [...(localSettings.savedPresets || []), newPreset]);
      setNewPresetName("");
  };

  const loadPreset = (preset: SettingsPreset) => {
      setLocalSettings(prev => ({
          ...prev,
          ...preset.data,
          savedPresets: prev.savedPresets,
          globalLorebooks: prev.globalLorebooks
      }));
  };

  const handleDeletePreset = () => {
      if (presetToDelete) {
          handleChange('savedPresets', localSettings.savedPresets?.filter(p => p.id !== presetToDelete) || []);
          setPresetToDelete(null);
      }
  };

  const handleRenamePreset = () => {
      if (renamePresetId && renamePresetName.trim()) {
          handleChange('savedPresets', localSettings.savedPresets?.map(p => 
              p.id === renamePresetId ? { ...p, name: renamePresetName.trim() } : p
          ) || []);
          setRenamePresetId(null);
          setRenamePresetName("");
      }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            setLocalSettings(prev => ({ ...prev, userAvatarUrl: reader.result as string }));
        };
        reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setLocalSettings(prev => ({ ...prev, customBackgroundUrl: reader.result as string }));
          };
          reader.readAsDataURL(file);
      }
      e.target.value = '';
  };

  const handleTestConnection = async () => {
      setTestStatus('loading');
      setTestMessage('');
      try {
          await testConnection(localSettings);
          setTestStatus('success');
          setTestMessage('Connection Established');
          setTimeout(() => setTestStatus('idle'), 3000);
      } catch (error) {
          setTestStatus('error');
          setTestMessage(error instanceof Error ? error.message : "Connection Failed");
      }
  };

  // Lorebook Handlers
  const handleImportLorebook = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const json = JSON.parse(event.target?.result as string);
              const entries: LorebookEntry[] = [];
              const rawEntries = json.entries || json.data || (Array.isArray(json) ? json : []);
              
              Object.values(rawEntries).forEach((entry: any) => {
                  if (!entry) return;
                  const keys = entry.keys || entry.key;
                  const content = entry.content;
                  if (keys && content) {
                      entries.push({
                          id: generateId(),
                          keys: Array.isArray(keys) ? keys : (keys || "").split(',').map((k:string) => k.trim()),
                          content: content || "",
                          enabled: entry.enabled !== false
                      });
                  }
              });

              if (entries.length > 0) {
                  const newLorebook: Lorebook = {
                      id: generateId(),
                      name: file.name.replace('.json', ''),
                      description: json.name || "Imported Global Lore",
                      entries: entries,
                      enabled: true
                  };
                  handleChange('globalLorebooks', [...(localSettings.globalLorebooks || []), newLorebook]);
              } else {
                  alert("No valid lorebook entries found.");
              }
          } catch (err) {
              console.error(err);
              alert("Failed to parse lorebook.");
          }
      };
      reader.readAsText(file);
      e.target.value = '';
  };

  const startEditingLorebook = (lb: Lorebook) => {
      setEditingLorebook(JSON.parse(JSON.stringify(lb)));
  };

  const saveEditingLorebook = () => {
      if (!editingLorebook) return;
      handleChange('globalLorebooks', localSettings.globalLorebooks?.map(lb => lb.id === editingLorebook.id ? editingLorebook : lb) || []);
      setEditingLorebook(null);
  };

  const addEntryToEditor = () => {
      if (!editingLorebook) return;
      const newEntry: LorebookEntry = {
          id: generateId(),
          keys: ["new_key"],
          content: "",
          enabled: true
      };
      setEditingLorebook(prev => prev ? { ...prev, entries: [...prev.entries, newEntry] } : null);
  };

  const removeEntryFromEditor = (entryId: string) => {
      setEditingLorebook(prev => prev ? { ...prev, entries: prev.entries.filter(e => e.id !== entryId) } : null);
  };

  const updateEntryInEditor = (entryId: string, field: 'keys' | 'content' | 'enabled', value: any) => {
      setEditingLorebook(prev => {
          if (!prev) return null;
          return {
              ...prev,
              entries: prev.entries.map(e => {
                  if (e.id === entryId) {
                      if (field === 'keys') {
                          return { ...e, keys: typeof value === 'string' ? value.split(',').map(k => k.trim()) : value };
                      }
                      return { ...e, [field]: value };
                  }
                  return e;
              })
          };
      });
  };

  const toggleLorebook = (id: string) => {
      handleChange('globalLorebooks', localSettings.globalLorebooks?.map(lb => lb.id === id ? { ...lb, enabled: !lb.enabled } : lb) || []);
  };

  const deleteLorebook = () => {
      if (lorebookToDelete) {
          handleChange('globalLorebooks', localSettings.globalLorebooks?.filter(lb => lb.id !== lorebookToDelete) || []);
          setLorebookToDelete(null);
      }
  };

  const bulkDeleteLorebooks = () => {
      setShowBulkDeleteConfirm(true);
  };

  const performBulkDeleteLorebooks = () => {
      handleChange('globalLorebooks', localSettings.globalLorebooks?.filter(lb => !selectedLorebooks.has(lb.id)) || []);
      setSelectedLorebooks(new Set());
      setManageLorebookMode(false);
      setShowBulkDeleteConfirm(false);
  };

  const toggleLorebookSelection = (id: string) => {
      const newSet = new Set(selectedLorebooks);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedLorebooks(newSet);
  };

  const renameLorebook = () => {
      if (renameLorebookId && renameLorebookName.trim()) {
          handleChange('globalLorebooks', localSettings.globalLorebooks?.map(lb => lb.id === renameLorebookId ? { ...lb, name: renameLorebookName.trim() } : lb) || []);
          setRenameLorebookId(null);
          setRenameLorebookName("");
      }
  };

  const tabs: {id: Tab, label: string}[] = [
      { id: 'general', label: 'System' },
      { id: 'generation', label: 'Generation' },
      { id: 'world', label: 'World Info' },
  ];

  return (
    <div className={`fixed top-0 left-0 w-full z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-0 md:p-4 transition-all duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} style={{ height: viewportHeight }}>
      <div className={`bg-[#050505] border-x md:border border-zinc-800 w-full max-w-4xl h-full md:h-[800px] md:max-h-[90vh] flex flex-col shadow-[0_0_50px_rgba(234,88,12,0.1)] relative transition-transform duration-300 ${isOpen ? 'scale-100' : 'scale-95'}`}>
        
        <div className="p-6 pb-4 bg-[#080808] shrink-0 border-b border-zinc-900 flex justify-between items-start">
            <div>
                <h3 className="text-xs font-serif text-orange-500 tracking-[0.3em] mb-2 uppercase drop-shadow-[0_0_5px_rgba(234,88,12,0.5)]">Control Panel</h3>
                <h2 className="text-2xl font-serif font-bold text-white tracking-wide">CONFIGURATION</h2>
            </div>
            <div className="flex gap-2">
                 <Button variant="ghost" className="text-red-500 hover:text-red-400" onClick={handleResetClick} title="Reset Defaults">
                    <RefreshCcw size={16} />
                 </Button>
                 <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors p-2">
                    <X size={24} />
                 </button>
            </div>
        </div>

        {!editingLorebook && (
            <div className="flex border-b border-zinc-900 bg-[#080808] overflow-x-auto scrollbar-none shrink-0">
                {tabs.map(tab => (
                    <button 
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 flex items-center justify-center gap-2 py-4 px-6 text-xs font-bold tracking-widest uppercase transition-colors relative whitespace-nowrap min-w-[120px] ${activeTab === tab.id ? 'text-orange-500 bg-zinc-900/30' : 'text-zinc-600 hover:text-zinc-400'}`}
                    >
                        {tab.id === 'general' && <Cpu size={14} />}
                        {tab.id === 'generation' && <Sparkles size={14} />}
                        {tab.id === 'world' && <Globe size={14} />}
                        {tab.label}
                        {activeTab === tab.id && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]" />}
                    </button>
                ))}
            </div>
        )}
        
        <div className="flex-1 overflow-y-auto bg-[#050505] p-6 md:p-8 scrollbar-thin scrollbar-thumb-zinc-800">
            {activeTab === 'general' && !editingLorebook && (
                <div className="space-y-8 animate-slide-up-fade max-w-2xl mx-auto">
                    {/* General Settings Content */}
                    <section>
                        <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <User size={14} /> User Identity
                        </h4>
                        <div className="flex gap-6 flex-col md:flex-row items-center md:items-start">
                             <div className="relative group cursor-pointer shrink-0" onClick={() => fileInputRef.current?.click()}>
                                 <img src={localSettings.userAvatarUrl || "https://ui-avatars.com/api/?name=User&background=18181b&color=71717a"} alt="User" className="w-24 h-24 rounded-full object-cover ring-1 ring-zinc-800 group-hover:ring-orange-500/50 transition-all" />
                                 <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Upload size={20} className="text-zinc-300" />
                                 </div>
                             </div>
                             <div className="flex-1 w-full space-y-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-1">Display Name</label>
                                    <div className="flex gap-2">
                                        <input 
                                            className="w-full bg-black border border-zinc-800 p-3 text-zinc-200 focus:border-orange-500/50 outline-none text-sm"
                                            value={localSettings.userName}
                                            onChange={(e) => handleChange('userName', e.target.value)}
                                            onFocus={(e) => { if (window.innerWidth < 768) setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300); }}
                                            placeholder="User"
                                        />
                                        <button 
                                            onClick={() => handleTranslate('userName')}
                                            disabled={translatingField === 'userName' || (!localSettings.userName && !originalValues['userName'])}
                                            className="p-3 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-orange-500/50 rounded transition-colors disabled:opacity-50 flex items-center justify-center min-w-[44px]"
                                            title={originalValues['userName'] ? "Restore Original" : "Translate Name"}
                                        >
                                            {translatingField === 'userName' ? <Loader2 size={16} className="animate-spin" /> : originalValues['userName'] ? <RotateCcw size={16} /> : <Languages size={16} />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-1">Persona Description</label>
                                    <div className="flex flex-col gap-2">
                                        <DebouncedTextarea 
                                            className="w-full bg-black border border-zinc-800 p-3 text-zinc-200 focus:border-orange-500/50 outline-none text-sm h-24 resize-none"
                                            value={localSettings.userPersona}
                                            onDebounceChange={(val) => handleChange('userPersona', val)}
                                            placeholder="Briefly describe yourself to the AI..."
                                        />
                                        <div className="flex justify-end">
                                            <button 
                                                onClick={() => handleTranslate('userPersona')}
                                                disabled={translatingField === 'userPersona' || (!localSettings.userPersona && !originalValues['userPersona'])}
                                                className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 hover:text-white hover:border-orange-500/50 rounded transition-colors disabled:opacity-50"
                                                title={originalValues['userPersona'] ? "Restore Original" : "Translate Persona"}
                                            >
                                                {translatingField === 'userPersona' ? <Loader2 size={12} className="animate-spin" /> : originalValues['userPersona'] ? <RotateCcw size={12} /> : <Languages size={12} />}
                                                {originalValues['userPersona'] ? "Restore" : "Translate"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-1">{t('systemPrompt')}</label>
                                    <div className="flex flex-col gap-2">
                                        <DebouncedTextarea 
                                            className="w-full bg-black border border-zinc-800 p-3 text-zinc-200 focus:border-orange-500/50 outline-none text-sm h-24 resize-none"
                                            value={localSettings.systemPromptOverride || ''}
                                            onDebounceChange={(val) => handleChange('systemPromptOverride', val)}
                                            placeholder="Leave empty for default system prompt..."
                                        />
                                        <div className="flex justify-end">
                                            <button 
                                                onClick={() => handleTranslate('systemPromptOverride')}
                                                disabled={translatingField === 'systemPromptOverride' || (!localSettings.systemPromptOverride && !originalValues['systemPromptOverride'])}
                                                className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 hover:text-white hover:border-orange-500/50 rounded transition-colors disabled:opacity-50"
                                                title={originalValues['systemPromptOverride'] ? "Restore Original" : "Translate System Prompt"}
                                            >
                                                {translatingField === 'systemPromptOverride' ? <Loader2 size={12} className="animate-spin" /> : originalValues['systemPromptOverride'] ? <RotateCcw size={12} /> : <Languages size={12} />}
                                                {originalValues['systemPromptOverride'] ? "Restore" : "Translate"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-1 flex items-center gap-2">
                                        {t('designerPersona')} <Sparkles size={12} className="text-orange-500" />
                                    </label>
                                    <div className="flex flex-col gap-2">
                                        <DebouncedTextarea 
                                            className="w-full bg-black border border-zinc-800 p-3 text-zinc-200 focus:border-orange-500/50 outline-none text-xs font-mono h-32 resize-y shadow-inner"
                                            value={localSettings.designerSystemPrompt || ''}
                                            onDebounceChange={(val) => handleChange('designerSystemPrompt', val)}
                                            placeholder="Leave empty to use default designer persona..."
                                        />
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] text-zinc-500 italic">This defines the personality of the AI Character Designer.</span>
                                            <button 
                                                onClick={() => handleChange('designerSystemPrompt', INITIAL_SETTINGS.designerSystemPrompt)}
                                                className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 hover:text-white hover:border-orange-500/50 rounded transition-colors"
                                            >
                                                <RotateCcw size={12} /> Reset to Default
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-1 flex items-center gap-2">
                                        Global Jailbreak Override <AlertTriangle size={12} className="text-orange-500" />
                                    </label>
                                    <div className="flex flex-col gap-2">
                                        <DebouncedTextarea 
                                            className="w-full bg-black border border-zinc-800 p-3 text-orange-200/80 focus:border-orange-500/50 outline-none text-xs font-mono h-32 resize-y shadow-inner"
                                            value={localSettings.jailbreakOverride || ''}
                                            onDebounceChange={(val) => handleChange('jailbreakOverride', val)}
                                            placeholder="Leave empty to use default jailbreak..."
                                        />
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] text-zinc-500 italic">This overrides the default safety bypass instructions.</span>
                                            <button 
                                                onClick={() => handleChange('jailbreakOverride', INITIAL_SETTINGS.jailbreakOverride)}
                                                className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 hover:text-white hover:border-orange-500/50 rounded transition-colors"
                                            >
                                                <RotateCcw size={12} /> Reset to Default
                                            </button>
                                        </div>
                                    </div>
                                </div>
                             </div>
                        </div>
                    </section>
                    
                    <div className="h-px bg-zinc-900"></div>

                    <section>
                        <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <Palette size={14} /> Interface Visuals
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-1">{t('language')}</label>
                                <select
                                    value={localSettings.language || 'en'}
                                    onChange={(e) => handleChange('language', e.target.value)}
                                    className="w-full bg-black border border-zinc-800 p-3 text-white focus:border-orange-500/50 outline-none text-xs"
                                >
                                    <option value="en">English</option>
                                    <option value="ar">العربية</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-1">Background Image</label>
                                <div className="flex gap-2">
                                    <button onClick={() => bgInputRef.current?.click()} className="flex-1 bg-black border border-zinc-800 p-3 text-zinc-400 hover:text-white hover:border-zinc-700 text-xs flex items-center justify-center gap-2 transition-colors">
                                        <ImageIcon size={14} /> {localSettings.customBackgroundUrl ? "Change Image" : "Upload Image"}
                                    </button>
                                    {localSettings.customBackgroundUrl && (
                                        <button onClick={() => handleChange('customBackgroundUrl', '')} className="bg-black border border-zinc-800 p-3 text-zinc-500 hover:text-red-500 transition-colors">
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                             <div>
                                <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-1">Background Blur ({localSettings.backgroundBlur}px)</label>
                                <input type="range" min="0" max="20" value={localSettings.backgroundBlur} onChange={(e) => handleChange('backgroundBlur', e.target.value)} className="w-full accent-orange-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-1">Background Opacity ({localSettings.backgroundOpacity})</label>
                                <input type="range" min="0" max="1" step="0.1" value={localSettings.backgroundOpacity} onChange={(e) => handleChange('backgroundOpacity', e.target.value)} className="w-full accent-orange-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer" />
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                             <div>
                                <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-1">Dialogue Color</label>
                                <div className="flex items-center gap-2 bg-black border border-zinc-800 p-2 rounded">
                                    <input type="color" value={localSettings.dialogueColor} onChange={(e) => handleChange('dialogueColor', e.target.value)} className="w-6 h-6 bg-transparent border-none p-0 cursor-pointer" />
                                    <span className="text-xs text-zinc-400 font-mono">{localSettings.dialogueColor}</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-1">Thought Color</label>
                                <div className="flex items-center gap-2 bg-black border border-zinc-800 p-2 rounded">
                                    <input type="color" value={localSettings.thoughtColor} onChange={(e) => handleChange('thoughtColor', e.target.value)} className="w-6 h-6 bg-transparent border-none p-0 cursor-pointer" />
                                    <span className="text-xs text-zinc-400 font-mono">{localSettings.thoughtColor}</span>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            )}

            {activeTab === 'generation' && !editingLorebook && (
                <div className="space-y-8 animate-slide-up-fade max-w-4xl mx-auto flex flex-col md:flex-row gap-8">
                    <div className="flex-1 space-y-8">
                        <section>
                            <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <Server size={14} /> Provider Configuration
                            </h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-1">API Provider</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {(['gemini', 'openai', 'kobold', 'horde', 'openrouter', 'deepseek', 'routeway', 'vercel', 'puter'] as const).map(p => (
                                            <button 
                                                key={p}
                                                onClick={() => handleChange('apiProvider', p === 'kobold' ? 'custom' : p)}
                                                className={`py-2 px-2 text-[10px] uppercase font-bold border transition-all truncate ${
                                                    (localSettings.apiProvider === p || (p === 'kobold' && localSettings.apiProvider === 'custom'))
                                                    ? 'bg-orange-500/10 border-orange-500 text-orange-500 shadow-[0_0_10px_rgba(234,88,12,0.2)]'
                                                    : 'bg-black border-zinc-800 text-zinc-500 hover:border-zinc-600'
                                                }`}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {localSettings.apiProvider === 'puter' && (
                                    <div className="space-y-4 bg-zinc-900/30 p-4 rounded border border-zinc-800">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Cloud size={16} className={puterSignedIn ? "text-emerald-500" : "text-zinc-500"} />
                                                <span className="text-xs font-bold text-zinc-300">Puter Account</span>
                                            </div>
                                            {puterSignedIn ? (
                                                <span className="text-[10px] text-emerald-500 font-mono bg-emerald-950/20 px-2 py-1 rounded">CONNECTED</span>
                                            ) : (
                                                <Button variant="primary" className="py-1 px-3 text-[10px]" onClick={handlePuterSignIn}>
                                                    Sign In to Puter
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {(localSettings.apiProvider === 'custom' || localSettings.apiProvider === 'openrouter' || localSettings.apiProvider === 'vercel') && (
                                    <div>
                                        <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-1">
                                            {localSettings.apiProvider === 'vercel' ? 'Gateway URL' : 'API Endpoint'}
                                        </label>
                                        <div className="relative">
                                            <input 
                                                className="w-full bg-black border border-zinc-800 p-3 pl-3 text-zinc-200 focus:border-orange-500/50 outline-none text-sm font-mono"
                                                value={localSettings.customEndpoint}
                                                onChange={(e) => handleChange('customEndpoint', e.target.value)}
                                                onFocus={(e) => { if (window.innerWidth < 768) setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300); }}
                                                placeholder={
                                                    localSettings.apiProvider === 'openrouter' ? "https://openrouter.ai/api/v1" : 
                                                    localSettings.apiProvider === 'vercel' ? "https://your-app.vercel.app/api/chat" :
                                                    "http://localhost:5000/v1"
                                                }
                                            />
                                        </div>
                                        {localSettings.apiProvider === 'vercel' && (
                                            <p className="text-[9px] text-zinc-600 mt-1">
                                                Enter the full URL to your Vercel AI SDK chat endpoint.
                                            </p>
                                        )}
                                    </div>
                                )}

                                {localSettings.apiProvider !== 'horde' && localSettings.apiProvider !== 'puter' && (
                                    <div>
                                        <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-1">API Key</label>
                                        <div className="relative">
                                            <input 
                                                type="password"
                                                className="w-full bg-black border border-zinc-800 p-3 pl-10 text-zinc-200 focus:border-orange-500/50 outline-none text-sm font-mono"
                                                value={localSettings.apiKey}
                                                onChange={(e) => handleChange('apiKey', e.target.value)}
                                                onFocus={(e) => { if (window.innerWidth < 768) setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300); }}
                                                placeholder="sk-..."
                                            />
                                            <Key size={14} className="absolute left-3 top-3.5 text-zinc-600" />
                                            {localSettings.apiProvider === 'gemini' && (
                                                <a 
                                                    href="https://aistudio.google.com/app/apikey" 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="absolute right-3 top-3.5 text-zinc-500 hover:text-orange-500 transition-colors"
                                                    title="Get API Key"
                                                >
                                                    <ExternalLink size={14} />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="block text-[10px] font-bold text-zinc-600 uppercase">Model Name</label>
                                    </div>
                                    {localSettings.apiProvider === 'horde' ? (
                                        <select 
                                            value={localSettings.modelName}
                                            onChange={(e) => handleChange('modelName', e.target.value)}
                                            className="w-full bg-black border border-zinc-800 p-3 text-zinc-200 focus:border-orange-500/50 outline-none text-xs font-mono"
                                        >
                                            {HORDE_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                                        </select>
                                    ) : localSettings.apiProvider === 'gemini' ? (
                                        <select 
                                            value={localSettings.modelName}
                                            onChange={(e) => handleChange('modelName', e.target.value)}
                                            className="w-full bg-black border border-zinc-800 p-3 text-zinc-200 focus:border-orange-500/50 outline-none text-xs font-mono"
                                        >
                                            {GEMINI_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                                        </select>
                                    ) : localSettings.apiProvider === 'deepseek' ? (
                                        <select 
                                            value={localSettings.modelName}
                                            onChange={(e) => handleChange('modelName', e.target.value)}
                                            className="w-full bg-black border border-zinc-800 p-3 text-zinc-200 focus:border-orange-500/50 outline-none text-xs font-mono"
                                        >
                                            {DEEPSEEK_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                                        </select>
                                    ) : localSettings.apiProvider === 'puter' ? (
                                        <div className="relative group">
                                            <input 
                                                className="w-full bg-zinc-900 border border-zinc-800 p-3 text-zinc-500 outline-none text-xs font-mono cursor-not-allowed opacity-70"
                                                value="gryphe/mythomax-l2-13b"
                                                disabled
                                                readOnly
                                            />
                                            <Lock size={14} className="absolute right-3 top-3 text-zinc-600" />
                                            <div className="absolute right-8 top-3 text-[9px] text-orange-500/80 font-bold uppercase tracking-wider">Locked</div>
                                            <p className="text-[9px] text-orange-500 mt-1 flex items-center gap-1"><Check size={10} /> Model strictly locked to Mythomax for Uncensored RP compliance.</p>
                                        </div>
                                    ) : localSettings.apiProvider === 'vercel' ? (
                                        <div className="relative">
                                            <input 
                                                className="w-full bg-black border border-zinc-800 p-3 text-zinc-200 focus:border-orange-500/50 outline-none text-sm font-mono"
                                                value={localSettings.modelName}
                                                onChange={(e) => handleChange('modelName', e.target.value)}
                                                onFocus={(e) => { if (window.innerWidth < 768) setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300); }}
                                                placeholder="gpt-4o"
                                                list="vercel-models"
                                            />
                                            <datalist id="vercel-models">
                                                {VERCEL_MODELS.map(m => <option key={m} value={m} />)}
                                            </datalist>
                                        </div>
                                    ) : (
                                        <input 
                                            className="w-full bg-black border border-zinc-800 p-3 text-zinc-200 focus:border-orange-500/50 outline-none text-sm font-mono"
                                            value={localSettings.modelName}
                                            onChange={(e) => handleChange('modelName', e.target.value)}
                                            onFocus={(e) => { if (window.innerWidth < 768) setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300); }}
                                            placeholder="gemini-2.0-flash"
                                        />
                                    )}
                                </div>
                                
                                <div className="flex gap-2">
                                     <Button 
                                        onClick={handleTestConnection}
                                        disabled={testStatus === 'loading'}
                                        variant={testStatus === 'error' ? 'danger' : testStatus === 'success' ? 'primary' : 'secondary'}
                                        className="w-full text-xs py-2 flex items-center justify-center gap-2"
                                     >
                                        {testStatus === 'loading' && <Loader2 className="animate-spin" size={14} />}
                                        {testStatus === 'idle' && "Test Connection"}
                                        {testStatus === 'loading' && "Connecting..."}
                                        {testStatus === 'success' && <Check size={14} />}
                                        {testStatus === 'error' && <X size={14} />}
                                        {testStatus === 'success' && "Connected"}
                                        {testStatus === 'error' && "Failed"}
                                     </Button>
                                </div>
                                {testMessage && (
                                    <div className={`text-[10px] p-2 rounded ${testStatus === 'error' ? 'text-red-400 bg-red-950/20' : 'text-emerald-400 bg-emerald-950/20'}`}>
                                        {testMessage}
                                    </div>
                                )}
                            </div>
                        </section>
                        
                        {/* ... (rest of the file remains unchanged) */}
                        <div className="h-px bg-zinc-900"></div>

                        <section>
                            <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <Sliders size={14} /> Presets
                            </h4>
                            <div className="bg-zinc-900/20 border border-zinc-900 rounded p-4">
                                <div className="flex gap-2 mb-4">
                                    <input 
                                        className="flex-1 bg-black border border-zinc-800 p-2 text-xs text-zinc-300 outline-none"
                                        placeholder="New Preset Name"
                                        value={newPresetName}
                                        onChange={e => setNewPresetName(e.target.value)}
                                        onFocus={(e) => { if (window.innerWidth < 768) setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300); }}
                                    />
                                    <Button variant="outline" className="py-1 px-3" onClick={handleCreatePreset} disabled={!newPresetName.trim()}>Save</Button>
                                </div>
                                
                                <div className="space-y-1 max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800">
                                    {localSettings.savedPresets?.map(preset => (
                                        <div key={preset.id} className="flex items-center justify-between p-2 bg-black/40 hover:bg-black/60 rounded text-xs group">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <div className="text-orange-500"><Sliders size={12}/></div>
                                                {renamePresetId === preset.id ? (
                                                     <input 
                                                        className="bg-zinc-900 border border-zinc-700 text-zinc-200 px-1 py-0.5 w-24 outline-none"
                                                        value={renamePresetName}
                                                        onChange={e => setRenamePresetName(e.target.value)}
                                                        onFocus={(e) => { if (window.innerWidth < 768) setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300); }}
                                                        autoFocus
                                                        onBlur={() => setRenamePresetId(null)}
                                                        onKeyDown={e => e.key === 'Enter' && handleRenamePreset()}
                                                     />
                                                ) : (
                                                    <span className="text-zinc-300 truncate font-mono">{preset.name}</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {renamePresetId === preset.id ? (
                                                    <button onClick={handleRenamePreset} className="text-emerald-500 p-1"><Check size={12}/></button>
                                                ) : (
                                                    <button onClick={() => { setRenamePresetId(preset.id); setRenamePresetName(preset.name); }} className="text-zinc-600 hover:text-orange-400 p-1"><Pencil size={12}/></button>
                                                )}
                                                <button onClick={() => loadPreset(preset)} className="text-zinc-600 hover:text-emerald-400 p-1" title="Load"><Upload size={12}/></button>
                                                <button onClick={() => setPresetToDelete(preset.id)} className="text-zinc-600 hover:text-red-400 p-1" title="Delete"><Trash2 size={12}/></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>
                    </div>

                    <div className="w-px bg-zinc-900 hidden md:block"></div>

                    <div className="flex-1 space-y-8">
                         <section>
                            <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <Zap size={14} /> Generation Parameters
                            </h4>
                            
                            {localSettings.apiProvider === 'puter' ? (
                                <div className="p-4 rounded-lg bg-zinc-900/30 border border-zinc-800 flex flex-col items-center justify-center text-center py-12 gap-2">
                                    <Cloud size={24} className="text-zinc-600" />
                                    <span className="text-zinc-400 text-xs font-bold">Managed by Puter</span>
                                    <p className="text-[10px] text-zinc-600 max-w-[200px]">
                                        Parameters are handled automatically by the Puter platform for optimal performance with Mythomax.
                                    </p>
                                </div>
                            ) : (
                            <div className="space-y-6">
                                <div>
                                    <div className="flex justify-between mb-2">
                                        <label className="text-[10px] font-bold text-zinc-600 uppercase flex items-center gap-2"><FileCode size={12} /> Prompt Template</label>
                                    </div>
                                    <select 
                                        value={localSettings.promptTemplate || 'chatml'}
                                        onChange={(e) => handleChange('promptTemplate', e.target.value)}
                                        className="w-full bg-black border border-zinc-800 p-3 text-zinc-200 focus:border-orange-500/50 outline-none text-xs font-mono"
                                    >
                                        {PROMPT_TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                                    </select>
                                    <p className="text-[9px] text-zinc-600 mt-2">
                                        Required for Horde/Completion APIs. Chat APIs (Gemini/OpenAI) usually handle this automatically.
                                    </p>
                                </div>

                                <div>
                                    <div className="flex justify-between mb-2">
                                        <label className="text-[10px] font-bold text-zinc-600 uppercase">Temperature</label>
                                        <span className="text-[10px] font-mono text-orange-500">{localSettings.temperature}</span>
                                    </div>
                                    <input 
                                        type="range" min="0" max="2" step="0.01" 
                                        value={localSettings.temperature} 
                                        onChange={(e) => handleChange('temperature', e.target.value)} 
                                        className="w-full accent-orange-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer" 
                                    />
                                </div>

                                <div>
                                    <div className="flex justify-between mb-2">
                                        <label className="text-[10px] font-bold text-zinc-600 uppercase">Max Output Tokens</label>
                                        <span className="text-[10px] font-mono text-orange-500">{localSettings.maxOutputTokens}</span>
                                    </div>
                                    <input 
                                        type="range" min="128" max="8192" step="128" 
                                        value={localSettings.maxOutputTokens} 
                                        onChange={(e) => handleChange('maxOutputTokens', e.target.value)} 
                                        className="w-full accent-orange-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer" 
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                     <div>
                                        <div className="flex justify-between mb-2">
                                            <label className="text-[10px] font-bold text-zinc-600 uppercase">Top P</label>
                                            <span className="text-[10px] font-mono text-zinc-400">{localSettings.topP}</span>
                                        </div>
                                        <input 
                                            type="range" min="0" max="1" step="0.01" 
                                            value={localSettings.topP} 
                                            onChange={(e) => handleChange('topP', e.target.value)} 
                                            className="w-full accent-zinc-600 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer" 
                                        />
                                    </div>
                                    <div>
                                        <div className="flex justify-between mb-2">
                                            <label className="text-[10px] font-bold text-zinc-600 uppercase">Top K</label>
                                            <span className="text-[10px] font-mono text-zinc-400">{localSettings.topK}</span>
                                        </div>
                                        <input 
                                            type="range" min="0" max="100" step="1" 
                                            value={localSettings.topK} 
                                            onChange={(e) => handleChange('topK', e.target.value)} 
                                            className="w-full accent-zinc-600 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer" 
                                        />
                                    </div>
                                </div>

                                {localSettings.apiProvider !== 'gemini' && (
                                    <div className="grid grid-cols-2 gap-4">
                                         <div>
                                            <div className="flex justify-between mb-2">
                                                <label className="text-[10px] font-bold text-zinc-600 uppercase">Repetition Penalty</label>
                                                <span className="text-[10px] font-mono text-zinc-400">{localSettings.repetitionPenalty}</span>
                                            </div>
                                            <input 
                                                type="range" min="1" max="1.5" step="0.01" 
                                                value={localSettings.repetitionPenalty} 
                                                onChange={(e) => handleChange('repetitionPenalty', e.target.value)} 
                                                className="w-full accent-zinc-600 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer" 
                                            />
                                        </div>
                                         <div>
                                            <div className="flex justify-between mb-2">
                                                <label className="text-[10px] font-bold text-zinc-600 uppercase">Top A</label>
                                                <span className="text-[10px] font-mono text-zinc-400">{localSettings.topA}</span>
                                            </div>
                                            <input 
                                                type="range" min="0" max="1" step="0.01" 
                                                value={localSettings.topA} 
                                                onChange={(e) => handleChange('topA', e.target.value)} 
                                                className="w-full accent-zinc-600 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer" 
                                            />
                                        </div>
                                    </div>
                                )}
                                
                                <div className="p-3 bg-zinc-900/30 rounded border border-zinc-900">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-[10px] font-bold text-zinc-500 uppercase">Min Length Enforcement</label>
                                        <button 
                                            onClick={() => handleChange('minOutputEnabled', !localSettings.minOutputEnabled)}
                                            className={`transition-colors ${localSettings.minOutputEnabled ? 'text-orange-500' : 'text-zinc-700'}`}
                                        >
                                            {localSettings.minOutputEnabled ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                                        </button>
                                    </div>
                                    {localSettings.minOutputEnabled && (
                                        <div>
                                             <div className="flex justify-between mb-1">
                                                <label className="text-[10px] font-bold text-zinc-600 uppercase">Target Minimum</label>
                                                <span className="text-[10px] font-mono text-zinc-400">{localSettings.minOutputLength} chars</span>
                                            </div>
                                            <input 
                                                type="range" min="50" max="1000" step="50" 
                                                value={localSettings.minOutputLength} 
                                                onChange={(e) => handleChange('minOutputLength', e.target.value)} 
                                                className="w-full accent-zinc-600 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer" 
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="p-3 bg-zinc-900/30 rounded border border-zinc-900">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-bold text-zinc-500 uppercase">Stream Response</label>
                                        <button 
                                            onClick={() => handleChange('streamResponse', !localSettings.streamResponse)}
                                            className={`transition-colors ${localSettings.streamResponse ? 'text-orange-500' : 'text-zinc-700'}`}
                                        >
                                            {localSettings.streamResponse ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                                        </button>
                                    </div>
                                </div>
                                
                                {localSettings.apiProvider === 'gemini' && (
                                    <div className="p-3 bg-zinc-900/30 rounded border border-zinc-900">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-2">
                                                <Globe size={14} /> Google Search Grounding
                                            </label>
                                            <button 
                                                onClick={() => handleChange('enableGoogleSearch', !localSettings.enableGoogleSearch)}
                                                className={`transition-colors ${localSettings.enableGoogleSearch ? 'text-orange-500' : 'text-zinc-700'}`}
                                            >
                                                {localSettings.enableGoogleSearch ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                                            </button>
                                        </div>
                                        <p className="text-[9px] text-zinc-600 mt-1">
                                            Allow the model to access real-time information via Google Search.
                                        </p>
                                    </div>
                                )}
                                
                                <div className="p-3 bg-red-900/10 rounded border border-red-900/30">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-bold text-red-500 uppercase flex items-center gap-2">
                                            <ShieldAlert size={14} /> Advanced Jailbreak Mode
                                        </label>
                                        <button 
                                            onClick={() => handleChange('enableAdvancedJailbreak', !localSettings.enableAdvancedJailbreak)}
                                            className={`transition-colors ${localSettings.enableAdvancedJailbreak ? 'text-red-500' : 'text-zinc-700'}`}
                                        >
                                            {localSettings.enableAdvancedJailbreak ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                                        </button>
                                    </div>
                                    <p className="text-[9px] text-zinc-500 mt-1">
                                        Applies expert-level prompt injection techniques and disables safety filters (especially effective on Gemini). Use with caution.
                                    </p>
                                </div>
                            </div>
                            )}
                        </section>
                    </div>
                </div>
            )}

            {/* ... (rest of the file remains unchanged) */}
            {activeTab === 'world' && (
                <div className="space-y-6 animate-slide-up-fade h-full">
                    {editingLorebook ? (
                        // EDITOR VIEW FOR GLOBAL LOREBOOK
                        <div className="flex flex-col h-full animate-fade-in">
                            <div className="flex items-center justify-between mb-4 shrink-0">
                                <button type="button" onClick={() => setEditingLorebook(null)} className="flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-white uppercase tracking-wider transition-colors">
                                    <ChevronLeft size={14} /> Back to Lorebooks
                                </button>
                                <Button type="button" variant="primary" className="py-1 px-4 text-[10px]" onClick={saveEditingLorebook}>
                                    <Save size={12} className="mr-1" /> Save Changes
                                </Button>
                            </div>

                            <div className="bg-zinc-900/20 border border-zinc-800/50 rounded-lg p-4 mb-4 space-y-4 shrink-0">
                                <div>
                                    <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-1">Lorebook Name</label>
                                    <input 
                                        className="w-full bg-black border border-zinc-800 p-2 text-zinc-200 focus:border-orange-500/50 outline-none text-xs rounded"
                                        value={editingLorebook.name}
                                        onChange={e => setEditingLorebook({...editingLorebook, name: e.target.value})}
                                        onFocus={(e) => { if (window.innerWidth < 768) setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300); }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-1">Description</label>
                                    <input 
                                        className="w-full bg-black border border-zinc-800 p-2 text-zinc-200 focus:border-orange-500/50 outline-none text-xs rounded"
                                        value={editingLorebook.description || ""}
                                        onChange={e => setEditingLorebook({...editingLorebook, description: e.target.value})}
                                        onFocus={(e) => { if (window.innerWidth < 768) setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300); }}
                                    />
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col min-h-0">
                                <div className="flex items-center justify-between mb-2 shrink-0">
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Entries ({editingLorebook.entries.length})</label>
                                    <button type="button" onClick={addEntryToEditor} className="text-[10px] flex items-center gap-1 text-orange-500 hover:text-orange-400 font-bold uppercase">
                                        <Plus size={12} /> Add Entry
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-zinc-800">
                                    {editingLorebook.entries.map((entry, idx) => (
                                        <div key={entry.id} className="bg-black/40 border border-zinc-800 rounded p-3 group hover:border-zinc-700 transition-colors">
                                            <div className="flex items-start gap-3 mb-2">
                                                <div className="mt-1 text-zinc-600"><Key size={14} /></div>
                                                <div className="flex-1">
                                                    <input 
                                                        className="w-full bg-transparent border-b border-zinc-800 text-orange-200 text-xs py-1 focus:border-orange-500/50 outline-none placeholder-zinc-700 font-mono"
                                                        placeholder="keywords, comma, separated"
                                                        value={entry.keys.join(', ')}
                                                        onChange={(e) => updateEntryInEditor(entry.id, 'keys', e.target.value)}
                                                        onFocus={(e) => { if (window.innerWidth < 768) setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300); }}
                                                    />
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button 
                                                        type="button" 
                                                        onClick={() => updateEntryInEditor(entry.id, 'enabled', !entry.enabled)}
                                                        className={entry.enabled ? "text-emerald-500" : "text-zinc-600"}
                                                        title={entry.enabled ? "Disable" : "Enable"}
                                                    >
                                                        {entry.enabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                                                    </button>
                                                    <button 
                                                        type="button" 
                                                        onClick={() => removeEntryFromEditor(entry.id)}
                                                        className="text-zinc-600 hover:text-red-500 transition-colors"
                                                        title="Delete Entry"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                            <DebouncedTextarea 
                                                className="w-full bg-zinc-900/30 border border-zinc-800/50 rounded p-2 text-zinc-300 text-xs outline-none focus:border-orange-500/30 min-h-[80px] resize-y scrollbar-thin scrollbar-thumb-zinc-800"
                                                placeholder="Lore content..."
                                                value={entry.content}
                                                onDebounceChange={(val) => updateEntryInEditor(entry.id, 'content', val)}
                                            />
                                        </div>
                                    ))}
                                    {editingLorebook.entries.length === 0 && (
                                        <div className="text-center py-8 text-zinc-600 text-xs italic">
                                            No entries yet. Add one to define world info.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        // LIST VIEW FOR GLOBAL LOREBOOKS
                        <div className="flex flex-col h-full">
                             <div className="flex items-center justify-between mb-4">
                                 <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                                    <BookOpen size={14} /> Global Lorebooks
                                 </div>
                                 <div className="flex items-center gap-2">
                                    <button type="button" onClick={() => lorebookInputRef.current?.click()} className="text-[10px] bg-black border border-zinc-800 p-2 px-3 text-zinc-300 hover:text-white hover:border-zinc-700 flex items-center gap-2 transition-colors rounded">
                                        <Upload size={12} /> {t('import')}
                                    </button>
                                    {manageLorebookMode ? (
                                        <>
                                            <Button type="button" variant="danger" className="py-1 px-3 text-[10px]" onClick={bulkDeleteLorebooks} disabled={selectedLorebooks.size === 0}>
                                                Delete ({selectedLorebooks.size})
                                            </Button>
                                            <button type="button" onClick={() => { setManageLorebookMode(false); setSelectedLorebooks(new Set()); }} className="p-2 text-zinc-500 hover:text-white">
                                                <X size={16} />
                                            </button>
                                        </>
                                    ) : (
                                        <button type="button" onClick={() => setManageLorebookMode(true)} className="p-2 text-zinc-600 hover:text-orange-500 transition-colors" title="Manage">
                                            <CheckSquare size={16} />
                                        </button>
                                    )}
                                 </div>
                             </div>

                             <div className="bg-orange-950/10 border border-orange-900/30 p-4 rounded-lg mb-4 shrink-0">
                                <p className="text-[10px] text-zinc-400 leading-relaxed">
                                    Global Lorebooks are active across ALL chats and characters. Use them for general world-building, game mechanics, or persistent rules.
                                </p>
                            </div>

                             <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-zinc-800 bg-black/20 rounded-lg border border-zinc-900 p-4">
                                    {(localSettings.globalLorebooks || []).length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-zinc-600 gap-2 opacity-50">
                                            <BookOpen size={32} />
                                            <span className="text-xs">No global lorebooks defined.</span>
                                        </div>
                                    ) : (
                                        localSettings.globalLorebooks.map(lb => (
                                        <div key={lb.id} className="bg-black/60 border border-zinc-800/80 rounded p-3 flex items-center justify-between group hover:border-zinc-700 transition-colors">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                {manageLorebookMode ? (
                                                    <div 
                                                        onClick={() => toggleLorebookSelection(lb.id)}
                                                        className={`cursor-pointer ${selectedLorebooks.has(lb.id) ? 'text-orange-500' : 'text-zinc-700 hover:text-zinc-500'}`}
                                                    >
                                                        {selectedLorebooks.has(lb.id) ? <CheckSquare size={16}/> : <Square size={16}/>}
                                                    </div>
                                                ) : (
                                                    <div className="text-zinc-700"><Globe size={16} /></div>
                                                )}
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        {renameLorebookId === lb.id ? (
                                                            <input 
                                                                className="bg-zinc-900 border border-zinc-700 text-zinc-200 px-1 py-0.5 w-32 outline-none text-xs"
                                                                value={renameLorebookName}
                                                                onChange={e => setRenameLorebookName(e.target.value)}
                                                                onFocus={(e) => { if (window.innerWidth < 768) setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300); }}
                                                                autoFocus
                                                                onBlur={() => setRenameLorebookId(null)}
                                                                onKeyDown={e => e.key === 'Enter' && renameLorebook()}
                                                            />
                                                        ) : (
                                                            <div className="text-xs font-bold text-zinc-300 truncate">{lb.name}</div>
                                                        )}
                                                    </div>
                                                    <div className="text-[10px] text-zinc-600 truncate">{lb.entries.length} entries • {lb.description}</div>
                                                </div>
                                            </div>
                                            {!manageLorebookMode && (
                                                <div className="flex items-center gap-2">
                                                    <button type="button" onClick={() => startEditingLorebook(lb)} className="text-zinc-600 hover:text-orange-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity" title="Edit Content"><Pencil size={12} /></button>
                                                    <button type="button" onClick={() => { setRenameLorebookId(lb.id); setRenameLorebookName(lb.name); }} className="text-zinc-600 hover:text-white p-1 opacity-0 group-hover:opacity-100 transition-opacity" title="Rename"><Edit size={12} /></button>
                                                    <button type="button" onClick={() => setLorebookToDelete(lb.id)} className="text-zinc-600 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12} /></button>
                                                    <div className="w-px h-3 bg-zinc-800 mx-1"></div>
                                                    <button type="button" onClick={() => toggleLorebook(lb.id)} className={`transition-colors ${lb.enabled ? 'text-orange-500' : 'text-zinc-700 hover:text-zinc-500'}`}>
                                                        {lb.enabled ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )))}
                             </div>
                        </div>
                    )}
                </div>
            )}
        </div>

        {/* ... (footer actions and inputs remain unchanged) */}
        {/* Footer Actions */}
        {!editingLorebook && (
            <div className="p-6 border-t border-zinc-900 flex justify-end gap-4 bg-[#080808] shrink-0 z-10">
                <Button variant="ghost" onClick={handleCancel}>Cancel</Button>
                <Button variant="primary" onClick={handleSave}>Save Changes</Button>
            </div>
        )}

        {/* Hidden File Inputs */}
        <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleAvatarUpload} 
            className="hidden" 
            accept="image/*"
        />
        <input 
            type="file" 
            ref={bgInputRef} 
            onChange={handleBackgroundUpload} 
            className="hidden" 
            accept="image/*"
        />
        <input 
            type="file" 
            ref={lorebookInputRef} 
            onChange={handleImportLorebook} 
            className="hidden" 
            accept=".json"
        />

        {/* Overlays */}
        {showResetConfirm && (
             <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
                  <div className="bg-[#0a0a0a] border border-red-900/30 p-6 rounded shadow-lg max-w-sm w-full">
                      <h4 className="text-red-500 font-bold mb-2">Reset All Settings?</h4>
                      <p className="text-zinc-400 text-xs mb-4">This will revert all configuration to default values. Saved presets will remain.</p>
                      <div className="flex justify-end gap-2">
                          <Button variant="ghost" onClick={() => setShowResetConfirm(false)}>Cancel</Button>
                          <Button variant="danger" onClick={performReset}>Confirm Reset</Button>
                      </div>
                  </div>
              </div>
        )}

        {lorebookToDelete && (
             <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
                  <div className="bg-[#0a0a0a] border border-red-900/30 p-6 rounded shadow-lg max-w-sm w-full">
                      <h4 className="text-red-500 font-bold mb-2">Delete Global Lorebook?</h4>
                      <div className="flex justify-end gap-2">
                          <Button variant="ghost" onClick={() => setLorebookToDelete(null)}>Cancel</Button>
                          <Button variant="danger" onClick={deleteLorebook}>Delete</Button>
                      </div>
                  </div>
              </div>
        )}

        {showBulkDeleteConfirm && (
              <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
                  <div className="bg-[#0a0a0a] border border-red-900/30 p-6 rounded shadow-lg max-w-sm w-full">
                      <h4 className="text-red-500 font-bold mb-2">Bulk Delete?</h4>
                      <div className="flex justify-end gap-2">
                          <Button variant="ghost" onClick={() => setShowBulkDeleteConfirm(false)}>Cancel</Button>
                          <Button variant="danger" onClick={performBulkDeleteLorebooks}>Delete All</Button>
                      </div>
                  </div>
              </div>
        )}

        {presetToDelete && (
             <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
                  <div className="bg-[#0a0a0a] border border-red-900/30 p-6 rounded shadow-lg max-w-sm w-full">
                      <h4 className="text-red-500 font-bold mb-2">Delete Preset?</h4>
                      <div className="flex justify-end gap-2">
                          <Button variant="ghost" onClick={() => setPresetToDelete(null)}>Cancel</Button>
                          <Button variant="danger" onClick={handleDeletePreset}>Delete</Button>
                      </div>
                  </div>
              </div>
        )}

      </div>
    </div>
  );
};