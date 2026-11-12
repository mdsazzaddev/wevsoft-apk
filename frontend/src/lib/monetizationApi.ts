export async function createSubscription(token: string, planId: string) {
  const res = await fetch('/api/monetization/subscriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ planId })
  });
  if (!res.ok) throw new Error('Failed to create subscription');
  return res.json();
}

export async function getSubscription(token: string) {
  const res = await fetch('/api/monetization/subscription', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to get subscription');
  return res.json();
}

export async function processPayment(token: string, data: any) {
  const res = await fetch('/api/monetization/payment', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to process payment');
  return res.json();
}
