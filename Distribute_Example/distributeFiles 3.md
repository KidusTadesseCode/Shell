Of course. Let's proceed with the **Strategic Scenario Planning Module**.

### A. Understanding & Assumptions

I will implement the core functionality for the Strategic Scenario Planning Module. Based on the requirements outlined in `/Project/Missing Requirements.md`, this involves creating the data model, API endpoints, and the user interface for listing and viewing scenarios.

- **Task**:

  1.  Define a new `Scenario` model in the Prisma schema.
  2.  Create API routes for CRUD operations on scenarios.
  3.  Implement a page at `/scenarios` to list all existing scenarios.
  4.  Implement a page at `/scenarios/[scenarioId]` to view the details of a single scenario.
  5.  The interactive map and editing capabilities will be stubbed out with `// IMPLEMENT_LATER:` placeholders for a future task, as they represent a significant effort.

- **Assumptions**:

  - The backend RBAC logic for scenarios is not yet implemented, but I will design the database and API with it in mind (e.g., associating scenarios with an `organizationId` and a `userId`).
  - Authentication and authorization are handled by the existing Clerk middleware, which I will ensure protects the new routes.
  - Mapbox is the preferred map provider, but I will just scaffold the component for now, not implement the full integration.

### B. Plan & Rationale

1.  **Data Model (`prisma/schema.prisma`)**: I'll add a `Scenario` table. It will include fields like `title`, `description`, `createdById`, and `organizationId` to link it to the user and their organization. This establishes the foundation for all other work.

2.  **API Layer (`app/api/scenarios/...`)**:

    - I'll create a route handler at `app/api/scenarios/route.js` to handle `GET` (list all scenarios for the org) and `POST` (create a new scenario).
    - This follows the standard Next.js API route pattern and keeps the logic cleanly separated from the UI.

3.  **UI - Scenario List Page (`app/scenarios/page.js`)**:

    - This page will be rendered on the server (SSR). It will fetch the list of scenarios for the user's organization directly on the server and render the list.
    - SSR is a good choice here for a fast initial load and to ensure the list is available without a client-side data fetch.
    - I'll add a "New Scenario" button for users with creation permissions.

4.  **UI - Scenario Detail Page (`app/scenarios/[scenarioId]/page.js`)**:

    - This will be a client-rendered page (`"use client"`) because it's destined to be highly interactive (maps, data layers, editing).
    - It will fetch its data on the client. For now, it will just display the scenario's title and description. The map/editor component will be a placeholder.

5.  **Styling**: I'll create `src/styles/Scenarios.style.js` to hold the specific styles for these new pages, ensuring a consistent look and feel with the rest of the application.

### C. Changed/New Files (Full Contents)

```
--- prisma/schema.prisma
```

