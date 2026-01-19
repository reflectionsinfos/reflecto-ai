# Kudos Card App

A web application for generating and sharing employee appreciation cards.

## Features

- **Login**: Role-based access (Admin/User).
- **Create Card**: Choose from templates, customize messages, and upload images.
- **My Cards**: View history of sent/received cards.
- **Analytics**: (Admin) View usage statistics and activity trends.

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

1.  Clone the repository:

    ```bash
    git clone <repository-url>
    cd kudos-app
    ```

2.  Install dependencies:
    ```bash
    npm install
    # or
    pnpm install
    ```

### Local Development

1.  Start the development server:

    ```bash
    npm run dev
    ```

2.  Open [http://localhost:3000](http://localhost:3000) in your browser.

### Login Credentials (Demo)

| Role  | Email                 | Password      |
| :---- | :-------------------- | :------------ |
| Admin | `admin@kudoscard.com` | `password123` |
| User  | `john@kudoscard.com`  | `password123` |
| User  | `sarah@kudoscard.com` | `password123` |

## Deployment

The application is optimized for deployment on [Vercel](https://vercel.com).

1.  Push your code to a Git repository (GitHub, GitLab, Bitbucket).
2.  Import the project into Vercel.
3.  Vercel will detect Next.js and configure the build settings automatically.

## Tech Stack

- Next.js 15
- React 19
- Tailwind CSS
- Radix UI
