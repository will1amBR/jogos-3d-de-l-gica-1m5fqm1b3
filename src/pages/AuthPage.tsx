import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { AuthScreen } from '@/components/AuthScreen'

interface AuthPageProps {
  /** true = página de cadastro (Criar Nova Conta) */
  isRegister?: boolean
}

/**
 * Página de autenticação em rota própria (/entrar e /cadastro).
 * Reutiliza a AuthScreen (form completo) e redireciona para o Hub quando logar.
 */
export const AuthPage: React.FC<AuthPageProps> = ({ isRegister = false }) => {
  const navigate = useNavigate()

  useEffect(() => {
    if (pb.authStore.isValid && pb.authStore.model) {
      navigate('/', { replace: true })
    }
  }, [navigate])

  return <AuthScreen onSuccess={() => navigate('/', { replace: true })} />
}
