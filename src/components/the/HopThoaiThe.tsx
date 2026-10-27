// Hộp thoại tạo / sửa flashcard (đề xuất 3.5, 4.3 "tạo/sửa thẻ: C32 + C36"): tiêu đề "Tạo thẻ" / "Sửa thẻ" + tên
// mục, hai ô nhiều dòng "Mặt trước" / "Mặt sau" (bắt buộc, tối đa MAT_THE_TOI_DA ký tự), Huỷ / Tạo thẻ (Lưu).
// - Mở từ card Flashcard ("Tạo thẻ" điền sẵn tên mục, "Sửa") và từ câu Tự kiểm tra ("Tạo flashcard" điền sẵn H/Đ,
//   kèm khoaCau). Mỗi lần mở bắt đầu lại từ bản tạm (nhap-tam: mất kết nối, tải lại trang vẫn còn chữ) hoặc giá
//   trị đầu. Chỉ "Huỷ" và lưu xong mới bỏ bản tạm: Esc / X / lỡ đóng thì mở lại vẫn còn chữ. Đã gõ (khác giá trị
//   đầu) thì bấm ra ngoài không đóng; đang lưu thì không đóng được (Esc, X, Huỷ) — lỗi lưu luôn hiện trong hộp thoại.
//   Nơi dùng gỡ hộp thoại lúc đang lưu (rời trang) mà lưu lỗi → toast lỗi (bản tạm còn, mở lại là thấy chữ).
// - Tạo: chờ máy chủ (hộp 1, hạn ngày mai do server tính), xong thì toast "Đã tạo thẻ"; sửa: lưu rồi đóng. Lỗi máy
//   chủ hiện trong hộp thoại, giữ nguyên chữ.
// - IME: Enter xuống dòng; ⌘/Ctrl+Enter lưu, Esc đóng — cả hai bỏ qua khi Telex/VNI đang ghép chữ (đề xuất 5).
// Ngoài QueryClientProvider (gallery, test component lẻ): không vẽ gì.
import { useContext, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { QueryClientContext } from '@tanstack/react-query'
import { CircleAlert } from 'lucide-react'
import { layCay } from '../../../shared/roadmap'
import { MAT_THE_TOI_DA } from '../../../server/du-lieu/hop-dong-the'
import { useSuaThe, useTaoThe, useThe } from '../../app/du-lieu/the'
import { docNhapTam, luuNhapTam, xoaNhapTam } from '../../app/nhap-tam'
import HopThoai from '../HopThoai'
import Nut from '../Nut'
import TenMuc from '../TenMuc'
import { useToast } from '../Toast'
import { TruongVanBan, dangGhepChu } from '../TruongNhap'
import {
  DA_TAO_THE,
  LOI_THIEU_MAT_SAU,
  LOI_THIEU_MAT_TRUOC,
  NUT_LUU,
  SUA_THE,
} from '../../copy/cho-duyet'

/** Nhãn nút "Tạo thẻ" (F11) — cũng là tiêu đề hộp thoại tạo. */
export const TAO_THE = 'Tạo thẻ'

export interface PropsHopThoaiThe {
  mo: boolean
  doiMo: (mo: boolean) => void
  itemId: string
  /** Sửa thẻ có sẵn. */
  theId?: number
  /** Điền sẵn khi tạo từ câu Tự kiểm tra (H/Đ) hoặc tên mục. */
  giaTriDau?: { truoc: string; sau: string; khoaCau?: string }
}

interface HaiMat {
  truoc: string
  sau: string
}

/** Khoá bản tạm: thẻ mới theo mục + câu (mỗi câu một bản), thẻ đang sửa theo id. */
export function khoaNhapThe(itemId: string, theId?: number, khoaCau?: string): string {
  return theId !== undefined ? `sua-the:${theId}` : `the-moi:${itemId}:${khoaCau ?? ''}`
}

function docBanTam(khoa: string): HaiMat | null {
  const chu = docNhapTam(khoa)
  if (chu === null) return null
  try {
    const v: unknown = JSON.parse(chu)
    if (v && typeof v === 'object' && 'truoc' in v && 'sau' in v) {
      const { truoc, sau } = v
      if (typeof truoc === 'string' && typeof sau === 'string') return { truoc, sau }
    }
  } catch {
    // Bản tạm hỏng: coi như không có
  }
  return null
}

function NoiDungHopThoaiThe({ mo, doiMo, itemId, theId, giaTriDau }: PropsHopThoaiThe) {
  const { the } = useThe(itemId)
  const tao = useTaoThe(itemId)
  const sua = useSuaThe(itemId)
  const { toast } = useToast()
  const laSua = theId !== undefined
  const khoa = khoaNhapThe(itemId, theId, giaTriDau?.khoaCau)

  const [mat, datMat] = useState<HaiMat>({ truoc: '', sau: '' })
  // Giá trị lúc mở (để biết người dùng đã gõ gì chưa)
  const [matDau, datMatDau] = useState<HaiMat>({ truoc: '', sau: '' })
  const [loi, datLoi] = useState<{ truoc?: string; sau?: string; chung?: string }>({})
  const [dangLuu, datDangLuu] = useState(false)
  const refTruoc = useRef<HTMLTextAreaElement>(null)
  const refSau = useRef<HTMLTextAreaElement>(null)
  // Lần focus đầu sau khi mở (HopThoai focus sẵn Mặt trước): con trỏ cuối chữ điền sẵn để gõ tiếp.
  const [conTroCuoi, datConTroCuoi] = useState(false)

  // Mỗi lần mở: bản tạm → thẻ đang sửa → giá trị đầu.
  const [moTruoc, datMoTruoc] = useState(false)
  if (mo !== moTruoc) {
    datMoTruoc(mo)
    if (mo) {
      const cu = laSua ? the.find((t) => t.id === theId) : undefined
      const dau = cu
        ? { truoc: cu.truoc, sau: cu.sau }
        : { truoc: giaTriDau?.truoc ?? '', sau: giaTriDau?.sau ?? '' }
      datMatDau(dau)
      datMat(docBanTam(khoa) ?? dau)
      datLoi({})
      datDangLuu(false)
      datConTroCuoi(true)
    }
  }

  function doi(truong: keyof HaiMat, chu: string) {
    const moi = { ...mat, [truong]: chu }
    datMat(moi)
    luuNhapTam(khoa, JSON.stringify(moi))
    if (loi[truong] && chu.trim() !== '') datLoi((l) => ({ ...l, [truong]: undefined }))
  }

  // Còn gắn hay không: lưu xong / lỗi sau khi nơi dùng đã gỡ hộp thoại (rời trang)
  const conGan = useRef(true)
  useEffect(() => {
    conGan.current = true
    return () => {
      conGan.current = false
    }
  }, [])

  const daGo = mat.truoc !== matDau.truoc || mat.sau !== matDau.sau

  /** "Huỷ": bỏ bản tạm rồi đóng (không đóng khi đang lưu). */
  function huy() {
    if (dangLuu) return
    xoaNhapTam(khoa)
    doiMo(false)
  }

  async function luu() {
    if (dangLuu) return
    const thieuTruoc = mat.truoc.trim() === ''
    const thieuSau = mat.sau.trim() === ''
    if (thieuTruoc || thieuSau) {
      datLoi({
        truoc: thieuTruoc ? LOI_THIEU_MAT_TRUOC : undefined,
        sau: thieuSau ? LOI_THIEU_MAT_SAU : undefined,
      })
      ;(thieuTruoc ? refTruoc : refSau).current?.focus()
      return
    }
    datLoi({})
    datDangLuu(true)
    const kq = laSua
      ? await sua(theId, { truoc: mat.truoc, sau: mat.sau })
      : await tao({ truoc: mat.truoc, sau: mat.sau, khoaCau: giaTriDau?.khoaCau })
    if (!conGan.current) {
      // Hộp thoại đã bị gỡ: không còn chỗ hiện lỗi → toast; chữ còn trong bản tạm
      if (!kq.ok) toast({ loai: 'loi', noiDung: kq.loi })
      else {
        xoaNhapTam(khoa)
        if (!laSua) toast({ noiDung: DA_TAO_THE })
      }
      return
    }
    datDangLuu(false)
    if (!kq.ok) {
      datLoi({ chung: kq.loi })
      return
    }
    xoaNhapTam(khoa)
    doiMo(false)
    if (!laSua) toast({ noiDung: DA_TAO_THE })
  }

  // ⌘/Ctrl+Enter lưu (Enter thường xuống dòng); bỏ qua khi đang ghép chữ.
  function phim(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== 'Enter' || !(e.metaKey || e.ctrlKey) || dangGhepChu(e)) return
    e.preventDefault()
    void luu()
  }

  const ten = layCay().mucTheoId.get(itemId)?.label
  return (
    <HopThoai
      mo={mo}
      // Esc / X / bấm ra ngoài: đóng, GIỮ bản tạm; đang lưu thì không đóng
      doiMo={(m) => {
        if (m) doiMo(true)
        else if (!dangLuu) doiMo(false)
      }}
      chanBamRaNgoai={daGo || dangLuu}
      tieuDe={laSua ? SUA_THE : TAO_THE}
      phuDe={ten ? <TenMuc>{ten}</TenMuc> : undefined}
      focusDau={refTruoc}
      chan={
        <>
          <Nut bien="ghost" onClick={huy} disabled={dangLuu}>
            Huỷ
          </Nut>
          <Nut bien="chinh" dangXuLy={dangLuu} onClick={() => void luu()}>
            {laSua ? NUT_LUU : TAO_THE}
          </Nut>
        </>
      }
    >
      <TruongVanBan
        ref={refTruoc}
        nhan="Mặt trước"
        loi={loi.truoc}
        value={mat.truoc}
        rows={3}
        required
        maxLength={MAT_THE_TOI_DA}
        onChange={(e) => doi('truoc', e.target.value)}
        onKeyDown={phim}
        onFocus={(e) => {
          if (!conTroCuoi) return
          datConTroCuoi(false)
          const cuoi = e.currentTarget.value.length
          e.currentTarget.setSelectionRange(cuoi, cuoi)
        }}
      />
      <TruongVanBan
        ref={refSau}
        nhan="Mặt sau"
        loi={loi.sau}
        value={mat.sau}
        rows={4}
        required
        maxLength={MAT_THE_TOI_DA}
        onChange={(e) => doi('sau', e.target.value)}
        onKeyDown={phim}
      />
      {loi.chung && (
        <p
          role="alert"
          className="m-0 flex items-start gap-1.5 text-[length:var(--fs-meta)] leading-[var(--lh-meta)] text-danger"
        >
          <CircleAlert size={14} strokeWidth={2} aria-hidden="true" className="mt-[3px] shrink-0" />
          {loi.chung}
        </p>
      )}
    </HopThoai>
  )
}

export default function HopThoaiThe(props: PropsHopThoaiThe) {
  const coMayChu = useContext(QueryClientContext) !== undefined
  return coMayChu ? <NoiDungHopThoaiThe {...props} /> : null
}
