"use server"

import OpenAI from "openai"

type DocumentResult = {
  fileName: string
  ranking: number
  summary: string
}

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Get the assistant ID from environment variables
const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID

export async function processDocuments(formData: FormData): Promise<DocumentResult[]> {
  const files = formData.getAll("documents") as File[]

  if (!files || files.length === 0) {
    throw new Error("No documents provided")
  }

  if (!ASSISTANT_ID) {
    throw new Error("OPENAI_ASSISTANT_ID environment variable is not set")
  }

  const results: DocumentResult[] = []

  // Create a thread once for all documents
  const thread = await openai.beta.threads.create()

  for (const file of files) {
    try {
      // Read file content
      const fileContent = await file.text()

      // Add a message to the thread with the document content
      await openai.beta.threads.messages.create(thread.id, {
        role: "user",
        content: `Please analyze this document and provide a ranking from 1-10 (10 being highest quality) and a brief summary (max 100 words). Document name: ${file.name}. Content: ${fileContent.slice(0, 15000)}`,
      })

      // Run the assistant on the thread
      const run = await openai.beta.threads.runs.create(thread.id, {
        assistant_id: ASSISTANT_ID,
      })

      // Poll for the run to complete
      let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id)

      // Wait for the run to complete with a timeout
      const startTime = Date.now()
      const TIMEOUT = 60000 // 60 seconds timeout

      while (runStatus.status !== "completed" && runStatus.status !== "failed" && Date.now() - startTime < TIMEOUT) {
        // Wait for 1 second before checking again
        await new Promise((resolve) => setTimeout(resolve, 1000))
        runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id)
      }

      if (runStatus.status === "failed") {
        throw new Error(`Assistant run failed: ${runStatus.last_error?.message || "Unknown error"}`)
      }

      if (runStatus.status !== "completed") {
        throw new Error("Assistant run timed out")
      }

      // Get the messages from the thread
      const messages = await openai.beta.threads.messages.list(thread.id)

      // Get the last assistant message
      const assistantMessages = messages.data.filter((msg) => msg.role === "assistant")

      if (assistantMessages.length === 0) {
        throw new Error("No response from assistant")
      }

      const lastMessage = assistantMessages[0]

      // Extract the content from the message
      let messageContent = ""
      if (lastMessage.content[0].type === "text") {
        messageContent = lastMessage.content[0].text.value
      }

      // Try to parse the response as JSON
      let ranking = 0
      let summary = ""

      try {
        // First try to extract JSON if it exists in the response
        const jsonMatch =
          messageContent.match(/```json\s*([\s\S]*?)\s*```/) ||
          messageContent.match(/{[\s\S]*"ranking"[\s\S]*"summary"[\s\S]*}/)

        if (jsonMatch) {
          const jsonStr = jsonMatch[1] || jsonMatch[0]
          const parsed = JSON.parse(jsonStr)
          ranking = parsed.ranking || 0
          summary = parsed.summary || ""
        } else {
          // If no JSON, try to extract ranking and summary from text
          const rankingMatch = messageContent.match(/ranking:?\s*(\d+)/i) || messageContent.match(/(\d+)\s*\/\s*10/)

          if (rankingMatch) {
            ranking = Number.parseInt(rankingMatch[1], 10)
          }

          const summaryMatch = messageContent.match(/summary:?\s*([\s\S]+?)(?:\n\n|$)/i)
          if (summaryMatch) {
            summary = summaryMatch[1].trim()
          } else {
            // Just use the whole message if we can't extract a summary
            summary = messageContent.trim()
          }
        }
      } catch (error) {
        console.error("Error parsing assistant response:", error)
        // Use default values if parsing fails
        ranking = 0
        summary = "Failed to parse assistant response"
      }

      results.push({
        fileName: file.name,
        ranking: ranking || 0,
        summary: summary || "No summary provided",
      })
    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error)

      // Add error result
      results.push({
        fileName: file.name,
        ranking: 0,
        summary: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      })
    }
  }

  return results
}
