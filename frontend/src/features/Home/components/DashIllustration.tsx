/** Hero illustration. Motion is transform/opacity only (see home.css). */
export default function DashIllustration() {
  const line = "#d9dcd6";
  return (
    <svg
      viewBox="0 0 400 300"
      className="dm-illus-svg"
      role="img"
      aria-label="A developer working on a laptop"
    >
      <defs>
        <linearGradient id="dmLeaf" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9bf04a" />
          <stop offset="1" stopColor="#5ec21a" />
        </linearGradient>
      </defs>

      {/* desk */}
      <path
        d="M8 288H392"
        stroke={line}
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* plant */}
      <g className="dm-sway">
        <path d="M46 288 50 264H80L84 288Z" fill="#f1f3ef" />
        <rect x="43" y="257" width="44" height="9" rx="3" fill="#fff" />
        <path
          d="M64 257C58 233 44 221 46 197 62 207 70 231 64 257Z"
          fill="url(#dmLeaf)"
        />
        <path
          d="M64 257C70 227 84 215 96 197 96 223 82 241 64 257Z"
          fill="#6fcf20"
        />
        <path
          d="M64 257C62 237 64 215 70 193 80 215 76 237 64 257Z"
          fill="#8fe83e"
        />
      </g>

      {/* code window */}
      <g className="dm-float">
        <rect
          x="52"
          y="34"
          width="132"
          height="98"
          rx="8"
          fill="#0d100d"
          stroke={line}
          strokeWidth="1.3"
        />
        <text
          x="118"
          y="82"
          textAnchor="middle"
          fontFamily="JetBrains Mono, monospace"
          fontSize="30"
          fontWeight="600"
          fill="#7ee02c"
        >
          {"</>"}
        </text>
        <path
          d="M72 100H152M72 114H134"
          stroke={line}
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </g>

      {/* chat bubble */}
      <g className="dm-float d2">
        <path
          d="M214 12H318Q328 12 328 22V66Q328 76 318 76H292L276 92 272 76H224Q214 76 214 66V22Q214 12 224 12Z"
          fill="#0d100d"
          stroke={line}
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <path
          d="M232 32H310M232 48H284"
          stroke="#7ee02c"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>

      {/* sparkle */}
      <path
        className="dm-twinkle"
        d="M350 86Q352 104 370 106 352 108 350 126 348 108 330 106 348 104 350 86Z"
        fill="#7ee02c"
      />

      {/* laptop */}
      <path
        d="M118 274 138 198Q139 194 143 194H236Q240 194 240 198L250 274Z"
        fill="#0d100d"
        stroke={line}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <text
        x="190"
        y="242"
        textAnchor="middle"
        fontFamily="JetBrains Mono, monospace"
        fontSize="20"
        fontWeight="600"
        fill="#7ee02c"
      >
        {"</>"}
      </text>
      <path
        d="M102 274H266L272 286H96Z"
        fill="#161a16"
        stroke={line}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />

      {/* person */}
      <path
        d="M240 288C240 236 262 204 304 198 344 204 366 236 366 288Z"
        fill="#121512"
        stroke={line}
        strokeWidth="1.4"
      />
      <path
        d="M296 238V266M312 238V266"
        stroke="#7ee02c"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M268 226C248 238 226 252 208 262"
        stroke={line}
        strokeWidth="18"
        strokeLinecap="round"
      />
      <path
        d="M268 226C248 238 226 252 208 262"
        stroke="#121512"
        strokeWidth="15"
        strokeLinecap="round"
      />
      <circle cx="206" cy="264" r="7" fill="#f1d8c0" />
      <rect x="296" y="168" width="20" height="26" rx="8" fill="#f1d8c0" />
      <circle
        cx="306"
        cy="150"
        r="31"
        fill="#f1d8c0"
        stroke={line}
        strokeWidth="1.2"
      />
      <path
        d="M274 152C270 120 294 104 318 112 338 120 342 142 336 160 326 140 302 132 274 152Z"
        fill="#1a1a1a"
        stroke={line}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <circle cx="294" cy="152" r="2.2" fill="#1a1a1a" />
      <circle cx="312" cy="152" r="2.2" fill="#1a1a1a" />
      <path
        d="M296 166Q303 172 312 166"
        stroke="#1a1a1a"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
