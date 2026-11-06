import { notFound } from "next/navigation";

import { StatesGallery } from "@/components/states-gallery";

export const metadata = { title: "State gallery" };

export default function DevStatesPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <StatesGallery />;
}
