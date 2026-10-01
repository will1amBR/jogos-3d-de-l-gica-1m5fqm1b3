import React from 'react'
import { useGame } from '@/context/GameContext'
import { AuthScreen } from './AuthScreen'
import { Loader2 } from 'lucide-react'

export const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useGame()

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 text-[#8BC34A] animate-spin" />
        <p className="text-sm font-extrabold text-[#795548] animate-pulse">
          Carregando dados da sua fazenda e progresso...
        </p>
      </div>
    )
  }

  if (!user) {
    return <AuthScreen />
  }

  return <>{children}</>
}
