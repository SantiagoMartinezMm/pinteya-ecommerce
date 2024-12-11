'use client'

import { useEffect } from 'react'
import SwaggerUI from 'swagger-ui-react'
import 'swagger-ui-react/swagger-ui.css'

export default function ApiDocs() {
  useEffect(() => {
    // Ajustar estilos para modo oscuro si es necesario
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    }
  }, [])

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">API Documentation</h1>
      <div className="bg-white rounded-lg shadow-lg p-6">
        <SwaggerUI url="/api/openapi.yaml" />
      </div>
    </div>
  )
}
