// Tab Nhập của /noi-dung (F22; §4 đường 2 và 3, §8.8; đề xuất 1.6, 1.7, 3.8; D21).
// - Kéo thả / chọn file hoặc thư mục (C30) → đọc ở trình duyệt (giới hạn 1.7) → POST /api/nhap/kiem-tra (gửi
//   kèm mucMacDinh khi mở bằng ?muc=<slug>) → bảng kết quả → "Nhập n file" → POST /api/nhap/thuc-hien → toast
//   "Đã nhập n file" + Hoàn tác (POST /api/nhap/hoan-tac), bảng xoá, khối "Vừa nhập" có link tới từng bài.
// - "Quét lại thư mục" (và banner "Có n file chưa nhận — Quét lại" theo /api/meta): POST /api/nhap/quet-lai —
//   nhập thẳng file Hợp lệ / Thiếu khối (toast + Hoàn tác), chỉ dừng ở bảng khi có file cần bạn quyết. Mở tab
//   bằng ?quet=1 (nút "Quét lại…" trên banner của trang bài) thì quét lại ngay một lần, bỏ ?quet khỏi URL.
// - ⟳ của Quét lại để "Giữ bản cũ": bản chép nằm chỗ khác (chưa nhận) chỉ vào thùng rác qua thuc-hien — gọi
//   thuc-hien cả khi không có file nào để nhập (422 "không có gì" = xong); rồi giu-ban-cu/:id cho mọi dòng giữ
//   (ghi lại bản chụp vào <slug>.md; server không làm gì khi file đã khớp bản chụp).
// - Lô hết hạn (410): banner lỗi với câu của server + "Kiểm tra lại" (giữ lựa chọn của bạn).
// - Sau mỗi lần ghi: tải lại trạng thái nội dung + bài (khoá 'noi-dung'), hỏi lại /api/meta.
// - Focus: nhập xong → tiêu đề "Vừa nhập" (nút Nhập đã biến mất); hoàn tác xong mà focus rơi về <body> → nút
//   "Chọn file…". Kết quả kiểm tra, lỗi đọc file báo qua một vùng status (aria-live, đề xuất 5).
import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { RefreshCw } from 'lucide-react'
import { dinhDangSo } from '../../../shared/dinh-dang'
import { layCay } from '../../../shared/roadmap'
import { LoiGoiApi } from '../../app/du-lieu/api'
import {
  cauLoi,
  guiGiuBanCu,
  guiHoanTac,
  guiKiemTra,
  guiQuetLai,
  guiThucHien,
  laHetHan,
  useLamMoiNoiDung,
  useNoiDungMeta,
  type PhanHoiKiemTra,
  type PhanHoiThucHien,
  type TepGui,
} from '../../app/du-lieu/nhap'
import Banner from '../../components/Banner'
import Nut from '../../components/Nut'
import TenMuc from '../../components/TenMuc'
import { useToast } from '../../components/Toast'
import VungThaFile, { type NguonTha } from '../../components/VungThaFile'
import BangKetQua from '../../components/nhap/BangKetQua'
import DanhSachKhongNhan from '../../components/nhap/DanhSachKhongNhan'
import VuaNhap, { banCua, type DongVuaNhap } from '../../components/nhap/VuaNhap'
import {
  TOI_DA_BYTE_LO,
  TOI_DA_FILE,
  TOI_DA_MUC_DUYET,
  docNoiDung,
  soByteYeuCau,
  soMb,
  thuTuDanhSach,
  thuTuEntry,
  type KetQuaThu,
  type LoiLo,
  type TepKhongNhan,
} from '../../components/nhap/doc-tep'
import {
  LUA_CHON_TRONG,
  canBoVaoRac,
  chuTomTat,
  demLoai,
  demViec,
  giuLuaChon,
  seGiuBanCu,
  taoYeuCau,
  type LuaChon,
  type NguonLo,
} from '../../components/nhap/ket-qua'
import {
  BO_GAN_SAN,
  DANG_QUET_LAI,
  GAN_SAN_CHO,
  KIEM_TRA_LAI,
  LOI_LO,
  LOI_NHAP,
  QUET_LAI_KHONG_CO_GI,
  THU_LAI_KEO_THA,
  daGiuBanCu,
  daHoanTacNhap,
  daKiemTra,
  dangKiemTraFile,
} from '../../copy/cho-duyet'

