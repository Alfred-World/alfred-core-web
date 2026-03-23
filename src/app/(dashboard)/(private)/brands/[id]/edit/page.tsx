'use client'

import { use } from 'react'

import BrandEditor from '../../_components/BrandEditor'

const EditBrandPage = ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = use(params)

  return <BrandEditor brandId={id} />
}

export default EditBrandPage
