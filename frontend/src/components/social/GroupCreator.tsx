import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Users, Search, Plus, Check, ImageIcon, ShieldAlert, Lock, Unlock, EyeOff, Shield, Link as LinkIcon, QrCode, ArrowRight } from 'lucide-react';
import { useStore } from '../../store';
import toast from 'react-hot-toast';

interface GroupCreatorProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function GroupCreator({ onClose, onSuccess }: GroupCreatorProps) {
  const token = useStore((s) => s.token);
  const user = useStore((s) => s.user);
  const [step, setStep] = useState(1); // 1: Info, 2: Rules & Roles, 3: Invite Friends
  const [loading, setLoading] = useState(false);
  
  // Group Info
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState('public');
  const [joinApproval, setJoinApproval] = useState(false);
  const [groupRules, setGroupRules] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  // Friends Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<any[]>([]);
  
  // Roles
  const [moderators, setModerators] = useState<string[]>([]);

  useEffect(() => {
    if (step === 3 && searchQuery) {
      const delay = setTimeout(() => {
        // eslint-disable-next-line react-hooks/immutability -- intentional mutation/forward reference (existing behavior)
        searchFriends();
      }, 300);
      return () => clearTimeout(delay);
    } else if (step === 3 && !searchQuery) {
      searchFriends('suggested');
    }
  }, [searchQuery, step]);

