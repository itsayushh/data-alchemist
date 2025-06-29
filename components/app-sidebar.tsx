'use client'
import { BotMessageSquare, BrainCircuit, DatabaseZap, FileStack, Home, Settings, Shredder, Scale, Bus, Github, Heart } from "lucide-react"

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"
import { usePathname, useRouter } from "next/navigation"
import { title } from "process"


const sidebarItems = {
    Home:[{
        title: "Home",
        url: "/",
        icon: Home,
    }],
    Data:[
        {
            title: "Validate",
            url: '/validate',   
            icon: DatabaseZap
        },
        {
            title: "Query",
            url: '/query',
            icon: BotMessageSquare
        }
    ],
    Business:[
        {
            title: 'Rules',
            url: '/rules',
            icon: BrainCircuit
        },
        {
            title: 'Prioritization',
            url: '/prioritization',
            icon: Scale
        }
    ]
}
// Menu items.
const items = [
    {
        title: "Data Validation",
        url: "/validate",
        icon: DatabaseZap,
    },
    {
        title: "Data Query",
        url: "/ai",
        icon: BotMessageSquare,
    },
    {
        title: "Business Rules",
        url: "/rules",
        icon: BrainCircuit,
    },
    {
        title: "Prioritization & Weights",
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
    const router = useRouter();
    return (
        <Sidebar aria-label="Main application sidebar" className="flex flex-col h-full font-bricolage-grotesk" collapsible="icon">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            aria-label="Data Alchemist Home"
                            className="flex items-center gap-2 text-lg font-semibold tracking-wide h-11 hover:bg-transparent hover:text-foreground"
                        >
                            <div className="flex aspect-square size-5 items-center justify-center">
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
                                        <SidebarMenuButton asChild isActive={item.url === pathname} onClick={() => {router.push(item.url)}}>
                                            <div className="text-lg">
                                                <Icon size={22} className="flex-shrink-0" />
                                                <span>{item.title}</span>
                                            </div>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                )
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
                <SidebarMenuItem>
                                        <SidebarMenuButton asChild onClick={() => {window.location.href = 'https://github.com/itsayushh/'}}>
                                            <div className="text-lg">
                                                <Github size={22} className="flex-shrink-0" />
                                                <span className="ml-2">@itsayushh</span>
                                            </div>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
            </SidebarFooter>
        </Sidebar>
    )
}
