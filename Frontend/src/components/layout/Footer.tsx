const CURRENT_YEAR = new Date().getFullYear()

export default function Footer() {
  return (
    <footer className="border-t bg-brand-black text-white py-8">
      <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-brand-gray">
        <p>© {CURRENT_YEAR} El Bahli Store. Tous droits réservés.</p>
        <p className="text-brand-gold font-medium">Boutique de Prêt-à-Porter Marocain</p>
      </div>
    </footer>
  )
}
