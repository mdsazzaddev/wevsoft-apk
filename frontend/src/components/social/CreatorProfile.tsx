import React, { useState } from 'react';
import { BadgeCheck, Link as LinkIcon, Mail, Users } from 'lucide-react';
import { FanMessageDialog } from './FanMessageDialog';

export const CreatorProfile: React.FC = () => {
  const [isMessageOpen, setIsMessageOpen] = useState(false);

  // Mock creator
  const creator = {
    name: 'Sarah Drasner',
    username: '@sarah_edo',
    bio: 'Engineering Manager, Vue Core Team, Author. I build things for the web and talk about it.',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop',
    cover: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&h=300&fit=crop',
    followers: '124.5k',
    price: 5
  };

  return (
    <div className="max-w-3xl mx-auto bg-background min-h-full">
      <div className="h-48 w-full relative">
        <img src={creator.cover} alt="Cover" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
      </div>
      
      <div className="px-6 relative pb-8">
        <div className="flex justify-between items-end -mt-16 mb-4">
          <img 
            src={creator.avatar} 
            alt={creator.name} 
            className="w-32 h-32 rounded-full border-4 border-background object-cover bg-card z-10 relative" 
          />
          <div className="flex gap-2">
            <button onClick={() => {}} className="px-4 py-2 bg-card border border-border rounded-xl font-bold text-sm hover:bg-muted transition-colors">
              Follow
            </button>
            <button 
              onClick={() => setIsMessageOpen(true)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-transform active:scale-95 shadow-lg shadow-primary/20 flex items-center gap-2"
            >
              <Mail className="w-4 h-4" />
              Message for ${creator.price}
            </button>
          </div>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
            {creator.name}
            <BadgeCheck className="w-5 h-5 text-blue-500" />
          </h1>
          <p className="text-muted-foreground font-medium mb-3">{creator.username}</p>
          <p className="text-foreground/90 leading-relaxed max-w-2xl">{creator.bio}</p>
        </div>

        <div className="flex items-center gap-6 text-sm text-muted-foreground font-medium border-b border-border pb-6 mb-6">
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            <span className="text-foreground font-bold">{creator.followers}</span> Followers
          </div>
          <div className="flex items-center gap-1.5 hover:text-primary cursor-pointer transition-colors">
            <LinkIcon className="w-4 h-4" />
            sarah.dev
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="font-bold text-lg">Recent Posts</h3>
          {/* We can embed ChannelFeed here or similar UI */}
          <div className="p-8 text-center border-2 border-dashed border-border rounded-2xl text-muted-foreground">
            More content coming soon
          </div>
        </div>
      </div>

      <FanMessageDialog 
        isOpen={isMessageOpen} 
        onClose={() => setIsMessageOpen(false)} 
        creatorName={creator.name} 
        price={creator.price} 
      />
    </div>
  );
};
