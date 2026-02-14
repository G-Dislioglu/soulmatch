/**
 * Responsive artwork loader using srcset + sizes.
 * No runtime JS for image switching — pure HTML attributes.
 * Supports any persona with 3 WebP sizes in /assets/.
 */

interface ResponsiveArtworkProps {
  baseName: string;               // e.g. "lilith" | "maya"
  alt: string;
  sizes: string;                  // HTML sizes attribute
  className?: string;
  style?: React.CSSProperties;
  priority?: boolean;             // true = eager loading, false = lazy (default)
  onError?: () => void;
}

export function ResponsiveArtwork({
  baseName,
  alt,
  sizes,
  className,
  style,
  priority = false,
  onError,
}: ResponsiveArtworkProps) {
  const base = `/assets/${baseName}`;

  return (
    <img
      src={`${base}-1024.webp`}
      srcSet={`${base}-512.webp 512w, ${base}-1024.webp 1024w, ${base}-1536.webp 1536w`}
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
