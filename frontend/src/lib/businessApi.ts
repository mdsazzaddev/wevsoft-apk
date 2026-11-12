export async function setupBusiness(token: string, data: any) {
  const res = await fetch('/api/business/setup', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to setup business');
  return res.json();
}

export async function getBusinessProfile(token: string) {
  const res = await fetch('/api/business/profile', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch business profile');
  return res.json();
}

export async function getLeads(token: string) {
  const res = await fetch('/api/business/leads', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch leads');
  return res.json();
}

export async function addLead(token: string, data: any) {
  const res = await fetch('/api/business/leads', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to add lead');
  return res.json();
}

export async function getTickets(token: string) {
  const res = await fetch('/api/business/tickets', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch tickets');
  return res.json();
}

export async function createTicket(token: string, data: any) {
  const res = await fetch('/api/business/tickets', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create ticket');
  return res.json();
}
