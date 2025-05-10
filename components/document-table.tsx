"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp } from "lucide-react"

type DocumentResult = {
  fileName: string
  ranking: number
  summary: string
}

interface DocumentTableProps {
  results: DocumentResult[]
}

export function DocumentTable({ results }: DocumentTableProps) {
  const [sortField, setSortField] = useState<"fileName" | "ranking">("ranking")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  const handleSort = (field: "fileName" | "ranking") => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const sortedResults = [...results].sort((a, b) => {
    if (sortField === "fileName") {
      return sortDirection === "asc" ? a.fileName.localeCompare(b.fileName) : b.fileName.localeCompare(a.fileName)
    } else {
      return sortDirection === "asc" ? a.ranking - b.ranking : b.ranking - a.ranking
    }
  })

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[300px]">
              <Button
                variant="ghost"
                onClick={() => handleSort("fileName")}
                className="flex items-center font-semibold"
              >
                File Name
                {sortField === "fileName" &&
                  (sortDirection === "asc" ? (
                    <ChevronUp className="ml-2 h-4 w-4" />
                  ) : (
                    <ChevronDown className="ml-2 h-4 w-4" />
                  ))}
              </Button>
            </TableHead>
            <TableHead className="w-[100px]">
              <Button variant="ghost" onClick={() => handleSort("ranking")} className="flex items-center font-semibold">
                Ranking
                {sortField === "ranking" &&
                  (sortDirection === "asc" ? (
                    <ChevronUp className="ml-2 h-4 w-4" />
                  ) : (
                    <ChevronDown className="ml-2 h-4 w-4" />
                  ))}
              </Button>
            </TableHead>
            <TableHead>Summary</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedResults.map((result, index) => (
            <TableRow key={index}>
              <TableCell className="font-medium truncate max-w-[300px]">{result.fileName}</TableCell>
              <TableCell>
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-medium">
                  {result.ranking}
                </span>
              </TableCell>
              <TableCell className="text-sm">{result.summary}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
