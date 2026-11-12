/** Unknown /space/:handle/desk/<page> — a not-found card inside the WevDesk shell. */

import { useDesk } from './deskContext';
import { DeskButton } from './deskUi';

export default function WevDeskPlaceholder() {
  const { deskPath } = useDesk();
  return (
    <div className="p-6">
      <div className="wd-card max-w-lg mx-auto p-7 text-center">
        <h2 className="text-[17px] font-semibold">Page not found</h2>
        <p className="mt-1 text-[12.5px] text-[var(--wd-muted)]">This WevDesk page does not exist.</p>
        <div className="mt-4 flex justify-center"><DeskButton to={deskPath()}>Back to WevDesk</DeskButton></div>
      </div>
    </div>
  );
}
