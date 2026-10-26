import { AsyncLocalStorage } from 'node:async_hooks'
import path from 'node:path'
import { docFrontmatter, TOI_DA_BYTE_BAI } from '../../shared/noi-dung/index.ts'
import type { MucHoc } from '../../shared/roadmap/index.ts'
import type { Db } from '../db/index.ts'
import { coBanChup, docBanChupHienHanh, docCacBanChupHienHanh } from '../du-lieu/ban-chup-duyet.ts'
import {
  docSo,
  docTepCuaMuc,
  layRevisionNoiDung,
  tangRevisionNoiDung,
  xoaDongSo,
  type DongSo,
  type VaiTep,
} from '../du-lieu/so-noi-dung.ts'
import { LoiApi } from '../loi.ts'
import { docBai, docTepTai } from './doc-bai.ts'
import { duongDanCuaMuc, duongDanChuan, khoaDuongDan, type CayNoiDung } from './duong-dan.ts'
import {
  daoNguocFileOp,
  dsFileOpDuDinh,
  thucHienFileOp,
  tiepTucFileOps,
  type BuocFile,
  type KetQuaFileOp,
  type YeuCauFileOp,
} from './file-ops.ts'
import { bamTep, giaiDuongDan } from './ghi-tep.ts'
import type { PhanHoiBai, PhanHoiTrangThaiNoiDung } from './hop-dong-bai.ts'
import { LoiQuetSau, quetNhe, quetSau, trangThaiGoc } from './quet.ts'
import { docBannerThayCay, type BannerThayCay } from './thay-cay.ts'
import { TB_ND } from './thong-bao.ts'
import { taoBoTrangThaiNoiDung } from './trang-thai-noi-dung.ts'

// Kho nội dung: một đối tượng cho mỗi (DB, thư mục nội dung), dùng chung bởi các route và lúc khởi động.
// Mọi việc ghi sổ / chạm file (quét nhẹ, Quét lại, file_ops, Giữ bản cũ) chạy NỐI TIẾP qua một khoá (gọi
// lồng trong khoá thì chạy luôn, không tự khoá chết). Đọc bài không cần khoá.
// file_op dở dang (lỗi đĩa giữa chừng: EACCES, ENOSPC…): trước mỗi thao tác mới và mỗi lượt quét nhẹ, kho chạy
// tiếp nó trước; vẫn hỏng thì từ chối thao tác mới (503) và bỏ lượt quét nhẹ (sổ đã ghi theo thao tác, đĩa chưa
// — quét lúc này sẽ đánh dấu mất oan), để không thao tác nào chạy chồng lên một thao tác chưa xong.

/** /api/meta → noiDung */
export interface NoiDungMeta {
  /** Revision nội dung: tăng khi sổ, bản chụp duyệt hay file trên đĩa đổi */
  revision: number
  /** Số file .md chưa nhận (gốc + thư mục phần / lĩnh vực) */
  chuaNhan: number
  /** Banner một lần sau khi thay file cây; null khi không có / đã tắt */
  thayCay: BannerThayCay | null
}

export interface CanhBaoSo {
  duongDan: string
  /** Mục mà file đang được nhận cho */
  itemId: string
  loai: 'id-muc-khac' | 'id-khong-co'
  idTrongFile: string
}

export interface TepChuaNhanDoc {
  duongDan: string
  hash: string
  size: number
  /** null khi file lớn hơn 256 KB (không đọc) */
  noiDung: string | null
}

