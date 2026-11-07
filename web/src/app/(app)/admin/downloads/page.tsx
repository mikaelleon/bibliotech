import { redirect } from "next/navigation";

/** Download activity now lives on Analytics. Keep the old address working. */
export default function AdminDownloadsPage() {
  redirect("/admin/analytics");
}
