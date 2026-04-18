// v4 · phase 0 stub — implemented in phase 1
export type ClientTabKey = 'today' | 'program' | 'food' | 'progress' | 'messages' | 'profile';

export interface BottomTabsProps {
  active?: ClientTabKey;
  className?: string;
}

export default function BottomTabs({ active = 'today', className }: BottomTabsProps) {
  return (
    <nav
      data-mf-stub="BottomTabs"
      data-active={active}
      className={className}
      aria-label="Primary navigation"
    />
  );
}
