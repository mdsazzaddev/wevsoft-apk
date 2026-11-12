import { useNavigate, useSearchParams } from 'react-router-dom';
import PostComposer from '../components/social/PostComposer';

/**
 * Dedicated Create Post route (`/create-post`).
 * Opens the shared CreatePostStudio via PostComposer.
 */
export default function CreatePostPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const withAi = params.get('ai') === '1' || params.get('ai') === 'true';

  return (
    <div className="mx-auto w-full max-w-2xl px-3 py-4 sm:px-4">
      <div className="mb-4">
        <h1 className="text-lg font-bold text-foreground">Create Post</h1>
        <p className="text-sm text-muted-foreground">
          Share something with your community. Your draft is saved as you type.
        </p>
      </div>
      <PostComposer
        autoOpen
        autoOpenAi={withAi}
        onPostCreated={() => {
          navigate('/home', { replace: true });
        }}
      />
    </div>
  );
}