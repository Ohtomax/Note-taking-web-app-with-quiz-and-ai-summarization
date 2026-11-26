# AI-Powered Project-Based Note-Taking and Study Platform

## 1. Project Overview

I want to build a modern, secure, scalable, and maintainable AI-powered note-taking and study web application.

The application will allow users to organize their notes into project folders, generate AI-powered summaries, create interactive quizzes similar to the Gemini quiz experience, track their quiz history, retake quizzes, and analyze their learning performance.

Act as my senior full-stack developer, software architect, and development mentor. Help me design, plan, implement, test, secure, and deploy this application using professional software development practices.

We will follow a divide-and-conquer development approach by separating the entire project into exactly six development phases, with detailed and independently manageable tasks.

## 2. Technology Stack

### Frontend

- React with TypeScript
- Vite
- TanStack Query for server-side state management
- Zustand for global client-side state management
- Tailwind CSS for styling
- React Router for routing and navigation

### Backend

- Node.js
- Express.js
- TypeScript
- Prisma ORM for database models, queries, and migrations
- Zod for input, environment variable, and AI output validation
- RESTful API architecture
- MVC architecture with a service layer where appropriate

### Database and Authentication

- Supabase PostgreSQL
- Firebase Authentication
- Firebase Admin SDK

### Artificial Intelligence

- Recommend an appropriate AI provider, such as Gemini, OpenAI, or Groq.
- Compare providers based on pricing, free-tier availability, context window, response quality, structured output support, privacy, and reliability.
- Implement a dedicated AI integration service.
- Keep the AI provider interchangeable without unnecessary abstraction.
- Validate structured AI responses using Zod.
- Process all AI requests through the backend.

### Infrastructure and Deployment

- Vercel for frontend deployment
- Render for backend deployment
- Supabase for PostgreSQL database hosting
- Docker for backend containerization
- Git and GitHub for version control

Do not introduce additional technologies or dependencies unless they provide a clear benefit and are properly justified.

## 3. Core Application Features

### A. Authentication and User Management

Implement a simple and secure authentication system using Firebase Authentication.

Features:

- User registration
- User login
- User logout
- Forgot password
- Password reset
- Authentication persistence
- Protected frontend routes
- Protected backend API endpoints
- Firebase user synchronization with PostgreSQL
- Basic user profile management

Firebase must handle user credentials. Do not implement custom password storage or password hashing.

### B. Project Folder Management

The application must allow users to organize their notes using project folders.

Each project folder represents a particular subject, course, topic, or personal project.

For example:

- Computer Networking
  - OSI Model
  - TCP/IP Model
  - IP Addressing
  - Network Security
- Web Development
  - React Fundamentals
  - Express.js
  - PostgreSQL
- Software Engineering
  - System Architecture
  - Design Patterns

Each user must be able to:

- Create project folders.
- Rename project folders.
- Add folder descriptions.
- Customize folder colors or icons.
- View all owned project folders.
- Search project folders.
- Open individual project folders.
- View all notes within a project folder.
- View the number of notes inside each folder.
- View folder creation and modification dates.
- Archive and restore project folders.
- Delete project folders with confirmation.
- Generate AI summaries from project folders.
- Generate AI quizzes from project folders.
- Access project-specific summaries, quizzes, and analytics.

Every project folder must belong exclusively to its authenticated owner.

Define safe deletion behavior for folders containing notes, summaries, quizzes, and historical quiz attempts. Prevent accidental data loss.

Nested folders are not required for the initial version.

### C. Note Management

Each project folder can contain multiple individual note files.

Users must be able to:

- Create notes inside a project folder.
- View notes.
- Edit notes.
- Rename notes.
- Delete notes.
- Duplicate notes.
- Move notes between owned project folders.
- Search notes by title or content.
- Pin and unpin notes.
- Archive and restore notes.
- Sort notes by title, creation date, or last modified date.
- Automatically save note changes.
- View note creation and modification dates.
- Generate AI summaries from individual notes.
- Generate AI quizzes from individual notes.

