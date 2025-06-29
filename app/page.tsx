"use client"

import type React from "react"
import { useState, useEffect } from "react"
import {
  Upload,
  FileText,
  Users,
  Briefcase,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Trash2,
  Sparkles,
  Database,
  FileSpreadsheet,
  FileStack,
  Shredder,
} from "lucide-react"
import { useRouter } from "next/navigation"
import * as XLSX from "xlsx"
import Papa from "papaparse"
import { useData } from "@/contexts/DataContext"
import { clearAllCaches } from "@/lib/client-cache"

interface FileUploadState {
  clients: { file: File | null; data: any[]; isUploaded: boolean }
  workers: { file: File | null; data: any[]; isUploaded: boolean }
  tasks: { file: File | null; data: any[]; isUploaded: boolean }
}

const FileUploadCard = ({
  fileType,
  icon: Icon,
  uploadState,
  onFileUpload,
  onRemove,
  isLoading,
}: {
  fileType: "clients" | "workers" | "tasks"
  icon: any
  uploadState: FileUploadState[keyof FileUploadState]
  onFileUpload: (file: File, type: string) => void
  onRemove: (type: string) => void
  isLoading: boolean
}) => {
  const [isDragging, setIsDragging] = useState(false)

  const handleFile = (file: File) => {
    onFileUpload(file, fileType)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0 && !isLoading) {
      handleFile(files[0])
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0 && !isLoading) {
      handleFile(files[0])
    }
  }

  const getFileTypeConfig = (type: string) => {
    switch (type) {
      case "clients":
        return {
          label: "Clients",
          description: "Upload your client database",
        }
      case "workers":
        return {
          label: "Workers",
          description: "Upload your worker database",
        }
      case "tasks":
        return {
          label: "Tasks",
          description: "Upload your task database",
        }
      default:
        return { label: type, description: "" }
    }
  }

  const config = getFileTypeConfig(fileType)

  return (
    <div
      className={`
      relative group rounded-2xl transition-all duration-300 border-2 border-dashed overflow-hidden
      ${
        uploadState.isUploaded
          ? "border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5 shadow-lg shadow-primary/10 scale-105"
          : isDragging
            ? "border-primary bg-gradient-to-br from-primary/10 to-accent/10 shadow-xl shadow-primary/20 scale-102"
            : "border-border hover:border-primary/50 bg-card/50 backdrop-blur-sm hover:shadow-lg hover:scale-102"
      }
      ${isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
      backdrop-blur-sm
    `}
      onDragOver={(e) => {
        e.preventDefault()
        if (!isLoading) setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative p-8 text-center">
        <div
          className={`
          mx-auto mb-6 p-4 rounded-2xl inline-flex items-center justify-center transition-all duration-300
          ${
            uploadState.isUploaded
              ? "bg-primary/15 text-primary shadow-lg shadow-primary/20 scale-110"
              : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary group-hover:scale-110"
          }
        `}
        >
          <Icon className="h-7 w-7" />
        </div>

        {uploadState.isUploaded ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-3">
              <CheckCircle className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-foreground truncate max-w-36" title={uploadState.file?.name}>
                {uploadState.file?.name}
              </span>
            </div>
            <div className="inline-flex items-center px-3 py-1 bg-primary/10 rounded-full">
              <span className="text-xs font-medium text-primary">
                {uploadState.data.length.toLocaleString()} records
              </span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onRemove(fileType)
              }}
              className="inline-flex items-center px-3 py-2 text-xs font-medium rounded-xl 
                text-destructive hover:bg-destructive/10 transition-all duration-300 hover:scale-105"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Remove
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold text-foreground mb-2">{config.label}</h3>
              <p className="text-sm text-muted-foreground mb-4">{config.description}</p>
            </div>

            <div className="space-y-3">
              <div className="text-xs text-muted-foreground font-medium bg-muted/50 px-3 py-1 rounded-full inline-block">
                CSV, XLSX, XLS
              </div>

              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileInput}
                className="hidden"
                id={`file-${fileType}`}
                disabled={isLoading}
              />
              <label
                htmlFor={`file-${fileType}`}
                className={`
                  inline-flex items-center px-6 py-3 text-sm font-medium rounded-xl 
                  transition-all duration-300 hover:scale-105
                  ${
                    isLoading
                      ? "bg-muted text-muted-foreground cursor-not-allowed"
                      : "bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-lg shadow-primary/25"
                  }
                `}
              >
                <Upload className="h-4 w-4 mr-2" />
                {isLoading ? "Processing..." : "Choose File"}
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const MultiFileUpload = ({
  onComplete,
  isLoading,
  setIsLoading,
}: {
  onComplete: () => void
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [sheetsData, setSheetsData] = useState<{ [key: string]: any[] }>({})
  const [availableSheets, setAvailableSheets] = useState<string[]>([])
  const [sheetMappings, setSheetMappings] = useState<{
    clients: string
    workers: string
    tasks: string
  }>({
    clients: "",
    workers: "",
    tasks: "",
  })

  const { setClients, setWorkers, setTasks } = useData()

  const detectSheetType = (sheetName: string): "clients" | "workers" | "tasks" | null => {
    const name = sheetName.toLowerCase()

    if (name.includes("client") || name.includes("customer") || name.includes("company")) {
      return "clients"
    }

    if (
      name.includes("worker") ||
      name.includes("employee") ||
      name.includes("staff") ||
      name.includes("team") ||
      name.includes("personnel") ||
      name.includes("user")
    ) {
      return "workers"
    }

    if (
      name.includes("task") ||
      name.includes("project") ||
      name.includes("job") ||
      name.includes("work") ||
      name.includes("assignment") ||
      name.includes("activity")
    ) {
      return "tasks"
    }

    return null
  }

  const handleFile = (file: File) => {
    setIsLoading(true)
    setUploadedFile(file)

    const reader = new FileReader()
    reader.onload = (e) => {
      const data = e.target?.result

      if (file.name.endsWith(".csv")) {
        Papa.parse(data as string, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: true,
          complete: (results) => {
            const cleanedData = results.data.map((row: any) => {
              const cleanRow: any = {}
              Object.keys(row).forEach((key) => {
                const cleanKey = key.trim()
                cleanRow[cleanKey] = row[key]
              })
              return cleanRow
            })

            setSheetsData({ Sheet1: cleanedData })
            setAvailableSheets(["Sheet1"])

            const detectedType = detectSheetType(file.name)
            if (detectedType) {
              setSheetMappings((prev) => ({
                ...prev,
                [detectedType]: "Sheet1",
              }))
            }

            setIsLoading(false)
          },
        })
      } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        const workbook = XLSX.read(data, { type: "binary" })
        const sheets: { [key: string]: any[] } = {}
        const detectedMappings: { [key: string]: string } = {}

        workbook.SheetNames.forEach((sheetName) => {
          const worksheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet)

          const cleanedData = jsonData.map((row: any) => {
            const cleanRow: any = {}
            Object.keys(row).forEach((key) => {
              const cleanKey = key.trim()
              cleanRow[cleanKey] = row[key]
            })
            return cleanRow
          })

          sheets[sheetName] = cleanedData

          const detectedType = detectSheetType(sheetName)
          if (detectedType && !detectedMappings[detectedType]) {
            detectedMappings[detectedType] = sheetName
          }
        })

        setSheetsData(sheets)
        setAvailableSheets(workbook.SheetNames)

        setSheetMappings((prev) => ({
          ...prev,
          ...detectedMappings,
        }))

        setIsLoading(false)
      }
    }
    reader.readAsBinaryString(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0 && !isLoading) {
      handleFile(files[0])
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0 && !isLoading) {
      handleFile(files[0])
    }
  }

  const handleMappingChange = (entityType: "clients" | "workers" | "tasks", sheetName: string) => {
    setSheetMappings((prev) => ({
      ...prev,
      [entityType]: sheetName,
    }))
  }

  const handleLoadData = () => {
    if (sheetMappings.clients && sheetMappings.workers && sheetMappings.tasks) {
      setClients(sheetsData[sheetMappings.clients] || [])
      setWorkers(sheetsData[sheetMappings.workers] || [])
      setTasks(sheetsData[sheetMappings.tasks] || [])
      onComplete()
    }
  }

  const canLoadData = sheetMappings.clients && sheetMappings.workers && sheetMappings.tasks

  return (
    <div className="space-y-12">
      <div
        className={`
          relative rounded-2xl border-2 border-dashed p-16 text-center transition-all duration-300 overflow-hidden
          ${
            isDragging
              ? "border-primary bg-gradient-to-br from-primary/10 to-accent/10 shadow-xl scale-102"
              : uploadedFile
                ? "border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5 shadow-lg"
                : "border-border hover:border-primary/50 bg-card/50 backdrop-blur-sm hover:shadow-lg hover:scale-102"
          }
          ${isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        `}
        onDragOver={(e) => {
          e.preventDefault()
          if (!isLoading) setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {/* Background pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        <div className="relative">
          <div
            className={`
            mx-auto mb-8 p-6 rounded-2xl inline-flex items-center justify-center transition-all duration-300
            ${uploadedFile ? "bg-primary/15 text-primary shadow-lg scale-110" : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary hover:scale-110"}
          `}
          >
            <FileSpreadsheet className="h-10 w-10" />
          </div>

          {uploadedFile ? (
            <div className="space-y-6">
              <div className="flex items-center justify-center space-x-3">
                <CheckCircle className="h-6 w-6 text-primary" />
                <span className="text-foreground font-semibold text-lg">{uploadedFile.name}</span>
              </div>
              <div className="inline-flex items-center space-x-3 bg-primary/10 text-primary px-4 py-2 rounded-xl text-sm font-medium">
                <Database className="h-4 w-4" />
                <span>{availableSheets.length} sheet(s) detected</span>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-foreground mb-3">Single File Upload</h3>
                <p className="text-muted-foreground text-lg mb-6">Upload one Excel file containing all your data sheets</p>
              </div>

              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileInput}
                className="hidden"
                id="multi-file-upload"
                disabled={isLoading}
              />
              <label
                htmlFor="multi-file-upload"
                className={`
                  inline-flex items-center px-8 py-4 text-base font-medium rounded-2xl
                  transition-all duration-300 hover:scale-105
                  ${
                    isLoading
                      ? "bg-muted text-muted-foreground cursor-not-allowed"
                      : "bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-xl shadow-primary/25"
                  }
                `}
              >
                <Upload className="h-5 w-5 mr-3" />
                {isLoading ? "Processing..." : "Choose File"}
              </label>
            </div>
          )}
        </div>
      </div>

      {availableSheets.length > 0 && (
        <div className="bg-gradient-to-r from-card/80 to-card/40 backdrop-blur-sm rounded-2xl border border-border/50 shadow-xl p-8">
          <div className="flex items-center space-x-3 mb-8">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h4 className="text-2xl font-bold text-foreground">Sheet Mapping</h4>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {(["clients", "workers", "tasks"] as const).map((entityType) => {
              const icons = { clients: Users, workers: Briefcase, tasks: FileText }
              const Icon = icons[entityType]

              return (
                <div key={entityType} className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <label className="text-base font-semibold text-foreground capitalize">{entityType}</label>
                  </div>
                  <select
                    value={sheetMappings[entityType]}
                    onChange={(e) => handleMappingChange(entityType, e.target.value)}
                    className="w-full p-4 border border-input rounded-xl bg-background/50 backdrop-blur-sm text-foreground 
                      focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 hover:bg-background"
                  >
                    <option value="">Select sheet...</option>
                    {availableSheets.map((sheet) => (
                      <option key={sheet} value={sheet}>
                        {sheet} ({sheetsData[sheet]?.length.toLocaleString() || 0} records)
                      </option>
                    ))}
                  </select>
                </div>
              )
            })}
          </div>

          {canLoadData && (
            <div className="mt-8 text-center">
              <button
                onClick={handleLoadData}
                className="group inline-flex items-center px-8 py-4 text-base font-medium rounded-2xl
                  bg-gradient-to-r from-primary to-primary/90 text-primary-foreground 
                  hover:from-primary/90 hover:to-primary/80 transition-all duration-300 
                  hover:scale-105 shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/40"
              >
                <ArrowRight className="h-5 w-5 mr-2 group-hover:translate-x-1 transition-transform duration-300" />
                Load Data & Continue
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function UploadPage() {
  const router = useRouter()
  const { data, setClients, setWorkers, setTasks, clearData } = useData()
  const [uploadMethod, setUploadMethod] = useState<"individual" | "single">("single")
  const [isLoading, setIsLoading] = useState(false)

  const [fileStates, setFileStates] = useState<FileUploadState>({
    clients: { file: null, data: [], isUploaded: false },
    workers: { file: null, data: [], isUploaded: false },
    tasks: { file: null, data: [], isUploaded: false },
  })

  useEffect(() => {
    if (data.isDataLoaded) {
      router.push("/validate")
    } else {
      clearAllCaches()
    }
  }, [data.isDataLoaded, router])

  const handleFileUpload = (file: File, type: string) => {
    setIsLoading(true)

    const reader = new FileReader()
    reader.onload = (e) => {
      const data = e.target?.result

      if (file.name.endsWith(".csv")) {
        Papa.parse(data as string, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: true,
          complete: (results) => {
            const cleanedData = results.data.map((row: any) => {
              const cleanRow: any = {}
              Object.keys(row).forEach((key) => {
                const cleanKey = key.trim()
                cleanRow[cleanKey] = row[key]
              })
              return cleanRow
            })

            setFileStates((prev) => ({
              ...prev,
              [type]: { file, data: cleanedData, isUploaded: true },
            }))

            if (type === "clients") setClients(cleanedData)
            if (type === "workers") setWorkers(cleanedData)
            if (type === "tasks") setTasks(cleanedData)

            setIsLoading(false)
            router.push("/validate")
          },
        })
      } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        const workbook = XLSX.read(data, { type: "binary" })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet)

        const cleanedData = jsonData.map((row: any) => {
          const cleanRow: any = {}
          Object.keys(row).forEach((key) => {
            const cleanKey = key.trim()
            cleanRow[cleanKey] = row[key]
          })
          return cleanRow
        })

        setFileStates((prev) => ({
          ...prev,
          [type]: { file, data: cleanedData, isUploaded: true },
        }))

        if (type === "clients") setClients(cleanedData)
        if (type === "workers") setWorkers(cleanedData)
        if (type === "tasks") setTasks(cleanedData)

        setIsLoading(false)
        router.push("/validate")
      }
    }
    reader.readAsBinaryString(file)
  }

  const handleRemoveFile = (type: string) => {
    setFileStates((prev) => ({
      ...prev,
      [type]: { file: null, data: [], isUploaded: false },
    }))

    if (type === "clients") setClients([])
    if (type === "workers") setWorkers([])
    if (type === "tasks") setTasks([])
  }

  const handleContinue = () => {
    router.push("/validate")
  }

  const handleSingleFileComplete = () => {
    router.push("/validate")
  }

  const allFilesUploaded = fileStates.clients.isUploaded && fileStates.workers.isUploaded && fileStates.tasks.isUploaded

  return (
    <div className="min-h-screen bg-background font-bricolage-grotesk">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_var(--primary)/0.1,transparent_50%)] pointer-events-none" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Enhanced Header */}
        <div className="text-center mb-16 animate-fade-in-up">
          <div className="inline-flex items-center justify-center space-x-4 mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl scale-110 animate-pulse-glow" />
              <div className="relative p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border border-primary/20 backdrop-blur-sm">
                <Shredder className="h-8 w-8 text-primary" />
              </div>
            </div>
            <div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                Data Alchemist
              </h1>
              <div className="h-1 w-20 bg-gradient-to-r from-primary to-primary/60 rounded-full mt-2 animate-shimmer" />
            </div>
          </div>
          <p className="text-xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed">
            Transform your spreadsheets into clean, validated data with intelligent processing and seamless workflows
          </p>

          {/* Clear Data Button */}
          {data.isDataLoaded && (
            <div className="mb-12">
              <div className="inline-flex items-center justify-center p-1 bg-destructive/5 rounded-2xl border border-destructive/20">
                <button
                  onClick={() => {
                    clearData()
                    setFileStates({
                      clients: { file: null, data: [], isUploaded: false },
                      workers: { file: null, data: [], isUploaded: false },
                      tasks: { file: null, data: [], isUploaded: false },
                    })
                  }}
                  className="inline-flex items-center px-6 py-3 text-sm font-medium rounded-xl
                    text-destructive hover:bg-destructive/10 transition-all duration-300 hover:scale-105"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Clear All Data
                </button>
              </div>
            </div>
          )}

          {/* Enhanced Upload Method Selector */}
          <div className="inline-flex bg-muted/50 backdrop-blur-sm p-1.5 rounded-2xl mb-12 border border-border/50 shadow-lg">
            <button
              onClick={() => setUploadMethod("individual")}
              className={`relative px-6 py-3 text-sm font-medium rounded-xl transition-all duration-300 ${
                uploadMethod === "individual"
                  ? "bg-background text-foreground shadow-md scale-105 border border-border/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              }`}
            >
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="h-4 w-4" />
                <span>Individual Files</span>
              </div>
            </button>
            <button
              onClick={() => setUploadMethod("single")}
              className={`relative px-6 py-3 text-sm font-medium rounded-xl transition-all duration-300 ${
                uploadMethod === "single"
                  ? "bg-background text-foreground shadow-md scale-105 border border-border/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              }`}
            >
              <div className="flex items-center space-x-2">
                <Database className="h-4 w-4" />
                <span>Single File</span>
              </div>
            </button>
          </div>
        </div>

        {uploadMethod === "individual" ? (
          <div className="space-y-12">
            {/* Enhanced Individual File Upload */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <FileUploadCard
                fileType="clients"
                icon={Users}
                uploadState={fileStates.clients}
                onFileUpload={handleFileUpload}
                onRemove={handleRemoveFile}
                isLoading={isLoading}
              />
              <FileUploadCard
                fileType="workers"
                icon={Briefcase}
                uploadState={fileStates.workers}
                onFileUpload={handleFileUpload}
                onRemove={handleRemoveFile}
                isLoading={isLoading}
              />
              <FileUploadCard
                fileType="tasks"
                icon={FileText}
                uploadState={fileStates.tasks}
                onFileUpload={handleFileUpload}
                onRemove={handleRemoveFile}
                isLoading={isLoading}
              />
            </div>

            {/* Enhanced Progress and Continue Button */}
            {(fileStates.clients.isUploaded || fileStates.workers.isUploaded || fileStates.tasks.isUploaded) && (
              <div className="bg-gradient-to-r from-card/80 to-card/40 backdrop-blur-sm rounded-2xl border border-border/50 shadow-xl p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-primary/10 rounded-xl">
                      <CheckCircle className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground">Upload Progress</h3>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="relative w-32 bg-muted rounded-full h-3 overflow-hidden">
                      <div
                        className="absolute top-0 left-0 bg-gradient-to-r from-primary to-primary/80 h-full rounded-full transition-all duration-500 ease-out"
                        style={{
                          width: `${(Object.values(fileStates).filter((f) => f.isUploaded).length / 3) * 100}%`,
                        }}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-semibold text-primary">
                        {Object.values(fileStates).filter((f) => f.isUploaded).length}
                      </span>
                      <span className="text-sm text-muted-foreground">/3</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  {Object.entries(fileStates).map(([type, state]) => (
                    <div
                      key={type}
                      className={`
                      relative flex items-center space-x-4 p-4 rounded-xl border transition-all duration-300
                      ${state.isUploaded 
                        ? "bg-gradient-to-br from-primary/10 to-accent/10 border-primary/30 shadow-lg" 
                        : "bg-muted/30 border-border/50"
                      }
                    `}
                    >
                      {state.isUploaded && (
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent rounded-xl" />
                      )}
                      <div className="relative">
                        {state.isUploaded ? (
                          <div className="p-2 bg-primary/20 rounded-lg">
                            <CheckCircle className="h-5 w-5 text-primary" />
                          </div>
                        ) : (
                          <div className="p-2 bg-muted rounded-lg">
                            <AlertCircle className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="relative">
                        <span
                          className={`capitalize font-semibold text-sm ${
                            state.isUploaded ? "text-foreground" : "text-muted-foreground"
                          }`}
                        >
                          {type}
                        </span>
                        <p className="text-xs text-muted-foreground">
                          {state.isUploaded ? `${state.data.length.toLocaleString()} records` : "Not uploaded"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {allFilesUploaded && (
                  <div className="text-center">
                    <button
                      onClick={handleContinue}
                      className="group inline-flex items-center px-8 py-4 text-base font-medium rounded-2xl
                        bg-gradient-to-r from-primary to-primary/90 text-primary-foreground 
                        hover:from-primary/90 hover:to-primary/80 transition-all duration-300 
                        hover:scale-105 shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/40"
                    >
                      <ArrowRight className="h-5 w-5 mr-2 group-hover:translate-x-1 transition-transform duration-300" />
                      Continue to Validation
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <MultiFileUpload onComplete={handleSingleFileComplete} isLoading={isLoading} setIsLoading={setIsLoading} />
        )}
      </div>
    </div>
  )
}
