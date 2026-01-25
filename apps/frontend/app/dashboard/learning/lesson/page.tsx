"use client"

import React, { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { BookOpen, CheckCircle, Award } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"
import ReactMarkdown from "react-markdown"

export default function LessonViewerPage() {
  const searchParams = useSearchParams()
  const progressId = searchParams.get("id")
  const { toast } = useToast()
  
  const [lesson, setLesson] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [exerciseSubmission, setExerciseSubmission] = useState("")
  const [quizAnswers, setQuizAnswers] = useState<number[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState<any>(null)

  useEffect(() => {
    if (progressId) {
      loadLesson()
    }
  }, [progressId])

  const loadLesson = async () => {
    try {
      // TODO: Create backend endpoint to get lesson by progress ID
      // For now, we'll show a placeholder
      setLoading(false)
    } catch (error) {
      console.error("Failed to load lesson:", error)
      setLoading(false)
    }
  }

  const handleQuizSubmit = async () => {
    if (quizAnswers.length === 0) {
      toast({ title: "Missing Answers", description: "Please answer all quiz questions", variant: "destructive" })
      return
    }

    try {
      const response = await apiClient.post("/learning/submit-quiz", {
        progressId,
        quizAnswers,
        exerciseSubmission
      })
      
      setResult(response)
      setSubmitted(true)
      
      toast({ 
        title: "Quiz Submitted!", 
        description: `You scored ${response.score}% and earned ${response.pointsEarned} points! 🎉` 
      })
    } catch (error) {
      toast({ title: "Error", description: "Failed to submit quiz", variant: "destructive" })
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <p>Loading lesson...</p>
    </div>
  }

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-6">
      <div className="flex items-center gap-3">
        <BookOpen className="w-8 h-8 text-purple-500" />
        <div>
          <h1 className="text-3xl font-bold">Today's Lesson</h1>
          <p className="text-muted-foreground">Complete the lesson and quiz to earn points</p>
        </div>
      </div>

      {/* Lesson Content */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>JSX Syntax and Components</CardTitle>
              <div className="flex gap-2 mt-2">
                <Badge>React</Badge>
                <Badge variant="outline">Intermediate</Badge>
                <Badge variant="secondary">2 min read</Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none">
          <ReactMarkdown>
            {`# JSX Syntax and Components in React

Hey React devs! Let's dive into JSX and components. JSX is like HTML for React, allowing you to write UI elements directly in your JavaScript code.

**Key Concepts:**
- **Embedding Expressions:** Use curly braces \`{}\` to embed JavaScript expressions
- **Attributes:** Use camelCase (e.g., \`className\` instead of \`class\`)
- **Components:** Reusable UI building blocks

\`\`\`javascript
function MyComponent(props) {
  const name = "React Learner";
  return (
    <div className="my-component">
      <h1>Hello, {name}!</h1>
      <p>Welcome, {props.message}</p>
    </div>
  );
}
\`\`\`

**Important Rules:**
- JSX must have a single root element
- Self-closing tags like \`<img />\` must be self-closing`}
          </ReactMarkdown>
        </CardContent>
      </Card>

      {/* Exercise */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            Hands-On Exercise
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">
            Create a new functional component called <code>Greeting</code> that accepts a <code>username</code> prop 
            and displays a personalized greeting message.
          </p>
          
          <div className="bg-muted p-3 rounded text-sm space-y-1">
            <p className="font-semibold">Hints:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Pass the username as a prop</li>
              <li>Use curly braces to embed the prop</li>
              <li>Return a single root element</li>
            </ul>
          </div>

          <Textarea 
            placeholder="Paste your code here..."
            value={exerciseSubmission}
            onChange={(e) => setExerciseSubmission(e.target.value)}
            className="h-32 font-mono text-sm"
            disabled={submitted}
          />
        </CardContent>
      </Card>

      {/* Quiz */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-500" />
            Knowledge Check
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {[
            {
              question: "Which of the following is the correct way to embed a JavaScript expression within JSX?",
              options: ["{{expression}}", "(expression)", "{expression}", "[expression]"],
              correctIndex: 2
            },
            {
              question: "What is the purpose of JSX?",
              options: [
                "To style React components with CSS",
                "To write HTML-like structures within JavaScript code",
                "To manage state in React components",
                "To handle events in React components"
              ],
              correctIndex: 1
            },
            {
              question: "What is the correct attribute to use for applying CSS classes in JSX?",
              options: ["class", "className", "style", "cssClass"],
              correctIndex: 1
            }
          ].map((q, qIndex) => (
            <div key={qIndex} className="space-y-3">
              <p className="font-semibold">{qIndex + 1}. {q.question}</p>
              <div className="space-y-2">
                {q.options.map((option, oIndex) => (
                  <label 
                    key={oIndex} 
                    className={`flex items-center gap-2 p-3 border rounded cursor-pointer hover:bg-accent ${
                      quizAnswers[qIndex] === oIndex ? "bg-accent border-primary" : ""
                    } ${submitted && oIndex === q.correctIndex ? "bg-green-50 border-green-500" : ""} ${
                      submitted && quizAnswers[qIndex] === oIndex && oIndex !== q.correctIndex ? "bg-red-50 border-red-500" : ""
                    }`}
                  >
                    <input 
                      type="radio" 
                      name={`q${qIndex}`}
                      checked={quizAnswers[qIndex] === oIndex}
                      onChange={() => {
                        const newAnswers = [...quizAnswers]
                        newAnswers[qIndex] = oIndex
                        setQuizAnswers(newAnswers)
                      }}
                      disabled={submitted}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}

          {!submitted ? (
            <Button className="w-full" onClick={handleQuizSubmit}>
              Submit Quiz
            </Button>
          ) : (
            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <p className="font-semibold text-green-900 dark:text-green-100">
                🎉 Quiz Completed! Score: {result?.score}%
              </p>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                {result?.feedback}
              </p>
              <p className="text-sm font-semibold mt-2">
                Points Earned: {result?.pointsEarned} 🏆
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
