import { useId } from 'react';
import type { EnemyArt, KeeperId } from '../game/data';

export function Landscape({
  chapter = 0,
  className = '',
}: {
  chapter?: number;
  className?: string;
}) {
  const id = useId().replace(/:/g, '');
  const palette =
    chapter === 0
      ? ['#637c72', '#203d3a', '#132e2c', '#0f2426']
      : chapter === 1
        ? ['#787a93', '#353f57', '#243042', '#192735']
        : ['#8b7964', '#4b453c', '#31362f', '#1b2b29'];
  return (
    <svg
      className={`landscape ${className}`}
      viewBox="0 0 1000 680"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${id}sky`} x2="0" y2="1">
          <stop stopColor={palette[0]} stopOpacity=".4" />
          <stop offset="1" stopColor="#122628" />
        </linearGradient>
        <radialGradient id={`${id}sun`}>
          <stop stopColor="#f2d29a" stopOpacity=".45" />
          <stop offset=".28" stopColor="#d6be8d" stopOpacity=".15" />
          <stop offset="1" stopColor="#d6be8d" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}water`} x2="0" y2="1">
          <stop stopColor="#578078" stopOpacity=".2" />
          <stop offset="1" stopColor="#122427" stopOpacity="0" />
        </linearGradient>
        <filter id={`${id}mist`}>
          <feGaussianBlur stdDeviation="14" />
        </filter>
      </defs>
      <rect width="1000" height="680" fill={`url(#${id}sky)`} />
      <ellipse cx="540" cy="180" rx="260" ry="240" fill={`url(#${id}sun)`} />
      <circle cx="540" cy="170" r="56" fill="#dabd83" opacity=".24" />
      <circle cx="540" cy="170" r="72" fill="none" stroke="#dbc38e" opacity=".13" />
      <path
        d="M0 260 60 240 105 280 170 200 230 256 297 175 345 236 423 190 480 258 557 210 600 256 667 169 737 240 800 180 872 240 950 198 1000 252V680H0Z"
        fill={palette[1]}
      />
      <path
        d="M0 332 80 288 160 346 235 309 319 351 390 285 443 337 517 301 604 360 679 300 752 323 848 275 930 320 1000 290V680H0Z"
        fill={palette[2]}
      />
      <g fill={palette[1]} opacity=".8">
        <path d="M448 320V175h24v-33h23v33h22v145h-16V205h-36v115Z" />
        <path d="M456 175 482 116 509 175Z" />
        <path d="M663 325V208h14v-18h19v18h19v132h-13V235h-25v90Z" />
        <path d="M517 287Q586 214 663 274v21Q590 247 517 310Z" />
      </g>
      <path d="M380 380Q540 330 706 393L879 680H170Z" fill={`url(#${id}water)`} />
      <g stroke="#c8d1aa" strokeWidth="1" opacity=".13">
        <path d="M429 422h173m-215 21h264m-227 33h200m-310 34h360m-389 46h435m-406 32h380m-448 42h500" />
      </g>
      <g fill={palette[3]}>
        {Array.from({ length: 18 }, (_, i) => {
          const x = i < 9 ? i * 35 - 35 : 700 + (i - 9) * 42;
          const h = 100 + ((i * 47) % 130);
          const y = 365 + ((i * 17) % 70);
          return (
            <g key={i}>
              <path d={`M${x} ${y}l28 -${h} 28 ${h - 15}h-15l28 48h-72l25 -44Z`} />
              <path d={`M${x + 26} ${y - 50}v150h5v-150Z`} />
            </g>
          );
        })}
        <path d="M0 485Q115 440 271 530L330 680H0Z" />
        <path d="M1000 460Q846 483 766 570L710 680h290Z" />
      </g>
      <g fill="#091c20">
        <path d="M0 0h38l18 150 39 115-35-34 39 180-37-38 18 307H0Z" />
        <path d="M1000 0h-37l-17 150-65 97 49-28-34 156 32-37-18 342h90Z" />
      </g>
      <g fill="none" stroke="#0a1e20" strokeWidth="9">
        <path d="m35 154 85-74 53-12m-68 23 4-60M953 123l-70-75-66-21m73 35-2-62" />
      </g>
      <g filter={`url(#${id}mist)`} fill="#a3bfb0" opacity=".065">
        <ellipse cx="380" cy="385" rx="240" ry="18" />
        <ellipse cx="730" cy="480" rx="240" ry="20" />
      </g>
      <g fill="#e9c38c" opacity=".65">
        {Array.from({ length: 22 }, (_, i) => (
          <circle
            key={i}
            cx={80 + ((i * 137) % 860)}
            cy={110 + ((i * 79) % 500)}
            r={i % 3 === 0 ? 1.8 : 0.9}
          />
        ))}
      </g>
    </svg>
  );
}

