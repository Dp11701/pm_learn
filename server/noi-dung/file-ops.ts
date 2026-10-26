import fs from 'node:fs/promises'
import { homNay, nowIso } from '../../shared/clock.ts'
import type { Db } from '../db/index.ts'
import { docDongDuyet, docHashBanChupHienHanh, type DongDuyet } from '../du-lieu/ban-chup-duyet.ts'
import {
  docDongSo,
  docSo,
  docTepCuaMuc,
  ghiDongSo,
  ngayNhapCho,
  tangRevisionNoiDung,
  xoaDongSo,
  type DongSo,
  type VaiTep,
} from '../du-lieu/so-noi-dung.ts'
import { LoiApi } from '../loi.ts'
import { bamNoiDung } from './bam.ts'
import { duongDanChuan, hopVai, khoaDuongDan, type CayNoiDung } from './duong-dan.ts'
import {
  LoiTep,
  bamTep,
  chepVaoRac,
  choTrongRac,
  chuanTenHoaThuong,
  donTepTam,
  duongDanRac,
  giaiDuongDan,
  ghiNguyenTu,
  kiemTenTep,
  laTrongThungRac,
  nhanThoiDiem,
  tachDuongDan,
} from './ghi-tep.ts'
import { TB_ND } from './thong-bao.ts'

// Nhật ký file_ops (đề xuất 1.6) cho MỌI thao tác chạm file nội dung (lưu, duyệt, duyệt bản sửa, Giữ bản cũ,
// nhập, chuyển chỗ, thay cây):
//  (1) một transaction ghi file_ops 'du-dinh' CÙNG mọi thay đổi SQLite (sổ nội dung theo `so` của từng bước,
//      thayDoiDb của nơi gọi, revision nội dung);
//  (2) làm từng bước file, mỗi bước idempotent (đích đã đúng hash thì bỏ qua), tiến độ ghi lại sau mỗi bước;
//      lần đầu tới một bước, trạng thái trước của đích được ghi lại TRƯỚC khi đụng đĩa (rac = bản cũ trong thùng
//      rác | null = chưa có file | khong_doi = đích đã đúng nội dung, bước không đổi file nào) để Hoàn tác
//      phân biệt "ghi mới" với "đã có sẵn";
//  (3) đặt 'xong'. Server khởi động thì chạy tiếp mọi 'du-dinh' (tiepTucFileOps); kho nội dung cũng chạy tiếp
//      trước mỗi thao tác mới / quét nhẹ (lỗi đĩa giữa chừng không chờ tới lần khởi động sau).
// Mọi lần ghi đè một file đã có (kể cả bản giống hệt): bản cũ được CHÉP vào thùng rác trước; không bao giờ xoá
// hẳn file nội dung.
//
// Bất biến 5 (kiểm sau khi áp mọi thay đổi DB, trong transaction): bước nào đặt nội dung vào <slug>.md của mục
// có bản chụp duyệt hiện hành thì nội dung đó phải BẰNG bản chụp ("Giữ bản cũ"; duyệt bản sửa tạo bản chụp mới
// trùng nội dung ghi), trừ khi chỉ dời chính file đã nhận của mục (thay cây); bước chuyển file đó vào thùng rác
// bị từ chối; chỉ op 'duyet-ban-sua' được thay bản chụp hiện hành của mục đã duyệt. Vi phạm → LoiApi 409, không
// đổi gì (transaction rollback, chưa chạm file).

