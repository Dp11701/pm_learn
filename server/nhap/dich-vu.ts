import path from 'node:path'
import { TOI_DA_BYTE_BAI, TB, soKb, voiDong } from '../../shared/noi-dung/index.ts'
import type { Db } from '../db/index.ts'
import { docDongSo, layRevisionNoiDung } from '../du-lieu/so-noi-dung.ts'
import { LoiApi } from '../loi.ts'
import { bamNoiDung } from '../noi-dung/bam.ts'
import { duongDanChuan, khoaDuongDan, type CayNoiDung } from '../noi-dung/duong-dan.ts'
import { docFileOp } from '../noi-dung/file-ops.ts'
import { LoiTep, bamTep, chuanHoaTep, giaiDuongDan, kiemTenTep } from '../noi-dung/ghi-tep.ts'
import { layKhoNoiDung, type KetQuaQuetLai, type KhoNoiDung } from '../noi-dung/kho-noi-dung.ts'
import { docTepTrongGoc } from '../noi-dung/tep-an-toan.ts'
import { TB_ND } from '../noi-dung/thong-bao.ts'
import type { SaoLuu } from '../sao-luu.ts'
import { danhGia, docAnhDb, type DanhGia } from './danh-gia.ts'
import type {
  KetQuaFile,
  PhanHoiKiemTra,
  PhanHoiQuetLai,
  PhanHoiRevision,
  PhanHoiThucHien,
  YeuCauKiemTra,
  YeuCauThucHien,
} from './hop-dong.ts'
import { kiemDuongDanTruoc, lapKeHoach, type CachNhap, type ViecNhap } from './ke-hoach.ts'
import { mucHocTheoId, type Dich } from './khop.ts'
import { taoBoLo, type Lo } from './lo.ts'
import { phanLoaiLo, type DongPhanLoai, type NguCanhPhanLoai, type TepKiem } from './phan-loai.ts'
import { TB_NHAP } from './thong-bao.ts'

// Dịch vụ nhập file .md (đề xuất 1.6 "Quét lại", 1.7, 3.8): kiểm tra (không ghi file), thực hiện (kiểm lại
// rồi ghi qua file_ops, một thao tác mỗi lần nhập, sao lưu trước), hoàn tác, Quét lại. Mọi việc chạy trong
// khoá của kho nội dung (nối tiếp với mọi thao tác file khác).

/** Giới hạn mỗi lần (1.7) */
export const TOI_DA_FILE_LO = 250
/** Tên thao tác file_ops của lần nhập (chỉ các thao tác này hoàn tác được qua /api/nhap/hoan-tac) */
export const OP_NHAP = 'nhap'
export const OP_NHAP_QUET_LAI = 'nhap-quet-lai'

export interface DichVuNhap {
  kiemTra(yc: YeuCauKiemTra): Promise<PhanHoiKiemTra>
  thucHien(yc: YeuCauThucHien): Promise<PhanHoiThucHien>
  hoanTac(fileOp: number): Promise<PhanHoiRevision>
  quetLai(): Promise<PhanHoiQuetLai>
}

export interface TuyChonDichVuNhap {
  db: Db
  cay: CayNoiDung
  noiDungDir: string
  saoLuu: Pick<SaoLuu, 'saoLuuNgay'>
}

const giaiMa = new TextDecoder('utf-8', { fatal: true })

/** Đọc một file trong thư mục nội dung cho Quét lại; null khi không còn / không đọc được (symlink…). */
async function docTepDia(
  goc: string,
  duongDan: string,
): Promise<Pick<TepKiem, 'noiDung' | 'loiDoc' | 'hashDia'> | null> {
  const kq = await docTepTrongGoc(goc, duongDan, { toiDa: TOI_DA_BYTE_BAI })
  if (!kq.ok) {
    if (kq.lyDo !== 'qua-lon') return null
    let hashDia: string | null = null
    try {
      const p = await giaiDuongDan(goc, duongDan)
      hashDia = p ? await bamTep(p.tep) : null
    } catch (loi) {
      if (!(loi instanceof LoiTep)) throw loi
    }
    if (hashDia === null) return null
    return {
      noiDung: null,
      loiDoc: TB.fileQuaLon(soKb(kq.kichThuoc), soKb(TOI_DA_BYTE_BAI)),
      hashDia,
    }
  }
  const hashDia = bamNoiDung(kq.noiDung)
  try {
    return { noiDung: chuanHoaTep(giaiMa.decode(kq.noiDung)), loiDoc: null, hashDia }
  } catch {
    return { noiDung: null, loiDoc: TB_NHAP.khongPhaiUtf8, hashDia }
  }
}