The note editor should support basic rich-text formatting, including:

- Headings
- Paragraphs
- Bold
- Italic
- Underline
- Bullet lists
- Numbered lists
- Checklists
- Code blocks
- Blockquotes

Recommend a suitable note editor library if necessary.

Notes should be stored as structured content or another appropriate database representation. Explain the advantages and disadvantages of the selected storage format.

Prevent auto-save race conditions and accidental overwriting of newer note content.

### D. AI Summarizer

The AI summarizer must support three primary generation scopes.

**Individual Note Summarization**

- Generate a summary from a single note.
- Summarize selected portions of a note.
- Extract important concepts from the selected note.

**Multiple Note Summarization**

- Allow users to select multiple notes from a project folder.
- Generate a combined summary from the selected notes.
- Preserve references to the original source notes.

**Entire Project Folder Summarization**

- Retrieve eligible notes belonging to a selected project folder.
- Combine and process their content securely.
- Generate a comprehensive summary of the entire project.
- Organize information by topic where appropriate.
- Combine related concepts.
- Reduce unnecessary repetition.
- Identify important relationships between topics.
- Preserve references to source notes.
- Handle folders containing large amounts of content.

Users must be able to customize:

- Summary length: Short, Medium, or Detailed.
- Summary format: Paragraphs, bullet points, key concepts, or study guide.

Additional summarizer features:

- Generate summaries.
- Preview generated summaries.
- Regenerate summaries.
- Copy summaries.
- Edit generated summaries.
- Save summaries.
- Rename saved summaries.
- Delete summaries.
- View summary history.
- Identify the source notes used during generation.
- Display generation timestamps.
- Identify when source content has changed since generation.
- Display loading and error states.

AI-generated summaries must not overwrite original notes automatically.

When summarizing entire folders, do not silently truncate source material. Implement an appropriate token management and chunking strategy when necessary.

The AI should rely on the provided study materials and avoid introducing unsupported information.

### E. AI Quiz Maker

Users must be able to generate quizzes based on:

- An individual note.
- Selected portions of a note.
- Multiple selected notes.
- An entire project folder.

Users must be able to customize the following:

- Quiz title
- Source material
- Number of questions
- Difficulty level
- Question type
- Quiz mode
- Whether explanations are included

Supported question types:

- Multiple choice
- True or false
- Identification
- Multiple-select questions
- Mixed question types

Supported difficulty levels:

- Easy
- Medium
- Hard

AI-generated quizzes must include:

- Relevant questions based on source material.
- Plausible answer choices.
- Correct answers.
- Answer explanations.
- Source note references where applicable.
- Unique and non-repetitive questions.
- Structured responses validated using Zod.

Users must be able to:

- Generate quizzes.
- Preview generated quizzes.
- Edit questions.
- Edit answer choices.
- Edit correct answers.
- Rename quizzes.
- Save quizzes.
- Regenerate quizzes.
- Duplicate quizzes.
- Delete quizzes.
- View previously generated quizzes.

### F. Interactive Quiz Experience

The quiz-taking experience should be inspired by Gemini's interactive quiz interface while maintaining our own application design.

The interface should include:

- One question displayed at a time.
- Clear and interactive answer choices.
- Question progress indicators.
- Progress bars.
- Previous and next navigation where appropriate.
- Answer submission.
- Correct and incorrect answer indicators.
- Answer explanations.
- Smooth transitions between questions.
- Final quiz results.
- Score and percentage.
- Retake quiz button.
- Review answers button.

Support two quiz-taking modes.

**Practice Mode**

- Display immediate feedback after answering each question.
- Highlight correct and incorrect answers.
- Display explanations.
- Allow the user to continue to the next question.

**Exam Mode**

- Do not reveal correct answers during the quiz.
- Allow users to review unanswered questions.
- Submit all answers at the end.
- Display the final score after submission.
- Reveal answers and explanations only after submission.

The backend must handle answer validation and scoring.

Do not expose correct answers prematurely through API responses.

For practice mode, reveal the answer and explanation only after the corresponding answer has been submitted and recorded.