/** Một bước nơi gọi đưa vào. */
export interface BuocFile {
  /**
   * null: ghi `noiDung` vào `den`. Khác null: chuyển file `tu` → `den` (tu === den: nhận file tại chỗ, không
   * đụng đĩa — chỉ để ghi sổ).
   */
  tu: string | null
  /** null: chuyển `tu` vào thùng rác (.thung-rac/<thời điểm>/<tu>) */
  den: string | null
  /** sha256 của file ở `den` sau bước (bước vào thùng rác: hash của file `tu`) */
  hashMoi: string
  /** Chỉ khi tu === null: byte UTF-8 sẽ ghi (sha256 phải bằng hashMoi) */
  noiDung?: string
  /**
   * Sau bước, `den` là file đã nhận của (itemId, vai) (dòng sổ cũ cùng mục + vai bị gỡ). Không có: bước chuyển
   * (không vào thùng rác) mang dòng sổ của `tu` sang `den`; bước khác không đổi sổ ở `den`. ngayNhap mặc định:
   * bước ghi = hôm nay, bước chuyển = ngày của dòng cũ.
   */
  so?: { itemId: string; vai: VaiTep; ngayNhap?: string }
  /** Dữ liệu riêng của nơi gọi, lưu nguyên (vd. chiSo của lô nhập) */
  them?: Record<string, unknown>
}

/** Bước như lưu trong file_ops.steps (khoá snake_case như đề xuất 2.1: {tu, den, hash_moi}). */
export interface BuocLuu {
  tu: string | null
  den: string
  hash_moi: string
  noi_dung?: string
  so?: { item_id: string; role: VaiTep; imported_on?: string }
  them?: Record<string, unknown>
  /** Đã làm xong bước */
  xong?: boolean
  /** Bản cũ ở `den` (bị ghi đè) đã chép vào đây trong thùng rác; null = trước bước không có file ở `den` */
  rac?: string | null
  /**
   * Lần đầu tới bước thì đích đã đúng nội dung (bước ghi) hoặc nguồn đã không còn mà đích đã đúng / nguồn vào
   * thùng rác đã không còn: bước không đổi file nào → Hoàn tác bỏ qua phần file (sổ do so_truoc lo)
   */
  khong_doi?: boolean
  /** hash của bản cũ ở `den` (đi cùng rac) */
  hash_cu?: string
  /** Bước vào thùng rác: chỗ thật (có thể có hậu tố -2…) */
  den_that?: string
  /** Bước không làm được vì quy tắc an toàn / nguồn đã mất (đã bỏ qua) */
  loi?: string
  // Chỉ ở bước đầu: nhãn thùng rác + ảnh trước của DB để Hoàn tác
  rac_nhan?: string
  so_truoc?: Record<string, DongSo | null>
  duyet_truoc?: { them: number[]; doi: Pick<DongDuyet, 'id' | 'supersededAt'>[] }
}

export interface FileOp {
  id: number
  op: string
  steps: BuocLuu[]
  state: 'du-dinh' | 'xong'
  createdAt: string
}

export interface YeuCauFileOp {
  /** Tên thao tác: nhap, quet-lai, giu-ban-cu, chuyen-cho, thay-cay, hoan-tac:<id>, duyet, duyet-ban-sua… */
  op: string
  buoc: BuocFile[]
  /** Thay đổi SQLite khác của thao tác, chạy trong cùng transaction (sau khi ghi sổ theo các bước) */
  thayDoiDb?: () => void
  /** false: không ghi sổ theo các bước (Hoàn tác tự khôi phục ảnh trước của sổ) */
  apSo?: boolean
  /**
   * Gọi ngay khi file_op đã lưu 'du-dinh' (trước khi chạm file): từ đây thao tác sẽ được làm tiếp kể cả khi
   * bước file lỗi giữa chừng (vd. lô nhập đánh dấu đã dùng để "Thử lại" không tạo thao tác trùng)
   */
  daTao?: (id: number) => void
}

/** Điểm dừng cho test (giả lập tiến trình chết): ném lỗi ở đây = chết ngay sau thời điểm đó. */
export type DiemDung = (
  ten: 'sau-chep-rac' | 'sau-ghi-tam' | 'sau-doi-ten' | 'sau-buoc',
  chiSo: number,
) => void

const TEN_OP_HOAN_TAC = (id: number) => `hoan-tac:${id}`

export function docFileOp(db: Db, id: number): FileOp | undefined {
  const dong = db
    .prepare('SELECT id, op, steps, state, created_at AS createdAt FROM file_ops WHERE id = ?')
    .get(id) as (Omit<FileOp, 'steps'> & { steps: string }) | undefined
  return dong ? { ...dong, steps: JSON.parse(dong.steps) as BuocLuu[] } : undefined
}

