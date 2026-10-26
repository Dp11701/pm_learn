// Hiện Markdown của bài (đề xuất 1.5 "Làm sạch"): react-markdown + remark-gfm.
// - HTML thô hiện thành chữ (không bao giờ thành phần tử): plugin htmlThanhChu đổi node html → text;
// - link: phanLoaiLink — http(s)/mailto mở tab mới rel="noopener noreferrer", đường dẫn trong app đi qua
//   router, neo #… giữ nguyên, còn lại (javascript:, data:, //host…) chỉ hiện chữ;
// - ảnh: chỉ khi giaiDuongDanAnh nhận (trong thư mục nội dung, đuôi ảnh) → /api/anh/<id>?duong-dan=…;
//   ảnh ngoài thành link (http/https) hoặc chữ;
// - tiêu đề trong khối không lên quá h3 (H1 là tên mục, h2 là tên khối);
// - bảng nằm trong vùng cuộn ngang riêng để trang không cuộn ngang.
import { memo, useMemo, type ReactNode } from 'react'
import Markdown, { type Components, type UrlTransform } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Link } from 'react-router'
import {
  THUOC_TINH_LINK_NGOAI,
  duongDanAnh,
  giaiDuongDanAnh,
  phanLoaiLink,
} from '../../../shared/noi-dung'
import type { MucHoc } from '../../../shared/roadmap'
import { MO_TAB_MOI, nhanBangCuon } from '../../copy/cho-duyet'

// ---------- Plugin: HTML thô → chữ ----------

interface NutMd {
  type: string
  value?: string
  children?: NutMd[]
  position?: unknown
}

/** Ngữ cảnh khối: node html đứng ở đây được bọc thành đoạn văn. */
const CHA_KHOI = new Set(['root', 'blockquote', 'listItem', 'footnoteDefinition'])

function doiHtml(cha: NutMd): void {
  if (!cha.children) return
  cha.children = cha.children.map((con) => {
    if (con.type !== 'html') {
      doiHtml(con)
      return con
    }
    const chu: NutMd = { type: 'text', value: con.value ?? '', position: con.position }
    return CHA_KHOI.has(cha.type)
      ? { type: 'paragraph', children: [chu], position: con.position }
      : chu
  })
}

/** remark plugin: mọi node html (khối và trong dòng) thành chữ thường. */
export function htmlThanhChu() {
  return (cay: NutMd) => doiHtml(cay)
}

const PLUGIN = [remarkGfm, htmlThanhChu]

/** Link bị chặn → chuỗi rỗng (component `a` hiện chữ); ảnh giữ src để component `img` tự quyết. */
const urlTransform: UrlTransform = (url, khoa) =>
  khoa === 'src' ? url : phanLoaiLink(url).loai === 'chan' ? '' : url

// ---------- Kiểu chữ ----------

const LOP_LINK = 'text-text underline decoration-1 underline-offset-2 hover:decoration-2'
const LOP_H3 =
  'm-0 text-[17px] leading-7 font-semibold max-md:text-[length:var(--fs-body-m)] max-md:leading-[var(--lh-body-m)]'
const LOP_H4 = 'm-0 text-[length:var(--fs-ui)] leading-[var(--lh-ui)] font-semibold'

function LinkAnToan({ href, children }: { href?: string; children?: ReactNode }) {
  const loai = phanLoaiLink(href ?? '')
  switch (loai.loai) {
    case 'ngoai':
      return (
        <a href={loai.href} {...THUOC_TINH_LINK_NGOAI} className={LOP_LINK}>
          {children}
          <span className="sr-only"> {MO_TAB_MOI}</span>
        </a>
      )
    case 'trong-app':
      return (
        <Link to={loai.href} className={LOP_LINK}>
          {children}
        </Link>
      )
    case 'neo':
      return (
        <a href={loai.href} className={LOP_LINK}>
          {children}
        </a>
      )
    default:
      return <span>{children}</span>
  }
}

function AnhAnToan({ muc, src, alt }: { muc: MucHoc; src?: string; alt?: string }) {
  const goc = src ?? ''
  if (giaiDuongDanAnh(muc.duongDanTuongDoi, goc) !== null) {
    return (
      <img
        src={duongDanAnh(muc.id, goc)}
        alt={alt ?? ''}
        loading="lazy"
        className="h-auto max-w-full rounded-[var(--radius-sm)]"
      />
    )
  }
  const chu = alt || goc
  const loai = phanLoaiLink(goc)
  return loai.loai === 'ngoai' ? (
    <LinkAnToan href={loai.href}>{chu}</LinkAnToan>
  ) : (
    <span>{chu}</span>
  )
}

