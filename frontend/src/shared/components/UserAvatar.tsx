import { memo, useMemo } from "react";
import { buildIdenticon, seedFromAvatar } from "../lib/identicon";

type Props = {
  avatar?: string | null;
  fallbackSeed: string;
  size?: number;
  className?: string;
  label?: string;
};

function UserAvatarBase({
  avatar,
  fallbackSeed,
  size = 40,
  className,
  label,
}: Props) {
  const seed = seedFromAvatar(avatar, fallbackSeed);
  const icon = useMemo(() => buildIdenticon(seed), [seed]);

  return (
    <svg
      viewBox="0 0 5 5"
      width={size}
      height={size}
      className={className}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ borderRadius: size * 0.28, display: "block", flex: "none" }}
      shapeRendering="crispEdges"
    >
      <rect width="5" height="5" fill={icon.tint} />
      {icon.cells.map((row, y) =>
        row.map((on, x) =>
          on ? (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width="1"
              height="1"
              fill={icon.fill}
            />
          ) : null,
        ),
      )}
    </svg>
  );
}

const UserAvatar = memo(UserAvatarBase);
export default UserAvatar;
