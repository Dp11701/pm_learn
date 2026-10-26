import { describe, expect, it } from 'vitest'
import {
  GOI_Y_KHOI,
  GOI_Y_MUC_CON,
  GOI_Y_TEN_KHAC,
  MAU_BAI,
  buildPrompt,
  phanTichBai,
  voiDong,
} from '../../shared/noi-dung'
import { cay, muc } from './ho-tro'

const SALIENCE = muc('Salience Model')
const RISK_REGISTER = muc('Risk Register')
const PMP = muc('Project Management Professional (PMP)')

describe('buildPrompt: snapshot (D14)', () => {
  it('Salience Model (Chủ đề)', async () => {
    await expect(buildPrompt(SALIENCE, cay)).toMatchFileSnapshot(
      './__snapshots__/prompt-salience-model.txt',
    )
  })

  it('Risk Register (Tài liệu)', async () => {
    await expect(buildPrompt(RISK_REGISTER, cay)).toMatchFileSnapshot(
      './__snapshots__/prompt-risk-register.txt',
    )
  })

  it('PMP (Chứng chỉ)', async () => {
    await expect(buildPrompt(PMP, cay)).toMatchFileSnapshot('./__snapshots__/prompt-pmp.txt')
  })
})

describe('buildPrompt: nội dung bắt buộc (§8.7, D14, 1.5)', () => {
  const p = buildPrompt(SALIENCE, cay)

  it('tên, vị trí (breadcrumb từ cây), loại (nhãn "Loại" như F19), đường dẫn file', () => {
    expect(p).toContain('"Salience Model"')
    expect(p).toContain(
      '- Vị trí: Project Management › Stakeholder and Communication Management › Salience Model',
    )
    expect(p).toContain('- Loại: Chủ đề')
    expect(p).not.toContain('Mẫu bài:')
    expect(p).toContain(
      '- File: noi-dung/project-management/stakeholder-and-communication-management/salience-model.md',
    )
  })

  it('khung frontmatter: id, loai, ban-nhap, nguon ai, giai_nghia, lien_quan; không có ngay_duyet', () => {
    const fm = p.slice(p.indexOf('\n---\n') + 5, p.indexOf('\n---\n', p.indexOf('\n---\n') + 5))
    expect(fm.split('\n').map((d) => d.split(':')[0])).toEqual([
      'id',
      'loai',
      'trang_thai_noi_dung',
      'nguon',
      'giai_nghia',
      'lien_quan',
    ])
    expect(fm).toContain(`id: "${SALIENCE.id}"`)
    expect(fm).toContain('loai: chu-de')
    expect(fm).toContain('trang_thai_noi_dung: ban-nhap')
    expect(fm).toContain('nguon: ai')
    expect(p).not.toMatch(/^ngay_duyet:/m)
  })

  it('D14: không đòi khối "## Mục liên quan", chỉ lien_quan', () => {
    expect(p).not.toContain('"## Mục liên quan"')
    expect(p).toContain('App tự tạo các khối "Nói lại bằng lời của bạn", "Mục liên quan"')
  })

  it('đủ các ## của mẫu Chủ đề theo thứ tự, ★ đúng khối bắt buộc, có quy ước ###, H/Đ', () => {
    const tieuDe = [...p.matchAll(/"## ([^"]+)"( ★)?/g)].map((m) => `${m[1]}${m[2] ?? ''}`)
    expect(tieuDe).toEqual([
      'Tóm tắt ★',
      'Vì sao PM cần biết ★',
      'Khái niệm cốt lõi ★',
      'Ví dụ thực tế ★',
      'Cách áp dụng ★',
      'Góc dev lead → PM ★',
      'So sánh',
      'Thuật ngữ',
      'Thực hành công cụ',
      'Thực hành trên dự án thật ★',
      'Tự kiểm tra ★',
      'Tham khảo ★',
    ])
    for (const ten of ['Bạn đã quen', 'Điều cần đổi', 'Đề bài', 'Đầu ra', 'Tiêu chí tự kiểm']) {
      expect(p).toContain(`"### ${ten}"`)
    }
    expect(p).toContain('"- H: <câu hỏi> | Đ: <đáp án>"')
    expect(p).toContain('viết \\|')
  })

  it('yêu cầu: tiếng Việt, giữ thuật ngữ tiếng Anh, ghi nguồn, không bịa, không HTML, bản nháp', () => {
    expect(p).toContain('Viết tiếng Việt có dấu')
    expect(p).toContain('Giữ nguyên tên mục và thuật ngữ PM bằng tiếng Anh')
    expect(p).toContain('Ghi nguồn ở khối Tham khảo')
    expect(p).toContain('Không bịa sự kiện, số liệu, trích dẫn')
    expect(p).toContain('không HTML')
    expect(p).toContain('không viết chữ nào trước dòng "## " đầu tiên ngoài frontmatter')
    expect(p).toContain('Đây là bản nháp')
  })

  it('danh sách slug đủ mọi mục học của cây, không có slug lạ', () => {
    const phan = p.slice(p.lastIndexOf('Slug các mục của roadmap'))
    const slug = [...phan.matchAll(/: (.+)$/gm)].flatMap((m) => m[1].split(', '))
    expect(slug).toHaveLength(199)
    expect(new Set(slug)).toEqual(new Set(cay.mucHoc.map((m) => m.slug)))
  })

  it('mục có tên gốc ghi thêm dòng tên gốc', () => {
    expect(buildPrompt(muc('Steering Committee'), cay)).toContain(
      '- Tên gốc trên roadmap: Steering Comittee',
    )
    expect(p).not.toContain('Tên gốc trên roadmap')
  })

  it('Tài liệu: process_group với 5 slug giai đoạn lấy từ cây; khối app Bản của tôi', () => {
    const r = buildPrompt(RISK_REGISTER, cay)
    expect(r).toContain('process_group: [<slug giai đoạn>, …]')
    expect(r).toContain(
      'chọn trong: initiation, planning, execution, monitoring-and-control, closure.',
    )
    expect(r).toContain('"Bản của tôi"')
    expect(r).not.toContain('"## Bản của tôi"')
  })

  it('Chứng chỉ: không ghi kiem_tra_lan_cuoi; Kế hoạch thi, Nhật ký thi thử do app tạo', () => {
    const c = buildPrompt(PMP, cay)
    expect(c).toContain('- Loại: Chứng chỉ')
    expect(c).toContain('Không ghi kiem_tra_lan_cuoi')
    expect(c).toContain('"Kế hoạch thi của tôi", "Nhật ký thi thử"')
    expect(c).not.toContain('"## Kế hoạch thi của tôi"')
  })

  it('Tài liệu, Chứng chỉ: các ## đúng thứ tự §8.6 / §8.6b, không có khối do app tạo', () => {
    const tieuDe = (x: string) =>
      [...x.matchAll(/"## ([^"]+)"( ★)?/g)].map((m) => `${m[1]}${m[2] ?? ''}`)
    expect(tieuDe(buildPrompt(RISK_REGISTER, cay))).toEqual([
      'Mục đích ★',
      'Khi nào lập, ai lập, ai duyệt ★',
      'Cấu trúc tài liệu ★',
      'Mẫu điền sẵn ★',
      'Checklist chất lượng ★',
      'Lỗi thường gặp',
      'Tự kiểm tra ★',
      'Tham khảo ★',
    ])
    expect(tieuDe(buildPrompt(PMP, cay))).toEqual([
      'Tóm tắt ★',
      'Dành cho ai ★',
      'Thông tin kỳ thi ★',
      'Phủ roadmap ★',
      'Tự kiểm tra ★',
      'Tham khảo ★',
    ])
  })

  it('§8.6b: Thông tin kỳ thi do người học tự nhập — AI để trống, không tự đặt danh sách trường', () => {
    const c = buildPrompt(PMP, cay)
    const dong = c.split('\n').find((d) => d.startsWith('- "## Thông tin kỳ thi"'))
    expect(dong).toBe(
      '- "## Thông tin kỳ thi" ★: người học tự điền khối này sau khi kiểm tra nguồn chính thức — bạn chỉ ghi dòng tiêu đề, để trống phần bên dưới, không tự đặt trường hay giá trị nào.',
    )
    for (const truong of [
      'Đơn vị tổ chức',
      'Hình thức thi',
      'Lệ phí',
      'Điều kiện dự thi',
      '<Trường>',
    ]) {
      expect(c).not.toContain(truong)
    }
    expect(c).not.toContain('Thông tin kỳ thi: mỗi dòng')
  })

  it('mọi khối, tên khác, tiểu mục của 3 mẫu đều có gợi ý', () => {
    for (const mau of Object.values(MAU_BAI)) {
      for (const k of mau.khoi.filter((x) => x.nguon === 'file')) {
        expect(GOI_Y_KHOI[mau.mau][k.id], `${mau.mau}/${k.id}`).toBeTruthy()
        for (const ten of k.tenKhac) expect(GOI_Y_TEN_KHAC[ten], ten).toBeTruthy()
        for (const ten of k.mucCon) expect(GOI_Y_MUC_CON[ten], ten).toBeTruthy()
      }
    }
  })

  it('mọi mục học đều dựng được prompt; prompt không có chữ giữ chỗ chưa thay', () => {
    for (const m of cay.mucHoc) {
      const x = buildPrompt(m, cay)
      expect(x).not.toMatch(/undefined|null|NaN|\$\{/)
    }
  })
})

describe('buildPrompt ↔ phanTichBai: file viết đúng theo prompt đọc được trọn vẹn', () => {
  // Dựng file từ chính prompt: khung frontmatter + mỗi "## …" (tên đầu nếu có nhiều tên) với chữ
  // giữ chỗ theo quy ước của khối.
  function fileTheoPrompt(p: string, mucId: string): string {
    const fm = p
      .slice(p.indexOf('\n---\n') + 5, p.indexOf('\n---\n', p.indexOf('\n---\n') + 5))
      .split('\n')
      .map((d) =>
        d.startsWith('giai_nghia:')
          ? 'giai_nghia: cụm giữ chỗ'
          : d.startsWith('lien_quan:')
            ? 'lien_quan: [scope-creep]'
            : d.startsWith('process_group:')
              ? 'process_group: [planning]'
              : d,
      )
    const than: string[] = []
    let daCoKhoi7 = false
    for (const dong of p.split('\n')) {
      const k = /^\s*- "## ([^"]+)"/.exec(dong)
      const mc = /^\s*- "### ([^"]+)"/.exec(dong)
      if (k) {
        if (['So sánh', 'Thuật ngữ', 'Thực hành công cụ'].includes(k[1])) {
          if (daCoKhoi7) continue
          daCoKhoi7 = true
        }
        than.push(`## ${k[1]}`, ...giuCho(k[1]))
      } else if (mc) {
        than.push(`### ${mc[1]}`, mc[1] === 'Tiêu chí tự kiểm' ? '- [ ] [giữ chỗ]' : '[giữ chỗ]')
      }
    }
    expect(fm[0]).toBe(`id: "${mucId}"`)
    return ['---', ...fm, '---', ...than].join('\n')
  }

  function giuCho(khoi: string): string[] {
    switch (khoi) {
      case 'Khái niệm cốt lõi':
        return ['- **[thuật ngữ]** — [giữ chỗ]']
      case 'Tự kiểm tra':
        return ['- H: [câu hỏi] | Đ: [đáp án]']
      case 'Mẫu điền sẵn':
        return ['| A | B |', '| --- | --- |', '| 1 | 2 |']
      case 'Checklist chất lượng':
        return ['- [ ] [giữ chỗ]']
      case 'Thông tin kỳ thi':
        // prompt bảo để trống (người học tự điền, §8.6b)
        return []
      case 'Phủ roadmap':
        return ['### [domain]', '- scope-creep']
      case 'Góc dev lead → PM':
      case 'Thực hành trên dự án thật':
        return []
      default:
        return ['[giữ chỗ]']
    }
  }

  it.each([['Salience Model'], ['Risk Register'], ['Project Management Professional (PMP)']])(
    '%s: không lỗi, không cảnh báo, đủ khối (Chứng chỉ: trừ Thông tin kỳ thi người học tự điền)',
    (ten) => {
      const m = muc(ten)
      const kq = phanTichBai(fileTheoPrompt(buildPrompt(m, cay), m.id), m)
      expect(kq.loi).toBeNull()
      expect(kq.canhBao.map(voiDong)).toEqual([])
      const conTrong = m.mau === 'chung-chi' ? 1 : 0
      expect(kq.duKhoi.co).toBe(kq.duKhoi.tong - conTrong)
      if (conTrong) {
        expect(kq.boCuc.find((o) => o.mau?.id === 'thong-tin-ky-thi')?.hien).toBe('chua-co')
      }
      expect(kq.frontmatter).toMatchObject({
        id: m.id,
        loai: m.mau,
        trangThaiNoiDung: 'ban-nhap',
        nguon: 'ai',
      })
    },
  )
})
