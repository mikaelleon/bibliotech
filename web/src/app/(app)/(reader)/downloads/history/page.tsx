import { redirect } from "next/navigation";

/** Older links open the history section of the Downloads page. */
export default function DownloadHistoryPage() {
  redirect("/downloads#history");
}
