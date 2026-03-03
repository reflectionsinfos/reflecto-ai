import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ReflectoAI — Talent Intelligence Platform API',
      version: '2.0.0',
      description: 'API documentation for ReflectoAI — covering Recognition (Kudos, Shout Outs, Spot Awards), AI message generation, and the Learning/Tech Growth platform.',
    },
    servers: [
      {
        url: 'http://localhost:4000',
        description: 'Local server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Tenant: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            role: { type: 'string', enum: ['admin', 'user'] },
            tenantId: { type: 'string', format: 'uuid' },
          },
        },
        Card: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            recipientName: { type: 'string' },
            creatorName: { type: 'string' },
            message: { type: 'string' },
            template: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Something went wrong' },
          },
        },

        // ── AI ─────────────────────────────────────────────────────────────
        GenerateMessageRequest: {
          type: 'object',
          required: ['type'],
          properties: {
            type: {
              type: 'string',
              enum: ['kudos', 'shout-out', 'spot-award'],
              description: 'Recognition type determines the tone and style of the generated message',
            },
            recipientName: { type: 'string', example: 'Jane Doe' },
            category: { type: 'string', example: 'Teamwork' },
            draft: { type: 'string', example: 'She helped the team during the sprint' },
            tone: { type: 'string', enum: ['warm', 'professional', 'fun'], example: 'warm' },
          },
        },

        // ── Recognition ────────────────────────────────────────────────────
        RecognitionEvent: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            createdAt: { type: 'string', format: 'date-time' },
            senderId: { type: 'string', format: 'uuid' },
            recipients: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                },
              },
            },
            type: { type: 'string', enum: ['kudos', 'shout-out', 'spot-award'] },
            metadata: { type: 'object', description: 'Flexible payload — message, category, image URL, etc.' },
            privacy_level: { type: 'string', enum: ['PUBLIC', 'PRIVATE'], default: 'PUBLIC' },
            image_blob: { type: 'string', description: 'Base64 encoded card image (optional)' },
          },
        },
        CreateRecognitionRequest: {
          type: 'object',
          required: ['type', 'recipients'],
          properties: {
            type: { type: 'string', enum: ['kudos', 'shout-out', 'spot-award'] },
            recipients: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                },
              },
            },
            metadata: { type: 'object' },
            privacy_level: { type: 'string', enum: ['PUBLIC', 'PRIVATE'], default: 'PUBLIC' },
            image_blob: { type: 'string' },
          },
        },

        // ── Learning ───────────────────────────────────────────────────────
        LearningProfile: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            techStack: { type: 'array', items: { type: 'string' }, example: ['React', 'Node.js'] },
            domain: { type: 'string', example: 'Full Stack' },
            learningGoals: { type: 'string' },
            monthlyObjectives: { type: 'array', items: { type: 'string' } },
            currentProjects: { type: 'array', items: { type: 'string' } },
            organizationalPriorities: { type: 'array', items: { type: 'string' } },
            preferredDelivery: { type: 'string', enum: ['teams', 'email', 'in-app'] },
            status: { type: 'string', enum: ['DRAFT', 'SUBMITTED', 'APPROVED', 'REVISION_REQUESTED'] },
            managerNotes: { type: 'string' },
            approvedBy: { type: 'string', format: 'uuid' },
            approvedAt: { type: 'string', format: 'date-time' },
            revisionComments: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        LearningProfileInput: {
          type: 'object',
          properties: {
            techStack: { type: 'array', items: { type: 'string' } },
            domain: { type: 'string' },
            learningGoals: { type: 'string' },
            monthlyObjectives: { type: 'array', items: { type: 'string' } },
            currentProjects: { type: 'array', items: { type: 'string' } },
            organizationalPriorities: { type: 'array', items: { type: 'string' } },
            preferredDelivery: { type: 'string', enum: ['teams', 'email', 'in-app'] },
            status: { type: 'string', enum: ['DRAFT', 'SUBMITTED'] },
          },
        },
        LessonResult: {
          type: 'object',
          properties: {
            content: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                topic: { type: 'string' },
                techStack: { type: 'string' },
                difficulty: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
                lessonContent: { type: 'string' },
                exercise: { type: 'object' },
                quizQuestions: { type: 'array', items: { type: 'object' } },
                estimatedReadTime: { type: 'integer', example: 5 },
              },
            },
            progress: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                deliveredAt: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
        LessonProgress: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            contentId: { type: 'string', format: 'uuid' },
            deliveredAt: { type: 'string', format: 'date-time' },
            lessonViewed: { type: 'string', enum: ['true', 'false'] },
            exerciseCompleted: { type: 'string', enum: ['true', 'false'] },
            quizScore: { type: 'integer' },
            pointsEarned: { type: 'integer' },
            aiFeedback: { type: 'string' },
            completedAt: { type: 'string', format: 'date-time' },
          },
        },
        QuizSubmission: {
          type: 'object',
          required: ['progressId', 'quizAnswers'],
          properties: {
            progressId: { type: 'string', format: 'uuid' },
            quizAnswers: { type: 'array', items: { type: 'string' }, example: ['A', 'C', 'B'] },
            exerciseSubmission: { type: 'string' },
          },
        },
        QuizResult: {
          type: 'object',
          properties: {
            score: { type: 'integer', example: 80 },
            pointsEarned: { type: 'integer', example: 40 },
            aiFeedback: { type: 'string' },
            correctAnswers: { type: 'array', items: { type: 'string' } },
          },
        },
        LearningStats: {
          type: 'object',
          properties: {
            totalPoints: { type: 'integer', example: 320 },
            currentStreak: { type: 'integer', example: 5 },
            longestStreak: { type: 'integer', example: 12 },
            level: { type: 'integer', example: 3 },
            badges: { type: 'array', items: { type: 'string' } },
            lastActivityDate: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts'], // Path to the API docs
};

export const specs = swaggerJsdoc(options);
