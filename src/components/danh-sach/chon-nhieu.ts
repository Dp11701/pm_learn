// Chọn nhiều mục cho thao tác hàng loạt (đề xuất 3.9): đổi bộ lọc (tập mục đang hiện đổi) thì bỏ chọn mục bị ẩn.
import { useCallback, useMemo, useState } from 'react'

export interface ChonNhieu {
  /** id các mục đang chọn (luôn nằm trong các mục đang hiện) */
  chon: ReadonlySet<string>
  doi: (id: string) => void
  /** Chọn hết / bỏ hết các mục đang hiện */
  datTatCa: (bat: boolean) => void
  boChon: () => void
}

export function useChonNhieu(hienIds: readonly string[]): ChonNhieu {
  const [chonGoc, datChon] = useState<ReadonlySet<string>>(() => new Set())
  const [khoaTruoc, datKhoaTruoc] = useState('')
  const khoa = useMemo(() => [...hienIds].sort().join('\n'), [hienIds])

  // Tập mục đang hiện đổi → bỏ chọn mục bị ẩn ngay trong lần vẽ này (React: chỉnh state khi prop đổi).
  let chon = chonGoc
  if (khoa !== khoaTruoc) {
    datKhoaTruoc(khoa)
    const hien = new Set(hienIds)
    const conLai = [...chonGoc].filter((id) => hien.has(id))
    if (conLai.length !== chonGoc.size) {
      chon = new Set(conLai)
      datChon(chon)
    }
  }

  const doi = useCallback((id: string) => {
    datChon((cu) => {
      const moi = new Set(cu)
      if (moi.has(id)) moi.delete(id)
      else moi.add(id)
      return moi
    })
  }, [])
  const datTatCa = useCallback(
    (bat: boolean) => datChon(bat ? new Set(hienIds) : new Set()),
    [hienIds],
  )
  const boChon = useCallback(() => datChon(new Set()), [])

  return { chon, doi, datTatCa, boChon }
}