export function dsFileOpDuDinh(db: Db): number[] {
  return (
    db.prepare("SELECT id FROM file_ops WHERE state = 'du-dinh' ORDER BY id").all() as {
      id: number
    }[]
  ).map((d) => d.id)
}

function luuBuoc(db: Db, id: number, steps: BuocLuu[]): void {
  db.prepare('UPDATE file_ops SET steps = ? WHERE id = ?').run(JSON.stringify(steps), id)
}

function kiemDuongDanBuoc(b: BuocFile): void {
  if (b.tu !== null) tachDuongDan(b.tu)
  if (b.den !== null) {
    tachDuongDan(b.den)
    const ten = b.den.slice(b.den.lastIndexOf('/') + 1)
    if (!laTrongThungRac(b.den) && !kiemTenTep(ten)) {
      throw new LoiTep('duong-dan', TB_ND.tenTepSai(ten))
    }
  } else if (b.tu === null) {
    throw new LoiTep('duong-dan', TB_ND.duongDanSai(''))
  }
  if (b.tu === null) {
    if (b.noiDung === undefined) throw new LoiTep('hash', TB_ND.thieuNoiDungGhi(b.den ?? ''))
    if (bamNoiDung(b.noiDung) !== b.hashMoi) {
      throw new LoiTep('hash', TB_ND.hashKhongKhop(b.den ?? ''))
    }
  }
}

/** Đường dẫn được bảo vệ (bất biến 5): bài chính của mục có bản chụp hiện hành → id mục + hash bản chụp. */
function duongDanBaoVe(db: Db, cay: CayNoiDung): Map<string, { itemId: string; hash: string }> {
  const kq = new Map<string, { itemId: string; hash: string }>()
  for (const [itemId, hash] of docHashBanChupHienHanh(db)) {
    const chuan = duongDanChuan(cay, itemId, 'bai')
    if (chuan) kq.set(khoaDuongDan(chuan), { itemId, hash })
    const dangKy = docTepCuaMuc(db, itemId, 'bai')
    if (dangKy) kq.set(khoaDuongDan(dangKy.path), { itemId, hash })
  }
  return kq
}

function kiemBatBien5(
  db: Db,
  cay: CayNoiDung,
  op: string,
  steps: readonly BuocLuu[],
  duyetTruoc: Map<string, number>,
): void {
  const baoVe = duongDanBaoVe(db, cay)
  const tuChoi = (cau: string) => {
    throw new LoiApi(409, cau)
  }
  for (const b of steps) {
    const dich = baoVe.get(khoaDuongDan(b.den))
    const nguon = b.tu === null ? undefined : baoVe.get(khoaDuongDan(b.tu))
    if (nguon && laTrongThungRac(b.den)) {
      tuChoi(TB_ND.racDaDuyet(b.tu as string))
    }
    if (!dich) continue
    const doiCho =
      b.tu !== null && (khoaDuongDan(b.tu) === khoaDuongDan(b.den) || op === 'thay-cay')
    if (!doiCho && b.hash_moi !== dich.hash) {
      tuChoi(TB_ND.ghiDeDaDuyet(b.den))
    }
  }
  // Chỉ duyệt bản sửa mới được thay bản chụp hiện hành của mục đã duyệt (Hoàn tác trả về đúng ảnh trước)
  if (op !== 'duyet-ban-sua' && !op.startsWith('hoan-tac:')) {
    const sau = new Map(
      docDongDuyet(db)
        .filter((d) => d.supersededAt === null)
        .map((d) => [d.itemId, d.id]),
    )
    for (const [itemId, idTruoc] of duyetTruoc) {
      if (sau.get(itemId) !== idTruoc) {
        tuChoi(TB_ND.thayBanDuyet)
      }
    }
  }
}

function soSanhDong(a: DongSo | undefined, b: DongSo | undefined): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
}

