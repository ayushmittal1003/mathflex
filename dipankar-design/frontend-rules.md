# MathFlex Frontend Rules

**Website redesign: frontend-only development and backend protection**

> Read this file before every task. These rules apply to all work on this repository alongside `design.md`. When a rule here conflicts with a convenience, the rule wins.

---

## 1. Project context

MathFlex.in is an educational platform for IIT JEE and JEE Main mathematics.

The website already has a working frontend and backend, including:

- Existing backend logic and APIs
- Admin dashboard for managing website content
- Video upload and video management
- Bunny Stream integration for video hosting and playback
- Cashfree payment gateway integration
- Payment verification and order processing
- Database and content management
- Vercel hosting, deployments, environment variables and configuration
- Authentication, access control and other backend functionality

A new frontend design has been created using Claude Design. The job is to implement this new design while retaining all existing backend functionality.

**Objective:** replace the visual design of the website without breaking, rebuilding or unnecessarily modifying the existing backend.

**Ownership:** Dipankar handles the frontend. Ayush handles the backend and admin. Anything that needs backend or admin work must be reported to Dipankar first, so it can be handed to Ayush.

---

## 2. Golden rule: frontend changes only

> Modify only the frontend presentation and user interface. Do not modify the existing backend, database, APIs, admin panel, payment gateway, video hosting, deployment configuration or production infrastructure unless a specific change is explicitly approved in writing.

The existing backend is the source of truth. The new frontend must connect to it, not replace it.

---

## 3. Strictly protected components

These must continue working exactly as they do now.

### A. Backend and APIs

- API endpoints and HTTP methods
- Request and response formats
- API authentication and authorization
- Business logic and validation
- Database queries and data models
- File upload and retrieval
- Error handling
- Server-side processing

Do not rewrite, rename, remove or replace existing APIs. Do not create duplicate APIs for functionality that already exists.

### B. Admin dashboard

- Admin login and authentication
- Admin routes and pages
- Content creation, editing and deletion
- Chapter, course, subject and video management
- File uploads and content publishing
- Admin permissions and workflows

The admin panel must remain functional and accessible. Do not redesign, restructure or modify it unless explicitly approved.

### C. Cashfree payment gateway

- Cashfree integration
- Test and production payment configurations
- Order creation and payment initiation
- Payment verification and callbacks
- Webhooks and server-side payment confirmation
- Successful and failed payment handling
- Subscription or course access after successful payment
- Transaction and order records

Do not change Cashfree credentials, environment variables, payment API endpoints, webhook URLs, order logic or payment verification logic.

**Never simulate a successful payment in production or bypass payment verification.**

### D. Bunny Stream and video hosting

- Bunny Stream configuration
- Video IDs and video URLs
- Video upload and storage workflows
- Video playback integration
- Database mapping between courses, chapters and videos
- Admin-to-frontend content synchronization

Do not change video storage, upload logic, video identifiers, access permissions or backend video management.

### E. Vercel and deployment infrastructure

- The existing Vercel project
- Production deployment and domain configuration
- Environment variables and secrets
- Build and deployment settings
- Serverless functions and API routes
- Rewrite and redirect rules
- Caching and revalidation configuration
- Deployment workflow

Do not delete files, create a new Vercel project, change production settings, remove environment variables or overwrite the production deployment configuration.

Do not clear, disable or modify caching globally to solve a frontend issue.

---

## 4. Frontend development scope

The following may be modified, provided existing functionality does not break:

- Page layouts and visual structure
- Colors, typography, spacing and styling
- Responsive design for desktop, tablet and mobile
- Navigation menus and header/footer design
- Homepage sections and banners
- Course cards, chapter cards and subject listings
- Buttons, forms, modals, tooltips and visual interactions
- Frontend components and reusable UI elements
- CSS, styling files and frontend-only assets
- Loading states, empty states and error messages
- Animations and visual transitions

Frontend components and presentation logic may be reorganized when necessary, but existing functionality must remain intact.

