// Vòng 4 bước (shared/domain/bon-buoc.ts; đề xuất 3.2 — Cần chốt 6, §1, F19, D8): mỗi quy tắc "Xong khi" và
// mỗi câu F19 khi thiếu là một test; x/4 đếm bước xong và Không áp dụng; "Tiếp" là bước chưa qua đầu tiên.
import { describe, expect, it } from 'vitest'
import {
  CAU_THIEU,
  DU_LIEU_BON_BUOC_TRONG,
  KHONG_AP_DUNG_CHUA_CO_CAU_HOI,
  tinhBonBuoc,
  type DuLieuBonBuoc,
} from '../../shared/domain/bon-buoc'
import type { MauBai } from '../../shared/roadmap/types'

const CAU = ['k1', 'k2', 'k3']

function hoc(doi: Partial<DuLieuBonBuoc> = {}): DuLieuBonBuoc {
  return { ...DU_LIEU_BON_BUOC_TRONG, ...doi }
}

function tinh(doi: Partial<DuLieuBonBuoc> = {}, mau: MauBai = 'chu-de', cauHoiKhoa = CAU) {
  return tinhBonBuoc({ mau, cauHoiKhoa, hoc: hoc(doi) })
}

const thucHanh = (doi: Partial<DuLieuBonBuoc['thucHanh']>): DuLieuBonBuoc['thucHanh'] => ({
  ...DU_LIEU_BON_BUOC_TRONG.thucHanh,
  ...doi,
})

const cham = (c: 'dung' | 'mot-phan' | 'sai' | null, traLoi = 'x', daXem = c !== null) => ({
  traLoi,
  daXem,
  cham: c,
})

describe('câu F19 (đề xuất 3.2, nguyên văn)', () => {
  it('đủ các câu "Thiếu · …"', () => {
    expect(CAU_THIEU.hieu).toBe('Thiếu · chưa nói lại bằng lời')
    expect(CAU_THIEU.apDungDangLam).toBe('Thiếu · đang làm bài thực hành')
    expect(CAU_THIEU.apDungChuaLam).toBe('Thiếu · chưa làm bài thực hành')
    // Phạm vi rút gọn 27/10/2026: không còn câu riêng của Tài liệu ("chưa có bản Hoàn thành") / Chứng chỉ
    expect(Object.keys(CAU_THIEU)).not.toContain('apDungTaiLieu')
    expect(Object.keys(CAU_THIEU)).not.toContain('apDungChungChi')
    expect(CAU_THIEU.kiemTraChuaCham).toBe('Thiếu · chưa tự chấm câu nào')
    expect(CAU_THIEU.kiemTraDaCham(1, 3)).toBe('Thiếu · đã chấm 1/3 câu')
    expect(CAU_THIEU.ghiNho).toBe('Thiếu · chưa có flashcard')
    expect(KHONG_AP_DUNG_CHUA_CO_CAU_HOI).toBe('Không áp dụng · chưa có câu hỏi')
  })

  it('mục chưa làm gì: 4 bước thiếu (Chủ đề có câu hỏi)', () => {
    const kq = tinh()
    expect(kq.cacBuocThieu).toEqual(['hieu', 'ap-dung', 'kiem-tra', 'ghi-nho'])
    expect(kq.buoc.hieu.thieu).toBe('Thiếu · chưa nói lại bằng lời')
    expect(kq.buoc['ap-dung'].thieu).toBe('Thiếu · chưa làm bài thực hành')
    expect(kq.buoc['kiem-tra'].thieu).toBe('Thiếu · chưa tự chấm câu nào')
    expect(kq.buoc['ghi-nho'].thieu).toBe('Thiếu · chưa có flashcard')
    expect(kq.soXong).toBe(0)
    expect(kq.tiep).toBe('hieu')
  })

  it('frame F19: Hiểu, Ghi nhớ đã xong; Áp dụng đang làm; Kiểm tra chưa chấm → "Bài còn 2 bước"', () => {
    const kq = tinh({
      noiLai: { text: 'Nói lại' },
      thucHanh: thucHanh({ trangThai: 'dang-lam' }),
      the: [{}],
    })
    expect(kq.cacBuocThieu).toEqual(['ap-dung', 'kiem-tra'])
    expect(kq.buoc.hieu.nhan).toBe('Đã xong')
    expect(kq.buoc['ap-dung'].nhan).toBe('Thiếu · đang làm bài thực hành')
    expect(kq.buoc['kiem-tra'].nhan).toBe('Thiếu · chưa tự chấm câu nào')
    expect(kq.buoc['ghi-nho'].nhan).toBe('Đã xong')
    expect(kq.soXong).toBe(2)
    expect(kq.tiep).toBe('ap-dung')
  })
})

