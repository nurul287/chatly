import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IoWarningOutline } from 'react-icons/io5'

interface ConfirmOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider')
  return ctx
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const resolverRef = useRef<((v: boolean) => void) | null>(null)

  const confirm = useCallback<ConfirmFn>((opts) => {
    setOptions(opts)
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve
    })
  }, [])

  const close = (result: boolean) => {
    resolverRef.current?.(result)
    resolverRef.current = null
    setOptions(null)
  }

  const danger = options?.danger ?? true

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AnimatePresence>
        {options && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => close(false)}
          >
            <motion.div
              className="bg-[#2a2a3e] rounded-2xl w-full max-w-sm p-6 shadow-2xl"
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col items-center text-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  danger ? 'bg-red-500/15 text-red-400' : 'bg-indigo-500/15 text-indigo-400'
                }`}>
                  <IoWarningOutline className="text-2xl" />
                </div>
                {options.title && (
                  <h3 className="text-base font-semibold text-white">{options.title}</h3>
                )}
                <p className="text-sm text-[#94a3b8] leading-relaxed">{options.message}</p>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => close(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[#3f3f5a] hover:bg-[#4a4a66] text-white text-sm font-medium transition-colors"
                >
                  {options.cancelText ?? 'Cancel'}
                </button>
                <button
                  onClick={() => close(true)}
                  className={`flex-1 py-2.5 rounded-xl text-white text-sm font-medium transition-colors ${
                    danger ? 'bg-red-500 hover:bg-red-600' : 'bg-indigo-500 hover:bg-indigo-600'
                  }`}
                >
                  {options.confirmText ?? 'Confirm'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  )
}
