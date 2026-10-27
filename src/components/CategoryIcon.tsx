import {
  Backpack,
  Binoculars,
  Box,
  FileText,
  HardHat,
  Medal,
  Shield,
  Shirt,
  Sword,
  Tent,
  Pocket,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  uniforms: Shirt,
  headgear: HardHat,
  "field-gear": Pocket,
  "bags-packs": Backpack,
  insignia: Shield,
  medals: Medal,
  "optics-comms": Binoculars,
  "knives-tools": Sword,
  camping: Tent,
  documents: FileText,
  other: Box,
};

export function CategoryIcon({ slug, size }: { slug: string; size?: number }) {
  const Icon = ICONS[slug] ?? Box;
  return <Icon size={size} strokeWidth={1.8} aria-hidden="true" />;
}