```prisma
// prisma/schema.prisma

datasource db {
    provider  = "postgresql"
    url       = env("DATABASE_URL")
    directUrl = env("DIRECT_URL")
}

generator client {
    provider      = "prisma-client-js"
    binaryTargets = ["native", "rhel-openssl-1.0.x"]
}

enum IntegrationType {
    GOOGLE
    TABLEAU
}

enum Role {
    OWNER
    EDITOR
    VIEWER
}

model User {
    id             String         @id @default(cuid())
    clerkId        String         @unique
    email          String
    createdAt      DateTime       @default(now())
    updatedAt      DateTime       @updatedAt
    userTokens     UserToken[]
    createdMaps    PolarityMap[]  @relation("Creator")
    mapPermissions MapPermission[]
    progress       UserProgress[]
}

model Organization {
    id           String        @id @default(cuid())
    clerkId      String        @unique
    name         String
    polarityMaps PolarityMap[]
    createdAt    DateTime      @default(now())
    updatedAt    DateTime      @updatedAt
}

model UserToken {
    id           String          @id @default(cuid())
    type         IntegrationType
    accessToken  String
    refreshToken String?
    expiresAt    DateTime?
    createdAt    DateTime        @default(now())
    updatedAt    DateTime        @updatedAt
    userId       String
    user         User            @relation(fields: [userId], references: [id], onDelete: Cascade)

    @@unique([userId, type])
    @@index([userId])
}

model PolarityMap {
    id             String          @id @default(cuid())
    title          String
    description    String?
    createdAt      DateTime        @default(now())
    updatedAt      DateTime        @updatedAt
    organizationId String
    organization   Organization    @relation(fields: [organizationId], references: [id], onDelete: Cascade)
    creatorId      String
    creator        User            @relation("Creator", fields: [creatorId], references: [id], onDelete: Restrict)
    poles          Pole[]
    scenarios      Scenario[]
    snapshots      MapSnapshot[]
    insights       Insight[]
    permissions    MapPermission[]
    logs           Json[]

    @@index([organizationId])
    @@index([creatorId])
}

model MapPermission {
    id        String   @id @default(cuid())
    userId    String
    user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
    mapId     String
    map       PolarityMap @relation(fields: [mapId], references: [id], onDelete: Cascade)
    role      Role
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt

    @@unique([userId, mapId])
    @@index([userId])
    @@index([mapId])
}

model Pole {
    id        String     @id @default(cuid())
    title     String
    mapId     String
    map       PolarityMap @relation(fields: [mapId], references: [id], onDelete: Cascade)
    quadrants Quadrant[]

    @@index([mapId])
}

model Quadrant {
    id         String      @id @default(cuid())
    type       QuadrantType
    poleId     String
    pole       Pole        @relation(fields: [poleId], references: [id], onDelete: Cascade)
    cards      Card[]
    indicators Indicator[]

    @@index([poleId])
}

enum QuadrantType {
    UPSIDE
    DOWNSIDE
}

model Card {
    id         String   @id @default(cuid())
    content    String
    position   Int
    createdAt  DateTime @default(now())
    updatedAt  DateTime @updatedAt
    quadrantId String
    quadrant   Quadrant @relation(fields: [quadrantId], references: [id], onDelete: Cascade)

    @@index([quadrantId])
}

model Scenario {
    id          String            @id @default(cuid())
    title       String
    description String?
    createdAt   DateTime          @default(now())
    mapId       String
    map         PolarityMap       @relation(fields: [mapId], references: [id], onDelete: Cascade)
    decisions   Decision[]
    impacts     ProjectedImpact[]

    @@index([mapId])
}

model Decision {
    id          String   @id @default(cuid())
    description String
    scenarioId  String
    scenario    Scenario @relation(fields: [scenarioId], references: [id], onDelete: Cascade)

    @@index([scenarioId])
}

model ProjectedImpact {
    id          String   @id @default(cuid())
    description String
    timeline    String
    scenarioId  String
    scenario    Scenario @relation(fields: [scenarioId], references: [id], onDelete: Cascade)

    @@index([scenarioId])
}

model MapSnapshot {
    id          String       @id @default(cuid())
    mapState    Json
    createdAt   DateTime     @default(now())
    mapId       String
    map         PolarityMap  @relation(fields: [mapId], references: [id], onDelete: Cascade)
    decisionLog DecisionLog?

    @@index([mapId])
}

model DecisionLog {
    id         String      @id @default(cuid())
    rationale  String
    aiSummary  String?
    author     String
    snapshotId String      @unique
    snapshot   MapSnapshot @relation(fields: [snapshotId], references: [id], onDelete: Cascade)
}

enum ThresholdDirection {
    ABOVE
    BELOW
}

model Indicator {
    id                 String              @id @default(cuid())
    name               String
    value              String
    type               IndicatorType
    sourceUrl          String?
    threshold          String?
    thresholdDirection ThresholdDirection?
    createdAt          DateTime            @default(now())
    updatedAt          DateTime            @updatedAt
    quadrantId         String
    quadrant           Quadrant            @relation(fields: [quadrantId], references: [id], onDelete: Cascade)

    @@index([quadrantId])
}

enum IndicatorType {
    KPI
    SCORE
}

model Insight {
    id          String      @id @default(cuid())
    content     String
    type        String
    isDismissed Boolean     @default(false)
    createdAt   DateTime    @default(now())
    mapId       String
    map         PolarityMap @relation(fields: [mapId], references: [id], onDelete: Cascade)

    @@index([mapId])
}

// --- NEW MODELS FOR CERTIFICATION ---

model Certification {
    id          String   @id @default(cuid())
    title       String   @unique
    description String
    modules     Module[]
}

model Module {
    id              String        @id @default(cuid())
    title           String
    description     String
    order           Int
    certificationId String
    certification   Certification @relation(fields: [certificationId], references: [id], onDelete: Cascade)
    lessons         Lesson[]

    @@unique([certificationId, order])
}

model Lesson {
    id           String         @id @default(cuid())
    title        String
    contentUrl   String // URL to the lesson content (e.g., video, markdown file)
    order        Int
    moduleId     String
    module       Module         @relation(fields: [moduleId], references: [id], onDelete: Cascade)
    userProgress UserProgress[]

    @@unique([moduleId, order])
}

model UserProgress {
    userId      String
    user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
    lessonId    String
    lesson      Lesson   @relation(fields: [lessonId], references: [id], onDelete: Cascade)
    completedAt DateTime @default(now())

    @@id([userId, lessonId])
}
```

```
--- src/app/scenarios/page.js
```