type Vung =
  | { loai: 'thuong' }
  | { loai: 'doc'; xong: number; tong: number }
  | { loai: 'kiem-tra'; tong: number }
  | { loai: 'quet' }
  | { loai: 'loi'; tieuDe: string }

interface Lo {
  nguon: NguonLo
  kiemTra: PhanHoiKiemTra
  /** Nội dung đã gửi (lô kéo thả) — để kiểm tra lại khi hết hạn và suy cột "Khớp theo". */
  tep: TepGui[] | null
  luaChon: LuaChon
  /** Câu của server khi lô hết hạn (410). */
  hetHan: string | null
  mucMacDinh?: string
}

type FocusSau = 'vua-nhap' | 'nut-chon-neu-mat' | null

const THU_LAI = 'Thử lại'
const HOAN_TAC = 'Hoàn tác'

function chuLoiLo(loi: LoiLo): string {
  switch (loi.loai) {
    case 'qua-nhieu-file':
      return LOI_LO.quaNhieuFile(dinhDangSo(TOI_DA_FILE), dinhDangSo(loi.so))
    case 'qua-dung-luong':
      return LOI_LO.quaDungLuong(
        dinhDangSo(TOI_DA_BYTE_LO / (1024 * 1024)),
        dinhDangSo(soMb(loi.soByte), 1),
      )
    case 'qua-nhieu-muc':
      return LOI_LO.quaNhieuMuc(dinhDangSo(TOI_DA_MUC_DUYET))
    case 'khong-co-file':
      return LOI_LO.khongCoFile
  }
}

/** Không còn file nào gửi được: cả lô là file không phải .md → câu của C30 "Chỉ nhận file .md". */
function chuKhongCoFile(khongNhan: readonly TepKhongNhan[]): string {
  return khongNhan.length > 0 && khongNhan.every((t) => t.lyDo === 'khong-phai-md')
    ? 'Chỉ nhận file .md'
    : LOI_LO.khongCoFileNhapDuoc
}

