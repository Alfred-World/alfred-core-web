'use client'

import { use } from 'react'

import AssetEditor from '@/components/assets/AssetEditor'

const EditAssetPage = ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = use(params)

  return <AssetEditor assetId={id} />
}

export default EditAssetPage
