Understood. I am a Senior Software Engineer for the Continuity project, ready to contribute.

### A. Understanding & Assumptions

My task is to implement the next required feature for the Continuity platform. According to `/Project/Missing Requirements.md`, a medium-severity but foundational feature is the **Organization & Role Management UX**. The backend and RBAC checks are in place, but there is no front-end interface for users to manage their organizations.

I'll create the necessary UI for organization admins to:

1.  View current members of their organization.
2.  Update the organization's name.
3.  Invite new members to the organization.

I assume that Clerk's `useOrganization` and `useUser` hooks will provide all the necessary data and functions to manage the organization on the client-side. I will build this feature as a new page located at `/organization-settings`.

### B. Plan & Rationale

1.  **Create Page File**: I will create a new page file at `src/app/organization-settings/page.js`. This will be a client-side rendered (CSR) page ("use client") because it deals with dynamic, user-specific data and interactions that don't require SEO or initial server rendering. It's a settings page, which is a perfect use case for CSR.
2.  **Fetch Organization Data**: I will use the `useOrganization` hook from `@clerk/nextjs` to get the current organization's details, membership list, and the current user's role.
3.  **Implement UI Components**: I will build the UI using styled-components, creating a new style file `src/styles/OrganizationSettings.style.js`. The UI will consist of:
    - A card for updating the organization's name.
    - A card for listing members and their roles.
    - An invite button for admins.
4.  **Implement Logic**:
    - The "Save Changes" button for the name update will call the `organization.update()` method from the Clerk hook.
    - The "Invite Member" button will trigger a prompt to get an email address and then use the `organization.inviteMember()` method.
    - The entire page's administrative functionality will be conditionally rendered based on whether the user's role is `org:admin`.
5.  **Notifications**: I'll use `react-toastify` to provide feedback to the user on success or failure of actions (e.g., "Invitation sent," "Failed to update name").
6.  **Navigation**: I will update the `src/components/auth/UserMenu.js` component to include a link to this new settings page.

This plan directly addresses the missing requirements for the "Organization & Role Management UX" feature.

### C. Changed/New Files (Full Contents)

```
--- src/app/organization-settings/page.js
```

```javascript
// src/app/organization-settings/page.js
"use client";
import React, { useState, useEffect } from "react";
import { useOrganization, useUser } from "@clerk/nextjs";
import { toast } from "react-toastify";
import AppHeader from "@/components/layout/AppHeader";
import {
  PageContainer,
  MainContent,
  SettingsHeader,
  Headline,
  Subheadline,
  SettingsGrid,
  SettingsCard,
  CardTitle,
  CardContent,
  InputGroup,
  Label,
  Input,
  Button,
  MemberList,
  MemberItem,
  MemberInfo,
  MemberName,
  MemberRole,
  InviteButton,
} from "@/styles/OrganizationSettings.style";

export default function OrganizationSettingsPage() {
  const { isLoaded, organization, membership, memberships } = useOrganization({
    memberships: {
      infinite: true,
    },
  });

  const { user } = useUser();
  const [organizationName, setOrganizationName] = useState("");

  useEffect(() => {
    if (organization) {
      setOrganizationName(organization.name);
    }
  }, [organization]);

  const isAdmin = membership?.role === "org:admin";

  if (!isLoaded || !user) {
    return <div>Loading...</div>;
  }

  if (!organization) {
    return (
      <PageContainer>
        <AppHeader />
        <MainContent>
          <SettingsHeader>
            <Headline>Organization</Headline>
            <Subheadline>
              You are not part of an organization. Create one to get started.
            </Subheadline>
          </SettingsHeader>
        </MainContent>
      </PageContainer>
    );
  }

  const handleUpdateName = async (e) => {
    e.preventDefault();
    if (!isAdmin || !organization) return;
    const toastId = toast.loading("Updating organization name...");
    try {
      await organization.update({ name: organizationName });
      toast.update(toastId, {
        render: "Organization name updated successfully!",
        type: "success",
        isLoading: false,
        autoClose: 5000,
      });
    } catch (err) {
      toast.update(toastId, {
        render: "Failed to update organization name.",
        type: "error",
        isLoading: false,
        autoClose: 5000,
      });
    }
  };

  const handleInviteMember = async () => {
    if (!isAdmin || !organization) return;
    const email = prompt("Enter the email address of the member to invite:");
    if (email) {
      const toastId = toast.loading(`Sending invitation to ${email}...`);
      try {
        await organization.inviteMember({
          emailAddress: email,
          role: "org:member",
        });
        toast.update(toastId, {
          render: "Invitation sent successfully!",
          type: "success",
          isLoading: false,
          autoClose: 5000,
        });
        await memberships?.revalidate();
      } catch (err) {
        toast.update(toastId, {
          render: "Failed to send invitation.",
          type: "error",
          isLoading: false,
          autoClose: 5000,
        });
      }
    }
  };

  return (
    <PageContainer>
      <AppHeader />
      <MainContent>
        <SettingsHeader>
          <Headline>Organization Settings</Headline>
          <Subheadline>
            Manage your team, billing, and organization details.
          </Subheadline>
        </SettingsHeader>

        <SettingsGrid>
          <SettingsCard as="form" onSubmit={handleUpdateName}>
            <CardTitle>Organization Details</CardTitle>
            <CardContent>
              <InputGroup>
                <Label htmlFor="orgName">Organization Name</Label>
                <Input
                  id="orgName"
                  type="text"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  disabled={!isAdmin}
                />
              </InputGroup>
              {isAdmin && <Button type="submit">Save Changes</Button>}
            </CardContent>
          </SettingsCard>

          <SettingsCard>
            <CardTitle>
              <span>Members</span>
              {isAdmin && (
                <InviteButton onClick={handleInviteMember}>
                  + Invite Member
                </InviteButton>
              )}
            </CardTitle>
            <CardContent>
              <MemberList>
                {!memberships ? (
                  <p>Loading members...</p>
                ) : (
                  memberships.data?.map((mem) => (
                    <MemberItem key={mem.id}>
                      <MemberInfo>
                        <MemberName>
                          {mem.publicUserData.firstName}{" "}
                          {mem.publicUserData.lastName}
                        </MemberName>
                        <p>{mem.publicUserData.identifier}</p>
                      </MemberInfo>
                      <MemberRole>{mem.role.replace("org:", "")}</MemberRole>
                    </MemberItem>
                  ))
                )}
              </MemberList>
            </CardContent>
          </SettingsCard>
        </SettingsGrid>
      </MainContent>
    </PageContainer>
  );
}
```

