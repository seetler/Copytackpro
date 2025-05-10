import { DocumentUploader } from "@/components/document-uploader"
import { PageHeader } from "@/components/page-header"

export default function Home() {
  return (
    <main className="container mx-auto py-10 px-4 md:px-6">
      <PageHeader
        title="Document Ranking System"
        description="Upload multiple documents to analyze and rank them using AI."
      />
      <DocumentUploader />
    </main>
  )
}