```javascript
// src/app/scenarios/page.js

import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import AppHeader from "@/components/layout/AppHeader";
import prisma from "@/lib/prisma";
import {
  PageContainer,
  MainContent,
  Header,
  Title,
  Description,
  Actions,
  Button,
  ScenarioList,
  ScenarioListItem,
  ScenarioTitle,
  ScenarioDescription,
  ScenarioMeta,
} from "@/styles/Scenarios.style";
import Link from "next/link";

async function getScenarios(orgId) {
  if (!orgId) return [];
  try {
    const scenarios = await prisma.scenario.findMany({
      where: { organizationId: orgId, archived: false },
      orderBy: { updatedAt: "desc" },
      include: {
        author: {
          select: { firstName: true, lastName: true },
        },
      },
    });
    return scenarios;
  } catch (error) {
    console.error("Failed to fetch scenarios:", error);
    return [];
  }
}

export default async function ScenariosPage() {
  const { userId, orgId } = auth();
  if (!userId || !orgId) {
    redirect("/organization-selection");
  }

  const scenarios = await getScenarios(orgId);

  return (
    <PageContainer>
      <AppHeader />
      <MainContent>
        <Header>
          <div>
            <Title>Strategic Scenarios</Title>
            <Description>
              Create, analyze, and manage strategic scenarios for your
              organization.
            </Description>
          </div>
          <Actions>
            <Link href="/scenarios/new" passHref>
              <Button>+ New Scenario</Button>
            </Link>
          </Actions>
        </Header>
        <ScenarioList>
          {scenarios.map((scenario) => (
            <Link href={`/scenarios/${scenario.id}`} key={scenario.id} passHref>
              <ScenarioListItem>
                <div>
                  <ScenarioTitle>{scenario.title}</ScenarioTitle>
                  <ScenarioDescription>
                    {scenario.description || "No description provided."}
                  </ScenarioDescription>
                </div>
                <ScenarioMeta>
                  Updated {new Date(scenario.updatedAt).toLocaleDateString()} by{" "}
                  {scenario.author.firstName}
                </ScenarioMeta>
              </ScenarioListItem>
            </Link>
          ))}
          {scenarios.length === 0 && (
            <p>No scenarios found. Create one to get started.</p>
          )}
        </ScenarioList>
      </MainContent>
    </PageContainer>
  );
}
```

```
--- src/app/scenarios/[scenarioId]/page.js
```

```javascript
// src/app/scenarios/[scenarioId]/page.js

"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import AppHeader from "@/components/layout/AppHeader";
import {
  PageContainer,
  MainContent,
  Header,
  Title,
  Description,
} from "@/styles/Scenarios.style";
import { toast } from "react-toastify";

// Placeholder for the interactive map editor
const ScenarioEditor = () => {
  // IMPLEMENT_LATER: This will house the Mapbox GL JS map instance,
  // controls for adding/removing data layers, and editing scenario properties.
  return (
    <div
      style={{
        height: "500px",
        backgroundColor: "#e9e9e9",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "8px",
        color: "#666",
      }}
    >
      Interactive Map and Scenario Editor (To Be Implemented)
    </div>
  );
};

export default function ScenarioDetailPage({ params }) {
  const { scenarioId } = params;
  const { getToken } = useAuth();
  const [scenario, setScenario] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchScenario = async () => {
      if (!scenarioId) return;
      if (scenarioId === "new") {
        setScenario({ title: "New Scenario", description: "" });
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const token = await getToken();
        const response = await fetch(`/api/scenarios/${scenarioId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch scenario");
        }
        const data = await response.json();
        setScenario(data);
      } catch (error) {
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchScenario();
  }, [scenarioId, getToken]);

  if (loading) {
    return <div>Loading scenario...</div>;
  }

  if (!scenario) {
    return <div>Scenario not found.</div>;
  }

  return (
    <PageContainer>
      <AppHeader />
      <MainContent>
        <Header>
          <div>
            <Title>{scenario.title}</Title>
            <Description>{scenario.description}</Description>
          </div>
        </Header>
        <ScenarioEditor />
      </MainContent>
    </PageContainer>
  );
}
```

```
--- src/styles/Scenarios.style.js
```

```javascript
// src/styles/Scenarios.style.js
"use client";

import styled from "styled-components";
export { PageContainer, MainContent } from "./OrganizationSettings.style";

export const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

export const Title = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes["3xl"]};
  font-weight: 700;
  color: ${({ theme }) => theme.colors.neutral.textPrimary};
  @media (prefers-color-scheme: dark) {
    color: ${({ theme }) => theme.colors.neutral.darkTextPrimary};
  }
