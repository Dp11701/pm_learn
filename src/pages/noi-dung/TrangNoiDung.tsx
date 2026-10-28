// Trang Nội dung /noi-dung (§8.8; F21, F21b, F22; bước 4 rút gọn theo đề xuất mục 10): H1 "Nội dung" + dòng đếm
// "x Đã duyệt · y Bản nháp · z Chưa có · n mục" (bất biến 7) + tab Chờ duyệt (n) · Độ phủ · Nhập
// (?tab=cho-duyet | do-phu | nhap).
// - Chờ duyệt (TabChoDuyet): bản nháp chờ duyệt + bản sửa chờ duyệt; duyệt bằng nút trên banner của bài.
// - Độ phủ (TabDoPhu): ba số của cả roadmap, rồi theo phần › lĩnh vực, link sang Lộ trình lọc mục chưa có.
// - Nhập (TabNhap): kéo thả / Quét lại (?quet=1), gán sẵn mục (?muc=).
// - Không có ?tab= hợp lệ (vd. từ sidebar): mở Chờ duyệt — việc chính của trang từ bước 4.
// - Có file .md trong thư mục nội dung chưa nhận (chuaNhan của /api/meta; Chờ duyệt, Độ phủ chỉ đếm file đã nhận):
//   ở tab Chờ duyệt / Độ phủ có banner "Có n file chưa nhận" + "Quét lại" → sang tab Nhập và quét lại ngay (?quet=1),
//   focus về tab Nhập. Tab Nhập có banner riêng của nó.
// - Tab: roving tabindex, ←/→/Home/End chuyển và chọn luôn (tự kích hoạt), URL đổi bằng replace, giữ ?muc=.
// - Thư mục nội dung đổi (Claude ghi file, sửa ngoài app) → tải lại trạng thái nội dung: khung app theo dõi
//   revision nội dung của /api/meta cho mọi trang (useTheoDoiNoiDung ở KhungApp).
import { useId, useRef, type KeyboardEvent } from 'react'
import { useSearchParams } from 'react-router'
import { dinhDangSo } from '../../../shared/dinh-dang'
import { layCay } from '../../../shared/roadmap'
import { useNoiDungMeta } from '../../app/du-lieu/nhap'
import { useTrangThaiNoiDung } from '../../app/du-lieu/noi-dung'
import Banner from '../../components/Banner'
import Nut from '../../components/Nut'
import TieuDeTrang from '../../components/TieuDeTrang'
import { CHUA_NHAN_CHUA_TINH } from '../../copy/cho-duyet-duyet'
import { KhungTrang, LOP_H1 } from '../chung'
import TabChoDuyet from './TabChoDuyet'
import TabDoPhu from './TabDoPhu'
import TabNhap from './TabNhap'

export const CAC_TAB = ['cho-duyet', 'do-phu', 'nhap'] as const
export type KhoaTab = (typeof CAC_TAB)[number]

/** Tab mở khi không có ?tab= hợp lệ. */
export const TAB_MAC_DINH: KhoaTab = 'cho-duyet'

export function tabTuUrl(gt: string | null): KhoaTab {
  return (CAC_TAB as readonly string[]).includes(gt ?? '') ? (gt as KhoaTab) : TAB_MAC_DINH
}

interface DemNoiDung {
  daDuyet: number
  banNhap: number
  chuaCo: number
  tong: number
}

/** Đếm theo trạng thái nội dung trên mọi mục học của cây; undefined khi chưa có dữ liệu. */
function useDemNoiDung(): DemNoiDung | undefined {
  const tra = useTrangThaiNoiDung()
  const cay = layCay()
  if (cay.mucHoc.length === 0 || tra(cay.mucHoc[0].id) === undefined) return undefined
  const d: DemNoiDung = { daDuyet: 0, banNhap: 0, chuaCo: 0, tong: cay.soMucHoc }
  for (const m of cay.mucHoc) {
    const tt = tra(m.id)
    if (tt?.loai === 'da-duyet') d.daDuyet += 1
    else if (tt?.loai === 'ban-nhap') d.banNhap += 1
    else d.chuaCo += 1
  }
  return d
}

