import { UserNav } from "./UserNav";
import { ModeToggle } from "../ModeToggle";

export function AdminHeader({ user }: { user: any }) {
  return (
    <header className="border-b">
      <div className="flex h-16 items-center px-4">
        <div className="ml-auto flex items-center space-x-4">
          <ModeToggle />
          <UserNav user={user} />
        </div>
      </div>
    </header>
  );
}