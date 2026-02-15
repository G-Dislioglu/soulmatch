/**
 * Responsive artwork loader using srcset + sizes.
 * No runtime JS for image switching — pure HTML attributes.
 * Supports any persona with 3 sized images in /assets/.
 */

type ArtworkVariant = 'portrait' | 'thumb';
type ArtworkFormat = 'webp' | 'png';

interface ResponsiveArtworkProps {
  baseName: string;               // e.g. "lilith" | "maya"
  alt: string;
  sizes: string;                  // HTML sizes attribute
  variant?: ArtworkVariant;       // portrait = full srcset, thumb = 512+1024 only
  format?: ArtworkFormat;         // image format, default 'png'
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
  format = 'png',
  className,
  style,
  priority = false,
  onError,
}: ResponsiveArtworkProps) {
  const base = `/assets/${baseName}`;
  const ext = format;

  const isThumb = variant === 'thumb';
  const src = isThumb ? `${base}-512.${ext}` : `${base}-1024.${ext}`;
  const srcSet = isThumb
    ? `${base}-512.${ext} 512w, ${base}-1024.${ext} 1024w`
    : `${base}-512.${ext} 512w, ${base}-1024.${ext} 1024w, ${base}-1536.${ext} 1536w`;

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
