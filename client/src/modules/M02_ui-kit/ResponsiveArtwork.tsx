/**
 * Responsive artwork loader using srcset + sizes.
 * No runtime JS for image switching — pure HTML attributes.
 * Supports any persona with 3 WebP sizes in /assets/.
 */

type ArtworkVariant = 'portrait' | 'thumb';

interface ResponsiveArtworkProps {
  baseName: string;               // e.g. "lilith" | "maya"
  alt: string;
  sizes: string;                  // HTML sizes attribute
  variant?: ArtworkVariant;       // portrait = full srcset, thumb = 512+1024 only
  className?: string;
  style?: React.CSSProperties;
  priority?: boolean;             // true = eager loading, false = lazy (default)
  onError?: () => void;
}

export function ResponsiveArtwork({
  baseName,
  alt,
  sizes,
  variant = 'portrait',
  className,
  style,
  priority = false,
  onError,
}: ResponsiveArtworkProps) {
  const base = `/assets/${baseName}`;

  const isThumb = variant === 'thumb';
  const src = isThumb ? `${base}-512.webp` : `${base}-1024.webp`;
  const srcSet = isThumb
    ? `${base}-512.webp 512w, ${base}-1024.webp 1024w`
    : `${base}-512.webp 512w, ${base}-1024.webp 1024w, ${base}-1536.webp 1536w`;

  return (
    <img
      src={src}
      srcSet={srcSet}
      sizes={sizes}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      className={className}
      style={style}
      onError={onError}
    />
  );
}