export default function TabNhap() {
  const { toast } = useToast()
  const lamMoi = useLamMoiNoiDung()
  const noiDungMeta = useNoiDungMeta()
  const [params, datParams] = useSearchParams()
  const slugMuc = params.get('muc')
  const mucMacDinh = slugMuc ? layCay().mucTheoSlug.get(slugMuc) : undefined

  const [vung, datVung] = useState<Vung>({ loai: 'thuong' })
  const [khongNhan, datKhongNhan] = useState<TepKhongNhan[]>([])
  const [lo, datLo] = useState<Lo | null>(null)
  const [vuaNhap, datVuaNhap] = useState<{ fileOp: number; daNhap: DongVuaNhap[] } | null>(null)
  const [dangNhap, datDangNhap] = useState(false)
  const [dangQuet, datDangQuet] = useState(false)
  const [thongBao, datThongBao] = useState('')
  const [focusSau, datFocusSau] = useState<FocusSau>(null)

  const nutChonRef = useRef<HTMLButtonElement>(null)
  const vuaNhapRef = useRef<HTMLHeadingElement>(null)
  /** Mỗi lần thả / quét mới tăng phiên: kết quả của phiên cũ về muộn thì bỏ. */
  const phien = useRef(0)

  useEffect(() => {
    if (focusSau === null) return
    if (focusSau === 'vua-nhap' && vuaNhapRef.current) vuaNhapRef.current.focus()
    else {
      const dang = document.activeElement
      const mat = !dang || dang === document.body || !dang.isConnected
      if (focusSau === 'vua-nhap' || mat) nutChonRef.current?.focus()
    }
    datFocusSau(null)
  }, [focusSau])

  const baoKiemTra = useCallback((kt: PhanHoiKiemTra) => {
    datThongBao(daKiemTra(dinhDangSo(kt.ketQua.length), chuTomTat(demLoai(kt.ketQua))))
  }, [])

  const datLoi = useCallback((tieuDe: string) => {
    datVung({ loai: 'loi', tieuDe })
    datThongBao(tieuDe)
  }, [])

  // ---------- Kiểm tra ----------

  const kiemTra = useCallback(
    async (gui: TepGui[], idMucMacDinh: string | undefined, giuTu: Lo | null, so: number) => {
      datVung({ loai: 'kiem-tra', tong: gui.length })
      try {
        const kt = await guiKiemTra(gui, idMucMacDinh)
        if (phien.current !== so) return
        const luaChon = giuTu
          ? giuLuaChon(giuTu.luaChon, giuTu.kiemTra.ketQua, kt.ketQua)
          : LUA_CHON_TRONG
        datLo({
          nguon: 'tha',
          kiemTra: kt,
          tep: gui,
          luaChon,
          hetHan: null,
          mucMacDinh: idMucMacDinh,
        })
        datVung({ loai: 'thuong' })
        baoKiemTra(kt)
      } catch (e) {
        if (phien.current !== so) return
        datLoi(`${LOI_NHAP.kiemTra}: ${cauLoi(e, LOI_NHAP.matKetNoi)}`)
      }
    },
    [baoKiemTra, datLoi],
  )

  const nhanTep = useCallback(
    async (nguon: NguonTha) => {
      const so = ++phien.current
      datLo(null)
      datVuaNhap(null)
      datKhongNhan([])
      datThongBao('')
      datVung({ loai: 'doc', xong: 0, tong: 0 })
      let thu: KetQuaThu
      try {
        thu =
          nguon.loai === 'entries' ? await thuTuEntry(nguon.entries) : thuTuDanhSach(nguon.files)
      } catch {
        if (phien.current === so) datLoi(LOI_LO.khongCoFileNhapDuoc)
        return
      }
      if (phien.current !== so) return
      if (thu.loiLo) return datLoi(chuLoiLo(thu.loiLo))
      if (thu.nhan.length === 0) {
        datKhongNhan(thu.khongNhan)
        return datLoi(chuKhongCoFile(thu.khongNhan))
      }
      const doc = await docNoiDung(thu.nhan, (xong, tong) => {
        if (phien.current === so) datVung({ loai: 'doc', xong, tong })
      })
      if (phien.current !== so) return
      const boQua = [...thu.khongNhan, ...doc.khongNhan]
      datKhongNhan(boQua)
      if (doc.gui.length === 0) return datLoi(chuKhongCoFile(boQua))
      const idMuc = mucMacDinh?.id
      const soByte = soByteYeuCau(
        idMuc ? { files: doc.gui, mucMacDinh: idMuc } : { files: doc.gui },
      )
      if (soByte > TOI_DA_BYTE_LO) return datLoi(chuLoiLo({ loai: 'qua-dung-luong', soByte }))
      await kiemTra(doc.gui, idMuc, null, so)
    },
    [datLoi, kiemTra, mucMacDinh],
  )

  // ---------- Hoàn tác ----------

  const hoanTac = useCallback(
    async (fileOp: number, soFile: number) => {
      try {
        await guiHoanTac(fileOp)
        lamMoi()
        datVuaNhap((cu) => (cu?.fileOp === fileOp ? null : cu))
        toast({ noiDung: daHoanTacNhap(dinhDangSo(soFile)) })
        datFocusSau('nut-chon-neu-mat')
      } catch (e) {
        toast({
          loai: 'loi',
          noiDung: `${LOI_NHAP.hoanTac}: ${cauLoi(e, LOI_NHAP.matKetNoi)}`,
          hanhDong: { nhan: THU_LAI, chay: () => void hoanTac(fileOp, soFile) },
        })
      }
    },
    [lamMoi, toast],
  )

  const toastDaNhap = useCallback(
    (soFile: number, fileOp: number) => {
      toast({
        noiDung: `Đã nhập ${dinhDangSo(soFile)} file`,
        hanhDong: { nhan: HOAN_TAC, chay: () => void hoanTac(fileOp, soFile) },
      })
    },
    [hoanTac, toast],
  )

  // ---------- Quét lại ----------

  const quetLai = useCallback(async () => {
    const so = ++phien.current
    datLo(null)
    datVuaNhap(null)
    datKhongNhan([])
    datThongBao('')
    datVung({ loai: 'quet' })
    datDangQuet(true)
    try {
      const kq = await guiQuetLai()
      lamMoi()
      if (kq.daNhap > 0 && kq.fileOp !== null) toastDaNhap(kq.daNhap, kq.fileOp)
      if (phien.current !== so) return
      if (kq.kiemTra) {
        datLo({
          nguon: 'quet-lai',
          kiemTra: kq.kiemTra,
          tep: null,
          luaChon: LUA_CHON_TRONG,
          hetHan: null,
        })
        baoKiemTra(kq.kiemTra)
      } else if (kq.daNhap === 0) {
        toast({ noiDung: QUET_LAI_KHONG_CO_GI })
      }
    } catch (e) {
      if (phien.current !== so) return
      toast({
        loai: 'loi',
        noiDung: `${LOI_NHAP.quetLai}: ${cauLoi(e, LOI_NHAP.matKetNoi)}`,
        hanhDong: { nhan: THU_LAI, chay: () => void quetLai() },
      })
    } finally {
      if (phien.current === so) {
        datVung({ loai: 'thuong' })
        datDangQuet(false)
      }
    }
  }, [baoKiemTra, lamMoi, toast, toastDaNhap])

  // ?quet=1 (nút "Quét lại…" trên banner của trang bài): quét lại ngay một lần rồi bỏ ?quet khỏi URL (replace —
  // Lùi không quét lại). Ref chặn lần chạy thứ hai của StrictMode khi URL chưa kịp đổi.
  const daTuQuet = useRef(false)
  const canTuQuet = params.get('quet') === '1'
  useEffect(() => {
    if (!canTuQuet) {
      daTuQuet.current = false
      return
    }
    if (daTuQuet.current) return
    daTuQuet.current = true
    datParams(
      (cu) => {
        const moi = new URLSearchParams(cu)
        moi.delete('quet')
        return moi
      },
      { replace: true },
    )
    void quetLai()
  }, [canTuQuet, datParams, quetLai])

  // ---------- Nhập ----------

  const nhap = useCallback(async () => {
    if (!lo || dangNhap) return
    const { nhap: soNhap } = demViec(lo.kiemTra.ketQua, lo.luaChon, lo.nguon)
    const giu = lo.kiemTra.ketQua.filter((kq) => seGiuBanCu(kq, lo.luaChon, lo.nguon))
    // Bản chép ⟳ nằm ngoài chỗ của file đã nhận: chỉ thuc-hien bỏ được vào thùng rác.
    const canThucHien = soNhap > 0 || giu.some((d) => canBoVaoRac(d, lo.luaChon, lo.nguon))
    datDangNhap(true)
    let kq: PhanHoiThucHien | null = null
    try {
      if (canThucHien) {
        try {
          kq = await guiThucHien(taoYeuCau(lo.kiemTra.token, lo.kiemTra.ketQua, lo.luaChon))
        } catch (e) {
          // Không có file nào để nhập và server không còn gì để bỏ vào thùng rác → không phải lỗi.
          if (!(soNhap === 0 && e instanceof LoiGoiApi && e.status === 422)) throw e
        }
      }
    } catch (e) {
      datDangNhap(false)
      if (laHetHan(e)) {
        datLo((cu) => (cu === lo ? { ...cu, hetHan: e.message } : cu))
        datThongBao(e.message)
      } else {
        toast({
          loai: 'loi',
          noiDung: `${LOI_NHAP.nhap}: ${cauLoi(e, LOI_NHAP.matKetNoi)}`,
          hanhDong: { nhan: THU_LAI, chay: () => void nhap() },
        })
      }
      return
    }
    // ⟳ của Quét lại để "Giữ bản cũ": ghi lại bản chụp đã duyệt (bất biến 5), không có Hoàn tác.
    let soGiu = 0
    let loiGiu: unknown = null
    for (const d of giu) {
      try {
        await guiGiuBanCu(d.muc!.id)
        soGiu += 1
      } catch (e) {
        loiGiu = e
      }
    }
    lamMoi()
    datDangNhap(false)
    datLo(null)
    datKhongNhan([])
    datThongBao('')
    if (kq && kq.daNhap.length > 0) {
      const loaiDong = new Map(lo.kiemTra.ketQua.map((d) => [d.chiSo, d.loai]))
      datVuaNhap({
        fileOp: kq.fileOp,
        daNhap: kq.daNhap.map((d) => ({ ...d, ban: banCua(d.duongDan, loaiDong.get(d.chiSo)) })),
      })
      toastDaNhap(kq.daNhap.length, kq.fileOp)
    }
    if (soGiu > 0) toast({ noiDung: daGiuBanCu(dinhDangSo(soGiu)) })
    if (loiGiu) {
      toast({ loai: 'loi', noiDung: `${LOI_NHAP.giuBanCu}: ${cauLoi(loiGiu, LOI_NHAP.matKetNoi)}` })
    }
    datFocusSau(kq && kq.daNhap.length > 0 ? 'vua-nhap' : 'nut-chon-neu-mat')
  }, [dangNhap, lamMoi, lo, toast, toastDaNhap])

  /** Lô hết hạn: kiểm tra lại cùng các file (kéo thả) hoặc quét lại. */
  const kiemTraLai = useCallback(() => {
    if (!lo) return
    if (lo.nguon === 'quet-lai' || !lo.tep) return void quetLai()
    const so = ++phien.current
    void kiemTra(lo.tep, lo.mucMacDinh, lo, so)
  }, [kiemTra, lo, quetLai])

  const doiLuaChon = useCallback((doi: (lc: LuaChon) => LuaChon) => {
    datLo((cu) => (cu ? { ...cu, luaChon: doi(cu.luaChon) } : cu))
  }, [])

  const boGanSan = () => {
    const moi = new URLSearchParams(params)
    moi.delete('muc')
    datParams(moi, { replace: true })
  }

  const xuLy = vung.loai === 'doc' || vung.loai === 'kiem-tra' || vung.loai === 'quet'
  const chuaNhan = noiDungMeta?.chuaNhan ?? 0

  return (
    <div className="flex min-w-0 flex-col gap-5 max-md:gap-4">
      <div className="flex items-stretch gap-4 max-md:flex-col max-md:gap-3">
        <VungThaFile
          className="flex-1"
          trangThai={xuLy ? 'xu-ly' : vung.loai === 'loi' ? 'loi' : 'thuong'}
          tienDo={
            vung.loai === 'doc' && vung.tong > 0 ? { xong: vung.xong, tong: vung.tong } : null
          }
          tieuDe={
            vung.loai === 'loi'
              ? vung.tieuDe
              : vung.loai === 'kiem-tra'
                ? dangKiemTraFile(dinhDangSo(vung.tong))
                : vung.loai === 'quet'
                  ? DANG_QUET_LAI
                  : undefined
          }
          moTa={vung.loai === 'loi' ? THU_LAI_KEO_THA : undefined}
          onNhan={(n) => void nhanTep(n)}
          nutChonRef={nutChonRef}
        />
        <Nut
          bien="phu"
          icon={RefreshCw}
          dangXuLy={dangQuet}
          aria-disabled={(xuLy && !dangQuet) || undefined}
          onClick={() => !xuLy && void quetLai()}
          className="md:h-auto md:self-stretch md:rounded-[var(--radius-md)] md:px-4"
        >
          Quét lại thư mục
        </Nut>
      </div>

      {mucMacDinh && (
        <p className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1 text-[length:var(--fs-meta)] leading-[var(--lh-meta)] text-muted">
          <span>
            {GAN_SAN_CHO} <TenMuc className="font-semibold text-text">{mucMacDinh.label}</TenMuc>
          </span>
          <Nut bien="ghost" co="nho" onClick={boGanSan}>
            {BO_GAN_SAN}
          </Nut>
        </p>
      )}

      {chuaNhan > 0 && (
        <Banner
          tieuDe={`Có ${dinhDangSo(chuaNhan)} file chưa nhận`}
          hanhDong={
            <Nut
              bien="phu"
              dangXuLy={dangQuet}
              aria-disabled={(xuLy && !dangQuet) || undefined}
              onClick={() => !xuLy && void quetLai()}
            >
              Quét lại
            </Nut>
          }
        />
      )}

      <DanhSachKhongNhan ds={khongNhan} />

      {lo?.hetHan && (
        <Banner
          loai="loi"
          tieuDe={lo.hetHan}
          hanhDong={
            <Nut bien="phu" onClick={kiemTraLai}>
              {KIEM_TRA_LAI}
            </Nut>
          }
        />
      )}

      {lo && (
        <BangKetQua
          ketQua={lo.kiemTra.ketQua}
          nguon={lo.nguon}
          tep={lo.tep}
          luaChon={lo.luaChon}
          doiLuaChon={doiLuaChon}
          mucMacDinh={lo.mucMacDinh}
          dangNhap={dangNhap}
          onNhap={() => void nhap()}
        />
      )}

      {vuaNhap && vuaNhap.daNhap.length > 0 && (
        <VuaNhap daNhap={vuaNhap.daNhap} tieuDeRef={vuaNhapRef} />
      )}

      <p role="status" className="sr-only">
        {thongBao}
      </p>
    </div>
  )
}
