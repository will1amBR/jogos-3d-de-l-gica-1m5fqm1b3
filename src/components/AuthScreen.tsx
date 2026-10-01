import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { getErrorMessage, extractFieldErrors } from '@/lib/pocketbase/errors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sparkles, Loader2, KeyRound, Mail, User, ShieldCheck } from 'lucide-react'

interface AuthModalProps {
  onSuccess?: () => void
}

export const AuthScreen: React.FC<AuthModalProps> = ({ onSuccess }) => {
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setFieldErrors({})

    if (!email || !password) {
      setError('Por favor preencha todos os campos obrigatórios.')
      return
    }

    if (isRegister) {
      if (password.length < 8) {
        setError('A senha deve ter no mínimo 8 caracteres.')
        return
      }
      if (password !== passwordConfirm) {
        setError('As senhas digitadas não coincidem.')
        return
      }
    }

    setLoading(true)

    try {
      if (isRegister) {
        // Create user
        await pb.collection('users').create({
          email,
          password,
          passwordConfirm,
          name: name.trim() || 'Fazendeiro',
        })
        // Authenticate immediately
        await pb.collection('users').authWithPassword(email, password)
      } else {
        await pb.collection('users').authWithPassword(email, password)
      }

      if (onSuccess) {
        onSuccess()
      }
    } catch (err: any) {
      const message = getErrorMessage(err)
      const fErrors = extractFieldErrors(err)
      setError(message || 'Falha na autenticação. Verifique suas credenciais.')
      if (fErrors && Object.keys(fErrors).length > 0) {
        setFieldErrors(fErrors)
      }
    } finally {
      setLoading(false)
    }
  }

  const fillSeedAccount = () => {
    setEmail('william@korenambiental.com')
    setPassword('Skip@Pass')
    setIsRegister(false)
    setError(null)
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      {/* Background soft playful circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-[#8BC34A]/15 rounded-full blur-3xl animate-float-slow" />
        <div
          className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#FFB74D]/20 rounded-full blur-3xl animate-float-slow"
          style={{ animationDelay: '2s' }}
        />
      </div>

      <div className="w-full max-w-md bg-[#FFF9F0] border-2 border-[#3E2723]/10 rounded-3xl p-6 sm:p-8 shadow-xl">
        {/* Header Badge */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-[#8BC34A] to-[#689F38] flex items-center justify-center text-white shadow-md animate-bounce">
            <Sparkles className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#3E2723] tracking-tight">
            {isRegister ? 'Criar Nova Conta' : 'Entrar no Jogo'}
          </h1>
          <p className="text-xs sm:text-sm text-[#795548] mt-1 font-bold">
            {isRegister
              ? 'Comece sua jornada de fazenda e desafios de raciocínio 3D'
              : 'Seu progresso, nível e moedas estão salvos na nuvem'}
          </p>
        </div>

        {/* Form Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl animate-fade-in">
            {error}
          </div>
        )}

        {/* Seed helper */}
        <div className="mb-5 p-3 bg-[#E8F5E9] border border-[#C8E6C9] rounded-2xl flex items-center justify-between">
          <div className="text-xs text-[#2E7D32]">
            <span className="font-extrabold block">Conta de Demonstração</span>
            <span className="text-[11px] text-[#388E3C]">william@korenambiental.com</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fillSeedAccount}
            className="text-xs bg-white text-[#2E7D32] border-[#A5D6A7] hover:bg-[#C8E6C9] font-black rounded-xl h-8 px-2.5"
          >
            Usar Seed
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <Label className="text-xs font-black text-[#3E2723] uppercase">
                Seu Nome / Apelido
              </Label>
              <div className="relative mt-1">
                <User className="w-4 h-4 text-[#795548] absolute left-3 top-3.5" />
                <Input
                  type="text"
                  placeholder="Ex: Fazendeiro Mestre"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-9 bg-white border-[#3E2723]/20 rounded-xl focus:border-[#8BC34A] focus:ring-[#8BC34A] text-sm"
                />
              </div>
              {fieldErrors.name && (
                <p className="text-[11px] text-red-600 mt-1 font-bold">{fieldErrors.name}</p>
              )}
            </div>
          )}

          <div>
            <Label className="text-xs font-black text-[#3E2723] uppercase">E-mail</Label>
            <div className="relative mt-1">
              <Mail className="w-4 h-4 text-[#795548] absolute left-3 top-3.5" />
              <Input
                type="email"
                required
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9 bg-white border-[#3E2723]/20 rounded-xl focus:border-[#8BC34A] focus:ring-[#8BC34A] text-sm"
              />
            </div>
            {fieldErrors.email && (
              <p className="text-[11px] text-red-600 mt-1 font-bold">{fieldErrors.email}</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs font-black text-[#3E2723] uppercase">Senha</Label>
              {!isRegister && (
                <Link
                  to="/recuperar-senha"
                  className="text-xs font-bold text-[#8BC34A] hover:underline"
                >
                  Esqueceu a senha?
                </Link>
              )}
            </div>
            <div className="relative mt-1">
              <KeyRound className="w-4 h-4 text-[#795548] absolute left-3 top-3.5" />
              <Input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 bg-white border-[#3E2723]/20 rounded-xl focus:border-[#8BC34A] focus:ring-[#8BC34A] text-sm"
              />
            </div>
            {fieldErrors.password && (
              <p className="text-[11px] text-red-600 mt-1 font-bold">{fieldErrors.password}</p>
            )}
          </div>

          {isRegister && (
            <div>
              <Label className="text-xs font-black text-[#3E2723] uppercase">Confirmar Senha</Label>
              <div className="relative mt-1">
                <ShieldCheck className="w-4 h-4 text-[#795548] absolute left-3 top-3.5" />
                <Input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  className="pl-9 bg-white border-[#3E2723]/20 rounded-xl focus:border-[#8BC34A] focus:ring-[#8BC34A] text-sm"
                />
              </div>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#8BC34A] hover:bg-[#7CB342] text-white font-black text-base py-6 rounded-2xl shadow-md transition-all active:scale-95 mt-2"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Carregando...
              </span>
            ) : isRegister ? (
              'Criar Minha Conta e Jogar'
            ) : (
              'Entrar e Carregar Progresso'
            )}
          </Button>
        </form>

        {/* Toggle Login / Register */}
        <div className="mt-6 text-center pt-4 border-t border-[#3E2723]/10">
          <p className="text-xs text-[#795548] font-bold">
            {isRegister ? 'Já possui uma conta?' : 'Ainda não tem conta?'}
          </p>
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister)
              setError(null)
              setFieldErrors({})
            }}
            className="mt-1 text-sm font-black text-[#5E35B1] hover:underline"
          >
            {isRegister ? 'Clique aqui para Entrar' : 'Cadastre-se gratuitamente'}
          </button>
        </div>
      </div>
    </div>
  )
}