export function KeeperArt({ keeper, className = '' }: { keeper: KeeperId; className?: string }) {
  const id = useId().replace(/:/g, '');
  const color = keeper === 'warden' ? '#85aaa0' : keeper === 'seer' ? '#9b9aba' : '#b3a47f';
  return (
    <svg className={`keeper-art ${className}`} viewBox="0 0 260 300" aria-hidden="true">
      <defs>
        <radialGradient id={`${id}halo`}>
          <stop stopColor={color} stopOpacity=".2" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}cloak`} x2="1" y2="1">
          <stop stopColor={color} />
          <stop offset=".5" stopColor="#28433e" />
          <stop offset="1" stopColor="#172e2c" />
        </linearGradient>
      </defs>
      <circle cx="130" cy="135" r="125" fill={`url(#${id}halo)`} />
      <circle cx="130" cy="112" r="82" fill="none" stroke={color} strokeOpacity=".25" />
      <path
        d="M130 22v16m0 149v18M40 112h16m148 0h16M66 48l11 11m106 106 11 11M66 176l11-11M183 59l11-11"
        stroke={color}
        strokeOpacity=".5"
      />
      <ellipse cx="135" cy="279" rx="81" ry="9" fill="#071719" opacity=".4" />
      <path d="m106 104-25 30-26 127q73 31 149-2l-32-122-23-31Z" fill={`url(#${id}cloak)`} />
      <path
        d="m110 130-14 130m56-130 19 130M130 124l-4 149"
        stroke="#a9bbb0"
        strokeWidth="1.3"
        opacity=".2"
      />
      <path
        d="M107 110q-18-38 23-62 41 24 21 65l-19 17Z"
        fill="#263b35"
        stroke={color}
        strokeWidth="1"
      />
      <path d="m111 96 19-27 19 27-5 20-13 9-15-9Z" fill="#142724" />
      <path d="m119 101 6 1m10 0 6-1" stroke="#ead1a4" strokeWidth="2" />
      <path d="m108 119 22 19 24-19-24 7Z" fill={color} opacity=".7" />
      <path d="M105 145h50l4 61h-58Z" fill="#1c302c" />
      <path d="M104 185h53v9h-53Z" fill="#8b7b58" />
      <rect x="125" y="183" width="12" height="12" rx="2" fill="#c2aa77" />
      <path d="m111 218-4 57h18l8-56m8-1 3 57h19l-13-58" fill="#182925" />
      <path d="m104 271-5 10h26v-10m20 0v10h29l-13-10" fill="#0c1e1f" />
      {keeper === 'warden' ? (
        <g>
          <path
            d="m71 146-15 18 5 64 31 17 29-24-2-60-25-16Z"
            fill="#314d46"
            stroke="#b5b68e"
            strokeWidth="2"
          />
          <path
            d="m86 154-18 14 5 52 17 10 19-16-2-46Z"
            fill="none"
            stroke="#b5b68e"
            opacity=".5"
          />
          <path d="m89 168 1 48m-13-32h26" stroke="#d7c28e" />
          <path d="m174 134 9 95 8-9-9-89Z" fill="#bfc6b4" />
          <path d="m168 153 26-3m-14-19-2-16" stroke="#b6a475" strokeWidth="4" />
        </g>
      ) : keeper === 'seer' ? (
        <g>
          <path d="m191 87-9 186" stroke="#958567" strokeWidth="5" />
          <path d="m176 67 11-12 14 11-3 21-13 10-12-13Z" fill="#8b98b1" stroke="#d1c7a6" />
          <path d="m187 57 2 36m-14-15 25-5" stroke="#d7decc" />
          <circle cx="188" cy="75" r="7" fill="#dae6cd" />
          <path d="m89 174-24-14 5-13 24 8" fill="#708d80" />
          <g stroke="#d9cdad" fill="none">
            <circle cx="58" cy="145" r="16" />
            <path d="m58 123 5 15 14 7-14 5-5 17-5-17-15-5 15-7Z" />
          </g>
        </g>
      ) : (
        <g>
          <path d="m76 164-18 51 7 6 25-47m81-8 29 31-2 10-39-30" fill="#6f8070" />
          <path d="m57 210-6 29 13-18m133-24 21 13-17-4" fill="#c6cbb3" />
          <path d="m97 147 61 53" stroke="#b3a47f" strokeWidth="7" />
          <path d="m92 209 16-14 9 14-16 29-11-7Z" fill="#75674b" />
          <path d="m163 112-10 28 16 17" fill="none" stroke="#b3a47f" strokeWidth="2" />
        </g>
      )}
      <path d="m124 137 7-8 7 8-7 14Z" fill="#e6b97a" />
    </svg>
  );
}

