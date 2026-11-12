import DOMPurify from 'dompurify';
import React from 'react';
import { ArrowLeft, Share2, Download, Clock, Edit } from 'lucide-react';

interface ArticleViewerProps {
  article: {
    title: string;
    content: string; // Markdown or HTML string
    category: string;
    author: string;
    updatedAt: string;
  };
  onBack: () => void;
  onEdit: () => void;
}

export const ArticleViewer: React.FC<ArticleViewerProps> = ({ article, onBack, onEdit }) => {
  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto no-scrollbar">
      {/* Top Navigation */}
      <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-background/80 backdrop-blur-md border-b border-border">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Export to PDF">
            <Download className="w-4 h-4" />
          </button>
          <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Share">
            <Share2 className="w-4 h-4" />
          </button>
          <button 
            onClick={onEdit}
            className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors ml-2"
          >
            <Edit className="w-4 h-4" />
            Edit
          </button>
        </div>
      </div>

      {/* Article Content */}
      <div className="max-w-3xl w-full mx-auto p-8 pb-24">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="px-2.5 py-1 bg-muted rounded-md text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {article.category}
            </span>
          </div>
          
          <h1 className="text-4xl font-black text-foreground mb-6 leading-tight">
            {article.title}
          </h1>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground pb-6 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-[10px]">
                {article.author.charAt(0)}
              </div>
              <span className="font-medium text-foreground">{article.author}</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>Last updated {new Date(article.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Prose container for rich text / markdown styling */}
        <article className="prose prose-slate dark:prose-invert prose-headings:font-bold prose-a:text-primary max-w-none">
          {/* If it's markdown, you'd use a markdown parser here. Assuming HTML for demo. */}
          <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(article.content) }} />
        </article>
      </div>
    </div>
  );
};
