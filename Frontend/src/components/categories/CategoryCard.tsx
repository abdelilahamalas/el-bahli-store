import { Link } from "react-router-dom"
import { ArrowRight, Tag } from "lucide-react"
import type { Category } from "@/types/category"
import { getCategoryImage } from "@/utils/categoryImages"
import { Card } from "@/components/ui/card"

interface CategoryCardProps {
  category: Category
}

export default function CategoryCard({ category }: CategoryCardProps) {
  const image = getCategoryImage(category.slug, category.image_url || category.image)

  return (
    <Link
      to={`/categories/${category.slug}`}
      className="group block focus:outline-hidden"
    >
      <Card className="relative overflow-hidden rounded-2xl border border-border/70 bg-brand-lightGray transition-colors duration-200 hover:border-brand-gold shadow-xs">
        {/* Conteneur d'image avec ratio moderne */}
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-brand-lightGray">
          {image ? (
            <img
              src={image}
              alt={category.name}
              className="h-full w-full object-cover object-center"
              loading="lazy"
            />
          ) : (
            <div className="h-full w-full flex flex-col items-center justify-center bg-muted text-muted-foreground p-4 text-center">
              <Tag className="h-10 w-10 mb-2 opacity-40 text-brand-gold" />
              <span className="text-xs font-semibold">{category.name}</span>
            </div>
          )}

          {/* Dégradé doux et soigné */}
          <div className="absolute inset-0 bg-gradient-to-t from-brand-black/90 via-brand-black/30 to-transparent transition-opacity duration-300 group-hover:from-brand-black" />

          {/* Badge circulaire catégorie en haut */}
          <div className="absolute top-3.5 left-3.5">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-brand-black/60 backdrop-blur-md text-[10px] font-bold tracking-wider uppercase text-white/90 border border-white/10">
              Collection
            </span>
          </div>

          {/* Contenu textuel sur l'image */}
          <div className="absolute bottom-0 left-0 right-0 p-5 text-white flex items-end justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-brand-gold block mb-0.5">
                El Bahli Store
              </span>
              <h3 className="font-extrabold text-base sm:text-lg tracking-tight leading-snug">
                {category.name}
              </h3>
            </div>
            <div className="h-9 w-9 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 transition-colors duration-200 group-hover:bg-brand-gold group-hover:text-brand-black shadow-xs">
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>
        </div>
      </Card>
    </Link>
  )
}