function cacThanhPhan(muc: MucHoc, tenKhoi: string, trongDong: boolean): Components {
  return {
    p: trongDong
      ? ({ children }) => <>{children}</>
      : ({ children }) => <p className="m-0 [text-wrap:pretty]">{children}</p>,
    a: ({ href, children }) => <LinkAnToan href={href}>{children}</LinkAnToan>,
    img: ({ src, alt }) => (
      <AnhAnToan muc={muc} src={typeof src === 'string' ? src : undefined} alt={alt} />
    ),
    h1: ({ children }) => <h3 className={LOP_H3}>{children}</h3>,
    h2: ({ children }) => <h3 className={LOP_H3}>{children}</h3>,
    h3: ({ children }) => <h3 className={LOP_H3}>{children}</h3>,
    h4: ({ children }) => <h4 className={LOP_H4}>{children}</h4>,
    h5: ({ children }) => <h5 className={LOP_H4}>{children}</h5>,
    h6: ({ children }) => <h6 className={LOP_H4}>{children}</h6>,
    ul: ({ children, className }) => (
      <ul
        className={`m-0 flex flex-col gap-1.5 ${
          className?.includes('contains-task-list') ? 'list-none pl-0' : 'list-disc pl-6'
        }`}
      >
        {children}
      </ul>
    ),
    ol: ({ children, start }) => (
      <ol start={start} className="m-0 flex list-decimal flex-col gap-1.5 pl-6">
        {children}
      </ol>
    ),
    li: ({ children, className }) => (
      <li
        className={
          className?.includes('task-list-item')
            ? 'flex items-start gap-2.5'
            : 'pl-0.5 [&>ul]:mt-1.5'
        }
      >
        {children}
      </li>
    ),
    // Ô tick trong file chỉ để đọc; dấu tick của người học lưu riêng (phase 7c).
    input: ({ type, checked }) =>
      type === 'checkbox' ? (
        <input
          type="checkbox"
          checked={Boolean(checked)}
          disabled
          readOnly
          aria-hidden="true"
          tabIndex={-1}
          className="mt-[5px] size-[18px] shrink-0 accent-[var(--primary)]"
        />
      ) : null,
    blockquote: ({ children }) => (
      // Không vạch trái: vạch trái chỉ dành cho trạng thái học (§5.1).
      <blockquote className="m-0 flex flex-col gap-2 rounded-[var(--radius-sm)] bg-surface-2 px-4 py-3">
        {children}
      </blockquote>
    ),
    pre: ({ children }) => (
      <pre className="m-0 overflow-x-auto rounded-[var(--radius-sm)] border border-border bg-surface-2 px-3 py-2.5 font-mono text-[length:var(--fs-meta)] leading-[var(--lh-meta)] [&>code]:bg-transparent [&>code]:p-0 [&>code]:text-[1em]">
        {children}
      </pre>
    ),
    code: ({ children, className }) => (
      <code
        className={
          className
            ? 'font-mono'
            : 'rounded-[4px] bg-surface-2 px-1 py-px font-mono text-[0.88em] [overflow-wrap:anywhere]'
        }
      >
        {children}
      </code>
    ),
    hr: () => <hr className="m-0 w-full border-0 border-t border-border" />,
    table: ({ children }) => (
      // Vùng cuộn ngang nhận focus bằng Tab để cuộn bằng phím (axe scrollable-region-focusable).
      <div
        role="region"
        aria-label={nhanBangCuon(tenKhoi)}
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
        className="max-w-full overflow-x-auto rounded-[var(--radius-md)] border border-border bg-surface"
      >
        <table className="w-full border-separate border-spacing-0 text-[length:var(--fs-meta)] leading-[var(--lh-meta)]">
          {children}
        </table>
      </div>
    ),
    th: ({ children, style }) => (
      <th
        scope="col"
        style={style}
        className="h-11 border-b border-border bg-surface-2 px-3 py-2.5 text-left font-semibold"
      >
        {children}
      </th>
    ),
    td: ({ children, style }) => (
      <td style={style} className="border-b border-border px-3 py-2.5 align-top">
        {children}
      </td>
    ),
  }
}

export interface PropsMarkdown {
  children: string
  /** Mục của bài: ảnh tra theo thư mục của file bài, phục vụ qua /api/anh/<id> */
  muc: MucHoc
  /** Tên khối chứa đoạn này (tên vùng cuộn của bảng) */
  tenKhoi: string
  /** Chỉ một dòng chữ (ô bảng, câu hỏi, thuật ngữ): không bọc <p> */
  trongDong?: boolean
  className?: string
}

/**
 * Markdown của bài, đã làm sạch. Bản trongDong không có khung; bản khối là cột cách 12.
 * memo + components giữ nguyên giữa các lần vẽ: trang vẽ lại (đổi trạng thái học, phím 1–4) không dựng lại
 * cây Markdown, nên link đang focus trong bài không bị gắn lại (mất focus).
 */
function MarkdownBai({ children, muc, tenKhoi, trongDong = false, className = '' }: PropsMarkdown) {
  const components = useMemo(() => cacThanhPhan(muc, tenKhoi, trongDong), [muc, tenKhoi, trongDong])
  const noiDung = (
    <Markdown remarkPlugins={PLUGIN} urlTransform={urlTransform} components={components}>
      {children}
    </Markdown>
  )
  if (trongDong) return noiDung
  return <div className={`flex min-w-0 flex-col gap-3 ${className}`}>{noiDung}</div>
}

export default memo(MarkdownBai)