  const searchFriends = async (query = searchQuery) => {
    try {
      const q = query === 'suggested' ? '' : query;
      const res = await fetch(`/api/friends/search?q=${encodeURIComponent(q)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setSearchResults(await res.json());
      }
    } catch (e) { /* ignore */ }
  };

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCoverFile(e.target.files[0]);
      setCoverPreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  const toggleFriend = (friend: any) => {
    if (selectedFriends.find(f => f.id === friend.id)) {
      setSelectedFriends(selectedFriends.filter(f => f.id !== friend.id));
      setModerators(moderators.filter(id => id !== friend.id));
    } else {
      setSelectedFriends([...selectedFriends, friend]);
    }
  };
  
  const toggleModerator = (friendId: string) => {
    if (moderators.includes(friendId)) {
      setModerators(moderators.filter(id => id !== friendId));
    } else {
      setModerators([...moderators, friendId]);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    
    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    formData.append('privacy', privacy);
    formData.append('joinApproval', String(joinApproval));
    formData.append('rules', groupRules);
    formData.append('userIds', JSON.stringify(selectedFriends.map(f => f.id)));
    formData.append('moderatorIds', JSON.stringify(moderators));
    if (coverFile) formData.append('cover', coverFile);
    
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      
      if (res.ok) {
        toast.success('Group created successfully!');
        onSuccess();
      } else {
        toast.error('Failed to create group');
      }
    } catch (err) {
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, backdropFilter: 'blur(0px)' }} 
        animate={{ opacity: 1, backdropFilter: 'blur(12px)' }} 
        exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
        className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4"
      >
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 20 }} 
          animate={{ scale: 1, opacity: 1, y: 0 }} 
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="bg-background/90 backdrop-blur-xl w-full max-w-5xl h-[90vh] md:h-[80vh] rounded-[2rem] overflow-hidden shadow-2xl border border-border dark:border-border flex flex-col md:flex-row"
        >
          {/* Left Side: Forms */}
          <div className="w-full md:w-[500px] border-r border-border flex flex-col h-1/2 md:h-full bg-background/50">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="font-extrabold text-xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">Create Wev Chat Group</h2>
                <div className="flex gap-2 mt-2">
                  {[1, 2, 3].map(s => (
                    <div key={s} className={`h-1.5 rounded-full transition-all duration-300 ${s === step ? 'w-8 bg-primary' : s < step ? 'w-4 bg-primary/50' : 'w-4 bg-muted'}`} />
                  ))}
                </div>
              </div>
              <button onClick={onClose} className="p-2.5 bg-muted/50 rounded-full hover:bg-muted transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 relative">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
                    <div>
                      <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block tracking-wider">Group Name</label>
                      <input 
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter group name"
                        className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3.5 focus:outline-none focus:border-primary focus:bg-background transition-all font-medium"
                      />
                    </div>
                    
                    <div>
                      <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block tracking-wider">Description</label>
                      <textarea 
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="What's the purpose of this group?"
                        className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3.5 focus:outline-none focus:border-primary focus:bg-background transition-all min-h-[100px] resize-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-muted-foreground uppercase mb-3 block tracking-wider">Privacy Setting</label>
                      <div className="space-y-3">
                        <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${privacy === 'public' ? 'border-primary bg-primary/5 shadow-md shadow-primary/5' : 'border-border hover:bg-muted/50'}`}>
                          <input type="radio" name="privacy" value="public" checked={privacy === 'public'} onChange={() => setPrivacy('public')} className="mt-1" />
                          <div>
                            <div className="font-bold flex items-center gap-2"><Unlock size={16}/> Public</div>
                            <p className="text-xs text-muted-foreground">Anyone can find the group and see its members and posts.</p>
                          </div>
                        </label>
                        <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${privacy === 'private' ? 'border-primary bg-primary/5 shadow-md shadow-primary/5' : 'border-border hover:bg-muted/50'}`}>
                          <input type="radio" name="privacy" value="private" checked={privacy === 'private'} onChange={() => setPrivacy('private')} className="mt-1" />
                          <div>
                            <div className="font-bold flex items-center gap-2"><Lock size={16}/> Private</div>
                            <p className="text-xs text-muted-foreground">Only members can see who's in the group and what they post.</p>
                          </div>
                        </label>
                        <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${privacy === 'secret' ? 'border-primary bg-primary/5 shadow-md shadow-primary/5' : 'border-border hover:bg-muted/50'}`}>
                          <input type="radio" name="privacy" value="secret" checked={privacy === 'secret'} onChange={() => setPrivacy('secret')} className="mt-1" />
                          <div>
                            <div className="font-bold flex items-center gap-2"><EyeOff size={16}/> Secret</div>
                            <p className="text-xs text-muted-foreground">Only members can find the group and see its content.</p>
                          </div>
                        </label>
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div key="step2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
                    <div>
                      <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block tracking-wider">Group Rules (Optional)</label>
                      <textarea 
                        value={groupRules}
                        onChange={(e) => setGroupRules(e.target.value)}
                        placeholder="e.g. Be kind and respectful. No spam."
                        className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3.5 focus:outline-none focus:border-primary focus:bg-background transition-all min-h-[120px] resize-none"
                      />
                    </div>
                    
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block tracking-wider">Membership Controls</label>
                      <label className="flex items-center justify-between p-4 bg-muted/50 border border-border rounded-xl cursor-pointer hover:bg-muted transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center">
                            <ShieldAlert size={20} />
                          </div>
                          <div>
                            <div className="font-bold text-sm">Require Approval</div>
                            <div className="text-xs text-muted-foreground">Admins must approve new joins.</div>
                          </div>
                        </div>
                        <input type="checkbox" checked={joinApproval} onChange={(e) => setJoinApproval(e.target.checked)} className="w-5 h-5 rounded text-primary focus:ring-primary" />
                      </label>
                      
                      <div className="flex items-center justify-between p-4 bg-muted/50 border border-border rounded-xl cursor-pointer hover:bg-muted transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-purple-500/20 text-purple-500 flex items-center justify-center">
                            <LinkIcon size={20} />
                          </div>
                          <div>
                            <div className="font-bold text-sm">Invite Links</div>
                            <div className="text-xs text-muted-foreground">Members can share invite links.</div>
                          </div>
                        </div>
                        <input type="checkbox" defaultChecked className="w-5 h-5 rounded text-primary focus:ring-primary" />
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div key="step3" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                      <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search friends by name..."
                        className="w-full bg-muted/50 border border-border rounded-xl pl-10 pr-4 py-3.5 focus:outline-none focus:border-primary focus:bg-background transition-all"
                      />
                    </div>
                    
                    {selectedFriends.length > 0 && (
                      <div className="flex flex-wrap gap-2 pb-3 border-b border-border">
                        {selectedFriends.map(f => (
                          <div key={f.id} className="bg-background border border-border px-3 py-1.5 rounded-full flex items-center gap-2 text-sm font-medium shadow-sm group">
                            <img src={f.avatar || `https://ui-avatars.com/api/?name=${f.name}`} alt="" className="w-5 h-5 rounded-full" />
                            {f.name.split(' ')[0]}
                            <button onClick={(e) => { e.stopPropagation(); toggleModerator(f.id); }} className={`p-1 rounded-full transition-colors ${moderators.includes(f.id) ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-muted'}`} title="Make Moderator">
                              <Shield size={12}/>
                            </button>
                            <button onClick={() => toggleFriend(f)} className="hover:bg-red-500/20 hover:text-red-500 rounded-full p-0.5 transition-colors"><X size={14}/></button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="space-y-1 pb-20">
                      <p className="text-xs font-bold text-muted-foreground uppercase mb-2 px-1">Suggested</p>
                      {searchResults.map((user: any) => {
                        const isSelected = !!selectedFriends.find(f => f.id === user.id);
                        return (
                          <div key={user.id} onClick={() => toggleFriend(user)} className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border ${isSelected ? 'bg-primary/5 border-primary/20' : 'bg-transparent border-transparent hover:bg-muted/50'}`}>
                            <div className="flex items-center gap-3">
                              <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}`} alt="" className="w-10 h-10 rounded-full border border-border" />
                              <div>
                                <span className="font-bold block leading-tight">{user.name}</span>
                                {user.department && <span className="text-xs text-muted-foreground">{user.department}</span>}
                              </div>
                            </div>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${isSelected ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' : 'border-2 border-muted-foreground/30 text-transparent'}`}>
                              <Check size={14} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <div className="p-6 border-t border-border flex gap-3 bg-background relative z-10 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)]">
              {step > 1 && (
                <button onClick={() => setStep(step - 1)} className="px-6 py-3.5 bg-muted font-bold rounded-xl hover:bg-muted/80 transition-colors">
                  Back
                </button>
              )}
              {step < 3 ? (
                <button onClick={() => setStep(step + 1)} disabled={!name.trim() && step === 1} className="flex-1 py-3.5 bg-primary text-primary-foreground font-bold rounded-xl shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  Next Step <ArrowRight size={18} />
                </button>
              ) : (
                <button onClick={handleCreate} disabled={loading} className="flex-1 py-3.5 bg-primary text-primary-foreground font-bold rounded-xl shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50 flex justify-center items-center gap-2">
                  {loading ? 'Creating...' : 'Create Group'}
                </button>
              )}
            </div>
          </div>

          {/* Right Side: Group Preview */}
          <div className="flex-1 bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-black flex items-center justify-center p-8 relative overflow-hidden h-1/2 md:h-full">
            <div className="absolute inset-0 pattern-grid-lg text-black/5 dark:text-white/5 opacity-50"></div>
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, rotateY: 10 }}
              animate={{ scale: 1, opacity: 1, rotateY: 0 }}
              transition={{ delay: 0.1, type: "spring" }}
              className="w-full max-w-[420px] bg-background/80 backdrop-blur-md rounded-3xl overflow-hidden shadow-2xl border border-white/50 dark:border-border relative z-10"
            >
              {/* Cover Photo */}
              <div className="h-48 bg-muted relative group">
                {coverPreview ? (
                  <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
                    <Users className="text-foreground dark:text-white/50" size={56} />
                  </div>
                )}
                
                <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/10 dark:bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white backdrop-blur-sm">
                  <ImageIcon size={28} className="mb-2" />
                  <span className="font-bold text-sm bg-black/40 px-3 py-1 rounded-full">Upload Cover</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleCoverSelect} />
                </label>
              </div>
              
              <div className="p-8">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-2xl font-extrabold line-clamp-2">{name || 'Your Group Name'}</h3>
                  <button onClick={() => {}} className="p-2 bg-muted rounded-full">
                    <QrCode size={18} className="text-muted-foreground" />
                  </button>
                </div>
                
                <p className="text-sm text-muted-foreground font-medium mb-6 flex items-center gap-1.5 bg-muted/50 w-fit px-3 py-1 rounded-full border border-border">
                  {privacy === 'public' ? <Unlock size={14}/> : privacy === 'private' ? <Lock size={14}/> : <EyeOff size={14}/>} 
                  {privacy.charAt(0).toUpperCase() + privacy.slice(1)} group · {selectedFriends.length + 1} member{selectedFriends.length === 0 ? '' : 's'}
                </p>
                
                <div className="flex -space-x-3 mb-6">
                  <img src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name}`} className="w-10 h-10 rounded-full border-2 border-background z-10 shadow-sm" />
                  {selectedFriends.slice(0, 4).map((f, i) => (
                    <img key={f.id} src={f.avatar || `https://ui-avatars.com/api/?name=${f.name}`} className="w-10 h-10 rounded-full border-2 border-background shadow-sm" style={{ zIndex: 9 - i }} />
                  ))}
                  {selectedFriends.length > 4 && (
                    <div className="w-10 h-10 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-bold z-0 shadow-sm">
                      +{selectedFriends.length - 4}
                    </div>
                  )}
                </div>
                
                <p className="text-sm text-foreground/80 line-clamp-3 mb-8 bg-muted/30 p-4 rounded-xl border border-border/50 italic">
                  {description ? `"${description}"` : "Add a description to tell people what this group is about."}
                </p>
                
                <div className="flex gap-3">
                  <div className="flex-1 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl text-center text-sm shadow-lg shadow-primary/20">Joined</div>
                  <div className="px-4 py-2.5 bg-muted text-foreground font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-muted/80 transition-colors border border-border"><Plus size={16} /> Invite</div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