For exam mode, reveal correct answers only after the entire attempt has been submitted.

Use deterministic backend scoring instead of repeatedly calling the AI provider.

For identification questions, define accepted answer variations and normalization rules. Explain the limitations of exact-match grading.

### G. Quiz History and Retake System

Every quiz attempt must be saved independently.

Users must be able to:

- View their complete quiz history.
- View quiz history by project folder.
- View previous quiz attempts.
- View attempt dates.
- View previous scores.
- View correct and incorrect answer counts.
- View individual submitted answers.
- Review correct answers and explanations.
- View quiz completion duration.
- View difficulty levels.
- Retake the same quiz.
- Shuffle questions or answer choices when retaking.
- Generate a new quiz from the same source material.
- Compare previous and latest attempts.
- View their highest score.
- View their latest score.
- View the total number of attempts.
- Resume an unfinished attempt where appropriate.

Retaking an existing quiz must not require another AI API request.

Every retake must create a new quiz attempt instead of overwriting previous attempts.

Historical quiz attempts must remain accurate even if the original quiz is edited.

Use immutable quiz versions or question snapshots to preserve historical questions, answers, and scoring.

Define the behavior for abandoned, in-progress, and completed quiz attempts.

Prevent duplicate quiz submissions and unauthorized modifications to completed attempts.

### H. Learning Analytics

Implement a learning analytics system based on recorded quiz attempts.

Provide analytics at both the global user level and individual project folder level.

**Global Analytics**

- Total project folders
- Total notes
- Total generated summaries
- Total generated quizzes
- Total completed quiz attempts
- Total questions answered
- Total correct answers
- Total incorrect answers
- Average quiz score
- Highest quiz score
- Overall answer accuracy
- Total quiz completion time
- Recent study activity
- Quiz performance over time

**Project-Level Analytics**

- Total notes within the project
- Total summaries generated
- Total quizzes generated
- Total quiz attempts
- Average quiz score
- Highest quiz score
- Latest quiz score
- Correct and incorrect answer distribution
- Performance improvement over time
- Performance by difficulty level
- Performance by question type

**Quiz-Level Analytics**

- Total attempts
- First attempt score
- Latest attempt score
- Highest attempt score
- Average score
- Score improvement
- Average completion duration
- Most frequently missed questions
- Attempt comparison

Where reliable topic metadata is available, provide topic-level performance analysis.

Use appropriate visualizations, including:

- Line charts for performance over time.
- Bar charts for quiz comparisons.
- Donut charts for correct and incorrect answer distributions.
- Progress indicators for performance metrics.
- Summary cards for key statistics.

Calculate analytics using backend database queries rather than relying on frontend calculations or unnecessary AI requests.

Clearly define each metric and how it is calculated. Distinguish overall answer accuracy from the average percentage across quiz attempts.

Recommend a lightweight charting library where necessary.

### I. Dashboard

The dashboard should provide an overview of the user's study workspace.

Include:

- Welcome section
- Total project folders
- Total notes
- Recently opened notes
- Recently created project folders
- Recent summaries
- Recent quizzes
- Recent quiz attempts
- Average quiz score
- Learning performance overview
- Quick-create project action
- Quick-create note action
- Quick-access quiz history
- Quick-access analytics
- AI usage information

### J. User Interface and Experience

The application should have a modern, minimalist, and professional interface.

The design should include:

- Responsive desktop, tablet, and mobile layouts.
- Collapsible sidebar navigation.
- Project folder navigation.
- Breadcrumb navigation.
- Light and dark mode.
- Reusable UI components.
- Loading indicators.
- Skeleton loading states.
- Toast notifications.
- Confirmation dialogs.
- Empty states.
- Error states.
- Accessible forms.
- Keyboard-friendly navigation.
- Consistent colors, typography, and spacing.

Prioritize functionality, usability, accessibility, and consistency over unnecessary visual complexity.

## 4. Database Design

Design a normalized PostgreSQL database using Prisma ORM.

Consider the following models:

