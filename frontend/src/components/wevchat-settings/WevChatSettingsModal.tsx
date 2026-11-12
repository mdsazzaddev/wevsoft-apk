import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Search, Bell, Moon, Sun, Settings, ChevronDown,
  MessageCircle, Shield, HardDrive, Image as ImageIcon, 
  Palette, Bot, Ban, Download, Sliders, HelpCircle
} from 'lucide-react';
import { useStore } from '../../store';
import {
  ChatPanel, NotificationsPanel, PrivacySecurityPanel, StoragePanel,
  MediaFilesPanel, AppearancePanel, AiAutoReplyPanel, BlockedUsersPanel,
  DataExportPanel, AdvancedPanel, HelpSupportPanel
} from './WevChatSettingsPanels';

interface WevChatSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export type SettingsTabId =
  | 'chat' | 'notifications' | 'privacy' | 'storage'
  | 'media' | 'appearance' | 'ai' | 'blocked'
  | 'data' | 'advanced' | 'help';

const TABS: { id: SettingsTabId; label: string; icon: React.ElementType }[] = [
  { id: 'chat', label: 'Chat', icon: MessageCircle },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'privacy', label: 'Privacy & Security', icon: Shield },
  { id: 'storage', label: 'Storage', icon: HardDrive },
  { id: 'media', label: 'Media & Files', icon: ImageIcon },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'ai', label: 'AI & Auto Reply', icon: Bot },
  { id: 'blocked', label: 'Blocked Users', icon: Ban },
  { id: 'data', label: 'Data & Export', icon: Download },
  { id: 'advanced', label: 'Advanced', icon: Sliders },
  { id: 'help', label: 'Help & Support', icon: HelpCircle },
];

export const WevChatSettingsModal: React.FC<WevChatSettingsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<SettingsTabId>('chat');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { theme, setTheme, user } = useStore();
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'chat': return <ChatPanel />;
      case 'notifications': return <NotificationsPanel />;
      case 'privacy': return <PrivacySecurityPanel />;
      case 'storage': return <StoragePanel />;
      case 'media': return <MediaFilesPanel />;
      case 'appearance': return <AppearancePanel />;
      case 'ai': return <AiAutoReplyPanel />;
      case 'blocked': return <BlockedUsersPanel />;
      case 'data': return <DataExportPanel />;
      case 'advanced': return <AdvancedPanel />;
      case 'help': return <HelpSupportPanel />;
      default: return null;
    }
  };

  const activeTabInfo = TABS.find(t => t.id === activeTab);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex bg-background">
          <motion.div
            layout
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full h-[100dvh] bg-background flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-border bg-card z-20">
              <div className="flex items-center gap-3">
                <button onClick={onClose} className="md:hidden p-2 -ml-2 text-muted-foreground hover:bg-muted rounded-full">
                  <X size={20} />
                </button>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-primary-foreground hidden md:flex">
                    <Settings size={18} />
                  </div>
                  <h2 className="font-bold text-lg hidden md:block">WevChat Settings</h2>
                  
                  {/* Mobile Left-aligned Category Menu */}
                  <div className="relative md:hidden" ref={mobileMenuRef}>
                    <button 
                      onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                      className="flex items-center gap-2 bg-muted/50 hover:bg-muted px-3 py-1.5 rounded-xl transition-colors font-medium text-sm"
                    >
                      {activeTabInfo?.icon && <activeTabInfo.icon size={16} className="text-primary" />}
                      <span>{activeTabInfo?.label}</span>
                      <ChevronDown size={16} className={`text-muted-foreground transition-transform ${isMobileMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {isMobileMenuOpen && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute top-full left-0 mt-2 w-64 bg-card border border-border shadow-xl rounded-2xl overflow-hidden py-2 z-50 max-h-[60vh] overflow-y-auto"
                        >
                          {TABS.map((tab) => {
                            const Icon = tab.icon;
                            return (
                              <button
                                key={tab.id}
                                onClick={() => {
                                  setActiveTab(tab.id);
                                  setIsMobileMenuOpen(false);
                                }}
                                className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors flex items-center gap-3 ${
                                  activeTab === tab.id 
                                    ? 'bg-primary/10 text-primary' 
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                }`}
                              >
                                <Icon size={18} className={activeTab === tab.id ? 'text-primary' : 'text-muted-foreground'} />
                                {tab.label}
                              </button>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-4 flex-1 justify-end">
                {/* Search */}
                <div className="relative hidden md:flex w-full max-w-xs">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search settings..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-muted/50 border border-border rounded-full pl-9 pr-4 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                {/* Notifications */}
                <button className="p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors relative hidden sm:block">
                  <Bell size={20} />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border border-card"></span>
                </button>

                {/* Profile */}
                <div className="w-8 h-8 rounded-full bg-muted overflow-hidden border border-border flex shrink-0">
                  {user?.avatar ? (
                    <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                      {user?.name?.charAt(0) || 'U'}
                    </div>
                  )}
                </div>

                <button onClick={onClose} className="hidden md:flex p-2 text-muted-foreground hover:bg-muted rounded-full ml-2">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Mobile Search */}
            <div className="md:hidden p-3 border-b border-border bg-card/50">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search settings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-muted border border-border rounded-xl pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="flex flex-1 overflow-hidden relative">
              {/* Left Sidebar (Desktop/Tablet) */}
              <div className="hidden md:flex flex-col w-64 border-r border-border bg-card/30 overflow-y-auto">
                <div className="p-3 flex-1 space-y-1">
                  {TABS.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                          isActive
                            ? 'bg-primary text-primary-foreground shadow-md'
                            : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                        }`}
                      >
                        <Icon size={18} className={isActive ? 'text-primary-foreground' : 'text-muted-foreground'} />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Scrollable Content Area */}
              <div className="flex-1 overflow-y-auto relative bg-background">
                {renderContent()}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
