import React, { createContext, useContext, useState, useCallback } from 'react'

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

  return (
    <TransferContext.Provider
      value={{
        uploadState, uploadData, setUploadData, aiData, setAiData,
        startUpload, setUploadProgress, setError, clearTransfer,
      }}
    >
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
