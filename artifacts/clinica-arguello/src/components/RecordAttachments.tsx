import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Paperclip, Upload, Trash2, Download, FileText, Image, File } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Attachment {
  id: number;
  clinicalRecordId: number;
  originalName: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: string;
}

function getToken() {
  return localStorage.getItem("clinica_token") ?? "";
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith("image/")) return <Image className="h-4 w-4 text-blue-500" />;
  if (mimeType === "application/pdf") return <FileText className="h-4 w-4 text-red-500" />;
  return <File className="h-4 w-4 text-muted-foreground" />;
}

export function RecordAttachments({ recordId }: { recordId: number }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const queryKey = ["attachments", recordId];

  const { data: attachments = [], isLoading } = useQuery<Attachment[]>({
    queryKey,
    queryFn: async () => {
      const res = await fetch(`/api/clinical-records/${recordId}/attachments`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Error al cargar adjuntos");
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (attachmentId: number) => {
      const res = await fetch(`/api/clinical-records/${recordId}/attachments/${attachmentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Error al eliminar adjunto");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Adjunto eliminado" });
    },
    onError: () => {
      toast({ title: "Error al eliminar adjunto", variant: "destructive" });
    },
  });

  const handleUpload = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/clinical-records/${recordId}/attachments`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Error al subir archivo");
      }
      await queryClient.invalidateQueries({ queryKey });
      toast({ title: "Archivo subido correctamente" });
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Error al subir archivo", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [recordId, queryClient, queryKey, toast]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDownload = (attachment: Attachment) => {
    const link = document.createElement("a");
    link.href = `/api/clinical-records/${recordId}/attachments/${attachment.id}/download`;
    link.setAttribute("Authorization", `Bearer ${getToken()}`);
    const token = getToken();
    fetch(`/api/clinical-records/${recordId}/attachments/${attachment.id}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = attachment.originalName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      })
      .catch(() => toast({ title: "Error al descargar archivo", variant: "destructive" }));
  };

  return (
    <div className="mt-3 border-t border-border pt-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Paperclip className="h-3.5 w-3.5" />
          <span>Adjuntos{attachments.length > 0 ? ` (${attachments.length})` : ""}</span>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,.pdf,.doc,.docx"
            onChange={handleFileChange}
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-3.5 w-3.5 mr-1" />
            {uploading ? "Subiendo..." : "Subir archivo"}
          </Button>
        </div>
      </div>

      {isLoading && (
        <p className="text-xs text-muted-foreground">Cargando adjuntos...</p>
      )}

      {!isLoading && attachments.length === 0 && (
        <p className="text-xs text-muted-foreground italic">Sin adjuntos. Puede subir imágenes, PDFs o documentos Word (máx. 20 MB).</p>
      )}

      {attachments.length > 0 && (
        <div className="space-y-1.5">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileIcon mimeType={att.mimeType} />
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate max-w-[200px]">{att.originalName}</p>
                  <p className="text-xs text-muted-foreground">{formatSize(att.fileSize)}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleDownload(att)}
                  title="Descargar"
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive hover:text-destructive"
                  onClick={() => deleteMutation.mutate(att.id)}
                  title="Eliminar"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