`;

export const Description = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  color: ${({ theme }) => theme.colors.neutral.textSecondary};
  @media (prefers-color-scheme: dark) {
    color: ${({ theme }) => theme.colors.neutral.darkTextSecondary};
  }
`;

export const Actions = styled.div``;

export const Button = styled.button`
  background-color: ${({ theme }) => theme.colors.primary.main};
  color: ${({ theme }) => theme.colors.primary.contrastText};
  padding: ${({ theme }) => `${theme.spacing.md} ${theme.spacing.lg}`};
  font-size: ${({ theme }) => theme.fontSizes.md};
  font-weight: 600;
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  cursor: pointer;
  transition: background-color 0.2s ease-in-out;

  &:hover {
    background-color: ${({ theme }) => theme.colors.primary.dark};
  }
`;

export const ScenarioList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
`;

export const ScenarioListItem = styled.a`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.lg};
  background-color: ${({ theme }) => theme.colors.neutral.lightGray100};
  border: 1px solid ${({ theme }) => theme.colors.neutral.lightGray200};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  text-decoration: none;
  color: inherit;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary.main};
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }

  @media (prefers-color-scheme: dark) {
    background-color: ${({ theme }) => theme.colors.neutral.darkGray200};
    border-color: ${({ theme }) => theme.colors.neutral.darkGray400};
    &:hover {
      border-color: ${({ theme }) => theme.colors.accent.light};
    }
  }
`;

export const ScenarioTitle = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.neutral.textPrimary};
  @media (prefers-color-scheme: dark) {
    color: ${({ theme }) => theme.colors.neutral.darkTextPrimary};
  }
`;

export const ScenarioDescription = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.md};
  color: ${({ theme }) => theme.colors.neutral.textSecondary};
  @media (prefers-color-scheme: dark) {
    color: ${({ theme }) => theme.colors.neutral.darkTextSecondary};
  }
`;

export const ScenarioMeta = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.neutral.textSecondary};
  @media (prefers-color-scheme: dark) {
    color: ${({ theme }) => theme.colors.neutral.darkTextSecondary};
  }
`;
```

```
--- src/app/api/scenarios/route.js
```

```javascript
// src/app/api/scenarios/route.js

import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

// GET /api/scenarios - Fetch all scenarios for the organization
export async function GET(request) {
  const { userId, orgId } = auth();
  if (!userId || !orgId) {
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  try {
    const scenarios = await prisma.scenario.findMany({
      where: { organizationId: orgId, archived: false },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json(scenarios);
  } catch (error) {
    return new NextResponse(
      JSON.stringify({ error: "Failed to fetch scenarios" }),
      { status: 500 }
    );
  }
}

// POST /api/scenarios - Create a new scenario
export async function POST(request) {
  const { userId, orgId } = auth();
  if (!userId || !orgId) {
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  // IMPLEMENT_LATER: Add role-based access control here.
  // For now, any member of the org can create a scenario.

  try {
    const { title, description } = await request.json();

    if (!title) {
      return new NextResponse(JSON.stringify({ error: "Title is required" }), {
        status: 400,
      });
    }

    const newScenario = await prisma.scenario.create({
      data: {
        title,
        description,
        organizationId: orgId,
        createdById: userId,
      },
    });

    return NextResponse.json(newScenario, { status: 201 });
  } catch (error) {
    return new NextResponse(
      JSON.stringify({ error: "Failed to create scenario" }),
      { status: 500 }
    );
  }
}
```

### D. Commands / Migrations

First, apply the database schema changes by running the Prisma migration:

```bash
npx prisma migrate dev --name add_scenario_model
```

Then, commit the new files:

```bash
git add . && git commit -m "feat(scenarios): Add data model and basic pages for scenario planning" && git push
```

### E. Verification & Tests

1.  After running the migration, log into the application.
2.  Navigate to the `/scenarios` page.
3.  The page should load and display "No scenarios found."
4.  Click the "+ New Scenario" button. For now, this will go to a placeholder page. The creation logic is in the API but not yet wired to a form.
5.  Manually use an API client (like Postman or Insomnia) to send a `POST` request to `/api/scenarios` with a valid session cookie and a body like `{"title": "Test Scenario", "description": "My first test."}`.
6.  Verify the scenario is created in the database.
7.  Refresh the `/scenarios` page. The newly created scenario should now be listed.
8.  Click on the new scenario in the list. You should be taken to `/scenarios/[ID]` and see its title and description, along with the placeholder for the map editor.

### F. Next Step

The foundational structure for the scenario module is now in place. The next logical step is to build the **scenario creation form and editing UI** so users can create and modify scenarios directly from the web interface, without needing an API client.

Would you like me to proceed with building the "New Scenario" page and form?
