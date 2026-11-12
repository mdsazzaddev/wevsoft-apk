import React from 'react';
import { motion } from 'motion/react';
import { HelpCircle, Mail, MessageSquare, Phone } from 'lucide-react';

export default function SupportPage() {
  return (
    <div className="flex-1 overflow-y-auto bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <HelpCircle size={24} className="text-primary" />
          <h1 className="text-2xl font-bold">Help & Support</h1>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border p-6 rounded-xl shadow-sm text-center"
          >
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare size={24} />
            </div>
            <h3 className="font-bold text-lg mb-2">Live Chat</h3>
            <p className="text-muted-foreground text-sm mb-4">Chat with our support team in real-time. Available 24/7.</p>
            <button onClick={() => {}} className="w-full bg-primary text-primary-foreground py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors">
              Start Chat
            </button>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card border border-border p-6 rounded-xl shadow-sm text-center"
          >
            <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail size={24} />
            </div>
            <h3 className="font-bold text-lg mb-2">Email Support</h3>
            <p className="text-muted-foreground text-sm mb-4">Send us an email and we'll get back to you within 24 hours.</p>
            <button onClick={() => {}} className="w-full bg-secondary text-secondary-foreground py-2 rounded-lg font-medium hover:bg-secondary/80 transition-colors">
              support@wevsoft.com
            </button>
          </motion.div>
        </div>

        <div className="bg-card border border-border p-6 rounded-xl shadow-sm mt-8">
          <h2 className="font-bold text-lg mb-4">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <div className="border-b border-border pb-4">
              <h4 className="font-medium mb-1">How do I reset my password?</h4>
              <p className="text-sm text-muted-foreground">Go to Settings &gt; Security and click on 'Change Password'. Or use the 'Forgot Password' link on the login page.</p>
            </div>
            <div className="border-b border-border pb-4">
              <h4 className="font-medium mb-1">How can I become a seller?</h4>
              <p className="text-sm text-muted-foreground">Go to the WevMall and click 'Start Selling' to fill out the seller application form.</p>
            </div>
            <div className="border-b border-border pb-4">
              <h4 className="font-medium mb-1">Is my data secure?</h4>
              <p className="text-sm text-muted-foreground">Yes, we use industry-standard encryption to protect your personal information and messages.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
