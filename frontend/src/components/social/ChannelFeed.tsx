import React from 'react';
import { Heart, MessageCircle, Share2, MoreHorizontal } from 'lucide-react';
import ExpandableText from '../ExpandableText';

interface Post {
  id: string;
  author: { name: string; username: string; avatar: string };
  content: string;
  timestamp: string;
  likes: number;
  comments: number;
}

export const ChannelFeed: React.FC = () => {
  const posts: Post[] = [
    {
      id: '1',
      author: { name: 'Tech Insider', username: '@techinsider', avatar: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=100&h=100&fit=crop' },
      content: 'Just published our comprehensive guide on the new React compiler. The performance gains are incredible, especially for complex dashboards with deep component trees. Check it out on our blog!',
      timestamp: '2h ago',
      likes: 1245,
      comments: 89
    },
    {
      id: '2',
      author: { name: 'Design Patterns', username: '@designpatt', avatar: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=100&h=100&fit=crop' },
      content: 'Micro-interactions make or break the user experience. A simple spring animation on a button press adds so much more delight than a static color change. Details matter.',
      timestamp: '5h ago',
      likes: 342,
      comments: 12
    }
  ];

  return (
    <div className="space-y-6 px-4">
      {posts.map(post => (
        <article key={post.id} className="bg-card border border-border rounded-2xl p-5 hover:border-primary/20 transition-colors shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <img src={post.author.avatar} alt="" className="w-10 h-10 rounded-full object-cover border border-border" />
              <div>
                <h3 className="font-bold text-foreground text-sm hover:underline cursor-pointer">{post.author.name}</h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{post.author.username}</span>
                  <span>•</span>
                  <span>{post.timestamp}</span>
                </div>
              </div>
            </div>
            <button onClick={() => {}} className="text-muted-foreground hover:text-foreground p-1">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>

          <ExpandableText
            text={post.content}
            className="mb-4 text-sm leading-relaxed text-foreground/90"
          />

          <div className="flex items-center gap-6 pt-3 border-t border-border/50">
            <button onClick={() => {}} className="flex items-center gap-2 text-muted-foreground hover:text-pink-500 transition-colors group">
              <div className="p-1.5 rounded-full group-hover:bg-pink-500/10 transition-colors">
                <Heart className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold">{post.likes}</span>
            </button>
            
            <button onClick={() => {}} className="flex items-center gap-2 text-muted-foreground hover:text-blue-500 transition-colors group">
              <div className="p-1.5 rounded-full group-hover:bg-blue-500/10 transition-colors">
                <MessageCircle className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold">{post.comments}</span>
            </button>

            <button onClick={() => {}} className="flex items-center gap-2 text-muted-foreground hover:text-green-500 transition-colors group ml-auto">
              <div className="p-1.5 rounded-full group-hover:bg-green-500/10 transition-colors">
                <Share2 className="w-5 h-5" />
              </div>
            </button>
          </div>
        </article>
      ))}
    </div>
  );
};