/**
 * (1) Một transaction: kiểm các bước, ghi sổ theo `so`, thayDoiDb, kiểm bất biến 5, lưu file_ops 'du-dinh'
 * (kèm ảnh trước của sổ + bản chụp duyệt để Hoàn tác), tăng revision nội dung. Chưa chạm file.
 * @param cay cây hiện hành: kiểm id (bất biến 8) và đường dẫn chuẩn của bài đã duyệt (bất biến 5)
 * @returns id file_op
 */
export function taoFileOp(db: Db, cay: CayNoiDung, yc: YeuCauFileOp): number {
  if (yc.buoc.length === 0) throw new Error('file_ops cần ít nhất một bước')
  for (const b of yc.buoc) kiemDuongDanBuoc(b)
  const createdAt = nowIso()
  const nhan = nhanThoiDiem(Date.parse(createdAt))

  return db.transaction(() => {
    const soTruoc = new Map(docSo(db).map((d) => [d.path, d]))
    const duyetTruocDs = docDongDuyet(db)
    const duyetTruoc = new Map(
      duyetTruocDs.filter((d) => d.supersededAt === null).map((d) => [d.itemId, d.id]),
    )

    const steps: BuocLuu[] = yc.buoc.map((b) => {
      const den = b.den ?? duongDanRac(nhan, b.tu as string)
      const s: BuocLuu = { tu: b.tu, den, hash_moi: b.hashMoi }
      if (b.noiDung !== undefined) s.noi_dung = b.noiDung
      if (b.so) {
        if (!hopVai(cay, b.so.itemId, b.so.vai)) {
          throw new LoiApi(400, TB_ND.nutKhongCo(b.so.itemId))
        }
        s.so = { item_id: b.so.itemId, role: b.so.vai }
        if (b.so.ngayNhap) s.so.imported_on = b.so.ngayNhap
      }
      if (b.them) s.them = b.them
      return s
    })

    if (yc.apSo !== false) {
      for (const s of steps) {
        let mangSang: DongSo | undefined
        if (s.tu !== null && s.tu !== s.den) {
          mangSang = docDongSo(db, s.tu)
          xoaDongSo(db, s.tu)
        }
        if (s.so) {
          ghiDongSo(db, {
            path: s.den,
            itemId: s.so.item_id,
            role: s.so.role,
            hash: s.hash_moi,
            size: s.noi_dung !== undefined ? Buffer.byteLength(s.noi_dung) : (mangSang?.size ?? 0),
            mtime: null,
            // Ngày nhập: bước ghi (nội dung mới) = hôm nay; bước chuyển giữ ngày của dòng cũ
            importedOn:
              s.so.imported_on ??
              (s.tu === null ? homNay() : ngayNhapCho(db, s.so.item_id, s.so.role, s.den)),
            missingSince: null,
          })
        } else if (mangSang && !laTrongThungRac(s.den)) {
          ghiDongSo(db, { ...mangSang, path: s.den, mtime: null, missingSince: null })
        }
      }
    }
    yc.thayDoiDb?.()
    kiemBatBien5(db, cay, yc.op, steps, duyetTruoc)

    // Ảnh trước để Hoàn tác: mọi dòng sổ đã đổi, mọi bản chụp duyệt đã thêm / đổi
    const soSau = new Map(docSo(db).map((d) => [d.path, d]))
    const soDoi: Record<string, DongSo | null> = {}
    for (const p of new Set([...soTruoc.keys(), ...soSau.keys()])) {
      if (!soSanhDong(soTruoc.get(p), soSau.get(p))) soDoi[p] = soTruoc.get(p) ?? null
    }
    const truocTheoId = new Map(duyetTruocDs.map((d) => [d.id, d]))
    const duyetSau = docDongDuyet(db)
    steps[0].rac_nhan = nhan
    steps[0].so_truoc = soDoi
    steps[0].duyet_truoc = {
      them: duyetSau.filter((d) => !truocTheoId.has(d.id)).map((d) => d.id),
      doi: duyetSau
        .filter(
          (d) => truocTheoId.has(d.id) && truocTheoId.get(d.id)?.supersededAt !== d.supersededAt,
        )
        .map((d) => ({ id: d.id, supersededAt: truocTheoId.get(d.id)?.supersededAt ?? null })),
    }

    const kq = db
      .prepare("INSERT INTO file_ops (op, steps, state, created_at) VALUES (?, ?, 'du-dinh', ?)")
      .run(yc.op, JSON.stringify(steps), createdAt)
    tangRevisionNoiDung(db)
    return Number(kq.lastInsertRowid)
  })()
}