export function EnemyFigure({ art }: { art: EnemyArt }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg className={`enemy-figure enemy-${art}`} viewBox="0 0 360 340" aria-hidden="true">
      <defs>
        <radialGradient id={`${id}glow`}>
          <stop stopColor="#b2c3a5" stopOpacity=".2" />
          <stop offset="1" stopColor="#b2c3a5" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}body`} x2=".8" y2="1">
          <stop stopColor="#708b7f" />
          <stop offset="1" stopColor="#172d2b" />
        </linearGradient>
      </defs>
      <circle cx="180" cy="165" r="150" fill={`url(#${id}glow)`} />
      <ellipse cx="180" cy="310" rx="102" ry="12" fill="#071619" opacity=".45" />
      {art === 'stag' ? (
        <g>
          <path
            d="m146 122-35 36-24 68 34 2 22-53 17 58-15 69h16l28-69 14 68h17l-9-90 20-59-15-33Z"
            fill={`url(#${id}body)`}
          />
          <path d="m162 123-10-49 29-24 30 24-12 49-18 19Z" fill="#98a894" />
          <path d="m166 90 14 29 17-29-16 7Z" fill="#273f37" />
          <path
            d="m166 83-34-23-10-39m28 51-46-17-22-30m28 30-16 7m39-17 12-23m52 61 35-23 10-39m-29 51 46-17 22-30m-28 30 16 7m-39-17-12-23"
            fill="none"
            stroke="#b8b696"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <path d="m172 84 5 3m9 0 6-3" stroke="#f4d59e" strokeWidth="3" />
          <path d="m159 148 22 17 20-17-20 54Z" fill="#aa9570" />
          <path d="m171 177 10-16 10 16-3 17h-14Z" fill="#e2b97c" />
          <path d="M181 194v27" stroke="#e2b97c" />
        </g>
      ) : (
        <g>
          <path
            d={
              art === 'king'
                ? 'm149 112-36 43-37 139 103-15 106 20-40-146-32-41Z'
                : 'm147 111-33 45-29 137 43-18 48 27 51-27 47 19-30-139-33-44Z'
            }
            fill={`url(#${id}body)`}
          />
          <path d="m146 139-23 133m49-134 5 147m31-149 29 135" stroke="#b9c7a8" opacity=".15" />
          <path d="m147 117-10-38 40-34 42 33-9 40-30 28Z" fill="#415e52" />
          <path d="m147 84 30-21 31 21-5 30-25 15-24-15Z" fill="#152e2b" />
          <path d="m153 94 15 3m18 0 16-3" stroke="#d6e0ab" strokeWidth="3" />
          {art === 'wraith' ? (
            <g>
              <path d="m136 78 10-26 32-19 32 20 14 28-47-20Z" fill="#658172" />
              <path d="m119 153-45 58 8 12 60-44m98-26 43 55-8 15-55-43" fill="#405e50" />
              <path
                d="m78 214-10 24m17-17-2 20m194-27 10 24m-17-17 2 20"
                stroke="#91a28b"
                strokeWidth="3"
              />
            </g>
          ) : (
            <g>
              <path
                d="m118 142-17 32 24 14 30-34m67-11 32 15 7 21-36 14-22-36"
                fill="#819283"
                stroke="#a4ac92"
              />
              <path d="m153 149 25 14 28-14 8 71-36 19-33-19Z" fill="#4e6a5b" stroke="#a4ac92" />
              <path d="M178 165v56m-17-42 17 10 17-10" stroke="#c7b77f" />
              <path d="m105 187-16 99 12 20 17-22-1-96Z" fill="#405e52" stroke="#a4ac92" />
              {art === 'king' ? (
                <g>
                  <path d="m142 74-7-39 25 15 18-30 19 30 25-15-9 39Z" fill="#b8a373" />
                  <path d="m178 31 1 35m-33-16 7 16m57-16-7 16" stroke="#e3c58d" />
                  <path d="m258 139 8 157" stroke="#a38e68" strokeWidth="5" />
                  <path d="m248 121 12-21 15 21-13 24Z" fill="#c8b889" />
                </g>
              ) : (
                <g>
                  <path d="m141 80 4-26 32-21 37 21 3 27-39-13Z" fill="#8a9d90" />
                  <path d="M176 36v30" stroke="#d6d5bb" />
                  <path d="m243 176 13 109 9-3-6-111Z" fill="#b6c4b0" />
                  <path d="m236 190 33-6" stroke="#a99b74" strokeWidth="5" />
                </g>
              )}
            </g>
          )}
        </g>
      )}
      <g fill="#c9d7b0" opacity=".5">
        <circle cx="80" cy="114" r="1.6" />
        <circle cx="269" cy="73" r="2" />
        <circle cx="298" cy="236" r="1.3" />
        <circle cx="57" cy="259" r="2" />
      </g>
    </svg>
  );
}
