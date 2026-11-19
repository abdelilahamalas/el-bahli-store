import { Link } from "react-router-dom"
import { ArrowRight, Tag } from "lucide-react"
import type { Category } from "@/types/category"
import { getCategoryImage } from "@/utils/categoryImages"
import { Card } from "@/components/ui/card"

interface CategoryCardProps {
  category: Category
}

export default function CategoryCard({ category }: CategoryCardProps) {
  const image = getCategoryImage(category.slug)

  return (
    <Link
      to={`/categories/${category.slug}`}
      className="group block focus:outline-hidden"
    >
      <Card className="overflow-hidden border border-border bg-card transition-all duration-300 hover:border-brand-gold hover:shadow-lg rounded-xl">
        {/* Conteneur d'image avec ratio élégant */}
        <div className="relative aspect-3/4 w-full overflow-hidden bg-brand-lightGray">
          {image ? (
            <img
              src={image}
              alt={category.name}
              className="h-full w-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="h-full w-full flex flex-col items-center justify-center bg-muted text-muted-foreground p-4 text-center">
              <Tag className="h-10 w-10 mb-2 opacity-40" />
              <span className="text-xs font-semibold">{category.name}</span>
            </div>
          )}

          {/* Dégradé discret pour contraste du titre */}
          <div className="absolute inset-0 bg-gradient-to-t from-brand-black/75 via-brand-black/20 to-transparent transition-opacity duration-300 group-hover:from-brand-black/85" />

          {/* Contenu textuel sur l'image */}
          <div className="absolute bottom-0 left-0 right-0 p-4 text-white flex items-end justify-between gap-2">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-gold block">
                Collection
              </span>
              <h3 className="font-bold text-base sm:text-lg tracking-tight leading-tight">
                {category.name}
              </h3>
            </div>
            <div className="h-8 w-8 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:bg-brand-gold group-hover:text-brand-black group-hover:translate-x-1">
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>
        </div>
      </Card>
    </Link>
  )
}
