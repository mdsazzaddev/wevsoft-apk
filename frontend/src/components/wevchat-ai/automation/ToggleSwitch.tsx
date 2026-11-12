import React from 'react';
import { Switch } from '../../ui/Switch';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  size?: 'sm' | 'md';
}

/**
 * Thin wrapper kept for backwards compatibility with existing automation
 * screens. The canonical implementation now lives in `components/ui/Switch`
 * so every toggle in the app shares one look and behavior.
 */
export const ToggleSwitch: React.FC<ToggleSwitchProps> = (props) => <Switch {...props} />;

export default ToggleSwitch;
