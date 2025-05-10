"use client"

import type React from "react"

import { useState } from "react"
import { Upload, FileUp, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { processDocuments } from "@/app/actions"
import { DocumentTable } from "@/components/document-table"
import { Progress } from "@/components/ui/progress"

type DocumentResult = {
  fileName: string
  ranking: number
  summary: string
}

type ProcessingStatus = {
  [filename: string]: {
    status: "pending" | "processing" | "completed" | "error"
    message?: string
  }
}

export function DocumentUploader() {
  const [files, setFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>({})
  const [results, setResults] = useState<DocumentResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    if (e.dataTransfer.files) {
      const newFiles = Array.from(e.dataTransfer.files).filter(
        (file) =>
          file.type === "application/pdf" ||
          file.type === "text/plain" ||
          file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      )
      setFiles((prev) => [...prev, ...newFiles])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).filter(
        (file) =>
          file.type === "application/pdf" ||
          file.type === "text/plain" ||
          file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      )
      setFiles((prev) => [...prev, ...newFiles])
    }
  }

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleProcessFiles = async () => {
    if (files.length === 0) return

    setIsProcessing(true)
    setError(null)
    setProgress(0)

    // Initialize processing status for all files
    const initialStatus: ProcessingStatus = {}
    files.forEach((file) => {
      initialStatus[file.name] = { status: "pending" }
    })
    setProcessingStatus(initialStatus)

    try {
      const formData = new FormData()
      files.forEach((file) => {
        formData.append("documents", file)

        // Update status to processing
        setProcessingStatus((prev) => ({
          ...prev,
          [file.name]: { status: "processing" },
        }))
      })

      // Start progress animation
      let progressValue = 0
      const progressInterval = setInterval(() => {
        progressValue += 1
        if (progressValue > 95) {
          clearInterval(progressInterval)
        } else {
          setProgress(progressValue)
        }
      }, 500)

      const result = await processDocuments(formData)

      // Clear interval and set progress to 100%
      clearInterval(progressInterval)
      setProgress(100)

      // Update status for all files
      const updatedStatus: ProcessingStatus = {}
      result.forEach((item) => {
        updatedStatus[item.fileName] = {
          status: item.ranking === 0 && item.summary.startsWith("Error") ? "error" : "completed",
          message: item.ranking === 0 && item.summary.startsWith("Error") ? item.summary : undefined,
        }
      })
      setProcessingStatus(updatedStatus)

      setResults(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred while processing the documents")

      // Update all pending files to error
      setProcessingStatus((prev) => {
        const updated = { ...prev }
        Object.keys(updated).forEach((filename) => {
          if (updated[filename].status === "pending" || updated[filename].status === "processing") {
            updated[filename] = {
              status: "error",
              message: "Processing failed",
            }
          }
        })
        return updated
      })
    } finally {
      setIsProcessing(false)
      setProgress(100) // Ensure progress is complete
    }
  }

  const clearAll = () => {
    setFiles([])
    setResults([])
    setError(null)
    setProcessingStatus({})
    setProgress(0)
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardContent className="p-6">
          <div
            className={`border-2 border-dashed rounded-lg p-10 text-center ${
              isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Upload className="h-10 w-10 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Drag & drop your documents</h3>
                <p className="text-sm text-muted-foreground">Supported formats: PDF, TXT, DOCX (Max 10MB per file)</p>
              </div>
              <div>
                <label htmlFor="file-upload">
                  <Button variant="outline" className="cursor-pointer" asChild>
                    <span>
                      <FileUp className="mr-2 h-4 w-4" />
                      Browse files
                    </span>
                  </Button>
                </label>
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  accept=".pdf,.txt,.docx"
                  className="sr-only"
                  onChange={handleFileChange}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {files.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Selected Documents ({files.length})</h2>
            <Button variant="ghost" onClick={clearAll}>
              Clear all
            </Button>
          </div>

          <div className="grid gap-2">
            {files.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-md">
                <div className="truncate max-w-[70%]">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                {processingStatus[file.name] && (
                  <div className="flex items-center mr-2">
                    {processingStatus[file.name].status === "processing" && (
                      <span className="text-sm text-amber-500 flex items-center">
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        Processing
                      </span>
                    )}
                    {processingStatus[file.name].status === "completed" && (
                      <span className="text-sm text-green-500">Completed</span>
                    )}
                    {processingStatus[file.name].status === "error" && (
                      <span className="text-sm text-red-500" title={processingStatus[file.name].message}>
                        Error
                      </span>
                    )}
                  </div>
                )}
                <Button variant="ghost" size="sm" onClick={() => handleRemoveFile(index)}>
                  Remove
                </Button>
              </div>
            ))}
          </div>

          {isProcessing && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-center text-muted-foreground">
                Processing documents with your AI assistant...
              </p>
            </div>
          )}

          <Button onClick={handleProcessFiles} disabled={isProcessing || files.length === 0} className="w-full">
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing with Assistant
              </>
            ) : (
              "Process Documents with Assistant"
            )}
          </Button>

          {error && <div className="p-4 bg-destructive/10 text-destructive rounded-md">{error}</div>}
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Document Rankings</h2>
          <DocumentTable results={results} />
        </div>
      )}
    </div>
  )
}