export interface KetQuaFileOp {
  id: number
  /** Bước bị bỏ qua (nguồn mất, symlink…) */
  loi: { chiSo: number; loi: string }[]
}

/** Tên tạm cố định khi đổi tên chỉ khác hoa/thường (chạy lại vẫn tìm thấy). */
function tenTamDoi(ten: string, id: number, chiSo: number): string {
  return `.${ten}.doi-ten-${id}-${chiSo}`
}

async function chayBuocGhi(
  goc: string,
  op: FileOp,
  i: number,
  luu: () => void,
  diemDung?: DiemDung,
): Promise<void> {
  const b = op.steps[i]
  const nhan = op.steps[0].rac_nhan ?? nhanThoiDiem(Date.parse(op.createdAt))
  const dich = await giaiDuongDan(goc, b.den, { taoCha: true })
  if (!dich) throw new Error(TB_ND.khongTaoThuMuc(b.den))
  await chuanTenHoaThuong(dich.thuMuc, dich.ten, tenTamDoi(dich.ten, op.id, i))
  await donTepTam(dich.thuMuc, dich.ten)
  const hienTai = await bamTep(dich.tep)
  const lanDau = b.rac === undefined && !b.khong_doi
  if (hienTai === b.hash_moi) {
    // Lần đầu: đích có sẵn đúng nội dung → bước không đổi gì (Hoàn tác không được đưa file này vào thùng rác).
    // Lần chạy lại: đã ghi xong ở lần trước (rac / null đã lưu trước khi ghi).
    if (lanDau) {
      b.khong_doi = true
      luu()
    }
    return
  }
  delete b.khong_doi
  if (hienTai !== null) {
    b.rac = await chepVaoRac(goc, nhan, b.den, hienTai)
    b.hash_cu = hienTai
  } else {
    b.rac ??= null
  }
  // Trạng thái trước của đích phải nằm trong DB trước khi ghi (chết sau khi ghi vẫn biết "trước đó chưa có")
  luu()
  diemDung?.('sau-chep-rac', i)
  if (b.noi_dung === undefined) throw new LoiTep('hash', TB_ND.thieuNoiDungGhi(b.den))
  await ghiNguyenTu(dich.tep, b.noi_dung, () => diemDung?.('sau-ghi-tam', i))
  diemDung?.('sau-doi-ten', i)
}

async function fsyncThuMuc(thuMuc: string): Promise<void> {
  let tep: fs.FileHandle | undefined
  try {
    tep = await fs.open(thuMuc, 'r')
    await tep.sync()
  } catch {
    // không fsync được thư mục: rename vẫn nguyên tử
  } finally {
    await tep?.close()
  }
}

