import React, { createContext, useContext, useState, useCallback } from 'react'

const TransferContext = createContext(null)

export function TransferProvider({ children }) {
  const [uploadState, setUploadState] = useState('idle') // idle | uploading | complete | error
  const [uploadData, setUploadDataState] = useState(null)
  const [downloadState, setDownloadState] = useState('idle')
  const [activeCode, setActiveCode] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadSpeed, setUploadSpeed] = useState(0)

  const setUploadData = useCallback((data) => {
    setUploadDataState(data)
    setActiveCode(data?.code || null)
    setUploadState('complete')
  }, [])

  const clearTransfer = useCallback(() => {
    setUploadDataState(null)
    setActiveCode(null)
    setUploadState('idle')
    setUploadProgress(0)
    setUploadSpeed(0)
  }, [])

  const setAiData = useCallback((ai) => {
    setUploadDataState((prev) => prev ? { ...prev, ai } : prev)
  }, [])

  const startUpload = useCallback(() => {
    setUploadState('uploading')
    setUploadProgress(0)
  }, [])

  const setError = useCallback(() => {
    setUploadState('error')
  }, [])

  return (
    <TransferContext.Provider value={{
      uploadState,
      uploadData,
      downloadState,
      activeCode,
      uploadProgress,
      uploadSpeed,
      setUploadData,
      clearTransfer,
      setAiData,
      startUpload,
      setError,
      setUploadProgress,
      setUploadSpeed,
      setDownloadState,
    }}>
      {children}
    </TransferContext.Provider>
  )
}

export const useTransfer = () => {
  const ctx = useContext(TransferContext)
  if (!ctx) throw new Error('useTransfer must be used inside TransferProvider')
  return ctx
}

export default TransferContext
