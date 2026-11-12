import React from 'react';


export const ActionRenderer = ({ toolCall, onConfirm, onCancel }: any) => {
  return (
    <div className="bg-blue-900/40 p-4 rounded-xl border border-blue-500/30 backdrop-blur-md">
      <h4 className="text-foreground dark:text-white font-bold mb-2">Confirm Action</h4>
      <p className="text-slate-300 text-sm mb-4">The AI wants to execute: {toolCall?.tool}</p>
      <div className="flex space-x-2">
        <button type="button" onClick={onConfirm} className="bg-blue-600 px-3 py-1.5 rounded-lg text-white text-sm font-semibold">Approve</button>
        <button type="button" onClick={onCancel} className="text-foreground dark:text-white px-3 py-1.5 rounded-lg text-sm font-semibold">Cancel</button>
      </div>
    </div>
  );
};
