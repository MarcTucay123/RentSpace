import Image from "next/image";

type BrandLogoProps = {
  className?: string;
  priority?: boolean;
};

export function BrandLogo({ className = "h-auto w-44", priority = false }: BrandLogoProps) {
  return (
    <Image
      src="/rentspace-logo.png"
      width={1438}
      height={388}
      alt="RentSpace"
      className={className}
      priority={priority}
    />
  );
}