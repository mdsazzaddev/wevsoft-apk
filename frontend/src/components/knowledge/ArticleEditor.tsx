import DOMPurify from 'dompurify';
import React, { useState } from 'react';
import { ArrowLeft, Save, Send, Image as ImageIcon, Link as LinkIcon, List, Bold, Italic, Heading } from 'lucide-react';
import toast from 'react-hot-toast';

interface ArticleEditorProps {
  initialData?: {
    title: string;
    content: string;
    category: string;
    tags: string[];
  };
  onBack: () => void;
  onSave: (data: any) => Promise<void>;
}

export const ArticleEditor: React.FC<ArticleEditorProps> = ({ initialData, onBack, onSave }) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [category, setCategory] = useState(initialData?.category || 'Engineering');
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const categories = ['Engineering', 'Design', 'Marketing', 'HR', 'General'];

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handlePublish = async () => {
    if (!title.trim()) return toast.error('Title is required');
    setIsSaving(true);
    try {
      await onSave({ title, content, category, tags });
      toast.success('Article published');
    } catch (err) {
      toast.error('Failed to publish article');
    } finally {
      setIsSaving(false);
    }
  };

  const format = (command: string) => {
    document.execCommand(command, false);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Top Navigation */}
      <div className="flex items-center justify-between p-4 bg-card border-b border-border">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <Save className="w-4 h-4" />
            Save Draft
          </button>
          <button 
            onClick={handlePublish}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {isSaving ? 'Publishing...' : 'Publish'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        {/* Main Editor */}
        <div className="flex-1 flex flex-col border-r border-border overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/10">
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Article Title..."
              className="w-full bg-transparent text-3xl font-black text-foreground outline-none placeholder:text-muted-foreground/50"
            />
          </div>
          
          <div className="flex items-center gap-1 p-2 border-b border-border bg-card">
            <button onMouseDown={e => { e.preventDefault(); format('formatBlock'); document.execCommand('formatBlock', false, 'H2'); }} className="p-2 hover:bg-muted rounded text-foreground transition-colors"><Heading className="w-4 h-4" /></button>
            <button onMouseDown={e => { e.preventDefault(); format('bold'); }} className="p-2 hover:bg-muted rounded text-foreground transition-colors"><Bold className="w-4 h-4" /></button>
            <button onMouseDown={e => { e.preventDefault(); format('italic'); }} className="p-2 hover:bg-muted rounded text-foreground transition-colors"><Italic className="w-4 h-4" /></button>
            <div className="w-px h-4 bg-border mx-2"></div>
            <button onMouseDown={e => { e.preventDefault(); format('insertUnorderedList'); }} className="p-2 hover:bg-muted rounded text-foreground transition-colors"><List className="w-4 h-4" /></button>
            <button onMouseDown={e => { e.preventDefault(); format('createLink'); }} className="p-2 hover:bg-muted rounded text-foreground transition-colors"><LinkIcon className="w-4 h-4" /></button>
            <button className="p-2 hover:bg-muted rounded text-foreground transition-colors"><ImageIcon className="w-4 h-4" /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 bg-background">
            <div
              className="outline-none min-h-full text-foreground prose prose-sm md:prose-base dark:prose-invert max-w-none"
              contentEditable
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
              onBlur={e => setContent(e.currentTarget.innerHTML)}
            />
          </div>
        </div>

        {/* Sidebar Settings */}
        <div className="w-full md:w-72 bg-card p-4 overflow-y-auto border-t md:border-t-0 border-border">
          <h3 className="text-sm font-bold text-foreground mb-6 uppercase tracking-wider">Publish Settings</h3>
          
          <div className="mb-6">
            <label className="block text-sm font-semibold text-muted-foreground mb-2">Category</label>
            <select 
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full px-3 py-2 bg-muted rounded-lg text-sm text-foreground outline-none border border-border appearance-none"
            >
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-muted-foreground mb-2">Tags</label>
            <div className="bg-muted rounded-lg p-2 border border-border flex flex-wrap gap-2">
              {tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 bg-background border border-border px-2 py-1 rounded text-xs font-medium">
                  {tag}
                  <button onClick={() => removeTag(tag)} className="text-muted-foreground hover:text-red-500">
                    &times;
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="Add tag and press Enter..."
                className="bg-transparent text-sm outline-none flex-1 min-w-[120px] py-1"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
