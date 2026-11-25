import React, { useEffect, useState } from 'react';
import { isValidAvatarUrl } from '../../lib/avatar';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type AvatarTone = 'primary' | 'neutral';

interface UserAvatarProps {
  name?: string;
  avatarUrl?: string;
  size?: AvatarSize;
  tone?: AvatarTone;
  className?: string;
  alt?: string;
}

const SIZE_CLASSES: Record<AvatarSize, string> = {
  xs: 'h-7 w-7 text-xs',
  sm: 'h-9 w-9 text-xs',
  md: 'h-12 w-12 text-lg',
  lg: 'h-13 w-13 text-lg',
  xl: 'h-20 w-20 text-2xl',
};

const TONE_CLASSES: Record<AvatarTone, string> = {
  primary: 'bg-blue-700 dark:bg-blue-600 text-white',
  neutral: 'bg-stone-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-200',
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  name = 'Student',
  avatarUrl,
  size = 'sm',
  tone = 'primary',
  className = '',
  alt,
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [avatarUrl]);

  const trimmedName = (name || 'S').trim();
  const initial = (trimmedName.charAt(0) || 'S').toUpperCase();
  const hasPhoto = Boolean(avatarUrl && isValidAvatarUrl(avatarUrl) && !imgFailed);

  return (
    <span
      className={`${SIZE_CLASSES[size]} ${
        hasPhoto ? 'bg-stone-200 dark:bg-neutral-800' : TONE_CLASSES[tone]
      } rounded-full font-bold inline-flex items-center justify-center shrink-0 overflow-hidden select-none ${className}`}
    >
      {hasPhoto ? (
        <img
          src={avatarUrl}
          alt={alt || `${trimmedName} profile picture`}
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
        />
      ) : (
        initial
      )}
    </span>
  );
};