async function chayBuocChuyen(
  goc: string,
  op: FileOp,
  i: number,
  luu: () => void,
  diemDung?: DiemDung,
): Promise<void> {
  const b = op.steps[i]
  const tu = b.tu as string
  if (tu === b.den) return
  const nhan = op.steps[0].rac_nhan ?? nhanThoiDiem(Date.parse(op.createdAt))

  if (laTrongThungRac(b.den)) {
    // Vào thùng rác: không bao giờ ghi đè trong thùng rác
    const nguon = await giaiDuongDan(goc, tu)
    const hashNguon = nguon ? await bamTep(nguon.tep) : null
    if (!nguon || hashNguon === null) {
      if (b.den_that === undefined) {
        // Lần đầu (den_that luôn được lưu trước khi chuyển): nguồn đã không còn → không chuyển gì
        b.den_that = b.den
        b.khong_doi = true
        luu()
      }
      return
    }
    const [, nhanBuoc, ...phanCon] = b.den.split('/')
    let cho = b.den_that
    if (cho) {
      // chỗ chọn ở lần chạy trước mà nay có bản khác → chọn lại
      const p = await giaiDuongDan(goc, cho)
      const coSan = p ? await bamTep(p.tep) : null
      if (coSan !== null && coSan !== hashNguon) cho = undefined
    }
    if (!cho) {
      cho = (await choTrongRac(goc, nhanBuoc, phanCon.join('/'), hashNguon)).duongDan
      b.den_that = cho
      luu()
    }
    const dich = await giaiDuongDan(goc, cho, { taoCha: true })
    if (!dich) throw new Error(TB_ND.khongTaoThuMuc(cho))
    // Chỗ trống hoặc đã có đúng bản này (rename đè bản giống hệt, không mất gì)
    await fs.rename(nguon.tep, dich.tep)
    await fsyncThuMuc(nguon.thuMuc)
    await fsyncThuMuc(dich.thuMuc)
    diemDung?.('sau-doi-ten', i)
    return
  }

  const dich = await giaiDuongDan(goc, b.den, { taoCha: true })
  if (!dich) throw new Error(TB_ND.khongTaoThuMuc(b.den))
  if (khoaDuongDan(tu) === khoaDuongDan(b.den)) {
    // Chỉ khác hoa/thường: đổi tên qua tên tạm
    await chuanTenHoaThuong(dich.thuMuc, dich.ten, tenTamDoi(dich.ten, op.id, i))
    return
  }
  await chuanTenHoaThuong(dich.thuMuc, dich.ten, tenTamDoi(dich.ten, op.id, i))
  const nguon = await giaiDuongDan(goc, tu)
  const hashNguon = nguon ? await bamTep(nguon.tep) : null
  const hashDich = await bamTep(dich.tep)
  if (!nguon || hashNguon === null) {
    if (hashDich === b.hash_moi) {
      // Lần đầu: nguồn đã không còn mà đích đã đúng → không chuyển gì. Lần chạy lại: đã chuyển ở lần trước.
      if (b.rac === undefined && !b.khong_doi) {
        b.khong_doi = true
        luu()
      }
      return
    }
    throw new LoiTep('khong-phai-file', TB_ND.nguonMat(tu, b.den))
  }
  delete b.khong_doi
  if (hashDich !== null) {
    // Kể cả bản giống hệt nguồn: Hoàn tác trả nguồn về chỗ cũ và lấy lại bản này từ thùng rác
    b.rac = await chepVaoRac(goc, nhan, b.den, hashDich)
    b.hash_cu = hashDich
  } else {
    b.rac ??= null
  }
  luu()
  diemDung?.('sau-chep-rac', i)
  await fs.rename(nguon.tep, dich.tep)
  await fsyncThuMuc(nguon.thuMuc)
  await fsyncThuMuc(dich.thuMuc)
  diemDung?.('sau-doi-ten', i)
}

/** Sổ khớp đĩa sau khi làm xong: dòng sổ ở đích của các bước lấy size / mtime thật (nếu đúng hash). */
async function statSauBuoc(goc: string, db: Db, steps: readonly BuocLuu[]) {
  const capNhat: { path: string; size: number; mtime: number; hash: string }[] = []
  for (const b of steps) {
    if (b.loi || laTrongThungRac(b.den)) continue
    const dong = docDongSo(db, b.den)
    if (!dong || dong.hash !== b.hash_moi) continue
    try {
      const p = await giaiDuongDan(goc, b.den)
      if (!p) continue
      const st = await fs.lstat(p.tep)
      if (st.isFile())
        capNhat.push({ path: b.den, size: st.size, mtime: st.mtimeMs, hash: b.hash_moi })
    } catch {
      // để quét nhẹ xử lý
    }
  }
  return capNhat
}