export default function TrangNoiDung() {
  const id = useId()
  const [params, datParams] = useSearchParams()
  const tab = tabTuUrl(params.get('tab'))
  const dem = useDemNoiDung()
  const chuaNhan = useNoiDungMeta()?.chuaNhan ?? 0
  const nutTab = useRef<Partial<Record<KhoaTab, HTMLButtonElement | null>>>({})

  const ten: Record<KhoaTab, string> = {
    'cho-duyet': dem && dem.banNhap > 0 ? `Chờ duyệt (${dinhDangSo(dem.banNhap)})` : 'Chờ duyệt',
    'do-phu': 'Độ phủ',
    nhap: 'Nhập',
  }
  const idTab = (k: KhoaTab) => `${id}tab-${k}`
  const idPanel = (k: KhoaTab) => `${id}panel-${k}`

  function chonTab(k: KhoaTab, quetLai = false) {
    const moi = new URLSearchParams(params)
    moi.set('tab', k)
    if (quetLai) moi.set('quet', '1')
    datParams(moi, { replace: true })
  }

  /** "Quét lại" của banner file chưa nhận: tab Nhập quét lại ngay (?quet=1); nút biến mất nên focus về tab Nhập. */
  function quetLaiONhap() {
    chonTab('nhap', true)
    nutTab.current.nhap?.focus()
  }

  function khiPhim(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.altKey || e.ctrlKey || e.metaKey) return
    const i = CAC_TAB.indexOf(tab)
    let toi: number | null = null
    if (e.key === 'ArrowRight') toi = (i + 1) % CAC_TAB.length
    else if (e.key === 'ArrowLeft') toi = (i - 1 + CAC_TAB.length) % CAC_TAB.length
    else if (e.key === 'Home') toi = 0
    else if (e.key === 'End') toi = CAC_TAB.length - 1
    if (toi === null) return
    e.preventDefault()
    const k = CAC_TAB[toi]
    chonTab(k)
    nutTab.current[k]?.focus()
  }

  return (
    <KhungTrang>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <TieuDeTrang tenTrang="Nội dung" className={LOP_H1}>
          Nội dung
        </TieuDeTrang>
        {dem && (
          <span className="text-[length:var(--fs-meta)] leading-[var(--lh-meta)] text-muted tabular-nums">
            {dinhDangSo(dem.daDuyet)} Đã duyệt · {dinhDangSo(dem.banNhap)} Bản nháp ·{' '}
            {dinhDangSo(dem.chuaCo)} Chưa có · {dinhDangSo(dem.tong)} mục
          </span>
        )}
      </div>

      {tab !== 'nhap' && chuaNhan > 0 && (
        <Banner
          tieuDe={`Có ${dinhDangSo(chuaNhan)} file chưa nhận`}
          moTa={CHUA_NHAN_CHUA_TINH}
          hanhDong={
            <Nut bien="phu" onClick={quetLaiONhap}>
              Quét lại
            </Nut>
          }
          className="max-w-[960px]"
        />
      )}

      <div role="tablist" aria-label="Nội dung" className="flex gap-1 border-b border-border">
        {CAC_TAB.map((k) => {
          const chon = k === tab
          return (
            <button
              key={k}
              ref={(el) => {
                nutTab.current[k] = el
              }}
              type="button"
              role="tab"
              id={idTab(k)}
              aria-selected={chon}
              // Chỉ panel của tab đang chọn có trong DOM.
              aria-controls={chon ? idPanel(k) : undefined}
              tabIndex={chon ? 0 : -1}
              onClick={() => chonTab(k)}
              onKeyDown={khiPhim}
              className={`-mb-px h-11 shrink-0 border-0 border-b-2 bg-transparent px-4 text-[length:var(--fs-ui)] leading-[var(--lh-ui)] whitespace-nowrap transition-colors duration-150 max-md:px-3 ${
                chon
                  ? 'border-primary font-semibold text-text'
                  : 'border-transparent font-medium text-muted hover:text-text'
              }`}
            >
              {ten[k]}
            </button>
          )
        })}
      </div>

      <div role="tabpanel" id={idPanel(tab)} aria-labelledby={idTab(tab)} className="min-w-0">
        {tab === 'nhap' ? (
          <TabNhap />
        ) : tab === 'do-phu' ? (
          <TabDoPhu />
        ) : (
          <TabChoDuyet khiQuetLai={() => nutTab.current.nhap?.focus()} />
        )}
      </div>
    </KhungTrang>
  )
}