- User
- Project
- Note
- Summary
- SummarySource
- Quiz
- QuizSource
- QuizVersion
- QuizQuestion
- QuizQuestionOption
- QuizAttempt
- QuizAttemptAnswer
- AIUsage

Additional models may be introduced only when justified.

The database design must support the following relationships:

- One user can own multiple projects.
- One project can contain multiple notes.
- One project can contain multiple summaries.
- One project can contain multiple quizzes.
- One summary can reference multiple source notes.
- One quiz can reference multiple source notes.
- One quiz can have multiple versions.
- One quiz version can contain multiple questions.
- One question can have multiple answer choices.
- One quiz can have multiple attempts through its versions.
- One quiz attempt can contain multiple submitted answers.
- One user can have multiple AI usage records.

Explain the purpose of every model, including:

- Primary keys
- Foreign keys
- Unique constraints
- Ownership relationships
- One-to-many relationships
- Many-to-many relationships
- Indexes
- Timestamps
- Referential integrity
- Cascade deletion behavior
- Historical data preservation
- Data retention

Avoid redundant ownership fields unless there is a clear performance or security benefit and consistency is enforced.

Ensure that the database supports efficient analytics queries without unnecessary duplication of derived statistics.

## 5. Authentication, Authorization, and Ownership

Strict ownership-based authorization is mandatory.

Each user must only be able to access their own:

- Projects
- Notes
- Summaries
- Quizzes
- Quiz questions
- Quiz attempts
- Quiz history
- Analytics
- AI usage records

Ownership requirements:

- Every user must have a unique Firebase UID.
- Every Firebase user must have a corresponding PostgreSQL user record.
- The backend must verify Firebase ID tokens.
- User identity must come exclusively from verified authentication tokens.
- Never trust user IDs or owner IDs provided by the frontend.
- All protected database queries must be scoped to the authenticated user.
- Verify project ownership before accessing nested resources.
- Verify ownership of every selected source note before AI processing.
- Reject AI generation requests containing unauthorized note IDs.
- Prevent users from moving notes into another user's project folder.
- Prevent users from accessing other users' quiz history or analytics.
- Prevent unauthorized changes to nested resources.
- Prevent unauthorized access through manipulated URLs and API requests.
- Enforce authorization at the backend.
- Avoid leaking information about resources owned by other users.

Do not rely on hidden frontend buttons or protected routes as the primary authorization mechanism.

## 6. Application Security

Follow secure-by-default development practices and relevant OWASP recommendations.

Implement:

- Firebase ID token verification middleware
- Ownership-based authorization
- Protection against IDOR and broken object-level authorization
- Zod request validation
- Environment variable validation
- Secure environment variable management
- Helmet middleware
- Strict CORS configuration
- API rate limiting
- Request body size limitations
- SQL injection prevention
- XSS prevention
- Rich-text sanitization
- Mass-assignment prevention
- Centralized error handling
- Secure logging
- Sensitive information protection
- HTTPS in production
- Dependency vulnerability auditing
- Secure database connections
- Least-privilege access
- Secure Docker configuration
- Cross-user authorization testing

The React frontend must communicate with the Express backend for application data.

Do not allow the frontend to directly access PostgreSQL or privileged Supabase APIs.

## 7. AI Security, Performance, and Cost Management

AI integration must be secure, reliable, and cost-efficient.

Implement or design:

- Backend-only AI credentials
- Dedicated AI service layer
- Prompt templates
- Structured AI responses
- Zod output validation
- Prompt injection safeguards
- Input length validation
- Output size limitations
- Token estimation
- Context window management
- Large-note processing
- Entire-folder processing
- Content chunking strategies
- Hierarchical summarization where necessary
- Per-user AI generation limits
- Daily or monthly usage quotas
- AI request rate limiting
- AI usage tracking
- Estimated AI costs
- Request timeouts
- Controlled retry strategies
- Duplicate generation prevention
- Concurrency limits
- Error recovery
- AI output quality validation
- Source note traceability
- Mock AI responses for automated testing

