import { Check, Shuffle } from "lucide-react";
import UserAvatar from "@/shared/components/UserAvatar";
import { avatarValue } from "@/shared/lib/identicon";
import "../profile.css";

type Props = {
  seeds: string[];
  value: string;
  onChange: (seed: string) => void;
  onShuffle: () => void;
  wide?: boolean;
};

/** GitHub-style avatar chooser: a grid of generated identicons. */
export default function AvatarPicker({
  seeds,
  value,
  onChange,
  onShuffle,
  wide,
}: Props) {
  return (
    <div className="pf-root">
      <div
        className={`pf-avatars ${wide ? "wide" : ""}`}
        role="radiogroup"
        aria-label="Choose an avatar"
      >
        {seeds.map((seed) => (
          <button
            key={seed}
            type="button"
            role="radio"
            aria-checked={seed === value}
            aria-label={`Avatar ${avatarValue(seed)}`}
            className="pf-avatar-opt pf-press"
            onClick={() => onChange(seed)}
          >
            <UserAvatar
              avatar={avatarValue(seed)}
              fallbackSeed={seed}
              size={64}
            />
            <span className="tick">
              <Check size={13} strokeWidth={3} />
            </span>
          </button>
        ))}
      </div>
      <button
        type="button"
        className="pf-btn sm pf-press"
        style={{ marginTop: 12 }}
        onClick={onShuffle}
      >
        <Shuffle size={15} /> Shuffle new options
      </button>
    </div>
  );
}
