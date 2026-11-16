import Image from "next/image";

export function GoldFrame() {
  return (
    <div className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="absolute top-3.5 right-7 left-7 h-px bg-gold sm:right-8 sm:left-8" />
      <span className="absolute right-7 bottom-3.5 left-7 h-px bg-gold sm:right-8 sm:left-8" />
      <span className="absolute top-7 bottom-7 left-3.5 w-px bg-gold sm:top-8 sm:bottom-8" />
      <span className="absolute top-7 right-3.5 bottom-7 w-px bg-gold sm:top-8 sm:bottom-8" />
      <span className="absolute top-1.5 left-1.5 size-4 border-t border-l border-gold sm:size-5" />
      <span className="absolute top-1.5 right-1.5 size-4 border-t border-r border-gold sm:size-5" />
      <span className="absolute bottom-1.5 left-1.5 size-4 border-b border-l border-gold sm:size-5" />
      <span className="absolute right-1.5 bottom-1.5 size-4 border-r border-b border-gold sm:size-5" />
    </div>
  );
}

export function CornerFlorals() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <Image
        src="/florals/corner-top-right.png"
        alt=""
        width={944}
        height={962}
        priority
        sizes="(min-width: 640px) 340px, 70vw"
        className="absolute top-0 right-0 h-auto w-[62%] max-w-none select-none sm:w-[56%]"
      />
      <Image
        src="/florals/corner-bottom-left.png"
        alt=""
        width={920}
        height={940}
        priority
        sizes="(min-width: 640px) 360px, 74vw"
        className="absolute bottom-0 left-0 h-auto w-[66%] max-w-none select-none sm:w-[58%]"
      />
    </div>
  );
}

export function Stationery({
  children,
  florals = false,
  className = "",
}: {
  children: React.ReactNode;
  florals?: boolean;
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden bg-paper shadow-[0_28px_60px_-36px_rgba(74,48,28,0.55)] ${className}`}>
      {florals ? <CornerFlorals /> : null}
      <GoldFrame />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