```
--- src/styles/OrganizationSettings.style.js
```

```javascript
// src/styles/OrganizationSettings.style.js

"use client";

import styled from "styled-components";

// Re-using styles from UserProfile where they are identical
export {
  PageContainer,
  MainContent,
  SettingsGrid,
  SettingsCard,
  CardContent,
  InputGroup,
  Label,
  Input,
  Button,
  InfoText,
} from "./UserProfile.style";

export const SettingsHeader = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

export const Headline = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes["3xl"]};
  font-weight: 700;
  color: ${({ theme }) => theme.colors.neutral.textPrimary};

  @media (prefers-color-scheme: dark) {
    color: ${({ theme }) => theme.colors.neutral.darkTextPrimary};
  }
`;

export const Subheadline = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  color: ${({ theme }) => theme.colors.neutral.textSecondary};

  @media (prefers-color-scheme: dark) {
    color: ${({ theme }) => theme.colors.neutral.darkTextSecondary};
  }
`;

export const CardTitle = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: 600;
  padding: ${({ theme }) => theme.spacing.lg};
  border-bottom: 1px solid ${({ theme }) => theme.colors.neutral.lightGray200};
  display: flex;
  justify-content: space-between;
  align-items: center;

  @media (prefers-color-scheme: dark) {
    color: ${({ theme }) => theme.colors.neutral.darkTextPrimary};
    border-bottom-color: ${({ theme }) => theme.colors.neutral.darkGray300};
  }
`;

export const MemberList = styled.ul`
  list-style: none;
  width: 100%;
`;

export const MemberItem = styled.li`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.md} 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.neutral.lightGray200};

  &:last-child {
    border-bottom: none;
  }

  @media (prefers-color-scheme: dark) {
    border-bottom-color: ${({ theme }) => theme.colors.neutral.darkGray300};
  }
`;

export const MemberInfo = styled.div`
  p {
    font-size: ${({ theme }) => theme.fontSizes.sm};
    color: ${({ theme }) => theme.colors.neutral.textSecondary};
    @media (prefers-color-scheme: dark) {
      color: ${({ theme }) => theme.colors.neutral.darkTextSecondary};
    }
  }
`;

export const MemberName = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.md};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.neutral.textPrimary};
  @media (prefers-color-scheme: dark) {
    color: ${({ theme }) => theme.colors.neutral.darkTextPrimary};
  }