export interface KetQuaQuetLai {
  /** File đã nhận bị đổi tên / chuyển chỗ, nhận ra cùng hash → đã đưa về đường dẫn chuẩn, không hỏi */
  daChuyen: { tu: string; den: string; itemId: string }[]
  /** Dòng sổ của file đã mất mà không thấy bản cùng hash → đã gỡ */
  daGo: { duongDan: string; itemId: string; vai: VaiTep }[]
  /** file_op của các bước chuyển (Hoàn tác được); null khi không chuyển gì */
  fileOp: number | null
  /** File .md chưa nhận còn lại (quét sâu): nơi gọi phân loại Hợp lệ / Thiếu khối / Không khớp / ◎ / Lỗi */
  chuaNhan: TepChuaNhanDoc[]
  /** Mục Đã duyệt mà file đã nhận khác bản chụp hoặc không còn → ⟳ (Giữ bản cũ / Nhập thành bản sửa) */
  doiNgoaiApp: { itemId: string; duongDan: string | null; hash: string | null }[]
  /** File đã nhận ghi da-duyet mà DB không có bản chụp nào của mục → ◎ */
  chuaXacNhan: { itemId: string; duongDan: string; hash: string }[]
  /** id trong file đã nhận thuộc mục khác / không có trong cây: giữ nguyên, cảnh báo ở tab Nhập */
  canhBao: CanhBaoSo[]
}

export interface KhoNoiDung {
  readonly db: Db
  readonly noiDungDir: string
  readonly cay: CayNoiDung
  /** Chạy `viec` khi giữ khoá của kho (nối tiếp với mọi việc ghi khác) */
  khoa<T>(viec: () => Promise<T>): Promise<T>
  /** Quét nhẹ (gộp các lần gọi trùng lúc); tăng revision nội dung khi sổ / danh sách chưa nhận đổi */
  quetNhe(): Promise<{ revision: number; chuaNhan: string[] }>
  /**
   * Cho /api/meta: quét nhẹ rồi trả số liệu; lỗi quét được ghi log, không làm hỏng /api/meta; kho đang bận
   * (thao tác file dài) thì trả số của lượt quét trước, không chờ
   */
  meta(): Promise<NoiDungMeta>
  /** File chưa nhận theo lượt quét nhẹ gần nhất */
  dsChuaNhan(): readonly string[]
  /**
   * Chạy tiếp file_op dở dang (trong khoá); còn op chưa xong được → LoiApi 503. Mọi thao tác ghi của kho gọi
   * trước khi làm; nơi gọi cần sổ khớp đĩa trước khi lập kế hoạch (vd. nhập) cũng gọi.
   */
  chayTiepOpDo(): Promise<void>
  /**
   * file_ops trong khoá (chạy tiếp op dở dang trước); trả kèm revision nội dung sau khi xong. Lỗi đĩa giữa
   * chừng → LoiApi 503 (op giữ 'du-dinh', làm tiếp ở thao tác sau).
   */
  thucHien(yc: YeuCauFileOp): Promise<KetQuaFileOp & { revision: number }>
  /** Hoàn tác một file_op trong khoá */
  daoNguoc(id: number, thayDoiDb?: () => void): Promise<KetQuaFileOp & { revision: number }>
  docBai(muc: MucHoc): Promise<PhanHoiBai>
  trangThaiTatCa(): Promise<PhanHoiTrangThaiNoiDung>
  /** "Giữ bản cũ" (đề xuất 1.6): ghi lại bản chụp vào <slug>.md, bản đang có vào thùng rác */
  giuBanCu(muc: MucHoc): Promise<{ revision: number; fileOp: number | null }>
  /**
   * Phần cơ học của Quét lại (1.6): băm lại mọi file đã nhận (không tin mtime + size), quét sâu, đưa file cùng
   * hash về chỗ, gỡ dòng sổ mất, liệt kê việc cần quyết. Thư mục nội dung không có / không đọc được → 422, không
   * đổi sổ.
   */
  quetLai(): Promise<KetQuaQuetLai>
  /** Cảnh báo về file đã nhận (id trong file khác mục) */
  kiemSo(): Promise<CanhBaoSo[]>
}

