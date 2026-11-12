import React from 'react';
import { Link as LinkIcon, ExternalLink } from 'lucide-react';

interface LinkSearchResultsProps {
  results: any[];
}

export const LinkSearchResults: React.FC<LinkSearchResultsProps> = ({ results }) => {
  if (results.length === 0) return null;

  return (
    <div className="flex flex-col p-4 gap-3">
      {results.map((result, idx) => {
        const url = result.linkUrl || result.url;
        let domain: string;
        try {
          domain = new URL(url).hostname;
        } catch (e) {
          domain = url;
        }

        return (
          <a
            key={result.id || idx}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-4 p-3 bg-card border border-border rounded-xl hover:bg-muted/50 transition-colors group"
          >
            {result.thumbnailUrl ? (
              <img src={result.thumbnailUrl} alt="" className="w-16 h-16 rounded-lg object-cover bg-muted shrink-0" />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <LinkIcon className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-foreground line-clamp-1 mb-1 group-hover:text-primary transition-colors">
                {result.title || url}
              </h4>
              {result.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                  {result.description}
                </p>
              )}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <img src={`https://www.google.com/s2/favicons?domain=${domain}`} alt="" className="w-3 h-3" />
                <span>{domain}</span>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                  <ExternalLink className="w-3 h-3" />
                </span>
              </div>
            </div>
          </a>
        );
      })}
    </div>
  );
};