function dauVet(k: KetQuaFile): string {
  return JSON.stringify([k.loai, k.muc?.id ?? null, k.ganSan, k.thayBanNhap, k.chuyenVeBanNhap])
}

export function taoDichVuNhap({ db, cay, noiDungDir, saoLuu }: TuyChonDichVuNhap): DichVuNhap {
  const kho: KhoNoiDung = layKhoNoiDung(db, noiDungDir, cay)
  const goc = kho.noiDungDir
  const boLo = taoBoLo(db)
  const nguCanh = (nguon: 'tha' | 'quet-lai', mucMacDinh?: string): NguCanhPhanLoai => ({
    db,
    cay,
    noiDungDir: goc,
    nguon,
    ...(mucMacDinh === undefined ? {} : { mucMacDinh }),
  })

  async function saoLuuTruoc() {
    try {
      await saoLuu.saoLuuNgay('nhap')
    } catch (loi) {
      console.error('Sao lưu trước khi nhập lỗi:', loi)
      throw new LoiApi(500, TB_NHAP.saoLuuLoi)
    }
  }

  /**
   * Lập kế hoạch → kiểm đường dẫn → sao lưu → một file_op (Hoàn tác được) → "Giữ bản cũ" cho bài Đã duyệt vừa
   * nhập bản sửa từ Quét lại (thao tác riêng: Hoàn tác lần nhập chỉ gỡ bản sửa, bài Đã duyệt giữ bản chụp).
   * @param daTao gọi khi file_op đã lưu (trước khi chạm file)
   */
  async function chay(
    nguon: 'tha' | 'quet-lai',
    op: string,
    viec: readonly ViecNhap[],
    daTao?: () => void,
  ) {
    const ke = await lapKeHoach({ db, cay, nguon, anh: docAnhDb(db) }, viec)
    if (ke.buoc.length === 0) return null
    await kiemDuongDanTruoc(goc, ke.buoc)
    await saoLuuTruoc()
    const kq = await kho.thucHien({
      op,
      buoc: ke.buoc,
      thayDoiDb: ke.thayDoiDb,
      ...(daTao ? { daTao } : {}),
    })
    const hong = new Set(kq.loi.map((l) => l.chiSo))
    const daNhap = [...ke.daNhapTheoBuoc]
      .filter(([i]) => !hong.has(i))
      .map(([, d]) => d)
      .sort((a, b) => a.chiSo - b.chiSo)
    const daNhapMuc = new Set(daNhap.map((d) => d.mucId))
    for (const id of ke.giuBanCu) {
      const muc = cay.mucTheoId.get(id)
      if (!muc || !daNhapMuc.has(id)) continue
      try {
        await kho.giuBanCu(muc)
      } catch (loi) {
        // Lần nhập đã xong (có Hoàn tác); bài vẫn báo "đổi ngoài app" để bạn Giữ bản cũ / Quét lại sau
        console.error(`Giữ bản cũ sau khi nhập bản sửa (${id}) lỗi:`, loi)
      }
    }
    return { fileOp: kq.id, revision: layRevisionNoiDung(db), daNhap }
  }

  // ---------- Quét lại: dựng lô từ đĩa ----------

  async function dungTepQuetLai(kq: KetQuaQuetLai): Promise<TepKiem[]> {
    const anh = docAnhDb(db)
    const ds: (Omit<TepKiem, 'chiSo'> & { sap: string })[] = []
    const daCo = new Set<string>()
    const them = (t: Omit<TepKiem, 'chiSo'>, sap: string) => {
      if (t.duongDan !== undefined) daCo.add(khoaDuongDan(t.duongDan))
      ds.push({ ...t, sap })
    }
    for (const x of kq.chuaXacNhan) {
      const doc = await docTepDia(goc, x.duongDan)
      if (!doc) continue
      them(
        {
          ten: path.posix.basename(x.duongDan),
          duongDan: x.duongDan,
          ...doc,
          dangKy: { itemId: x.itemId, vai: 'bai' },
        },
        x.duongDan,
      )
    }
    for (const x of kq.doiNgoaiApp) {
      const chuan = duongDanChuan(cay, x.itemId, 'bai') ?? ''
      const doc = x.duongDan ? await docTepDia(goc, x.duongDan) : null
      if (x.duongDan && doc) {
        them(
          {
            ten: path.posix.basename(x.duongDan),
            duongDan: x.duongDan,
            ...doc,
            dangKy: { itemId: x.itemId, vai: 'bai' },
          },
          x.duongDan,
        )
      } else {
        them(
          {
            ten: path.posix.basename(chuan),
            noiDung: null,
            loiDoc: null,
            hashDia: null,
            dangKy: { itemId: x.itemId, vai: 'bai' },
          },
          chuan,
        )
      }
    }
    for (const x of kq.canhBao) {
      if (daCo.has(khoaDuongDan(x.duongDan)) || anh.banChup.has(x.itemId)) continue
      if (docDongSo(db, x.duongDan)?.role !== 'bai') continue
      const doc = await docTepDia(goc, x.duongDan)
      if (!doc) continue
      them(
        {
          ten: path.posix.basename(x.duongDan),
          duongDan: x.duongDan,
          ...doc,
          dangKy: { itemId: x.itemId, vai: 'bai' },
          xungDot: { idTrongFile: x.idTrongFile },
        },
        x.duongDan,
      )
    }
    for (const x of kq.chuaNhan) {
      if (daCo.has(khoaDuongDan(x.duongDan))) continue
      const doc = await docTepDia(goc, x.duongDan)
      if (!doc) continue
      them({ ten: path.posix.basename(x.duongDan), duongDan: x.duongDan, ...doc }, x.duongDan)
    }
    return ds
      .sort((a, b) => (a.sap < b.sap ? -1 : a.sap > b.sap ? 1 : 0))
      .map(({ sap: _bo, ...t }, chiSo) => ({ ...t, chiSo }))
  }

  /** Phân loại lô Quét lại; dòng ⟳ "không còn file" bị file khác của mục thay thì bỏ và đánh số lại. */
  async function phanLoaiQuetLai(ds: TepKiem[]) {
    let tep = ds
    let dong = await phanLoaiLo(nguCanh('quet-lai'), tep)
    if (dong.some((d) => d.bo)) {
      tep = dong.filter((d) => !d.bo).map((d, chiSo) => ({ ...d.tep, chiSo }))
      dong = await phanLoaiLo(nguCanh('quet-lai'), tep)
    }
    return { tep, dong }
  }

  /** Lúc thực hiện lô Quét lại: file trên đĩa phải y như lúc kiểm tra (hash, đã nhận hay chưa). */
  async function kiemLaiDia(ds: readonly TepKiem[]): Promise<boolean> {
    for (const t of ds) {
      if (t.duongDan === undefined) continue
      let hash: string | null = null
      try {
        const p = await giaiDuongDan(goc, t.duongDan)
        hash = p ? await bamTep(p.tep) : null
      } catch (loi) {
        if (!(loi instanceof LoiTep)) throw loi
      }
      if (hash !== (t.hashDia ?? null)) return false
      const dong = docDongSo(db, t.duongDan)
      const daNhan = dong && dong.missingSince === null ? dong.itemId : null
      if (daNhan !== (t.dangKy?.itemId ?? null)) return false
    }
    return true
  }

  // ---------- Thực hiện: chọn việc theo lựa chọn của bạn ----------

  function chonViec(lo: Lo, dongMoi: DongPhanLoai[], yc: YeuCauThucHien): ViecNhap[] {
    const anh = docAnhDb(db)
    const nhanDaDuyet = new Set(yc.nhanDaDuyet)
    const viec: ViecNhap[] = []
    const daDoi = () => {
      boLo.bo(lo)
      return new LoiApi(410, TB_NHAP.daDoi)
    }
    for (const cu of lo.dong) {
      const k = cu.ketQua
      const chiSo = String(k.chiSo)
      const moi = dongMoi[k.chiSo]
      const ganId = Object.hasOwn(yc.gan, chiSo) ? yc.gan[chiSo] : undefined
      const xuLy = Object.hasOwn(yc.xuLyTrung, chiSo) ? yc.xuLyTrung[chiSo] : 'giu-ban-cu'
      let dichId: string | undefined
      let cach: CachNhap | 'tu-dg' = 'tu-dg'
      switch (k.loai) {
        case 'loi':
          continue
        case 'khong-khop':
          if (ganId === undefined) continue
          dichId = ganId
          break
        case 'hop-le':
        case 'thieu-khoi':
          dichId = ganId ?? k.muc?.id
          break
        case 'trung-da-duyet':
          if (xuLy === 'thanh-ban-sua') {
            dichId = ganId ?? k.muc?.id
            break
          }
          // Giữ bản cũ: file ngoài app (Quét lại, chưa nhận) vào thùng rác; file đã nhận do giu-ban-cu/:id lo
          if (lo.nguon !== 'quet-lai' || cu.tep.dangKy || !cu.tep.hashDia || !cu.dich) continue
          dichId = cu.dich.id
          cach = 'bo-vao-rac'
          break
        case 'chua-chup':
          if (!nhanDaDuyet.has(k.chiSo)) continue
          dichId = ganId ?? k.muc?.id
          break
      }
      if (dichId === undefined) continue
      const dich: Dich | undefined =
        mucHocTheoId(cay, dichId) ?? (cu.dich?.id === dichId ? cu.dich : undefined)
      if (!dich) throw new LoiApi(400, TB_ND.nutKhongCo(dichId))
      const ganLai = dichId !== cu.dich?.id || (k.loai === 'khong-khop' && !k.ganSan)
      if (!moi || (!ganLai && dauVet(moi.ketQua) !== dauVet(k))) throw daDoi()

      const dg: DanhGia =
        !ganLai && moi.dg ? moi.dg : danhGia(cu.tep.noiDung, cu.tep.loiDoc, dich, anh)
      if (cach === 'bo-vao-rac') {
        viec.push({ chiSo: k.chiSo, tep: cu.tep, dich, dg, cach })
        continue
      }
      if (cu.tep.noiDung === null && !cu.tep.loiDoc) {
        throw new LoiApi(409, TB_NHAP.khongConFile(k.ten))
      }
      if (dg.loai === 'loi' || cu.tep.noiDung === null) {
        const loi = dg.loi ? voiDong(dg.loi) : (cu.tep.loiDoc ?? TB.yamlLoi)
        throw new LoiApi(409, TB_NHAP.khongNhapDuoc(k.ten, dich.label, loi))
      }
      let cachNhap: CachNhap
      if (dg.daDuyet) {
        if (dich.vai === 'tong-quan') throw new LoiApi(409, TB_NHAP.tongQuanDaDuyet(k.ten))
        // Mục Đã duyệt: chỉ ghi bản sửa — khi bạn chọn "Nhập thành bản sửa" hoặc tự gán / nhận gán sẵn
        if (k.loai !== 'trung-da-duyet' && k.loai !== 'khong-khop' && !ganLai) throw daDoi()
        cachNhap = 'ban-sua'
      } else if (dg.loai === 'chua-chup' && nhanDaDuyet.has(k.chiSo)) {
        cachNhap = 'nhan-da-duyet'
      } else {
        if (k.loai === 'trung-da-duyet' && !ganLai) throw daDoi()
        cachNhap = 'ban-nhap'
      }
      viec.push({ chiSo: k.chiSo, tep: cu.tep, dich, dg, cach: cachNhap })
    }

    // Mỗi mục tối đa một file
    const theoMuc = new Map<string, ViecNhap>()
    for (const v of viec) {
      if (v.cach === 'bo-vao-rac') continue
      const truoc = theoMuc.get(v.dich.id)
      if (truoc)
        throw new LoiApi(409, TB_NHAP.haiFileMotMuc(truoc.tep.ten, v.tep.ten, v.dich.label))
      theoMuc.set(v.dich.id, v)
    }
    return viec
  }

  function kiemYeuCau(lo: Lo, yc: YeuCauThucHien) {
    const co = new Set(lo.dong.map((d) => String(d.ketQua.chiSo)))
    for (const k of [
      ...Object.keys(yc.gan),
      ...Object.keys(yc.xuLyTrung),
      ...yc.nhanDaDuyet.map(String),
    ]) {
      if (!co.has(k)) throw new LoiApi(400, TB_NHAP.chiSoSai(k))
    }
    for (const id of Object.values(yc.gan)) {
      if (!mucHocTheoId(cay, id)) throw new LoiApi(400, TB_ND.nutKhongCo(id))
    }
  }

  return {
    async kiemTra(yc) {
      if (yc.files.length === 0) throw new LoiApi(400, TB_NHAP.khongCoFile)
      if (yc.files.length > TOI_DA_FILE_LO) {
        throw new LoiApi(413, TB_NHAP.quaNhieuFile(String(TOI_DA_FILE_LO)))
      }
      for (const f of yc.files) {
        if (!kiemTenTep(f.ten)) throw new LoiApi(400, TB_ND.tenTepSai(f.ten))
        if (Buffer.byteLength(f.noiDung, 'utf8') > TOI_DA_BYTE_BAI) {
          throw new LoiApi(413, TB_NHAP.fileQuaLon(f.ten, soKb(TOI_DA_BYTE_BAI)))
        }
      }
      if (yc.mucMacDinh !== undefined && !mucHocTheoId(cay, yc.mucMacDinh)) {
        throw new LoiApi(400, TB_ND.nutKhongCo(yc.mucMacDinh))
      }
      const tep: TepKiem[] = yc.files.map((f, chiSo) => ({
        chiSo,
        ten: f.ten,
        noiDung: chuanHoaTep(f.noiDung),
        loiDoc: null,
      }))
      return kho.khoa(async () => {
        const dong = await phanLoaiLo(nguCanh('tha', yc.mucMacDinh), tep)
        const lo = boLo.tao({
          nguon: 'tha',
          tep,
          dong,
          ...(yc.mucMacDinh === undefined ? {} : { mucMacDinh: yc.mucMacDinh }),
        })
        return boLo.phanHoi(lo)
      })
    },

    async thucHien(yc) {
      return kho.khoa(async () => {
        const lay = boLo.lay(yc.token)
        if (!lay.ok) {
          throw new LoiApi(410, lay.lyDo === 'da-nhap' ? TB_NHAP.daNhapLo : TB_NHAP.hetHan)
        }
        const { lo } = lay
        kiemYeuCau(lo, yc)
        // Sổ phải khớp đĩa trước khi kiểm lại / lập kế hoạch (thao tác trước còn dở → 503)
        await kho.chayTiepOpDo()
        if (lo.nguon === 'quet-lai' && !(await kiemLaiDia(lo.tep))) {
          boLo.bo(lo)
          throw new LoiApi(410, TB_NHAP.daDoi)
        }
        const dongMoi = await phanLoaiLo(nguCanh(lo.nguon, lo.mucMacDinh), lo.tep)
        const viec = chonViec(lo, dongMoi, yc)
        // Lô đánh dấu đã dùng ngay khi thao tác đã lưu: lỗi đĩa giữa chừng thì "Thử lại" nhận 410, không tạo
        // thao tác trùng (thao tác dở được làm tiếp trước thao tác sau)
        const kq = await chay(lo.nguon, lo.nguon === 'tha' ? OP_NHAP : OP_NHAP_QUET_LAI, viec, () =>
          boLo.daNhap(lo),
        )
        if (!kq) throw new LoiApi(422, TB_NHAP.khongCoGiDeNhap)
        boLo.daNhap(lo)
        return { daNhap: kq.daNhap, fileOp: kq.fileOp, revision: kq.revision }
      })
    },

    async hoanTac(fileOp) {
      const op = docFileOp(db, fileOp)
      if (!op) throw new LoiApi(404, TB_ND.khongCoThaoTac(fileOp))
      if (op.op !== OP_NHAP && op.op !== OP_NHAP_QUET_LAI) {
        throw new LoiApi(409, TB_NHAP.khongPhaiLanNhap(fileOp))
      }
      const kq = await kho.daoNguoc(fileOp)
      return { revision: kq.revision }
    },

    async quetLai() {
      return kho.khoa(async () => {
        const kq = await kho.quetLai()
        const lan1 = await phanLoaiQuetLai(await dungTepQuetLai(kq))
        // Hợp lệ / Thiếu khối của file chưa nhận: nhập thẳng (một file_op, Hoàn tác được)
        const truc = lan1.dong.filter(
          (d) =>
            !d.tep.dangKy &&
            d.dich !== null &&
            d.dg !== null &&
            (d.ketQua.loai === 'hop-le' || d.ketQua.loai === 'thieu-khoi'),
        )
        let fileOp: number | null = null
        let daNhap = 0
        if (truc.length > 0) {
          const viec: ViecNhap[] = truc.map((d) => ({
            chiSo: d.ketQua.chiSo,
            tep: d.tep,
            dich: d.dich as Dich,
            dg: d.dg as DanhGia,
            cach: 'ban-nhap',
          }))
          const r = await chay('quet-lai', OP_NHAP_QUET_LAI, viec)
          if (r) {
            fileOp = r.fileOp
            daNhap = r.daNhap.length
          }
        }
        // Việc cần bạn quyết: phân loại lại theo trạng thái sau khi nhập thẳng
        const conLai = lan1.dong
          .filter((d) => !truc.includes(d))
          .map((d, chiSo) => ({ ...d.tep, chiSo }))
        let kiemTra: PhanHoiKiemTra | null = null
        let chuaNhan = 0
        if (conLai.length > 0) {
          const lan2 = await phanLoaiQuetLai(conLai)
          const lo = boLo.tao({ nguon: 'quet-lai', tep: lan2.tep, dong: lan2.dong })
          kiemTra = boLo.phanHoi(lo)
          chuaNhan = lan2.tep.filter((t) => !t.dangKy).length
        }
        return { daNhap, fileOp, kiemTra, chuaNhan, daChuyen: kq.daChuyen.length }
      })
    },
  }
}