function taoKhoa() {
  const trong = new AsyncLocalStorage<boolean>()
  let hangDoi: Promise<unknown> = Promise.resolve()
  let soViec = 0
  const khoa = <T>(viec: () => Promise<T>): Promise<T> => {
    if (trong.getStore()) return viec()
    soViec++
    const p = hangDoi
      .then(() => trong.run(true, viec))
      .finally(() => {
        soViec--
      })
    hangDoi = p.catch(() => {})
    return p
  }
  return { khoa, banh: () => soViec > 0 }
}

/**
 * Nơi ghi nội dung mới của một mục (bất biến 5, đề xuất 3.6): mục Đã duyệt → <slug>.ban-sua.md (vai ban-sua);
 * chưa duyệt → <slug>.md. Mọi đường ghi bài (Nhập thành bản sửa, Lưu bản nháp ở trình soạn) dùng hàm này;
 * chỉ duyệt bản sửa / Giữ bản cũ ghi thẳng <slug>.md của mục đã duyệt.
 */
export function dichGhiNoiDung(db: Db, muc: MucHoc): { duongDan: string; vai: 'bai' | 'ban-sua' } {
  const vai = docBanChupHienHanh(db, muc.id) ? 'ban-sua' : 'bai'
  return { duongDan: duongDanCuaMuc(muc, vai), vai }
}

function soSanhDs(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i])
}

async function bamTuongDoi(goc: string, tuongDoi: string): Promise<string | null> {
  try {
    const p = await giaiDuongDan(goc, tuongDoi)
    return p ? await bamTep(p.tep) : null
  } catch {
    return null
  }
}

function maLoi(loi: unknown): string | null {
  const ma = (loi as NodeJS.ErrnoException | null)?.code
  return typeof ma === 'string' ? ma : null
}

