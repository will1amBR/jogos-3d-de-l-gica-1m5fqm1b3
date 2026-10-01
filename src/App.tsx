/* Main App Component - Handles routing (using react-router-dom), query client and other providers */
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { GameProvider } from '@/context/GameContext'
import Layout from './components/Layout'

// Game and Hub Pages
import Index from './pages/Index'
import Fazenda from './pages/Fazenda'
import Fabrica from './pages/Fabrica'
import Tetris from './pages/Tetris'
import Jornada from './pages/Jornada'
import Melhorias from './pages/Melhorias'
import Conquistas from './pages/Conquistas'

// Auth Pages
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import VerifyEmail from './pages/VerifyEmail'
import NotFound from './pages/NotFound'

const App = () => (
  <BrowserRouter>
    <GameProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          {/* Main App Layout */}
          <Route element={<Layout />}>
            <Route path="/" element={<Index />} />
            <Route path="/fazenda" element={<Fazenda />} />
            <Route path="/fabrica" element={<Fabrica />} />
            <Route path="/tetris" element={<Tetris />} />
            <Route path="/jornada" element={<Jornada />} />
            <Route path="/melhorias" element={<Melhorias />} />
            <Route path="/conquistas" element={<Conquistas />} />
            <Route path="/recuperar-senha" element={<ForgotPassword />} />
            <Route path="/redefinir-senha" element={<ResetPassword />} />
            <Route path="/verificar-email" element={<VerifyEmail />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </GameProvider>
  </BrowserRouter>
)

export default App
