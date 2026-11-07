import { CreateUserForm } from "@/components/create-user-form";
import { PageHeader } from "@/components/page-header";
import { isAdminSession } from "@/lib/admin";
import { getSession } from "@/lib/session";

export const metadata = { title: "Create user" };

export default async function NewUserPage() {
  const session = await getSession();
  if (!isAdminSession(session)) return null;

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-16 px-4 py-6 md:px-8 md:py-8">
      <PageHeader
        title="Create user"
        lede="An invite email is the usual path. Creating the account arrives in Phase 2."
      />
      <CreateUserForm />
    </main>
  );
}
