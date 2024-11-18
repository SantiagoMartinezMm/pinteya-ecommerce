import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

interface ImageUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
  maxImages?: number;
}

export function ImageUpload({ 
  value = [], 
  onChange, 
  maxImages = 4 
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    try {
      setIsUploading(true);

      const formData = new FormData();
      acceptedFiles.forEach(file => {
        formData.append("files", file);
      });

      const response = await fetch("/api/uploadthing", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      
      onChange([...value, ...data.urls]);
    } catch (error) {
      console.error("Error uploading images:", error);
    } finally {
      setIsUploading(false);
    }
  }, [value, onChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    },
    maxFiles: maxImages - value.length,
    disabled: value.length >= maxImages || isUploading
  });

  const removeImage = (indexToRemove: number) => {
    onChange(value.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {value.map((url, index) => (
          <div key={url} className="relative aspect-square">
            <Image
              src={url}
              alt={`Product image ${index + 1}`}
              fill
              className="object-cover rounded-lg"
            />
            <Button
              type="button"
              onClick={() => removeImage(index)}
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {value.length < maxImages && (
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-6
            hover:border-primary/50 transition
            ${isDragActive ? 'border-primary' : 'border-gray-200'}
          `}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center gap-2">
            <Upload className={`
              h-10 w-10
              ${isDragActive ? 'text-primary' : 'text-gray-400'}
            `} />
            <p className="text-sm text-muted-foreground">
              {isDragActive ? 'Suelta las imágenes aquí' : 'Arrastra imágenes o haz clic para seleccionar'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}