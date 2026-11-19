import { siteConfig } from "@/config/site"
import { cn } from "@/utils/utils"

// Icône Instagram vectorielle officielle
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  )
}

// Icône TikTok vectorielle officielle
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 2.89 3.46 2.72 1.25-.07 2.38-.85 2.87-1.99.28-.62.39-1.3.39-1.98.02-4.99.01-9.98.01-14.97z" />
    </svg>
  )
}

// Icône WhatsApp vectorielle officielle
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M17.472 14.382c-.301-.15-1.78-.878-2.056-.978-.276-.1-.477-.15-.678.15-.2.301-.778.978-.954 1.179-.176.2-.351.226-.652.075s-1.271-.468-2.42-1.493c-.895-.798-1.5-1.784-1.676-2.085-.176-.301-.019-.464.132-.614.135-.135.301-.351.451-.527.15-.176.2-.301.301-.501.1-.2.05-.376-.025-.527s-.678-1.631-.929-2.233c-.244-.587-.492-.507-.678-.516-.176-.008-.376-.01-.577-.01s-.527.075-.803.376c-.276.301-1.054 1.03-1.054 2.511s1.079 2.912 1.23 3.113c.15.201 2.123 3.242 5.143 4.548.718.311 1.278.497 1.716.636.721.229 1.377.197 1.896.119.578-.087 1.78-.727 2.03-1.43.251-.703.251-1.305.176-1.43-.075-.126-.276-.201-.577-.352zM12.02 0C5.391 0 0 5.391 0 12.02c0 2.115.553 4.179 1.602 6.002L.055 24l6.14-1.611c1.761.96 3.754 1.467 5.825 1.467 6.629 0 12.02-5.391 12.02-12.02C24.04 5.391 18.649 0 12.02 0zm0 21.996c-1.854 0-3.673-.498-5.26-1.442l-.377-.224-3.909 1.025 1.043-3.811-.246-.391C2.247 15.502 1.69 13.791 1.69 12.02c0-5.706 4.64-10.346 10.33-10.346 5.69 0 10.33 4.64 10.33 10.346 0 5.706-4.64 10.346-10.33 10.346z" />
    </svg>
  )
}

interface SocialLinksProps {
  className?: string
  iconClassName?: string
  showLabel?: boolean
}

export default function SocialLinks({
  className,
  iconClassName = "h-4 w-4",
  showLabel = false,
}: SocialLinksProps) {
  const links = [
    {
      name: "Instagram",
      href: siteConfig.social.instagram,
      icon: InstagramIcon,
      ariaLabel: "Suivre El Bahli Store sur Instagram",
    },
    {
      name: "TikTok",
      href: siteConfig.social.tiktok,
      icon: TikTokIcon,
      ariaLabel: "Suivre El Bahli Store sur TikTok",
    },
    {
      name: "WhatsApp",
      href: siteConfig.social.whatsapp,
      icon: WhatsAppIcon,
      ariaLabel: "Contacter El Bahli Store sur WhatsApp Business (+212 609-769858)",
    },
  ]

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {links.map((link) => {
        const IconComponent = link.icon
        return (
          <a
            key={link.name}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={link.ariaLabel}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-brand-gold transition-colors duration-200"
          >
            <IconComponent className={iconClassName} />
            {showLabel && <span className="text-xs font-medium">{link.name}</span>}
          </a>
        )
      })}
    </div>
  )
}

export { InstagramIcon, TikTokIcon, WhatsAppIcon }