Treat all user-generated notes as untrusted data rather than executable instructions.

Do not provide the AI provider with database credentials, application secrets, or access to unrelated user resources.

Verify ownership of all source materials before sending any content to the AI provider.

Inform users when their study materials are processed by an external AI provider.

Store generated summaries and quizzes in the database so users can access them repeatedly without consuming additional AI credits.

Use background processing only if justified by the expected generation duration and deployment limitations.

Explain how the application will handle long-running AI generation without unnecessary infrastructure complexity.

## 8. Software Architecture and Coding Standards

The coding style must be similar to how I developed my existing SmileCheck System.

Analyze the existing SmileCheck codebase before implementing this application.

Follow its established conventions regarding:

- Naming conventions
- Formatting
- Function declarations
- TypeScript usage
- Component organization
- API implementation
- Service implementation
- Error handling
- File organization
- Code readability

If the SmileCheck codebase is unavailable, request representative source files rather than assuming its coding conventions.

However, this project must use an MVC-based backend architecture.

### Backend Responsibilities

Organize the backend into clearly separated folders for:

- Routes
- Controllers
- Services
- Prisma models
- Middlewares
- Validators
- Configuration
- Utilities
- Types
- Tests

Create dedicated services for:

- User management
- Authentication
- Project management
- Note management
- AI integration
- Summary generation
- Quiz generation
- Quiz management
- Quiz attempts
- Quiz scoring
- Learning analytics
- AI usage management

Routes should define endpoints.

Controllers should handle HTTP requests and responses.

Services should handle business logic.

Prisma should handle database access.

Middleware should handle authentication, validation, and other shared request-processing responsibilities.

Avoid placing large amounts of business logic inside routes or controllers.

### Frontend Responsibilities

Use a feature-oriented folder structure.

Separate functionality into:

- Components
- Pages
- Features
- Hooks
- API services
- Zustand stores
- Routes
- Types
- Utilities
- Configuration

Organize features around the application's main domains:

- Authentication
- Dashboard
- Projects
- Notes
- Summaries
- Quizzes
- Quiz history
- Analytics
- Settings

Use TanStack Query for:

- API fetching
- Server state
- Caching
- Mutations
- Cache invalidation
- Optimistic updates where appropriate
- Pagination
- AI generation status

Use Zustand for:

- Sidebar state
- Theme preferences
- Temporary note editor state
- Temporary quiz-taking state
- Selected project and note UI state
- Other shared client-side UI states

Do not unnecessarily duplicate server-side data inside Zustand.

Clear user-specific cached data when authentication changes to prevent cross-user data exposure on shared devices.

### Coding Principles

- Separation of concerns
- Single responsibility principle
- DRY
- KISS
- Strong TypeScript typing
- Consistent naming conventions
- Reusable components
- Consistent API response structures
- Centralized error handling
- Avoid unnecessary use of any
- Avoid overengineering
- Avoid unnecessary abstraction
- Maintain readable and self-explanatory code

## 9. Development Roadmap — Divide and Conquer

Create exactly six comprehensive development phases.

Each phase must contain at least six tasks.

Preferably, create 15–30 or more tasks per phase where necessary to ensure complex functionality is broken into manageable implementations.

Distribute tasks based on their actual dependencies.

### Phase 1 — Planning, Architecture, and Project Initialization

Include:

- Requirements analysis
- MVP scope definition
- SmileCheck coding style analysis
- Technology stack verification
- AI provider comparison
- AI pricing and usage planning
- System architecture design
- Database schema planning
- Entity relationship diagram
- API endpoint planning
- Authentication architecture
- Ownership architecture
- AI architecture
- Quiz versioning strategy
- Analytics architecture
- Security threat modeling
- Git repository initialization
- Frontend project initialization
- Backend project initialization
- TypeScript configuration
- MVC folder structure
- Frontend feature structure
- Environment variable configuration
- ESLint and Prettier configuration
- Project documentation

### Phase 2 — Backend Foundation, Database, Authentication, and Security

Include:

