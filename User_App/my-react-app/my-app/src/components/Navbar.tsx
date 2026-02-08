import { Button } from "@/components/ui/button"
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from "@/components/ui/navigation-menu"

export default function Navbar() {
  return (
    <header className="w-full border-b bg-background">
      <div className="mx-auto flex h-14 max-w-screen-xl items-center justify-between px-4">

        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold tracking-tight">
            Moby
          </span>
        </div>

        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <a
                href="#"
                className="px-3 py-2 text-sm font-medium hover:underline"
              >
                Home
              </a>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <a
                href="#"
                className="px-3 py-2 text-sm font-medium hover:underline"
              >
                About
              </a>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>

        <Button variant="ghost">Login</Button>
      </div>
    </header>
  )
}
