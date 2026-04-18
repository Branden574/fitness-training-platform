// v4 · phase 0 stub — implemented in phase 1
export interface AvatarProps {
  initials: string;
  size?: number;
  active?: boolean;
  className?: string;
}

export default function Avatar({ initials, size = 32, active, className }: AvatarProps) {
  return (
    <span
      data-mf-stub="Avatar"
      data-active={active ? '' : undefined}
      className={className}
      style={{ width: size, height: size, display: 'inline-block' }}
      aria-label={initials}
    />
  );
}
