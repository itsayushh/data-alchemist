import { BotMessageSquare, BrainCircuit, DatabaseZap, Home, Settings, Shredder } from "lucide-react"

import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"

// Menu items.
const items = [
    {
        title: "Home",
        url: "/",
        icon: Home,
    },
    {
        title: "Validate Data",
        url: "/validate",
        icon: DatabaseZap,
    },
    {
        title: "AI Assistant",
        url: "/ai",
        icon: BotMessageSquare,
    },
    {
        title: "Business Intelligence",
        url: "/rules",
        icon: BrainCircuit,
    },
    {
        title: "Settings",
        url: "#",
        icon: Settings,
    },
]

export function AppSidebar() {
    return (
        <Sidebar aria-label="Main application sidebar" className="flex flex-col h-full">
            <SidebarHeader className="border-b">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                          aria-label="Data Alchemist Home"
                          className="flex items-center gap-2 text-xl font-semibold tracking-wide h-11"
                        >
                            <Shredder size={100} />
                            Data Alchemist
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className="overflow-y-auto flex-grow">
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu aria-label="Primary navigation">
                            {items.map((item) => {
                                const Icon = item.icon
                                return (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton asChild>
                                            <a
                                                href={item.url}
                                                className="flex items-center gap-3 px-4 py-2 rounded-md text-gray-700 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                                            >
                                                <Icon size={20} className="flex-shrink-0" />
                                                <span>{item.title}</span>
                                            </a>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                )
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
        </Sidebar>
    )
}