describe('Hiểu: ô "Nói lại bằng lời của bạn" có chữ', () => {
  it('có chữ → xong', () => {
    expect(tinh({ noiLai: { text: 'Một câu' } }).buoc.hieu).toMatchObject({
      tinhTrang: 'xong',
      thieu: null,
    })
  })
  it('không có / rỗng / chỉ khoảng trắng → chưa làm + câu thiếu', () => {
    for (const noiLai of [null, { text: '' }, { text: '  \n ' }]) {
      expect(tinh({ noiLai }).buoc.hieu).toMatchObject({
        tinhTrang: 'chua-lam',
        thieu: 'Thiếu · chưa nói lại bằng lời',
      })
    }
  })
})

describe('Áp dụng', () => {
  it('Chủ đề: "Xong" và ô Kết quả có chữ → xong (dự án, tiêu chí không bắt buộc)', () => {
    const kq = tinh({ thucHanh: thucHanh({ trangThai: 'xong', ketQua: 'Kết quả' }) })
    expect(kq.buoc['ap-dung']).toMatchObject({ tinhTrang: 'xong', thieu: null })
  })
  it('Chủ đề: "Xong" mà ô Kết quả trống → vẫn đang làm', () => {
    const kq = tinh({ thucHanh: thucHanh({ trangThai: 'xong', ketQua: '  ' }) })
    expect(kq.buoc['ap-dung']).toMatchObject({
      tinhTrang: 'dang-lam',
      thieu: 'Thiếu · đang làm bài thực hành',
    })
  })
  it('Chủ đề: đang làm khi trạng thái Đang làm hoặc đã có kết quả / dự án / tiêu chí', () => {
    for (const th of [
      thucHanh({ trangThai: 'dang-lam' }),
      thucHanh({ ketQua: 'Nháp' }),
      thucHanh({ duAnId: 3 }),
      thucHanh({ tieuChi: { a: true } }),
    ]) {
      expect(tinh({ thucHanh: th }).buoc['ap-dung']).toMatchObject({
        tinhTrang: 'dang-lam',
        thieu: 'Thiếu · đang làm bài thực hành',
      })
    }
  })
  it('Chủ đề: chưa có gì (tiêu chí toàn bỏ tick) → chưa làm bài thực hành', () => {
    const kq = tinh({ thucHanh: thucHanh({ tieuChi: { a: false } }) })
    expect(kq.buoc['ap-dung']).toMatchObject({
      tinhTrang: 'chua-lam',
      thieu: 'Thiếu · chưa làm bài thực hành',
    })
  })
  // Phạm vi rút gọn 27/10/2026 (bỏ "Bản của tôi", kế hoạch thi): Tài liệu / Chứng chỉ làm bài thực hành như Chủ đề
  for (const mau of ['tai-lieu', 'chung-chi'] as const) {
    it(`${mau}: bài thực hành Xong (có kết quả) → xong; câu F19 như Chủ đề`, () => {
      const xongThucHanh = thucHanh({ trangThai: 'xong', ketQua: 'x' })
      expect(tinh({ thucHanh: xongThucHanh }, mau).buoc['ap-dung']).toMatchObject({
        tinhTrang: 'xong',
        thieu: null,
        nhan: 'Đã xong',
      })
      expect(tinh({}, mau).buoc['ap-dung']).toMatchObject({
        tinhTrang: 'chua-lam',
        thieu: 'Thiếu · chưa làm bài thực hành',
      })
      expect(tinh({ thucHanh: thucHanh({ ketQua: 'Nháp' }) }, mau).buoc['ap-dung']).toMatchObject({
        tinhTrang: 'dang-lam',
        thieu: 'Thiếu · đang làm bài thực hành',
      })
    })
  }
  it('dữ liệu cũ còn banCuaToi / keHoachThi (luôn false trong phản hồi server) không đổi kết quả', () => {
    const cu = { ...hoc(), banCuaToi: { coHoanThanh: true }, keHoachThi: { coNgayThi: true } }
    for (const mau of ['tai-lieu', 'chung-chi'] as const) {
      expect(tinhBonBuoc({ mau, cauHoiKhoa: CAU, hoc: cu }).buoc['ap-dung'].tinhTrang).toBe(
        'chua-lam',
      )
    }
  })
  it('mọi mẫu: "Không áp dụng" kèm lý do → Không áp dụng, không tính thiếu, đếm vào x/4', () => {
    for (const mau of ['chu-de', 'tai-lieu', 'chung-chi'] as const) {
      const kq = tinh({ thucHanh: thucHanh({ trangThai: 'khong-ap-dung' }) }, mau)
      expect(kq.buoc['ap-dung']).toMatchObject({
        tinhTrang: 'khong-ap-dung',
        thieu: null,
        nhan: 'Không áp dụng',
      })
      expect(kq.cacBuocThieu).not.toContain('ap-dung')
      expect(kq.soXong).toBe(1)
    }
  })
})

