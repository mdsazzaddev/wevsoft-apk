import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../../store';
import { motion } from 'motion/react';
import { X, Type, Image as ImageIcon, Video, Palette, ArrowLeft, Wand2 } from 'lucide-react';
import toast from 'react-hot-toast';
import ImageEditorModal from '../profile/ImageEditorModal';

interface StoryCreatorProps {
  onClose: () => void;
  onSuccess: () => void;
  /** When set, the story is authored by this WevSpace (team post). */
  spaceId?: string;
  spaceName?: string;
}

export default function StoryCreator({ onClose, onSuccess, spaceId, spaceName }: StoryCreatorProps) {
  const token = useStore((s) => s.token);
  const [type, setType] = useState<'select' | 'text' | 'media'>('select');
  const [loading, setLoading] = useState(false);

  const [content, setContent] = useState('');
  const [bgColor, setBgColor] = useState('#3b82f6');
  const [fontFamily, setFontFamily] = useState('Inter');
  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#000000', '#ffffff'];

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [privacy, setPrivacy] = useState('public');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    setMounted(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, []);

  useEffect(() => {
    if (!file) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setType('media');
      if (selected.type.startsWith('image/')) {
        setShowEditor(true);
      }
    }
  };

  const handleSaveEditedImage = (editedFile: File) => {
    setFile(editedFile);
    setShowEditor(false);
  };

  const handleSubmit = async () => {
    if (type === 'text' && !content.trim()) return;
    if (type === 'media' && !file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('type', type);
    formData.append('privacy', privacy);
    if (spaceId) formData.append('spaceId', spaceId);

    if (type === 'text') {
      formData.append('content', content);
      formData.append('backgroundColor', bgColor);
      formData.append('fontFamily', fontFamily);
    } else if (type === 'media' && file) {
      formData.append('media', file);
    }

    try {
      const res = await fetch('/api/stories', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) {
        toast.success(spaceName ? `Story published as ${spaceName}` : 'Story published!');
        onSuccess();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to create story');
      }
    } catch (err) {
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  const ui = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-md flex items-stretch sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Create Story"
    >
      <motion.div
        initial={{ scale: 0.98, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.98, opacity: 0 }}
        className="bg-card w-full h-[100dvh] sm:h-[min(90dvh,880px)] sm:max-w-4xl sm:rounded-3xl overflow-hidden shadow-2xl border-0 sm:border border-border flex flex-col md:flex-row"
      >
        {/* Controls */}
        <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-border flex flex-col min-h-0 flex-[1_1_45%] md:flex-none md:h-full md:max-h-none">
          <div className="p-3 sm:p-4 border-b border-border flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="p-2 bg-muted rounded-full hover:bg-muted/80 transition-colors"
            >
              <X size={20} />
            </button>
            <h2 className="font-bold text-lg">Create Story</h2>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-6">
            {type === 'select' && (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => setType('text')}
                  className="w-full p-4 rounded-2xl bg-primary/10 hover:bg-primary/20 border border-primary/20 flex flex-col items-center justify-center gap-3 transition-colors text-primary h-28 sm:h-32"
                >
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
                    <Type size={24} />
                  </div>
                  <span className="font-bold">Text Story</span>
                </button>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="image/*,video/*"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-4 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 flex flex-col items-center justify-center gap-3 transition-colors text-emerald-500 h-28 sm:h-32"
                >
                  <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg">
                    <ImageIcon size={24} />
                  </div>
                  <span className="font-bold">Photo / Video Story</span>
                </button>
              </div>
            )}

            {type === 'text' && (
              <div className="space-y-5">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Start typing..."
                  className="w-full bg-muted border border-border rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-primary min-h-[120px] resize-none"
                />

                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block tracking-wider flex items-center gap-2">
                    <Palette size={14} /> Background Color
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {colors.map((c) => (
                      <button
                        type="button"
                        key={c}
                        onClick={() => setBgColor(c)}
                        className={`w-8 h-8 rounded-full border-2 shadow-sm ${
                          bgColor === c ? 'border-primary scale-110' : 'border-border/50 hover:scale-105'
                        } transition-all`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block tracking-wider flex items-center gap-2">
                    <Type size={14} /> Font Style
                  </label>
                  <select
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    className="w-full bg-muted border border-border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="Inter">Inter (Clean)</option>
                    <option value="Space Grotesk">Space Grotesk (Modern)</option>
                    <option value="JetBrains Mono">JetBrains Mono (Tech)</option>
                    <option value="Playfair Display">Playfair Display (Elegant)</option>
                    <option value="Comic Sans MS">Comic (Playful)</option>
                  </select>
                </div>
              </div>
            )}

            {type === 'media' && file && (
              <div className="space-y-4">
                <div className="p-4 bg-muted border border-border rounded-xl flex items-center gap-3">
                  {file.type.startsWith('video') ? (
                    <Video className="text-primary shrink-0" />
                  ) : (
                    <ImageIcon className="text-primary shrink-0" />
                  )}
                  <div className="flex-1 truncate">
                    <p className="text-sm font-bold truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>

                {file.type.startsWith('image/') && (
                  <button
                    type="button"
                    onClick={() => setShowEditor(true)}
                    className="w-full py-3 bg-primary/10 text-primary font-bold rounded-xl hover:bg-primary/20 transition-colors flex items-center justify-center gap-2"
                  >
                    <Wand2 size={18} /> Open Professional Editor
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setType('select');
                  }}
                  className="w-full py-3 border border-border font-bold rounded-xl hover:bg-muted transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowLeft size={18} /> Choose Different File
                </button>
              </div>
            )}

            {type !== 'select' && (
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block tracking-wider">
                  Privacy
                </label>
                <select
                  value={privacy}
                  onChange={(e) => setPrivacy(e.target.value)}
                  className="w-full bg-muted border border-border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="public">Public (Everyone)</option>
                  <option value="friends">Friends Only</option>
                  <option value="followers">Followers</option>
                  <option value="close_friends">Close Friends</option>
                  <option value="private">Only Me</option>
                </select>
              </div>
            )}
          </div>

          {type !== 'select' && (
            <div className="p-3 sm:p-4 border-t border-border shrink-0 safe-area-pb">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || (type === 'text' && !content) || (type === 'media' && !file)}
                className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg hover:shadow-primary/25 hover:bg-primary/90 transition-all flex justify-center items-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Publishing...' : 'Share to Story'}
              </button>
            </div>
          )}
        </div>

        {/* Preview — always visible and sized to fit viewport */}
        <div className="flex-1 min-h-0 bg-black flex items-center justify-center relative p-3 sm:p-4 flex-[1_1_55%] md:flex-1">
          <div className="w-full h-full max-w-[360px] max-h-full mx-auto aspect-[9/16] rounded-2xl overflow-hidden relative shadow-2xl bg-zinc-900 flex items-center justify-center border border-border z-10">
            {type === 'select' && (
              <p className="text-zinc-500 font-medium text-sm flex items-center gap-2 px-4 text-center">
                <ImageIcon size={16} /> Preview Area
              </p>
            )}

            {type === 'text' && (
              <div
                className="absolute inset-0 flex items-center justify-center p-6 text-center overflow-auto"
                style={{ backgroundColor: bgColor, fontFamily }}
              >
                <p className="text-white text-xl sm:text-2xl font-bold whitespace-pre-wrap drop-shadow-md break-words">
                  {content || 'Preview Text'}
                </p>
              </div>
            )}

            {type === 'media' && file && previewUrl && (
              file.type.startsWith('image/') ? (
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <video src={previewUrl} controls playsInline className="w-full h-full object-contain bg-black" />
              )
            )}
          </div>
        </div>
      </motion.div>

      {showEditor && file && (
        <ImageEditorModal
          file={file}
          type="avatar"
          onClose={() => setShowEditor(false)}
          onSave={handleSaveEditedImage}
        />
      )}
    </motion.div>
  );

  return createPortal(ui, document.body);
}
