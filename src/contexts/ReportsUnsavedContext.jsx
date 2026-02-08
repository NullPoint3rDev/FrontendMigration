import React, { createContext, useContext, useRef, useState } from 'react'

const ReportsUnsavedContext = createContext(null)

export const ReportsUnsavedProvider = ({ children }) => {
    const isDirtyRef = useRef(() => false)
    const [pendingLeavePath, setPendingLeavePath] = useState(null)

    const value = {
        isDirtyRef,
        pendingLeavePath,
        setPendingLeavePath,
        requestLeave: (path) => setPendingLeavePath(path)
    }

    return (
        <ReportsUnsavedContext.Provider value={value}>
            {children}
        </ReportsUnsavedContext.Provider>
    )
}

export const useReportsUnsaved = () => {
    const ctx = useContext(ReportsUnsavedContext)
    if (!ctx) return null
    return ctx
}
