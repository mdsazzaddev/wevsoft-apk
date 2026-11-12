import React, { useState, useEffect, useRef } from 'react';
import { Folder, FileText, Download, MoreVertical, Search, Plus, Filter, Trash2, Image as ImageIcon, Video, File, X, Loader } from 'lucide-react';
import { useStore } from '../store';
import toast from 'react-hot-toast';

export default function FilesPage() {
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  
  const token = useStore(state => state.token);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability -- intentional mutation/forward reference (existing behavior)
    fetchDriveData();
  }, [currentFolder]);

  const fetchDriveData = async () => {
    setLoading(true);
    try {
      const url = currentFolder ? `/api/drive?parentId=${currentFolder}` : '/api/drive';
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load drive data');
      const data = await res.json();
      setFolders(data.folders || []);
      setFiles(data.files || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      const res = await fetch('/api/drive/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newFolderName, parentId: currentFolder })
      });
      if (!res.ok) throw new Error('Failed to create folder');
      const folder = await res.json();
      setFolders([...folders, folder]);
      setNewFolderName('');
      setIsCreatingFolder(false);
      toast.success('Folder created');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    if (currentFolder) formData.append('folderId', currentFolder);

    try {
      const res = await fetch('/api/drive/files', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (!res.ok) throw new Error('Failed to upload file');
      const newFile = await res.json();
      setFiles([newFile, ...files]);
      toast.success('File uploaded');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteFolder = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this folder and all its contents?')) return;
    try {
      const res = await fetch(`/api/drive/folders/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete folder');
      setFolders(folders.filter(f => f.id !== id));
      toast.success('Folder deleted');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteFile = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this file?')) return;
    try {
      const res = await fetch(`/api/drive/files/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete file');
      setFiles(files.filter(f => f.id !== id));
      toast.success('File deleted');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getFileIcon = (type) => {
    if (type.includes('image')) return <ImageIcon size={20} />;
    if (type.includes('video')) return <Video size={20} />;
    if (type.includes('pdf')) return <FileText size={20} />;
    return <File size={20} />;
  };

  const filteredFolders = folders.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));
  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
          <Folder className="text-amber-500" size={32} /> Drive
        </h1>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input 
              type="text" 
              placeholder="Search files..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-sm" 
            />
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-4 py-2 bg-amber-500 text-foreground dark:text-white font-bold rounded-xl shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-all flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
          >
            {isUploading ? <Loader className="animate-spin" size={18} /> : <Plus size={18} />} Upload File
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload}
            className="hidden" 
          />
        </div>
      </div>

      {currentFolder && (
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setCurrentFolder(null)}
            className="text-sm font-semibold text-amber-500 hover:underline"
          >
            My Drive
          </button>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm font-semibold">Folder</span>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Folders</h2>
          <button 
            onClick={() => setIsCreatingFolder(true)}
            className="text-sm font-semibold text-amber-500 hover:text-amber-600 flex items-center gap-1"
          >
            <Plus size={16}/> New Folder
          </button>
        </div>

        {isCreatingFolder && (
          <form onSubmit={handleCreateFolder} className="bg-card border border-amber-500/50 p-4 rounded-2xl flex items-center gap-3">
            <Folder className="text-amber-500" size={24} />
            <input 
              autoFocus
              type="text" 
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name..." 
              className="flex-1 bg-transparent border-none focus:outline-none text-sm" 
            />
            <button type="submit" className="px-3 py-1 bg-amber-500 text-foreground dark:text-white rounded-lg text-sm font-bold">Create</button>
            <button type="button" onClick={() => setIsCreatingFolder(false)} className="p-1 hover:bg-muted rounded-lg"><X size={18}/></button>
          </form>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {filteredFolders.map(f => (
            <div 
              key={f.id} 
              onClick={() => setCurrentFolder(f.id)}
              className="bg-card border border-border p-4 rounded-2xl flex items-center justify-between gap-3 hover:border-amber-500/50 hover:bg-amber-500/5 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Folder className="text-amber-500 group-hover:fill-amber-500/20 transition-all shrink-0" size={24} />
                <span className="font-semibold text-sm truncate">{f.name}</span>
              </div>
              <button 
                onClick={(e) => handleDeleteFolder(f.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-destructive/10 text-destructive rounded-lg transition-all"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {filteredFolders.length === 0 && !loading && !isCreatingFolder && (
            <div className="col-span-full py-8 text-center text-muted-foreground text-sm border border-dashed rounded-2xl">
              No folders found.
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Files</h2>
          <button onClick={() => {}} className="text-sm font-semibold text-muted-foreground flex items-center gap-1 hover:text-foreground">
            <Filter size={16}/> Filter
          </button>
        </div>
        
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          {filteredFiles.map((file) => (
            <div key={file.id} className="flex items-center p-4 border-b border-border last:border-0 hover:bg-muted/50 transition-colors group">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                {getFileIcon(file.type)}
              </div>
              <div className="ml-4 flex-1 min-w-0">
                <a 
                  href={file.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-sm font-bold truncate group-hover:text-amber-500 transition-colors cursor-pointer hover:underline block"
                >
                  {file.name}
                </a>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <span>{formatSize(file.size)}</span>
                  <span>•</span>
                  <span>{formatDate(file.createdAt)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <a 
                  href={file.url} 
                  download
                  className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Download size={18}/>
                </a>
                <button 
                  onClick={(e) => handleDeleteFile(file.id, e)}
                  className="p-2 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-lg transition-colors"
                >
                  <Trash2 size={18}/>
                </button>
              </div>
            </div>
          ))}
          {filteredFiles.length === 0 && !loading && (
            <div className="p-8 text-center text-muted-foreground text-sm border-b border-border last:border-0">
              No files uploaded yet.
            </div>
          )}
          {loading && (
            <div className="p-8 flex justify-center items-center text-amber-500">
              <Loader className="animate-spin" size={24} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
