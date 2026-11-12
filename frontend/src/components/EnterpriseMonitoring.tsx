import React, { useState, useEffect } from 'react';
import { useStore } from '../store';

export default function EnterpriseMonitoring() {
  const [health, setHealth] = useState<any>(null);
  const token = useStore((state) => state.token);

  useEffect(() => {
    fetch('/api/admin/health', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => setHealth(data))
    .catch(console.error);
  }, []);

  if (!health) return <div>Loading monitoring...</div>;

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow mt-6">
      <h2 className="text-xl font-bold mb-4 dark:text-white">Enterprise Monitoring</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <p className="text-sm text-muted-foreground dark:text-muted-foreground">System Status</p>
          <p className="text-2xl font-bold text-green-600">{health.status?.toUpperCase()}</p>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <p className="text-sm text-muted-foreground dark:text-muted-foreground">Memory (RSS)</p>
          <p className="text-2xl font-bold dark:text-white">{health.memory?.rss}</p>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <p className="text-sm text-muted-foreground dark:text-muted-foreground">Heap Used</p>
          <p className="text-2xl font-bold dark:text-white">{health.memory?.heapUsed}</p>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <p className="text-sm text-muted-foreground dark:text-muted-foreground">Uptime</p>
          <p className="text-2xl font-bold dark:text-white">{Math.floor(health.uptime / 60)} mins</p>
        </div>
      </div>
    </div>
  );
}