describe('Kiểm tra: mọi câu đã tự chấm ≥ 1 lần', () => {
  it('không có câu hỏi → "Không áp dụng · chưa có câu hỏi", không tính thiếu, bước không bấm được (D8)', () => {
    const kq = tinh({}, 'chu-de', [])
    expect(kq.buoc['kiem-tra']).toEqual({
      tinhTrang: 'khong-ap-dung',
      thieu: null,
      nhan: 'Không áp dụng · chưa có câu hỏi',
      ghiChu: 'Không áp dụng · chưa có câu hỏi',
    })
    expect(kq.voHieu).toEqual(['kiem-tra'])
    expect(kq.cacBuocThieu).toEqual(['hieu', 'ap-dung', 'ghi-nho'])
    expect(kq.soXong).toBe(1)
  })
  it('chưa chấm câu nào → "chưa tự chấm câu nào" (chưa làm; đã trả lời / xem đáp án → đang làm)', () => {
    expect(tinh().buoc['kiem-tra']).toMatchObject({
      tinhTrang: 'chua-lam',
      thieu: 'Thiếu · chưa tự chấm câu nào',
    })
    const daTraLoi = tinh({ tuKiemTra: { k1: cham(null, 'Trả lời', false) } })
    expect(daTraLoi.buoc['kiem-tra']).toMatchObject({
      tinhTrang: 'dang-lam',
      thieu: 'Thiếu · chưa tự chấm câu nào',
    })
    const daXem = tinh({ tuKiemTra: { k1: cham(null, 'x', true) } })
    expect(daXem.buoc['kiem-tra'].tinhTrang).toBe('dang-lam')
  })
  it('đã chấm một phần → "đã chấm x/y câu" (Sai cũng là đã chấm)', () => {
    const kq = tinh({ tuKiemTra: { k1: cham('sai'), k2: cham(null) } })
    expect(kq.buoc['kiem-tra']).toMatchObject({
      tinhTrang: 'dang-lam',
      thieu: 'Thiếu · đã chấm 1/3 câu',
    })
    const hai = tinh({ tuKiemTra: { k1: cham('dung'), k3: cham('mot-phan') } })
    expect(hai.buoc['kiem-tra'].thieu).toBe('Thiếu · đã chấm 2/3 câu')
  })
  it('mọi câu đã chấm → xong; câu không còn trong bài thì không tính', () => {
    const kq = tinh({
      tuKiemTra: { k1: cham('dung'), k2: cham('sai'), k3: cham('mot-phan'), cu: cham(null) },
    })
    expect(kq.buoc['kiem-tra']).toMatchObject({ tinhTrang: 'xong', thieu: null })
    // Câu chấm ở bản bài cũ (khoá không còn) không làm bước xong
    const cu = tinh({ tuKiemTra: { cu: cham('dung') } }, 'chu-de', ['moi'])
    expect(cu.buoc['kiem-tra'].thieu).toBe('Thiếu · chưa tự chấm câu nào')
  })
})

describe('Ghi nhớ: ≥ 1 flashcard', () => {
  it('có thẻ → xong; không có → "chưa có flashcard"', () => {
    expect(tinh({ the: [{ id: 1 }] }).buoc['ghi-nho']).toMatchObject({
      tinhTrang: 'xong',
      thieu: null,
    })
    expect(tinh().buoc['ghi-nho']).toMatchObject({
      tinhTrang: 'chua-lam',
      thieu: 'Thiếu · chưa có flashcard',
    })
  })
})

describe('x/4 và Tiếp', () => {
  it('đủ 4 bước → 4/4, không có Tiếp, không có bước thiếu', () => {
    const kq = tinh({
      noiLai: { text: 'a' },
      thucHanh: thucHanh({ trangThai: 'xong', ketQua: 'b' }),
      tuKiemTra: { k1: cham('dung'), k2: cham('dung'), k3: cham('dung') },
      the: [{}],
    })
    expect(kq.soXong).toBe(4)
    expect(kq.tiep).toBeNull()
    expect(kq.cacBuocThieu).toEqual([])
    expect(kq.tinhTrang).toEqual({
      hieu: 'xong',
      'ap-dung': 'xong',
      'kiem-tra': 'xong',
      'ghi-nho': 'xong',
    })
  })
  it('Tiếp là bước chưa qua đầu tiên (Không áp dụng tính là đã qua)', () => {
    const kq = tinh(
      { noiLai: { text: 'a' }, thucHanh: thucHanh({ trangThai: 'khong-ap-dung' }) },
      'chung-chi',
      [],
    )
    expect(kq.soXong).toBe(3)
    expect(kq.tiep).toBe('ghi-nho')
  })
  it('khoá câu trùng chỉ tính một lần', () => {
    const kq = tinh({ tuKiemTra: { k1: cham('dung') } }, 'chu-de', ['k1', 'k1'])
    expect(kq.buoc['kiem-tra'].tinhTrang).toBe('xong')
  })
})