/**
 * (2)(3) Làm các bước còn lại của file_op rồi đặt 'xong'. Idempotent: gọi lại sau khi chết giữa chừng cho cùng
 * kết quả. Bước gặp LoiTep (symlink, nguồn đã mất…) được ghi `loi` và bỏ qua; lỗi khác (EACCES, ENOSPC…) ném
 * ra, op giữ 'du-dinh' để lần sau chạy tiếp.
 */
export async function chayFileOp(
  db: Db,
  goc: string,
  id: number,
  tuyChon: { diemDung?: DiemDung } = {},
): Promise<KetQuaFileOp> {
  const op = docFileOp(db, id)
  if (!op) throw new Error(`Không có file_op ${id}.`)
  const loi: KetQuaFileOp['loi'] = []
  if (op.state === 'xong') {
    op.steps.forEach((b, i) => b.loi && loi.push({ chiSo: i, loi: b.loi }))
    return { id, loi }
  }
  const luu = () => luuBuoc(db, id, op.steps)
  for (let i = 0; i < op.steps.length; i++) {
    const b = op.steps[i]
    if (b.xong) {
      if (b.loi) loi.push({ chiSo: i, loi: b.loi })
      continue
    }
    try {
      if (b.tu === null) await chayBuocGhi(goc, op, i, luu, tuyChon.diemDung)
      else await chayBuocChuyen(goc, op, i, luu, tuyChon.diemDung)
    } catch (e) {
      if (!(e instanceof LoiTep)) throw e
      b.loi = e.message
      loi.push({ chiSo: i, loi: e.message })
    }
    b.xong = true
    luu()
    tuyChon.diemDung?.('sau-buoc', i)
  }
  const stat = await statSauBuoc(goc, db, op.steps)
  db.transaction(() => {
    const capNhat = db.prepare(
      'UPDATE content_files SET size = ?, mtime = ? WHERE path = ? AND hash = ?',
    )
    for (const s of stat) capNhat.run(s.size, s.mtime, s.path, s.hash)
    // Nội dung ghi đã nằm trên đĩa: bỏ khỏi nhật ký cho nhẹ
    const gon = op.steps.map(({ noi_dung: _bo, ...con }) => con)
    db.prepare("UPDATE file_ops SET state = 'xong', steps = ? WHERE id = ?").run(
      JSON.stringify(gon),
      id,
    )
    tangRevisionNoiDung(db)
  })()
  return { id, loi }
}

/** taoFileOp + (yc.daTao) + chayFileOp. */
export async function thucHienFileOp(
  db: Db,
  cay: CayNoiDung,
  goc: string,
  yc: YeuCauFileOp,
  tuyChon: { diemDung?: DiemDung } = {},
): Promise<KetQuaFileOp> {
  const id = taoFileOp(db, cay, yc)
  yc.daTao?.(id)
  return chayFileOp(db, goc, id, tuyChon)
}

/** Lúc khởi động: chạy tiếp mọi file_op 'du-dinh' theo thứ tự id. Lỗi của một op được ghi log, không chặn op sau. */
export async function tiepTucFileOps(
  db: Db,
  goc: string,
): Promise<{ xong: number[]; loi: { id: number; loi: unknown }[] }> {
  const kq = { xong: [] as number[], loi: [] as { id: number; loi: unknown }[] }
  for (const id of dsFileOpDuDinh(db)) {
    try {
      await chayFileOp(db, goc, id)
      kq.xong.push(id)
    } catch (loi) {
      kq.loi.push({ id, loi })
    }
  }
  return kq
}

function cacDuongDan(b: BuocLuu): string[] {
  return [b.tu, b.den, b.den_that, b.rac].filter((x): x is string => typeof x === 'string')
}

/**
 * Hoàn tác một file_op (vd. lô nhập, Quét lại): file về như trước (bản bị thay lấy lại từ thùng rác, file
 * mới ghi vào thùng rác; bước không đổi file nào — khong_doi — thì để nguyên), sổ nội dung + bản chụp duyệt về
 * ảnh trước — qua một file_op mới 'hoan-tac:<id>'. Từ chối (409) khi đã hoàn tác rồi hoặc có thao tác sau chạm
 * cùng file.
 * @param thayDoiDb thay đổi DB khác của nơi gọi (cùng transaction)
 * @param daTao như YeuCauFileOp.daTao, cho file_op hoàn tác
 */