- Express server setup
- Prisma configuration
- Supabase PostgreSQL connection
- Database model implementation
- Database migrations
- Database indexes
- Firebase Authentication setup
- Firebase Admin SDK setup
- Authentication middleware
- User synchronization
- Ownership authorization
- Zod validation middleware
- Error-handling middleware
- API response standardization
- CORS configuration
- Helmet configuration
- Rate limiting
- Request size limits
- Secure logging
- Backend testing foundation
- Authentication testing
- Cross-user ownership testing

### Phase 3 — Project Folder and Note-Taking System

Include:

- Project creation API
- Project retrieval API
- Project update API
- Project deletion API
- Project search API
- Project archive and restore
- Project ownership validation
- Note creation API
- Note retrieval API
- Note update API
- Note deletion API
- Note duplication
- Note movement between projects
- Note search
- Note sorting
- Note pinning
- Note archiving
- Authentication interfaces
- Protected frontend routes
- Dashboard layout
- Sidebar navigation
- Project folder interface
- Project detail interface
- Note editor implementation
- Rich-text formatting
- Note auto-save
- TanStack Query integration
- Zustand integration
- Responsive design
- Project and note integration testing

### Phase 4 — AI Summarizer and Quiz Generation System

Include:

- AI provider integration
- AI service abstraction
- AI configuration validation
- Prompt template implementation
- Prompt injection safeguards
- Token management
- Large-note processing
- Entire-folder processing
- Source material selection
- Source ownership validation
- AI structured output schemas
- AI output validation
- AI request timeout handling
- AI retry handling
- AI usage tracking
- AI quotas
- AI concurrency management
- Duplicate generation prevention
- Individual note summarization
- Multiple note summarization
- Entire project summarization
- Summary persistence
- Summary management APIs
- Summary source tracking
- Quiz generation from individual notes
- Quiz generation from multiple notes
- Quiz generation from project folders
- Multiple-choice question generation
- True-or-false question generation
- Identification question generation
- Multiple-select question generation
- Quiz question validation
- Quiz persistence
- Quiz management APIs
- Quiz versioning
- AI integration testing
- AI security testing

### Phase 5 — Interactive Quiz, AI Frontend Integration, History, and Analytics

Include:

- AI summarizer interface
- Summary source selection
- Summary configuration interface
- Summary generation loading states
- Generated summary preview
- Saved summaries interface
- Quiz generation interface
- Quiz source selection
- Quiz question type configuration
- Quiz difficulty configuration
- Quiz preview interface
- Quiz editing interface
- Quiz attempt creation API
- Quiz answer submission API
- Quiz progress persistence
- Practice mode implementation
- Exam mode implementation
- Backend scoring service
- Quiz submission validation
- Interactive quiz interface
- Question navigation
- Progress indicators
- Immediate answer feedback
- Answer explanations
- Quiz results interface
- Quiz history API
- Quiz history interface
- Retake quiz implementation
- Unfinished quiz recovery
- Quiz attempt comparison
- Global analytics API
- Project-level analytics API
- Quiz-level analytics API
- Analytics charts
- Dashboard statistics
- Performance tracking
- AI usage indicators
- Dark mode
- Accessibility improvements
- Full-stack integration testing

### Phase 6 — Testing, Optimization, Docker, and Production Deployment

Include:

- Backend unit testing
- Backend integration testing
- Frontend component testing
- End-to-end testing
- Authentication security testing
- Project ownership testing
- Note ownership testing
- AI source ownership testing
- Quiz ownership testing
- Quiz attempt security testing
- Analytics accuracy testing
- Quiz scoring accuracy testing
- Quiz retake testing
- Historical quiz version testing
- AI prompt injection testing
- AI output validation testing
- AI usage limit testing
- Auto-save reliability testing
- Database query optimization
- Analytics query optimization
- Frontend performance optimization
- AI performance optimization
- Dependency vulnerability auditing
- Dockerfile implementation
- Docker image optimization
- Non-root Docker execution
- Docker Compose configuration where appropriate
- Production environment configuration
- Production database migrations
- Render backend deployment
- Vercel frontend deployment
- Firebase production configuration
- Production CORS configuration
- Health-check endpoints
- Logging and monitoring
- Backup and recovery planning
- Production smoke testing
- Final project documentation

