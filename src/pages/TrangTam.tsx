// Trang tạm của phase 0. Khung app (sidebar, Tổng quan) có từ phase 1.
export default function TrangTam() {
  return (
    <main className="mx-auto max-w-[720px] px-4 py-12">
      <h1 className="text-[length:var(--fs-h1)] leading-[var(--lh-h1)] font-semibold">
        Học PM A–Z
      </h1>
      <p className="mt-4 text-muted">Đang dựng nền móng (phase 0). Khung app có từ phase 1.</p>
      {import.meta.env.DEV && (
        <p className="mt-4">
          <a className="underline" href="/_dev/thanh-phan">
            Xem design system (F01)
          </a>
        </p>
      )}
    </main>
  )
}
