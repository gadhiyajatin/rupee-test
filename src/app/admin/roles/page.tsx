

'use client';

import { ArrowLeft, UserCog, Shield, Eye, PencilLine, ServerCrash, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface RoleInfo {
    icon: React.ReactNode;
    title: 'Owner' | 'Admin' | 'Viewer' | 'Data Operator';
    description: string;
    permissions: string[];
}

const rolesData: RoleInfo[] = [
    {
        icon: <UserCog className="h-8 w-8 text-primary" />,
        title: 'Owner',
        description: 'The highest level of authority with full control over the entire application.',
        permissions: [
            'Workspace & Book Management: Create, rename, and delete any workspace or RupeeBook.',
            'User Management: Create, edit, and delete Admins, Viewers, and Data Operators.',
            'Hierarchical View: See which Admins have created which sub-accounts (Viewers/Operators).',
            'Full Data Access: Access to all data and settings, including the "Danger Zone" for resetting the application.',
            'Member Sharing: Can share books with any other member and assign them a role.',
        ],
    },
    {
        icon: <Shield className="h-8 w-8 text-blue-500" />,
        title: 'Admin',
        description: 'A trusted manager who can manage their own workspaces, books, and a team of users.',
        permissions: [
            'Workspace & Book Management: Create, rename, and delete their own workspaces and RupeeBooks.',
            'User Creation: Can create and manage new Viewer and Data Operator members.',
            'Data Management: Full control over entries (add, edit, delete) in books they own or are shared with them as an Admin.',
            'Privacy: Cannot see or manage workspaces, books, or members created by the Owner or other Admins unless explicitly shared.',
            'Account Security: Cannot delete their own account.',
        ],
    },
    {
        icon: <Eye className="h-8 w-8 text-green-500" />,
        title: 'Viewer',
        description: 'A read-only role, perfect for someone who needs to see data but not change it.',
        permissions: [
            'View Only: Can see all entries and balances within books that are explicitly shared with them.',
            'Generate Reports: Can view and generate all reports for their assigned books.',
            'No Modifications: Cannot add, edit, or delete any transactions or settings.',
            'No Creation: Cannot create new workspaces or RupeeBooks.',
        ],
    },
    {
        icon: <PencilLine className="h-8 w-8 text-orange-500" />,
        title: 'Data Operator',
        description: 'A specialized role for data entry with specific, customizable restrictions.',
        permissions: [
            'Add Entries: Their primary job is to add new "Cash In" and "Cash Out" transactions to shared books.',
            'No Creation: Cannot create new workspaces or RupeeBooks.',
            'Limited Access: Cannot delete entries created by others.',
            'Customizable Permissions: The Owner can restrict their ability to:',
            '- Add backdated entries.',
            '- See net balances and reports.',
            '- View entries created by other members.',
            '- Edit entries.',
        ],
    },
];

const RoleCard = ({ role }: { role: RoleInfo }) => (
    <Card>
        <CardHeader className="flex flex-row items-start gap-4 space-y-0">
            <div className="mt-1">{role.icon}</div>
            <div className='flex-1'>
                <CardTitle>{role.title}</CardTitle>
                <CardDescription>{role.description}</CardDescription>
            </div>
        </CardHeader>
        <CardContent>
            <div className="space-y-2">
                <h4 className="font-semibold text-sm">Key Permissions:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    {role.permissions.map((permission, index) => (
                        <li key={index}>{permission}</li>
                    ))}
                </ul>
            </div>
        </CardContent>
    </Card>
);

export default function RolesAndPermissionsPage() {
    return (
        <div className="flex flex-col h-screen bg-muted/40">
            <header className="flex items-center gap-2 p-2 border-b bg-background sticky top-0 z-10">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/admin/settings">
                        <ArrowLeft />
                    </Link>
                </Button>
                <h1 className="text-lg font-bold">Roles &amp; Permissions</h1>
            </header>
            <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                {rolesData.map(role => (
                    <RoleCard key={role.title} role={role} />
                ))}

                 <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>General Notes</AlertTitle>
                    <AlertDescription>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                            <li>Roles operate in a hierarchy: Owner > Admin > Viewer/Data Operator.</li>
                            <li>Access to any RupeeBook is granted only through explicit sharing by an Owner or an Admin of that book. A user cannot see any data they have not been specifically given access to.</li>
                        </ul>
                    </AlertDescription>
                </Alert>
            </main>
        </div>
    );
}
