// 404 tạm của phase 0; bản đầy đủ theo F26 ở phase 1.
export default function KhongTimThay() {
  return (
    <main className="mx-auto max-w-[720px] px-4 py-12">
      <h1 className="text-[length:var(--fs-h1)] leading-[var(--lh-h1)] font-semibold">
        Không tìm thấy trang
      </h1>
      <p className="mt-4">
        <a className="underline" href="/">
          Về trang đầu
        </a>
      </p>
    </main>
  )
}
