'use client'
import { BotMessageSquare, BrainCircuit, DatabaseZap, FileStack, Home, Settings, Shredder, Scale } from "lucide-react"

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
import { usePathname } from "next/navigation"

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
        title: "Prioritization",
        url: "/prioritization",
        icon: Scale,
    },
    {
        title: "Settings",
        url: "#",
        icon: Settings,
    },
]

export function AppSidebar() {
    const pathname = usePathname();
    return (
        <Sidebar aria-label="Main application sidebar" className="flex flex-col h-full" collapsible="icon">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            aria-label="Data Alchemist Home"
                            className="flex items-center gap-2 text-lg font-semibold tracking-wide h-11"
                        >
                            <div className="bg-background text-foreground flex aspect-square size-5 items-center justify-center rounded-lg hover:bg-accent">
                                <FileStack className="flex-shrink-0 size-6 hover:bg-accent" />
                            </div>
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
                                        <SidebarMenuButton asChild isActive={item.url === pathname}>
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
