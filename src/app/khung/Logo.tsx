// Ô logo "A–Z" 32×32 nền mực (C34, F11). Trang trí: tên app đi kèm bằng chữ hoặc aria-label.
export default function Logo() {
  return (
    <span
      aria-hidden="true"
      className="flex size-[var(--logo-o)] shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-primary text-[length:var(--fs-chip)] leading-[var(--lh-chip)] font-bold tracking-[var(--logo-tracking)] text-on-primary"
    >
      A–Z
    </span>
  )
}