If a requested design requires changes to the backend, database schema, API contracts, authentication, payment processing, admin panel or infrastructure, **stop and explain the requirement before making any changes.**

---

## 5. The existing backend must power the new frontend

The new frontend must connect to the existing backend and use real, production-compatible data flows.

- Inspect the existing backend APIs and frontend integration before writing new code.
- Reuse existing API endpoints, services, authentication and data models.
- Replace temporary design placeholders with real data from the existing backend.
- Do not hardcode course names, chapters, video IDs, prices, banners or other content managed through the admin panel.
- Do not use mock data, fake APIs, local-only arrays or simulated responses as substitutes for existing backend functionality.
- Preserve the existing payment and video playback flows.
- Keep user sessions, authorization and access restrictions working.
- Preserve the current API response handling and error management.

### Required content synchronization

Changes made in the admin panel must appear on the new frontend through the existing backend:

- A new video uploaded in admin appears on the correct chapter or course page.
- A changed video ID or URL is used by the frontend.
- A new chapter appears in the appropriate listing.
- Updated course titles, descriptions, thumbnails and prices are reflected.
- New or updated banners, notes, PDFs and other managed content appear on the relevant pages.
- Publish/unpublish rules are respected.

Do not create a second content management system or a separate database for the redesigned frontend. The existing database and APIs are the single source of truth.

If caching prevents new content from appearing, investigate the existing cache and revalidation mechanisms first. Implement frontend-level refresh or narrowly scoped revalidation only where appropriate, without changing global infrastructure settings.

---

## 6. Mandatory initial audit before development

Before making code changes, inspect the project and document:

- Frontend framework and application structure
- Backend architecture
- API endpoints used by the frontend
- Admin panel location and functionality
- Authentication and authorization flow
- Database and content relationships
- Cashfree payment integration flow
- Bunny Stream integration flow
- File upload and storage flow
- Vercel configuration and deployment process
- Environment variables referenced by the application (names only, never values)
- Caching and revalidation mechanisms
- Pages and functionality that must be preserved

Then inspect the new design and prepare a mapping:

| New design page | Existing frontend page/component | Existing API or data source |
| --- | --- | --- |

Do not begin implementation until this audit is complete. If the architecture is unclear, do not guess, rebuild or replace anything. Ask for clarification.

---

## 7. Git, file changes and environment protection

- Work on the redesign branch (`feature/Dipankar`), never directly on `main` or the production branch.
- Preserve current production code and deployment as a rollback point.
- Make small, focused commits.
- Modify only the files necessary for the frontend redesign.
- Before editing an existing file, check whether it contains backend logic or infrastructure configuration.
- Do not modify backend files to make the new design easier to implement.
- Do not change dependency versions or project configuration unless absolutely necessary and approved.
- Never expose, copy or commit production secrets, API keys, payment credentials, webhook secrets or environment files.
- Do not delete files that appear unused without confirming their purpose.
- Do not merge into the production branch or deploy to production without approval.
- Use Vercel Preview Deployments for testing whenever possible. Keep the production website available during development.

---

## 8. Backend integration contract

Treat the existing backend as a stable service contract. Before connecting each frontend page, identify:

- The API endpoint or server action it uses
- Expected request parameters
- Expected response structure
- Authentication requirements
- Loading and error states
- How the data is refreshed
- Whether the page is public or requires authentication

If an API already provides the required functionality, use it as-is.

Do not rename response fields, alter request formats, change authentication requirements or modify API behavior to match the new UI. If the design needs a different presentation of the same data, transform the data in the frontend only.

If a feature cannot be implemented without changing the backend, report it and wait for approval.

---

## 9. Testing requirements

Verify all of the following before declaring the redesign complete.

### Frontend

- [ ] New design matches the approved reference
- [ ] Responsive layouts work on desktop and mobile
- [ ] Navigation, buttons, links and forms work
- [ ] Loading, empty and error states display correctly
- [ ] No broken images, missing assets or console errors
- [ ] Existing routes and deep links still work
- [ ] Light and dark mode both work

