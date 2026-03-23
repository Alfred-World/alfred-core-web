import { use } from 'react'

import CommodityDetail from '../_components/CommodityDetail'

const CommodityDetailPage = ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = use(params)

  return <CommodityDetail commodityId={id} />
}

export default CommodityDetailPage
