/**
 * /spaces/create — the WevSpace creation wizard.
 *
 * The page is only a shell: every step, validation rule and the live preview
 * live in CreateSpaceWizard so the same wizard can later be opened from a modal
 * without duplicating any of it.
 */

import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import CreateSpaceWizard from '../components/wevspace/CreateSpaceWizard';

export default function CreateSpacePage() {
  useEffect(() => {
    const previous = document.title;
    document.title = 'Create a WevSpace · Wevsoft';
    return () => {
      document.title = previous;
    };
  }, []);

  return (
    <div className="min-h-full w-full px-4 sm:px-6 py-4 pb-16">
      <Link
        to="/spaces"
        className="inline-flex items-center gap-1.5 mb-4 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={16} /> WevSpaces
      </Link>
      <CreateSpaceWizard />
    </div>
  );
}
