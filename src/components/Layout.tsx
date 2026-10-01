import React from 'react'
import { Outlet } from 'react-router-dom'
import { Navbar, Footer } from './Navigation'
import { LevelUpModal } from './LevelUpModal'
import { useGame } from '@/context/GameContext'

export default function Layout() {
  const { levelUpModal, closeLevelUpModal } = useGame()

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F0E8] text-[#3E2723] antialiased selection:bg-[#8BC34A] selection:text-white">
      <Navbar />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>

      <Footer />

      {levelUpModal && (
        <LevelUpModal
          level={levelUpModal.newLevel}
          bonusCoins={levelUpModal.bonusCoins}
          onClose={closeLevelUpModal}
        />
      )}
    </div>
  )
}