export function taoKhoNoiDung(db: Db, noiDungDir: string, cay: CayNoiDung): KhoNoiDung {
  const { khoa, banh } = taoKhoa()
  const bo = taoBoTrangThaiNoiDung(noiDungDir)
  let chuaNhan: string[] = []
  let daQuet = false
  let dangQuet: Promise<{ revision: number; chuaNhan: string[] }> | null = null

  // Mỗi op dở dang chỉ ghi log một lần (quét nhẹ chạy theo mỗi lần /api/meta)
  const daBaoLoi = new Set<number>()
  function baoLoiOp(id: number, loi: unknown) {
    if (daBaoLoi.has(id)) return
    daBaoLoi.add(id)
    console.error(`Thao tác file ${id} chưa chạy tiếp được:`, loi)
  }

  /** Chạy tiếp mọi op 'du-dinh'; trả op đầu tiên vẫn chưa xong (null khi không còn). */
  async function tiepOpDo(): Promise<{ id: number; loi: unknown } | null> {
    if (dsFileOpDuDinh(db).length === 0) return null
    const tiep = await tiepTucFileOps(db, noiDungDir)
    for (const x of tiep.loi) baoLoiOp(x.id, x.loi)
    return tiep.loi[0] ?? null
  }

  async function chayTiepOpDo(): Promise<void> {
    return khoa(async () => {
      const con = await tiepOpDo()
      if (con) throw new LoiApi(503, TB_ND.opDoChan(con.id, maLoi(con.loi)))
    })
  }

  async function quetNheTrongKhoa(tuyChon: { bamLai?: boolean } = {}) {
    if ((await tiepOpDo()) !== null) return { revision: layRevisionNoiDung(db), chuaNhan }
    const kq = await quetNhe(db, noiDungDir, cay, tuyChon)
    const doiDs = daQuet && !soSanhDs(kq.chuaNhan, chuaNhan)
    chuaNhan = kq.chuaNhan
    daQuet = true
    const revision =
      kq.doiSo || doiDs ? db.transaction(() => tangRevisionNoiDung(db))() : layRevisionNoiDung(db)
    return { revision, chuaNhan }
  }

  function quetNheGop() {
    dangQuet ??= khoa(quetNheTrongKhoa).finally(() => {
      dangQuet = null
    })
    return dangQuet
  }

  async function kiemSo(): Promise<CanhBaoSo[]> {
    const kq: CanhBaoSo[] = []
    for (const d of docSo(db)) {
      if (d.missingSince !== null || (d.role !== 'bai' && d.role !== 'ban-sua')) continue
      const tep = await docTepTai(noiDungDir, d.path)
      if (!tep || 'quaLon' in tep) continue
      const id = docFrontmatter(tep.noiDung).frontmatter?.id
      if (id === undefined || id === d.itemId) continue
      kq.push({
        duongDan: d.path,
        itemId: d.itemId,
        loai: cay.mucTheoId.has(id) ? 'id-muc-khac' : 'id-khong-co',
        idTrongFile: id,
      })
    }
    return kq
  }

  /**
   * Một thao tác file trong khoá: chạy tiếp op dở dang trước (còn hỏng → 503); lỗi đĩa sau khi op đã lưu
   * 'du-dinh' → 503 tiếng Việt (op làm tiếp ở thao tác sau / lần khởi động sau).
   */
  async function chayOp(
    lam: (daTao: (id: number) => void) => Promise<KetQuaFileOp>,
    daTaoNgoai?: (id: number) => void,
  ): Promise<KetQuaFileOp> {
    await chayTiepOpDo()
    const tao = { id: null as number | null }
    try {
      return await lam((id) => {
        tao.id = id
        daTaoNgoai?.(id)
      })
    } catch (loi) {
      if (tao.id === null || loi instanceof LoiApi) throw loi
      baoLoiOp(tao.id, loi)
      throw new LoiApi(503, TB_ND.opDoDang(tao.id, maLoi(loi)))
    }
  }

  async function thucHien(yc: YeuCauFileOp) {
    return khoa(async () => {
      const kq = await chayOp(
        (daTao) => thucHienFileOp(db, cay, noiDungDir, { ...yc, daTao }),
        yc.daTao,
      )
      return { ...kq, revision: layRevisionNoiDung(db) }
    })
  }

  async function quetLai(): Promise<KetQuaQuetLai> {
    return khoa(async () => {
      await chayTiepOpDo()
      // Thư mục tạm không có (đổi tên, ổ ngoài chưa gắn, NOI_DUNG_DIR sai): không coi như mọi file bị xoá
      const goc = await trangThaiGoc(noiDungDir)
      if (goc !== 'co') {
        throw new LoiApi(
          422,
          goc === 'khong-co' ? TB_ND.gocKhongCo(noiDungDir) : TB_ND.gocKhongDoc(noiDungDir),
        )
      }
      // Bấm Quét lại: băm lại mọi file đã nhận (file sửa mà giữ nguyên cỡ + mtime vẫn được thấy)
      await quetNheTrongKhoa({ bamLai: true })
      let ds
      try {
        ds = await quetSau(noiDungDir)
      } catch (loi) {
        if (loi instanceof LoiQuetSau) throw new LoiApi(422, loi.message)
        throw loi
      }
      const so = docSo(db)
      const dangKy = new Set(so.map((d) => khoaDuongDan(d.path)))
      const tenTrenDia = new Map(ds.map((t) => [khoaDuongDan(t.duongDan), t.duongDan]))
      const conLai = new Map<string, { duongDan: string; size: number; hash: string }>()
      for (const t of ds) {
        if (dangKy.has(khoaDuongDan(t.duongDan))) continue
        const hash = await bamTuongDoi(noiDungDir, t.duongDan)
        if (hash !== null) conLai.set(t.duongDan, { duongDan: t.duongDan, size: t.size, hash })
      }

      const banChupTruoc = docCacBanChupHienHanh(db)
      const buoc: BuocFile[] = []
      const daChuyen: KetQuaQuetLai['daChuyen'] = []
      const daGo: DongSo[] = []
      const coBuoc = new Set<string>()
      for (const d of so) {
        const den = duongDanChuan(cay, d.itemId, d.role)
        if (!den) continue // mồ côi: giữ nguyên
        if (d.missingSince !== null) {
          // Chỉ tự đưa về khi đích trống và (với bài đã duyệt) đúng bản đã duyệt; còn lại để nơi gọi phân loại
          const bc = d.role === 'bai' ? banChupTruoc.get(d.itemId) : undefined
          const dichCoFileKhac = [...conLai.keys()].some(
            (p) => khoaDuongDan(p) === khoaDuongDan(den),
          )
          const cungHash =
            dichCoFileKhac || (bc && bc.hash !== d.hash)
              ? undefined
              : [...conLai.values()].find((t) => t.hash === d.hash)
          if (!cungHash) {
            daGo.push(d)
            continue
          }
          conLai.delete(cungHash.duongDan)
          coBuoc.add(`${d.itemId}|${d.role}`)
          buoc.push({
            tu: cungHash.duongDan,
            den,
            hashMoi: d.hash,
            so: { itemId: d.itemId, vai: d.role, ngayNhap: d.importedOn },
          })
          daChuyen.push({ tu: cungHash.duongDan, den, itemId: d.itemId })
        } else {
          // Tên trên đĩa chỉ khác tên chuẩn ở hoa/thường (APFS): đưa về đúng tên chuẩn
          const that = tenTrenDia.get(khoaDuongDan(d.path)) ?? d.path
          if (that === den || khoaDuongDan(that) !== khoaDuongDan(den)) continue
          if (coBuoc.has(`${d.itemId}|${d.role}`)) continue
          buoc.push({ tu: that, den, hashMoi: d.hash, so: { itemId: d.itemId, vai: d.role } })
          daChuyen.push({ tu: that, den, itemId: d.itemId })
        }
      }
      // Dòng mất đã có file cùng hash thay vào thì không gỡ
      const goThat = daGo.filter((d) => !coBuoc.has(`${d.itemId}|${d.role}`))
      const thayDoiDb = () => {
        for (const d of goThat) xoaDongSo(db, d.path)
      }
      let fileOp: number | null = null
      if (buoc.length > 0) {
        fileOp = (
          await chayOp((daTao) =>
            thucHienFileOp(db, cay, noiDungDir, { op: 'quet-lai', buoc, thayDoiDb, daTao }),
          )
        ).id
      } else if (goThat.length > 0) {
        db.transaction(() => {
          thayDoiDb()
          tangRevisionNoiDung(db)
        })()
      }
      await quetNheTrongKhoa()

      const tepConLai: TepChuaNhanDoc[] = []
      for (const t of conLai.values()) {
        const tep = t.size > TOI_DA_BYTE_BAI ? null : await docTepTai(noiDungDir, t.duongDan)
        tepConLai.push({
          duongDan: t.duongDan,
          hash: t.hash,
          size: t.size,
          noiDung: tep && !('quaLon' in tep) ? tep.noiDung : null,
        })
      }

      const doiNgoaiApp: KetQuaQuetLai['doiNgoaiApp'] = []
      const chuaXacNhan: KetQuaQuetLai['chuaXacNhan'] = []
      const banChup = docCacBanChupHienHanh(db)
      for (const muc of cay.mucTheoId.values()) {
        const dong = docTepCuaMuc(db, muc.id, 'bai')
        const bc = banChup.get(muc.id)
        if (bc) {
          const hash = dong && dong.missingSince === null ? dong.hash : null
          if (hash !== bc.hash) {
            doiNgoaiApp.push({ itemId: muc.id, duongDan: dong?.path ?? null, hash })
          }
          continue
        }
        if (!dong || dong.missingSince !== null || coBanChup(db, muc.id)) continue
        const tep = await docTepTai(noiDungDir, dong.path)
        if (!tep || 'quaLon' in tep) continue
        if (docFrontmatter(tep.noiDung).frontmatter?.trangThaiNoiDung === 'da-duyet') {
          chuaXacNhan.push({ itemId: muc.id, duongDan: dong.path, hash: tep.hash })
        }
      }

      return {
        daChuyen,
        daGo: goThat.map((d) => ({ duongDan: d.path, itemId: d.itemId, vai: d.role })),
        fileOp,
        chuaNhan: tepConLai,
        doiNgoaiApp,
        chuaXacNhan,
        canhBao: await kiemSo(),
      }
    })
  }

  async function giuBanCu(muc: MucHoc) {
    return khoa(async () => {
      await chayTiepOpDo()
      const banChup = docBanChupHienHanh(db, muc.id)
      if (!banChup) throw new LoiApi(409, TB_ND.chuaDuyet)
      const den = duongDanCuaMuc(muc, 'bai')
      const dong = docTepCuaMuc(db, muc.id, 'bai')
      const hienTai = await bamTuongDoi(noiDungDir, den)
      if (hienTai === banChup.hash && dong?.path === den && dong.missingSince === null) {
        return { revision: layRevisionNoiDung(db), fileOp: null }
      }
      const kq = await chayOp((daTao) =>
        thucHienFileOp(db, cay, noiDungDir, {
          op: 'giu-ban-cu',
          buoc: [
            {
              tu: null,
              den,
              hashMoi: banChup.hash,
              noiDung: banChup.noiDung,
              so: { itemId: muc.id, vai: 'bai' },
            },
          ],
          daTao,
        }),
      )
      return { revision: layRevisionNoiDung(db), fileOp: kq.id }
    })
  }

  return {
    db,
    noiDungDir,
    cay,
    khoa,
    quetNhe: quetNheGop,
    async meta() {
      // Đang có thao tác file (vd. nhập 250 file): không chờ, trả số của lượt quét trước — /api/meta phải nhanh
      if (!banh() || !daQuet) {
        try {
          await quetNheGop()
        } catch (loi) {
          console.error('Quét nhẹ thư mục nội dung lỗi:', loi)
        }
      }
      return {
        revision: layRevisionNoiDung(db),
        chuaNhan: chuaNhan.length,
        thayCay: docBannerThayCay(db),
      }
    },
    dsChuaNhan: () => chuaNhan,
    chayTiepOpDo,
    thucHien,
    daoNguoc: (id, thayDoiDb) =>
      khoa(async () => {
        const kq = await chayOp((daTao) =>
          daoNguocFileOp(db, cay, noiDungDir, id, {
            daTao,
            ...(thayDoiDb ? { thayDoiDb } : {}),
          }),
        )
        return { ...kq, revision: layRevisionNoiDung(db) }
      }),
    docBai: (muc) => docBai(db, noiDungDir, muc),
    trangThaiTatCa: () => bo.docTatCa(db, cay.mucTheoId.values()),
    giuBanCu,
    quetLai,
    kiemSo,
  }
}

// ---------- Một kho cho mỗi (DB, thư mục) ----------

const theoDb = new WeakMap<Db, Map<string, KhoNoiDung>>()
const moiNhat = new WeakMap<Db, KhoNoiDung>()

/** Kho của (db, thư mục nội dung); tạo khi chưa có (cùng cây thì dùng lại, để mọi route chung một khoá). */
export function layKhoNoiDung(db: Db, noiDungDir: string, cay: CayNoiDung): KhoNoiDung {
  const goc = path.resolve(noiDungDir)
  let bang = theoDb.get(db)
  if (!bang) {
    bang = new Map()
    theoDb.set(db, bang)
  }
  let kho = bang.get(goc)
  if (!kho || kho.cay.mucTheoId !== cay.mucTheoId) {
    kho = taoKhoNoiDung(db, goc, cay)
    bang.set(goc, kho)
  }
  moiNhat.set(db, kho)
  return kho
}

/** Kho tạo gần nhất cho DB này (để /api/meta dùng mà không cần thêm tham số); undefined khi chưa có. */
export function khoCuaDb(db: Db): KhoNoiDung | undefined {
  return moiNhat.get(db)
}
