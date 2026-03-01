'use client'

import { use } from 'react'

import AssetDetail from '@/components/assets/AssetDetail'

const AssetDetailPage = ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = use(params)

  return <AssetDetail assetId={id} />
}

export default AssetDetailPage
