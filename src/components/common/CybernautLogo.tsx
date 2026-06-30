import { cn } from "@/lib/utils";
import logo from "@/assets/cybernaut-logo.png";

interface CybernautLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
  textClassName?: string;
}

export function CybernautLogo({
  size = 32,
  className,
  showText = false,
  textClassName,
}: CybernautLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <img
        src={logo}
        alt="Cybernaut"
        style={{ width: size, height: size }}
        className="object-contain"
      />
      {showText && (
        <span className={cn("font-semibold tracking-tight", textClassName)}>
          Cybernaut
        </span>
      )}
    </span>
  );
}

export default CybernautLogo;