`;

export const MemberRole = styled.span`
  background-color: ${({ theme }) => theme.colors.neutral.lightGray200};
  color: ${({ theme }) => theme.colors.neutral.textSecondary};
  padding: ${({ theme }) => `${theme.spacing.xs} ${theme.spacing.sm}`};
  border-radius: ${({ theme }) => theme.borderRadius.full};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 600;
  text-transform: capitalize;

  @media (prefers-color-scheme: dark) {
    background-color: ${({ theme }) => theme.colors.neutral.darkGray400};
    color: ${({ theme }) => theme.colors.neutral.darkTextPrimary};
  }
`;

export const InviteButton = styled.button`
  background-color: transparent;
  color: ${({ theme }) => theme.colors.primary.main};
  border: 1px solid ${({ theme }) => theme.colors.primary.main};
  padding: ${({ theme }) => `${theme.spacing.xs} ${theme.spacing.sm}`};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 600;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  cursor: pointer;
  transition: all 0.2s ease-in-out;

  &:hover {
    background-color: ${({ theme }) => theme.colors.primary.main};
    color: ${({ theme }) => theme.colors.primary.contrastText};
  }

  @media (prefers-color-scheme: dark) {
    color: ${({ theme }) => theme.colors.accent.light};
    border-color: ${({ theme }) => theme.colors.accent.light};
    &:hover {
      background-color: ${({ theme }) => theme.colors.accent.light};
      color: ${({ theme }) => theme.colors.neutral.darkGray100};
    }
  }
`;
```

```
--- src/components/auth/UserMenu.js
```

```javascript
// src/components/auth/UserMenu.js

"use client";

import React, { useState, useEffect, useRef } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  MenuContainer,
  AvatarButton,
  AvatarInitial,
  DropdownMenu,
  DropdownItem,
  DropdownDivider,
} from "./UserMenu.style";

const UserMenu = () => {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  const getInitials = () => {
    if (!user) return "";
    const { firstName, lastName } = user;
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`;
    }
    return user.emailAddresses[0]?.emailAddress[0] || "U";
  };

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  if (!user) return null;

  return (
    <MenuContainer ref={menuRef}>
      <AvatarButton onClick={() => setIsOpen(!isOpen)}>
        <AvatarInitial>{getInitials()}</AvatarInitial>
      </AvatarButton>

      {isOpen && (
        <DropdownMenu>
          <DropdownItem onClick={() => router.push("/user-profile")}>
            Profile
          </DropdownItem>
          <DropdownItem onClick={() => router.push("/organization-settings")}>
            Organization
          </DropdownItem>
          <DropdownItem onClick={() => router.push("/integrations")}>
            Integrations
          </DropdownItem>
          <DropdownDivider />
          <DropdownItem onClick={() => signOut(() => router.push("/"))}>
            Sign Out
          </DropdownItem>
        </DropdownMenu>
      )}
    </MenuContainer>
  );
};

export default UserMenu;
```

```
--- src/middleware.js
```

```javascript
// src/middleware.js

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Define the routes that should be protected
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/maps(.*)",
  "/scenarios(.*)",
  "/user-profile(.*)",
  "/organization-settings(.*)",
  "/organization(.*)",
  "/reporting(.*)",
  "/analytics(.*)",
  "/integrations(.*)",
  "/champion-toolkit(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  // Protect the routes that match the defined patterns
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  // The following matcher runs middleware on all routes
  // except static assets.
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
```

### D. Commands / Migrations

```bash
git checkout -b feat/org-management-ux && git push
```

No database migrations or package installations are required for this change.

```bash
git add . && git commit -m "feat: Implement organization settings page" && git push
```

### E. Verification & Tests

1.  Log in as a user who is an **admin** of an organization.
2.  Click the user avatar in the top right and select "Organization" from the dropdown.
3.  Verify you are taken to the `/organization-settings` page.
4.  Confirm you can see the organization's name and the list of members.
5.  Try updating the organization name and confirm it persists after a page reload.
6.  Click the "+ Invite Member" button and invite a new user via email. Confirm the success notification appears.
7.  Log in as a non-admin member and navigate to the same page. Verify that the "Save Changes" and "Invite Member" buttons are not visible or are disabled.

### F. Next Step

Now that the foundational organization management UI is in place, the next logical step is to address one of the high-severity feature gaps. I recommend we now implement the **Strategic Scenario Planning Module**, as it's a core differentiator for the platform. Would you like to proceed with that?