Security and testing must be incorporated throughout all phases rather than postponed until Phase 6.

## 10. Required Phase and Task Format

Every phase must include:

- Phase number
- Phase name
- Phase objective
- Prerequisites
- Task checklist
- Task dependencies
- Expected deliverables
- Testing checklist
- Definition of completion

Every individual task must include:

- Unique task ID, such as P1-T01
- Task title
- Task description
- Purpose
- Implementation requirements
- Relevant files and folders
- Task dependencies
- Expected output
- Acceptance criteria
- Testing and verification steps

Tasks must be small enough to be implemented, reviewed, and tested independently.

Do not combine several major features into a single vague task.

Identify which tasks belong to the MVP and which are optional improvements.

## 11. Development Workflow and Rules

1. Plan the complete application before writing implementation code.
2. Analyze the SmileCheck codebase as a coding-style reference.
3. Present the system architecture.
4. Present the frontend and backend folder structures.
5. Design the database schema and relationships.
6. Define the required REST API endpoints.
7. Explain the authentication and ownership architecture.
8. Explain the AI generation architecture.
9. Explain the quiz-taking and scoring architecture.
10. Explain the quiz versioning and attempt history architecture.
11. Explain the analytics architecture.
12. Complete one development phase at a time.
13. Complete one task at a time within each phase.
14. Explain what we are implementing and why.
15. Specify exact file paths for created or modified files.
16. Provide necessary installation commands.
17. Provide complete working code for new files.
18. Review existing code before modifying it.
19. Avoid modifying unrelated files.
20. Test and verify each task before proceeding.
21. Track completed, pending, and blocked tasks.
22. Maintain consistency with established coding standards.
23. Explain architectural and security decisions.
24. Do not skip tasks.
25. Do not automatically proceed to another task or phase without my approval.
26. Do not claim an implementation works without verification.
27. Avoid unnecessary AI API requests.
28. Use mocked AI responses during automated testing where appropriate.
29. Keep documentation synchronized with implementation.
30. Prioritize simplicity, security, maintainability, and readability.

## 12. Project Documentation

Maintain the following documentation throughout development:

- README.md
- docs/ARCHITECTURE.md
- docs/ROADMAP.md
- docs/PROGRESS.md
- docs/DATABASE.md
- docs/API.md
- docs/SECURITY.md
- docs/AI_INTEGRATION.md
- docs/QUIZ_SYSTEM.md
- docs/ANALYTICS.md
- docs/TESTING.md
- docs/DEPLOYMENT.md
- Environment variable example files

Update documentation whenever a relevant implementation changes.

## 13. Initial Expected Response

For your first response, provide:

1. Project overview and technical assessment
2. MVP scope and optional features
3. Proposed system architecture
4. Technology stack responsibilities
5. Frontend folder structure
6. Backend MVC folder structure
7. Database schema
8. Entity relationship diagram
9. REST API endpoint documentation
10. Authentication flow
11. Resource ownership hierarchy
12. Authorization strategy
13. Project folder and note architecture
14. AI provider comparison and recommendation
15. Individual and entire-folder summarization architecture
16. AI quiz generation architecture
17. Interactive quiz-taking architecture
18. Quiz scoring architecture
19. Quiz versioning and retake strategy
20. Quiz history architecture
21. Analytics architecture and metric definitions
22. AI cost and usage management
23. Application and AI security strategy
24. Complete six-phase development roadmap
25. Detailed task checklists and dependencies
26. Testing strategy
27. Deployment architecture
28. Potential technical risks and recommended solutions

Do not begin implementing the actual application yet.

I want to review and approve the complete architecture, database design, and development roadmap before starting Phase 1.

The goal is to develop a production-ready AI-powered study platform while improving my understanding of professional full-stack development, software architecture, AI integration, database design, security, and cloud deployment.
