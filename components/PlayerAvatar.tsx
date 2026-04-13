'use client';

import { useState } from 'react';

interface PlayerAvatarProps {
  playerId: number;
  firstName: string;
  lastName: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: { outer: 'w-10 h-10', text: 'text-sm', img: 40 },
  md: { outer: 'w-16 h-16', text: 'text-lg', img: 64 },
  lg: { outer: 'w-20 h-20', text: 'text-xl', img: 80 },
};

export default function PlayerAvatar({
  playerId,
  firstName,
  lastName,
  size = 'lg',
}: PlayerAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const { outer, text } = sizeMap[size];

  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`;
  const headshotUrl = `https://cdn.nba.com/headshots/nba/latest/1040x760/${playerId}.png`;

  return (
    <div
      className={`${outer} rounded-full overflow-hidden shrink-0 bg-slate-700 border border-slate-600 flex items-center justify-center`}
    >
      {!imgError ? (
        <img
          src={headshotUrl}
          alt={`${firstName} ${lastName}`}
          width={sizeMap[size].img}
          height={sizeMap[size].img}
          className="w-full h-full object-cover object-top"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className={`${text} font-bold text-slate-300 select-none`}>
          {initials}
        </span>
      )}
    </div>
  );
}
