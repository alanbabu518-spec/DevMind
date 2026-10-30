export default function BrandMark({ size = 34 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={Math.round(size * 0.88)}
      viewBox="0 0 34 30"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M11 6 3 15l8 9"
        stroke="#7ee02c"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m23 6 8 9-8 9"
        stroke="#7ee02c"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 3 14 27"
        stroke="#b6f56e"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
