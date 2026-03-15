import React, { useState, useRef } from 'react';
import { Lorebook, LorebookEntry } from '../types';
import { Button } from './Button';
import { BookOpen, Upload, X, CheckSquare, Square, Pencil, Trash2, ToggleRight, ToggleLeft, ChevronLeft, Save, Plus, Key } from 'lucide-react';

import { DebouncedTextarea } from './DebouncedTextarea';

interface LorebookManagerProps {
    lorebooks: Lorebook[];
    onChange: (lorebooks: Lorebook[]) => void;
}

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

export const LorebookManager: React.FC<LorebookManagerProps> = ({ lorebooks = [], onChange }) => {
    const [manageLorebookMode, setManageLorebookMode] = useState(false);
    const [selectedLorebooks, setSelectedLorebooks] = useState<Set<string>>(new Set());
    const [editingLorebook, setEditingLorebook] = useState<Lorebook | null>(null);
    const [lorebookToDelete, setLorebookToDelete] = useState<string | null>(null);
    const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
    const lorebookInputRef = useRef<HTMLInputElement>(null);

    const handleImportLorebook = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                const entries: LorebookEntry[] = [];
                
                const normalizeKeys = (keys: any): string[] => {
                    if (Array.isArray(keys)) return keys.map(String);
                    if (typeof keys === 'string') return keys.split(',').map(k => k.trim()).filter(k => k);
                    return [];
                };

                const rawEntries = json.entries || (json.data && json.data.entries) || (json.character_book && json.character_book.entries) || json;

                const processEntry = (entry: any) => {
                    if (!entry) return null;
                    const keys = entry.keys || entry.keyword || entry.keywords || [];
                    const content = entry.content || entry.constant || "";
                    const enabled = entry.enabled !== undefined ? entry.enabled : true;
                    if (content && (Array.isArray(keys) ? keys.length > 0 : keys)) {
                        return {
                            id: generateId(),
                            keys: normalizeKeys(keys),
                            content: content,
                            enabled: enabled
                        } as LorebookEntry;
                    }
                    return null;
                };

                if (Array.isArray(rawEntries)) {
                    rawEntries.forEach(entry => {
                        const processed = processEntry(entry);
                        if (processed) entries.push(processed);
                    });
                } else if (typeof rawEntries === 'object') {
                     Object.values(rawEntries).forEach(entry => {
                        const processed = processEntry(entry);
                        if (processed) entries.push(processed);
                     });
                }

                if (entries.length > 0) {
                    const newLorebook: Lorebook = {
                        id: generateId(),
                        name: json.name || file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " "),
                        description: json.description || "Imported Character Lore",
                        entries: entries,
                        enabled: true
                    };
                    onChange([...lorebooks, newLorebook]);
                } else {
                    alert("No valid lorebook entries found in this file.");
                }
            } catch (err) {
                alert("Invalid lorebook file.");
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const startEditingLorebook = (lb: Lorebook) => setEditingLorebook(JSON.parse(JSON.stringify(lb)));
    
    const saveEditingLorebook = () => { 
        if(editingLorebook) { 
            onChange(lorebooks.map(lb => lb.id === editingLorebook.id ? editingLorebook : lb)); 
            setEditingLorebook(null); 
        }
    };
    
    const addEntryToEditor = () => setEditingLorebook(prev => prev ? {...prev, entries:[...prev.entries, {id:generateId(), keys:['key'], content:'', enabled:true}]} : null);
    const removeEntryFromEditor = (id: string) => setEditingLorebook(prev => prev ? {...prev, entries:prev.entries.filter(e => e.id !== id)} : null);
    const updateEntryInEditor = (id: string, f: any, v: any) => setEditingLorebook(prev => prev ? {...prev, entries:prev.entries.map(e => e.id===id ? (f==='keys'?{...e, keys:v.split(',')}:{...e, [f]:v}) : e)} : null);
    
    const toggleLorebook = (id: string) => onChange(lorebooks.map(lb => lb.id===id ? {...lb, enabled:!lb.enabled} : lb));
    
    const deleteLorebook = () => { 
        if(lorebookToDelete) { 
            onChange(lorebooks.filter(lb => lb.id !== lorebookToDelete)); 
            setLorebookToDelete(null); 
        }
    };
    
    const bulkDeleteLorebooks = () => setShowBulkDeleteConfirm(true);
    
    const performBulkDeleteLorebooks = () => { 
        onChange(lorebooks.filter(lb => !selectedLorebooks.has(lb.id))); 
        setSelectedLorebooks(new Set()); 
        setManageLorebookMode(false); 
        setShowBulkDeleteConfirm(false); 
    };
    
    const toggleLorebookSelection = (id: string) => setSelectedLorebooks(prev => { const n = new Set(prev); if(n.has(id)) n.delete(id); else n.add(id); return n; });

    return (
        <div className="space-y-6 animate-slide-up-fade h-full">
            {editingLorebook ? (
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
                            <input className="w-full bg-black border border-zinc-800 p-2 text-zinc-200 focus:border-orange-500/50 outline-none text-xs rounded" value={editingLorebook.name} onChange={e => setEditingLorebook({...editingLorebook, name: e.target.value})} onFocus={(e) => { if (window.innerWidth < 768) setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300); }}/>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-1">Description</label>
                            <input className="w-full bg-black border border-zinc-800 p-2 text-zinc-200 focus:border-orange-500/50 outline-none text-xs rounded" value={editingLorebook.description || ""} onChange={e => setEditingLorebook({...editingLorebook, description: e.target.value})} onFocus={(e) => { if (window.innerWidth < 768) setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300); }}/>
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
                            {editingLorebook.entries.map((entry) => (
                                <div key={entry.id} className="bg-black/40 border border-zinc-800 rounded p-3 group hover:border-zinc-700 transition-colors">
                                    <div className="flex items-start gap-3 mb-2">
                                        <div className="mt-1 text-zinc-600"><Key size={14} /></div>
                                        <div className="flex-1">
                                            <input className="w-full bg-transparent border-b border-zinc-800 text-orange-200 text-xs py-1 focus:border-orange-500/50 outline-none placeholder-zinc-700 font-mono" placeholder="keywords" value={entry.keys.join(', ')} onChange={(e) => updateEntryInEditor(entry.id, 'keys', e.target.value)} onFocus={(e) => { if (window.innerWidth < 768) setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300); }}/>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button type="button" onClick={() => updateEntryInEditor(entry.id, 'enabled', !entry.enabled)} className={entry.enabled ? "text-emerald-500" : "text-zinc-600"} title={entry.enabled ? "Disable" : "Enable"}>
                                                {entry.enabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                                            </button>
                                            <button type="button" onClick={() => removeEntryFromEditor(entry.id)} className="text-zinc-600 hover:text-red-500 transition-colors" title="Delete">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    <DebouncedTextarea className="w-full bg-zinc-900/30 border border-zinc-800/50 rounded p-2 text-zinc-300 text-xs outline-none focus:border-orange-500/30 min-h-[80px] resize-y scrollbar-thin scrollbar-thumb-zinc-800" placeholder="Lore content..." value={entry.content} onDebounceChange={(val) => updateEntryInEditor(entry.id, 'content', val)}/>
                                </div>
                            ))}
                            {editingLorebook.entries.length === 0 && <div className="text-center py-8 text-zinc-600 text-xs italic">No entries yet.</div>}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between mb-4">
                        <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                            <BookOpen size={14} /> Character Lorebooks
                        </div>
                        <div className="flex items-center gap-2">
                            <button type="button" onClick={() => lorebookInputRef.current?.click()} className="text-[10px] bg-black border border-zinc-800 p-2 px-3 text-zinc-300 hover:text-white hover:border-zinc-700 flex items-center gap-2 transition-colors rounded">
                                <Upload size={12} /> Import
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
                    <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-zinc-800 bg-black/20 rounded-lg border border-zinc-900 p-4">
                        {lorebooks.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-zinc-600 gap-2 opacity-50">
                                <BookOpen size={32} />
                                <span className="text-xs">No lorebooks defined.</span>
                            </div>
                        ) : (
                            lorebooks.map(lb => (
                                <div key={lb.id} className="bg-black/60 border border-zinc-800/80 rounded p-3 flex items-center justify-between group hover:border-zinc-700 transition-colors">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        {manageLorebookMode ? (
                                            <div onClick={() => toggleLorebookSelection(lb.id)} className={`cursor-pointer ${selectedLorebooks.has(lb.id) ? 'text-orange-500' : 'text-zinc-700 hover:text-zinc-500'}`}>
                                                {selectedLorebooks.has(lb.id) ? <CheckSquare size={16}/> : <Square size={16}/>}
                                            </div>
                                        ) : (
                                            <div className="text-zinc-700"><BookOpen size={16} /></div>
                                        )}
                                        <div className="min-w-0">
                                            <div className="text-xs font-bold text-zinc-300 truncate">{lb.name}</div>
                                            <div className="text-[10px] text-zinc-600 truncate">{lb.entries.length} entries • {lb.description}</div>
                                        </div>
                                    </div>
                                    {!manageLorebookMode && (
                                        <div className="flex items-center gap-2">
                                            <button type="button" onClick={() => startEditingLorebook(lb)} className="text-zinc-600 hover:text-orange-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity" title="Edit Content">
                                                <Pencil size={12} />
                                            </button>
                                            <button type="button" onClick={() => setLorebookToDelete(lb.id)} className="text-zinc-600 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Trash2 size={12} />
                                            </button>
                                            <div className="w-px h-3 bg-zinc-800 mx-1"></div>
                                            <button type="button" onClick={() => toggleLorebook(lb.id)} className={`transition-colors ${lb.enabled ? 'text-orange-500' : 'text-zinc-700 hover:text-zinc-500'}`}>
                                                {lb.enabled ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
            
            <input type="file" ref={lorebookInputRef} onChange={handleImportLorebook} className="hidden" accept=".json" />
            
            {lorebookToDelete && (
                <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#0a0a0a] border border-red-900/30 p-6 rounded shadow-lg max-w-sm w-full">
                        <h4 className="text-red-500 font-bold mb-2">Delete Lorebook?</h4>
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="ghost" onClick={() => setLorebookToDelete(null)}>Cancel</Button>
                            <Button type="button" variant="danger" onClick={deleteLorebook}>Delete</Button>
                        </div>
                    </div>
                </div>
            )}
            {showBulkDeleteConfirm && (
                <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#0a0a0a] border border-red-900/30 p-6 rounded shadow-lg max-w-sm w-full">
                        <h4 className="text-red-500 font-bold mb-2">Bulk Delete?</h4>
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="ghost" onClick={() => setShowBulkDeleteConfirm(false)}>Cancel</Button>
                            <Button type="button" variant="danger" onClick={performBulkDeleteLorebooks}>Delete All</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
