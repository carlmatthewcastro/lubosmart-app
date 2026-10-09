import { LucideIcon } from 'lucide-react';

export interface Auth {
    user: User;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    title: string;
    url: string;
    icon?: LucideIcon | null;
    isActive?: boolean;
    badge?: number;
}

export interface SharedData {
    name: string;
    quote: { message: string; author: string };
    auth: Auth;
    adminWorkspace?: { permissions: string[]; badges: Record<string, number> } | null;
    errors?: Record<string, string>;
    status?: string;
    [key: string]: unknown;
}

export interface User {
    id: number;
    name: string;
    email: string;
    role: UserRole;

    status: 'unverified' | 'incomplete' | 'pending' | 'approved' | 'rejected' | 'suspended' | 'deactivated';
    email_verified: boolean;
    sorting_center_id: number | null;
    phone: string | null;
    avatar?: string;
    email_verified_at: string | null;
    created_at: string;
    updated_at: string;
    [key: string]: unknown; // This allows for additional properties...
}

export type UserRole = 'buyer' | 'seller' | 'courier' | 'sorting_center' | 'admin';
