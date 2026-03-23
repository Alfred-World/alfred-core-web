'use client'

import { use } from 'react'

import AssetDetail from '../_components/AssetDetail'

const AssetDetailPage = ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = use(params)

  return <AssetDetail assetId={id} />
}

export default AssetDetailPage
