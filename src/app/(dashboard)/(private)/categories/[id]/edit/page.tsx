'use client'

import { use } from 'react'

import { redirect } from 'next/navigation'

interface EditCategoryPageProps {
  params: Promise<{ id: string }>
}

const EditCategoryPage = ({ params }: EditCategoryPageProps) => {
  const { id } = use(params)

  redirect(`/categories?id=${id}`)
}

export default EditCategoryPage
