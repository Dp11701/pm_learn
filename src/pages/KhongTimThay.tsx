// 404 (F26, F26b, §8.10): H1 trong khung app, gợi ý mục gần nhất, ô tìm, nút phụ "Về Tổng quan" (D24).
// Mobile lề 16 (D35). Dùng cho route '*' và slug không có trong cây (/hoc, /linh-vuc, /phan).
import { Fragment, useMemo } from 'react'
import { Link, useLocation } from 'react-router'
import { layCay, type Cay } from '../../shared/roadmap'
import { NutLink } from '../components/Nut'
import TenMuc from '../components/TenMuc'
import TieuDeTrang from '../components/TieuDeTrang'
import { LOP_H1 } from './chung'
import { goiYChoDuongDan, type GoiY } from './khong-tim-thay/goi-y'
import OTimMuc from './khong-tim-thay/OTimMuc'

function docCay(): Cay | null {
  try {
    return layCay()
  } catch {
    return null
  }
}

function giaiMa(duongDan: string): string {
  try {
    return decodeURI(duongDan)
  } catch {
    return duongDan
  }
}

/** "X", "X hoặc Y", "X, Y hoặc Z"; tên trùng nhau thì thêm tên cấp cha để phân biệt. */
function CauGoiY({ goiY, cay }: { goiY: GoiY[]; cay: Cay }) {
  const tenTrung = (g: GoiY) => goiY.some((k) => k !== g && k.nut.label === g.nut.label)
  return (
    <p className="m-0">
      Có phải bạn muốn mở{' '}
      {goiY.map((g, i) => {
        const cha = g.nut.chaId ? cay.nutTheoId.get(g.nut.chaId) : undefined
        return (
          <Fragment key={g.nut.id}>
            {i > 0 && (i === goiY.length - 1 ? ' hoặc ' : ', ')}
            <Link to={g.duongDan} className="font-semibold text-text underline">
              <TenMuc>{g.nut.label}</TenMuc>
            </Link>
            {cha && tenTrung(g) && (
              <span className="text-muted">
                {' '}
                (<TenMuc>{cha.label}</TenMuc>)
              </span>
            )}
          </Fragment>
        )
      })}
      ?
    </p>
  )
}

export default function KhongTimThay() {
  const { pathname } = useLocation()
  const cay = docCay()
  const goiY = useMemo(() => (cay ? goiYChoDuongDan(cay, pathname) : []), [cay, pathname])
  return (
    <div className="flex flex-col items-center gap-4 px-10 pt-16 pb-12 text-center max-lg:px-6 max-md:px-4">
      <span className="font-mono text-[length:var(--fs-meta)] leading-[var(--lh-meta)] break-all text-muted">
        {giaiMa(pathname)}
      </span>
      <TieuDeTrang tenTrang="Không tìm thấy trang" className={LOP_H1}>
        Không tìm thấy trang này.
      </TieuDeTrang>
      {cay && goiY.length > 0 && <CauGoiY goiY={goiY} cay={cay} />}
      {cay && <OTimMuc cay={cay} />}
      <NutLink to="/" bien="phu" className="max-md:w-full">
        Về Tổng quan
      </NutLink>
    </div>
  )
}
