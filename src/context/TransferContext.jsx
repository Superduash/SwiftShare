import React, { createContext, useContext, useState, useCallback, useMemo } from 'react'

const TransferContext = createContext(null)

const INITIAL_STATE = {
  status: 'idle', // idle | uploading | complete | error
  percent: 0,
  speed: 0,
  error: null,
}

export function TransferProvider({ children }) {
  const [uploadState, setUploadState] = useState(INITIAL_STATE)
  const [uploadData, setUploadData] = useState(null)
  const [aiData, setAiData] = useState(null)

  const startUpload = useCallback(() => {
    setUploadState({ ...INITIAL_STATE, status: 'uploading' })
  }, [])

  const setUploadProgress = useCallback((percent, speed) => {
    setUploadState(prev => ({ ...prev, percent, speed }))
  }, [])

  const setError = useCallback((error) => {
    setUploadState(prev => ({ ...prev, status: 'error', error }))
  }, [])

  const clearTransfer = useCallback(() => {
    setUploadState(INITIAL_STATE)
    setUploadData(null)
    setAiData(null)
  }, [])

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    uploadState, uploadData, setUploadData, aiData, setAiData,
    startUpload, setUploadProgress, setError, clearTransfer,
  }), [uploadState, uploadData, aiData, startUpload, setUploadProgress, setError, clearTransfer])

  return (
    <TransferContext.Provider value={contextValue}>
      {children}
    </TransferContext.Provider>
  )
}

/**
 * Use `uploadData` for the latest upload payload returned by the API.
 * Use `aiData` for cached AI analysis results.
 * Use `startUpload`, `setUploadProgress`, and `setError` only for upload UI state.
 */
export function useTransfer() {
  return useContext(TransferContext) || {}
}
