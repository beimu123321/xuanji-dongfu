/**
 * 全局轻提示（修仙语体）
 */
import { useDongfuStore } from '../store/useDongfuStore';

export default function Toast() {
  const toast = useDongfuStore((s) => s.toast);
  if (!toast) return null;

  return (
    <div
      key={toast.id}
      className="pointer-events-none fixed left-1/2 top-[16%] z-50 -translate-x-1/2 animate-inkRise"
    >
      <div className="ink-panel relative rounded-sm px-6 py-3">
        <span className="text-[13px] tracking-[0.18em] text-gold">{toast.message}</span>
      </div>
    </div>
  );
}
