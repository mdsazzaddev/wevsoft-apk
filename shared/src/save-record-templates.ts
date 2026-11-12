/**
 * Field templates for the SAVE_RECORDS automation tool ("Save Records").
 * Shared by the backend (function-calling schema + validation) and the
 * frontend (template picker / field editor / records browser).
 */

export type SaveRecordFieldType = 'text' | 'longtext' | 'number' | 'phone' | 'email' | 'date' | 'select' | 'boolean';

export interface SaveRecordField {
  key: string;
  label: string;
  type: SaveRecordFieldType;
  required?: boolean;
  /** For type=select. */
  options?: string[];
  /** Extra hint passed to the model, e.g. "full address incl. city". */
  description?: string;
}

export type SaveRecordTemplateId = 'ORDER' | 'LEAD' | 'BOOKING' | 'SUPPORT' | 'CUSTOM';

export interface SaveRecordTemplate {
  id: SaveRecordTemplateId;
  label: string;
  blurb: string;
  defaultInstructions: string;
  fields: SaveRecordField[];
}

export const SAVE_RECORD_STATUSES = ['NEW', 'CONFIRMED', 'DONE', 'CANCELLED'] as const;
export type SaveRecordStatus = (typeof SAVE_RECORD_STATUSES)[number];

export const SAVE_RECORD_TEMPLATES: SaveRecordTemplate[] = [
  {
    id: 'ORDER',
    label: 'Order',
    blurb: 'Capture product orders: customer, address, items and price.',
    defaultInstructions:
      'Save the order once the customer has confirmed what they want to buy and has given their name, phone and delivery address. If they change the order later in the same chat, save again with the updated details.',
    fields: [
      { key: 'customerName', label: 'Customer name', type: 'text', required: true },
      { key: 'phone', label: 'Phone', type: 'phone', required: true },
      { key: 'address', label: 'Delivery address', type: 'longtext', required: true, description: 'Full address including area/city' },
      { key: 'items', label: 'Items', type: 'longtext', required: true, description: 'Product names with size/colour/variant' },
      { key: 'quantity', label: 'Quantity', type: 'number' },
      { key: 'totalPrice', label: 'Total price', type: 'number' },
      { key: 'paymentMethod', label: 'Payment method', type: 'select', options: ['Cash on delivery', 'bKash', 'Nagad', 'Card', 'Bank transfer', 'Other'] },
      { key: 'notes', label: 'Notes', type: 'longtext' },
    ],
  },
  {
    id: 'LEAD',
    label: 'Lead',
    blurb: 'Collect interested prospects and what they need.',
    defaultInstructions:
      'Save a lead when the person shows real interest in a product or service and has shared at least a name and a way to contact them.',
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'phone', label: 'Phone', type: 'phone' },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'interest', label: 'Interested in', type: 'longtext', required: true },
      { key: 'budget', label: 'Budget', type: 'text' },
      { key: 'temperature', label: 'Lead quality', type: 'select', options: ['Hot', 'Warm', 'Cold'] },
      { key: 'notes', label: 'Notes', type: 'longtext' },
    ],
  },
  {
    id: 'BOOKING',
    label: 'Booking',
    blurb: 'Appointments, reservations and table bookings.',
    defaultInstructions:
      'Save the booking once the person has agreed on a date and time and given their name and phone number.',
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'phone', label: 'Phone', type: 'phone', required: true },
      { key: 'service', label: 'Service', type: 'text' },
      { key: 'date', label: 'Date', type: 'date', required: true },
      { key: 'time', label: 'Time', type: 'text', required: true },
      { key: 'people', label: 'Number of people', type: 'number' },
      { key: 'notes', label: 'Notes', type: 'longtext' },
    ],
  },
  {
    id: 'SUPPORT',
    label: 'Support ticket',
    blurb: 'Log complaints and issues for follow-up.',
    defaultInstructions:
      'Save a ticket when the person reports a problem that needs a human to follow up, after you have the issue details and a way to reach them.',
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'phone', label: 'Phone', type: 'phone' },
      { key: 'orderRef', label: 'Order / reference', type: 'text' },
      { key: 'issue', label: 'Issue', type: 'longtext', required: true },
      { key: 'priority', label: 'Priority', type: 'select', options: ['Low', 'Medium', 'High', 'Urgent'] },
    ],
  },
  {
    id: 'CUSTOM',
    label: 'Custom',
    blurb: 'Design your own fields from scratch.',
    defaultInstructions: 'Save a record when the conversation has produced the information below.',
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'details', label: 'Details', type: 'longtext' },
    ],
  },
];

export function getSaveRecordTemplate(id: string | null | undefined): SaveRecordTemplate {
  return SAVE_RECORD_TEMPLATES.find((t) => t.id === id) || SAVE_RECORD_TEMPLATES[SAVE_RECORD_TEMPLATES.length - 1];
}

/** Normalizes a field key so it is safe as a JSON-schema property name. */
export function toFieldKey(label: string): string {
  const words = label.trim().replace(/[^a-zA-Z0-9 ]+/g, ' ').split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'field';
  return words
    .map((w, i) => (i === 0 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase()))
    .join('')
    .slice(0, 40);
}

export interface SaveRecordsConfig {
  template: SaveRecordTemplateId;
  fields: SaveRecordField[];
  instructions: string;
  /** Optional GOOGLE_SHEETS tool id to mirror each record into as a new row. */
  syncSheetToolId?: string | null;
  /** Update the contact's latest open (NEW) record instead of creating duplicates. Default true. */
  updateOpenRecord?: boolean;
}

export function parseSaveRecordsConfig(raw: string | null | undefined): SaveRecordsConfig {
  let c: Record<string, any> = {};
  try {
    c = JSON.parse(raw || '{}');
  } catch {
    c = {};
  }
  const tpl = getSaveRecordTemplate(c.template);
  const fields: SaveRecordField[] = Array.isArray(c.fields) && c.fields.length > 0 ? c.fields : tpl.fields;
  return {
    template: tpl.id,
    fields: fields
      .filter((f) => f && typeof f.key === 'string' && f.key)
      .slice(0, 40)
      .map((f) => ({ ...f, type: (f.type || 'text') as SaveRecordFieldType })),
    instructions: typeof c.instructions === 'string' && c.instructions.trim() ? c.instructions : tpl.defaultInstructions,
    syncSheetToolId: c.syncSheetToolId || null,
    updateOpenRecord: c.updateOpenRecord !== false,
  };
}
