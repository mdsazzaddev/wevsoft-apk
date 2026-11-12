/** Developer Console strings (namespace "developer"), English source. Phase 2 P2-7. */
const en = {
  'theme.label': 'Theme',
  'theme.light': 'Light',
  'theme.dark': 'Dark',
  'theme.oled': 'OLED',
  'switcher.allApps': 'All apps',
  'switcher.current': 'Current app: {{name}}',
  'switcher.yourApps': 'Your applications',
  'switcher.none': 'No applications yet.',
  'switcher.create': 'Create new app',
  'switcher.manage': 'Manage {{name}}',
  'deleted.title': 'Recently deleted',
  'deleted.description': 'Deleted apps can be restored for {{days}} days, then they are removed permanently.',
  'deleted.restore': 'Restore',
  'deleted.restored': 'App restored',
} as const;

export type DeveloperStringKey = keyof typeof en;
export default en;
