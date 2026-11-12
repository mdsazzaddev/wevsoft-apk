import DOMPurify from 'dompurify';
import React, { useState } from 'react';
import { Bold, Italic, Underline, List, Link as LinkIcon, Pin, Lock, Save, X, AlignLeft, AlignCenter } from 'lucide-react';
import { useStore } from '../../store';
import { createNote, updateNote } from '../../lib/collaborationApi';
import toast from 'react-hot-toast';

interface SharedNoteEditorProps {
  conversationId: string;
  noteId?: string;
  initialTitle?: string;
  initialContent?: string;
  isPinned?: boolean;
  isLocked?: boolean;
  lastEditedBy?: string;
  lastEditedAt?: string;
  onClose: () => void;
  onSaveSuccess: () => void;
}

export const SharedNoteEditor: React.FC<SharedNoteEditorProps> = ({
  conversationId, noteId, initialTitle = '', initialContent = '',
  isPinned: initPinned = false, isLocked: initLocked = false,
  lastEditedBy, lastEditedAt, onClose, onSaveSuccess
}) => {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [isPinned, setIsPinned] = useState(initPinned);
  const [isLocked, setIsLocked] = useState(initLocked);
  const [isSaving, setIsSaving] = useState(false);
  
  const token = useStore(state => state.token);

  const handleSave = async () => {
    if (!title.trim() || !token) return;
    setIsSaving(true);
    try {
      if (noteId) {
        await updateNote(token, noteId, { title, content, isPinned, isLocked });
      } else {
        await createNote(token, conversationId, { title, content, isPinned, isLocked });
      }
      toast.success('Note saved');
      onSaveSuccess();
      onClose();
    } catch (err) {
      toast.error('Failed to save note');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFormat = (command: string) => {
    document.execCommand(command, false);
  };

  return (
    <div className="flex flex-col h-full bg-card border border-border shadow-lg rounded-xl overflow-hidden max-w-3xl mx-auto">
      <div className="flex items-center justify-between p-3 border-b border-border bg-muted/20">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note Title"
            className="bg-transparent text-lg font-bold text-foreground outline-none placeholder:text-muted-foreground w-64 focus:border-b-2 border-primary"
          />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsPinned(!isPinned)} className={`p-2 rounded-lg transition-colors ${isPinned ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-muted'}`}>
            <Pin className="w-4 h-4" />
          </button>
          <button onClick={() => setIsLocked(!isLocked)} className={`p-2 rounded-lg transition-colors ${isLocked ? 'bg-red-500/20 text-red-500' : 'text-muted-foreground hover:bg-muted'}`}>
            <Lock className="w-4 h-4" />
          </button>
          <button onClick={handleSave} disabled={isSaving || !title.trim()} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors ml-2">
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving' : 'Save'}
          </button>
          <button onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground transition-colors ml-1">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1 p-2 border-b border-border bg-muted/10 overflow-x-auto">
        <button onMouseDown={(e) => { e.preventDefault(); handleFormat('bold'); }} className="p-2 hover:bg-muted rounded text-foreground transition-colors"><Bold className="w-4 h-4" /></button>
        <button onMouseDown={(e) => { e.preventDefault(); handleFormat('italic'); }} className="p-2 hover:bg-muted rounded text-foreground transition-colors"><Italic className="w-4 h-4" /></button>
        <button onMouseDown={(e) => { e.preventDefault(); handleFormat('underline'); }} className="p-2 hover:bg-muted rounded text-foreground transition-colors"><Underline className="w-4 h-4" /></button>
        <div className="w-px h-4 bg-border mx-1"></div>
        <button onMouseDown={(e) => { e.preventDefault(); handleFormat('insertUnorderedList'); }} className="p-2 hover:bg-muted rounded text-foreground transition-colors"><List className="w-4 h-4" /></button>
        <button onMouseDown={(e) => { e.preventDefault(); handleFormat('justifyLeft'); }} className="p-2 hover:bg-muted rounded text-foreground transition-colors"><AlignLeft className="w-4 h-4" /></button>
        <button onMouseDown={(e) => { e.preventDefault(); handleFormat('justifyCenter'); }} className="p-2 hover:bg-muted rounded text-foreground transition-colors"><AlignCenter className="w-4 h-4" /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-background">
        <div
          className="outline-none min-h-[300px] text-foreground text-sm prose prose-sm dark:prose-invert max-w-none"
          contentEditable
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
          onBlur={(e) => setContent(e.currentTarget.innerHTML)}
        />
      </div>

      {lastEditedBy && (
        <div className="px-4 py-2 border-t border-border bg-muted/20 text-xs text-muted-foreground text-right italic">
          Last edited by {lastEditedBy} {lastEditedAt && `at ${new Date(lastEditedAt).toLocaleString()}`}
        </div>
      )}
    </div>
  );
};