export async function daoNguocFileOp(
  db: Db,
  cay: CayNoiDung,
  goc: string,
  id: number,
  tuyChon: { thayDoiDb?: () => void; daTao?: (id: number) => void } = {},
): Promise<KetQuaFileOp> {
  let op = docFileOp(db, id)
  if (!op) throw new LoiApi(404, TB_ND.khongCoThaoTac(id))
  if (op.op.startsWith('hoan-tac:')) throw new LoiApi(409, TB_ND.hoanTacHoanTac)
  if (op.state === 'du-dinh') {
    await chayFileOp(db, goc, id)
    op = docFileOp(db, id) as FileOp
  }
  const ten = TEN_OP_HOAN_TAC(id)
  if (db.prepare('SELECT 1 FROM file_ops WHERE op = ?').get(ten)) {
    throw new LoiApi(409, TB_ND.daHoanTac)
  }
  const cham = new Set(op.steps.flatMap(cacDuongDan).map(khoaDuongDan))
  const sau = db.prepare('SELECT id, steps FROM file_ops WHERE id > ? ORDER BY id').all(id) as {
    id: number
    steps: string
  }[]
  for (const d of sau) {
    const steps = JSON.parse(d.steps) as BuocLuu[]
    const truoc = steps[0]?.so_truoc ?? {}
    const duongDan = [...steps.flatMap(cacDuongDan), ...Object.keys(truoc)].map(khoaDuongDan)
    if (duongDan.some((p) => cham.has(p))) {
      throw new LoiApi(409, TB_ND.doiSauDo)
    }
  }

  const nguoc: BuocFile[] = []
  for (const b of [...op.steps].reverse()) {
    if (b.loi || b.khong_doi) continue
    if (b.tu === null) {
      if (b.rac && b.hash_cu) nguoc.push({ tu: b.rac, den: b.den, hashMoi: b.hash_cu })
      else nguoc.push({ tu: b.den, den: null, hashMoi: b.hash_moi })
    } else if (b.tu === b.den) {
      continue
    } else if (laTrongThungRac(b.den)) {
      nguoc.push({ tu: b.den_that ?? b.den, den: b.tu, hashMoi: b.hash_moi })
    } else {
      nguoc.push({ tu: b.den, den: b.tu, hashMoi: b.hash_moi })
      if (b.rac && b.hash_cu) nguoc.push({ tu: b.rac, den: b.den, hashMoi: b.hash_cu })
    }
  }
  const dau = op.steps[0]
  const khoiPhuc = () => {
    const soTruoc = dau.so_truoc ?? {}
    for (const p of Object.keys(soTruoc)) xoaDongSo(db, p)
    for (const dong of Object.values(soTruoc)) if (dong) ghiDongSo(db, dong)
    const duyet = dau.duyet_truoc ?? { them: [], doi: [] }
    const xoa = db.prepare('DELETE FROM content_approvals WHERE id = ?')
    for (const x of duyet.them) xoa.run(x)
    const doi = db.prepare(
      'UPDATE content_approvals SET superseded_at = ?, updated_at = ? WHERE id = ?',
    )
    for (const x of duyet.doi) doi.run(x.supersededAt, nowIso(), x.id)
    tuyChon.thayDoiDb?.()
  }
  if (nguoc.length === 0) {
    // Chỉ có thay đổi DB (vd. nhận file tại chỗ): vẫn đi qua file_ops để có dấu "đã hoàn tác"
    const tai = op.steps.find((b) => b.tu !== null && b.tu === b.den)
    nguoc.push({ tu: tai?.den ?? dau.den, den: tai?.den ?? dau.den, hashMoi: dau.hash_moi })
  }
  return thucHienFileOp(db, cay, goc, {
    op: ten,
    buoc: nguoc,
    thayDoiDb: khoiPhuc,
    apSo: false,
    ...(tuyChon.daTao ? { daTao: tuyChon.daTao } : {}),
  })
}
