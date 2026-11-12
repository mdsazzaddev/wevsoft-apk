import React, { useState, useEffect } from 'react';
import { Search, Folder, Tag, FileText, Plus, MoreVertical } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuthStore } from '../../stores/authStore';

interface Article {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  tags: string[];
  updatedAt: string;
}

export const KnowledgeBasePage: React.FC = () => {
  const { token } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const res = await fetch('/api/v1/business/knowledge', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setArticles(data);
          
          const uniqueCategories = Array.from(new Set(data.map((a: Article) => a.category).filter(Boolean))) as string[];
          setCategories(uniqueCategories);
          
          const allTags = data.flatMap((a: Article) => a.tags || []);
          const uniqueTags = Array.from(new Set(allTags)) as string[];
          setTags(uniqueTags);
        }
      } catch (err) {
        console.error('Failed to fetch knowledge base articles', err);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchArticles();
  }, [token]);

  const filteredArticles = articles.filter(a => 
    (!selectedCategory || a.category === selectedCategory) &&
    (a.title.toLowerCase().includes(searchQuery.toLowerCase()) || (a.excerpt || '').toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex h-full bg-background">
      {/* Sidebar */}
      <div className="w-64 border-r border-border bg-card/50 flex flex-col p-4">
        <h2 className="text-xl font-bold text-foreground mb-6">Knowledge Base</h2>
        
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Categories</h3>
          <div className="space-y-1">
            <button 
              onClick={() => setSelectedCategory(null)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${!selectedCategory ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-muted'}`}
            >
              <Folder className="w-4 h-4" />
              All Articles
            </button>
            {categories.map(cat => (
              <button 
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${selectedCategory === cat ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-muted'}`}
              >
                <Folder className="w-4 h-4" />
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Popular Tags</h3>
          <div className="flex flex-wrap gap-2">
            {tags.slice(0, 15).map(tag => (
              <span key={tag} className="flex items-center gap-1 px-2 py-1 bg-muted rounded-md text-xs text-muted-foreground">
                <Tag className="w-3 h-3" />
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col p-6 overflow-hidden">
        <div className="flex items-center justify-between mb-8">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search knowledge base..."
              className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
            />
          </div>
          
          <button className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" />
            New Article
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 no-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">Loading articles...</div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredArticles.map(article => (
                  <motion.div 
                    layout
                    key={article.id}
                    className="bg-card border border-border rounded-2xl p-5 hover:border-primary/40 hover:shadow-md transition-all group cursor-pointer flex flex-col"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        <FileText className="w-5 h-5" />
                      </div>
                      <button className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <h3 className="font-bold text-foreground text-lg mb-2 line-clamp-2">{article.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-4 flex-1">
                      {article.excerpt}
                    </p>
                    
                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/50">
                      <span className="text-xs font-medium px-2 py-1 bg-muted rounded-md text-foreground">
                        {article.category || 'Uncategorized'}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(article.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
              
              {filteredArticles.length === 0 && (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <Search className="w-12 h-12 mb-4 opacity-20" />
                  <p>No articles found.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
