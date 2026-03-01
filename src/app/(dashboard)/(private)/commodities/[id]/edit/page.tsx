import { use } from 'react'

import CommodityEditor from '@/components/commodities/CommodityEditor'

const EditCommodityPage = ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = use(params)

  return <CommodityEditor commodityId={id} />
}

export default EditCommodityPage