### Backend and admin

- [ ] Admin login still works
- [ ] Admin pages remain accessible
- [ ] New content uploaded through admin appears on the frontend
- [ ] Updated content is reflected correctly
- [ ] Existing content remains intact
- [ ] File uploads and content retrieval still work

### Payments

- [ ] Cashfree checkout launches correctly
- [ ] Payment status is verified through the existing backend
- [ ] Successful payments grant the correct access or purchase state
- [ ] Failed, cancelled and pending payments are handled correctly
- [ ] No duplicate orders or unintended transactions are created

Use the Cashfree test environment or approved test procedures. Do not create unnecessary live transactions.

### Video

- [ ] Existing videos play correctly
- [ ] New videos uploaded through admin display correctly
- [ ] Video-to-chapter mapping remains correct
- [ ] Access restrictions remain enforced

### Deployment

- [ ] Preview deployment builds successfully
- [ ] No production environment variables or deployment settings changed
- [ ] Production remains functional
- [ ] No backend endpoints or configuration files unintentionally modified

---

## 10. Required workflow for every major change

1. **Inspect** the existing implementation and identify the relevant frontend files.
2. **Explain** which files will be modified and confirm the changes are frontend-only.
3. **Implement** the approved UI changes while preserving APIs and business logic.
4. **Connect** redesigned components to existing APIs and real data.
5. **Test** locally or on a Vercel Preview Deployment.
6. **Verify** admin content updates, video playback, payment flows and other affected functionality.
7. **Summarise** changed files, tests performed, and any risks or issues.
8. **Wait** for approval before merging or deploying to production.

---

## 11. Rules for Claude during development

- Do not rebuild the website from scratch.
- Do not replace the existing backend with a new implementation.
- Do not introduce a new database, backend framework or payment gateway.
- Do not remove existing features to simplify the new design.
- Do not replace real data with mock data.
- Do not change environment variables or production configuration.
- Do not change existing API contracts.
- Do not bypass authentication, payment verification or access control.
- Do not make broad refactors outside the frontend scope.
- Do not silently fix backend problems by rewriting backend code. Report them for Ayush.
- Do not assume a successful frontend build means the website works correctly.
- If a change could affect a protected component, stop and ask for approval.
- When in doubt, preserve the existing implementation and ask before changing it.

---

## 12. Deliverables

At the end of the redesign, provide:

1. The completed frontend redesign
2. A list of all files created, modified and deleted
3. Confirmation that backend APIs and contracts are preserved
4. A summary of how each redesigned page connects to the existing backend
5. A report confirming admin content synchronization
6. A report confirming Bunny Stream video functionality
7. A report confirming the Cashfree integration remains intact
8. Desktop and mobile testing results
9. Identified issues, limitations or required approvals
10. A Vercel Preview Deployment link for review
11. Clear rollback instructions

---

## 13. Final acceptance criteria

The project is complete only when:

- [ ] The new frontend design is implemented
- [ ] The backend works without unauthorized modifications
- [ ] The admin panel works as before
- [ ] Admin changes flow to the frontend through the existing backend
- [ ] Videos, file uploads and content relationships are intact
- [ ] Cashfree payments and server-side verification work
- [ ] Authentication, authorization and access control are intact
- [ ] Vercel production configuration is unchanged unless explicitly approved
- [ ] No production data or functionality has been lost
- [ ] The Preview Deployment has been reviewed and approved before production release

---

## Final instruction

The job is to **redesign the frontend, not rebuild the platform.**

The existing backend, database, APIs, admin panel, payment gateway, video hosting and production infrastructure remain the source of truth. The new frontend must be a visual and user-experience upgrade that works seamlessly with the existing system. Every change must prioritise backward compatibility, data integrity, security and production stability.

Before starting any new piece of work, audit the relevant code, confirm the frontend-only scope, and share the proposed file-change plan. Make no code changes until that plan is approved.
